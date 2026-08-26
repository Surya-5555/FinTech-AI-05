import { randomUUID } from 'crypto';

const API_BASE = process.env.API_URL || 'http://localhost:3000/api/v1';

async function ingestEvent(eventType: string, externalEventId: string, amount: number, customerRef: string, merchantRef: string, idempotencyKey: string) {
  const payload = {
    externalEventId,
    eventType,
    occurredAt: new Date().toISOString(),
    amount: {
      amountMinor: amount.toString(),
      currency: 'INR'
    },
    failureReason: eventType === 'PAYMENT_FAILED' ? 'INSUFFICIENT_FUNDS' : undefined,
    customer: {
      externalReference: customerRef,
      maskedReference: `mask_${customerRef.substring(0, 4)}`,
      consents: { email: 'GRANTED', sms: 'GRANTED', voice: 'DENIED' }
    },
    merchant: {
      externalReference: merchantRef,
      name: 'Demo Res Merchant',
      segment: 'ENTERPRISE'
    },
    metadata: { resilienceTest: true }
  };

  const bodyStr = JSON.stringify(payload);
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-secret';
  const signature = require('crypto').createHmac('sha256', secret).update(bodyStr).digest('hex');

  const response = await fetch(`${API_BASE}/events/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      'x-razorpay-signature': signature
    },
    body: bodyStr
  });

  if (!response.ok) {
    if (response.status === 409) {
      return { status: 409, error: 'Conflict' };
    }
    const text = await response.text();
    if (response.status === 400 && text.includes('Concurrent duplicate ingestion detected')) {
      return { status: 409, error: 'Conflict' };
    }
    throw new Error(`Ingest failed: ${response.status} ${text}`);
  }

  const json = await response.json();
  return { status: response.status, ...json };
}

async function runResilienceTest() {
  console.log('--- Starting Resilience Test ---');

  console.log('Test 1: Idempotency under concurrent identical requests');
  const externalEventId = `evt_res_${randomUUID()}`;
  const customerRef = `cust_res_${Date.now()}`;
  const merchantRef = `merch_res_${Date.now()}`;
  const idempotencyKey = `idk_res_${externalEventId}`;
  const amount = 50000;

  // Seed the merchant and customer to prevent race conditions on their creation
  console.log('  Seeding merchant and customer...');
  await ingestEvent('PAYMENT_FAILED', `evt_seed_${randomUUID()}`, amount, customerRef, merchantRef, `idk_seed_${randomUUID()}`);

  // Send 10 identical requests simultaneously
  const promises = Array.from({ length: 10 }).map(() => 
    ingestEvent('PAYMENT_FAILED', externalEventId, amount, customerRef, merchantRef, idempotencyKey)
      .catch(err => ({ status: 500, error: err.message }))
  );

  const results = await Promise.all(promises);

  let successCount = 0;
  let replayCount = 0;
  let conflictCount = 0;
  let errorCount = 0;

  for (const r of results) {
    if (r.status === 409) conflictCount++;
    else if (r.status === 500) {
      errorCount++;
      console.error('Request Error:', r.error);
    }
    else if (r.idempotentReplay) replayCount++;
    else successCount++;
  }

  console.log(`  Success (New): ${successCount}`);
  console.log(`  Idempotent Replay: ${replayCount}`);
  console.log(`  Conflict (409): ${conflictCount}`);
  console.log(`  Errors: ${errorCount}`);

  if (successCount !== 1) {
    console.error(`  [FAIL] Expected exactly 1 successful new ingestion. Got ${successCount}.`);
    process.exit(1);
  }

  if (errorCount > 0) {
    console.error(`  [FAIL] Encountered unexpected errors during concurrency test.`);
    process.exit(1);
  }

  console.log('  [PASS] Idempotency maintained under concurrency.');
  console.log('--- Resilience Test Completed successfully ---');
}

runResilienceTest().catch(err => {
  console.error('Fatal Resilience Test Error:', err);
  process.exit(1);
});
