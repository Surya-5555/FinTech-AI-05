import { randomUUID } from 'crypto';
import * as crypto from 'crypto';

const API_BASE = process.env.API_URL || 'http://localhost:3000/api/v1';
const CONCURRENT_REQUESTS = 50;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
      name: 'Demo Load Merchant',
      segment: 'ENTERPRISE'
    },
    metadata: { loadTest: true }
  };

  const bodyStr = JSON.stringify(payload);
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-secret';
  const signature = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');

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
    const text = await response.text();
    throw new Error(`Ingest failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function runLoadTest() {
  console.log('--- Starting Load Test ---');
  const merchantRef = `merch_load_${Date.now()}`;
  const totalCases = 100;
  const chunkLimit = CONCURRENT_REQUESTS;

  console.log(`Phase A: Ingesting ${totalCases} PAYMENT_FAILED events...`);
  
  const testCases = Array.from({ length: totalCases }).map((_, i) => ({
    customerRef: `cust_load_${Date.now()}_${i}`,
    failedEventId: `evt_fail_${randomUUID()}`,
    recoveryEventId: `evt_rec_${randomUUID()}`,
    amount: 150000 + i // 1500 INR
  }));

  let failedResponses = [];
  for (let i = 0; i < testCases.length; i += chunkLimit) {
    const chunk = testCases.slice(i, i + chunkLimit);
    const promises = chunk.map(tc => 
      ingestEvent('PAYMENT_FAILED', tc.failedEventId, tc.amount, tc.customerRef, merchantRef, `idk_fail_${tc.failedEventId}`)
    );
    const results = await Promise.all(promises);
    failedResponses.push(...results);
    console.log(`  Ingested ${Math.min(i + chunkLimit, totalCases)} / ${totalCases}...`);
  }

  console.log(`Phase B: Waiting for worker to process cases...`);
  await sleep(2000); // Wait for BullMQ worker to pick up and process

  console.log(`Phase C: Ingesting PAYMENT_RECOVERED for half (${totalCases / 2}) of the cases...`);
  const recoverCases = testCases.slice(0, totalCases / 2);
  let recoveredResponses = [];
  
  for (let i = 0; i < recoverCases.length; i += chunkLimit) {
    const chunk = recoverCases.slice(i, i + chunkLimit);
    const promises = chunk.map(tc => 
      ingestEvent('PAYMENT_RECOVERED', tc.recoveryEventId, tc.amount, tc.customerRef, merchantRef, `idk_rec_${tc.recoveryEventId}`)
    );
    const results = await Promise.all(promises);
    recoveredResponses.push(...results);
    console.log(`  Recovered ${Math.min(i + chunkLimit, recoverCases.length)} / ${recoverCases.length}...`);
  }

  console.log(`Phase D: Validation`);
  const successRecovers = recoveredResponses.filter(r => r.caseRecovered);
  console.log(`  Successfully recovered cases: ${successRecovers.length} / ${recoverCases.length}`);

  if (successRecovers.length !== recoverCases.length) {
    console.error('  [FAIL] Expected all recovered events to mark cases as recovered.');
    process.exit(1);
  } else {
    console.log('  [PASS] All recovery events successfully mapped and updated cases.');
  }

  console.log('--- Load Test Completed successfully ---');
}

runLoadTest().catch(err => {
  console.error('Fatal Load Test Error:', err);
  process.exit(1);
});
