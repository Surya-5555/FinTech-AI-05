import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EvaluationCase, EvaluationManifest } from '../libs/evaluation/src/dataset/schemas.js';
import { id } from '../libs/utils/src/id.js';

// Simple LCG (Linear Congruential Generator) for deterministic randomness
class DeterministicRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.nextRange(min, max + 1));
  }

  nextBoolean(): boolean {
    return this.next() >= 0.5;
  }

  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  pickWeighted<T>(items: { item: T; weight: number }[]): T {
    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    let randomVal = this.nextRange(0, totalWeight);
    for (const i of items) {
      if (randomVal < i.weight) return i.item;
      randomVal -= i.weight;
    }
    return items[items.length - 1].item;
  }
}

const SEED = 42;
const TOTAL_CASES = 500;
const VERSION = '1.0.0';

const rng = new DeterministicRandom(SEED);

const SCENARIOS = [
  { id: 'SCN_INSUFFICIENT_FUNDS', weight: 40 },
  { id: 'SCN_CARD_EXPIRED', weight: 15 },
  { id: 'SCN_BANK_TIMEOUT', weight: 20 },
  { id: 'SCN_DO_NOT_HONOR', weight: 10 },
  { id: 'SCN_FRAUD_SUSPECTED', weight: 5 },
  { id: 'SCN_INVALID_CVV', weight: 10 }
];

const CURRENCIES = ['INR', 'USD'];
const EVENT_TYPES = ['payment.failed', 'subscription.halted', 'invoice.expired'];

function generateCase(): EvaluationCase {
  const scenario = rng.pickWeighted(SCENARIOS.map(s => ({ item: s.id, weight: s.weight })));
  const isRecoverable = scenario !== 'SCN_FRAUD_SUSPECTED' && scenario !== 'SCN_CARD_EXPIRED';
  const amountMinor = rng.nextInt(10000, 1000000).toString(); // 100.00 to 10000.00

  let providerScenario = rng.pickWeighted([
    { item: 'success', weight: 40 },
    { item: 'timeout_once_then_success', weight: 15 },
    { item: 'permanent_failure', weight: 20 },
    { item: 'payment_link_paid_after_event', weight: 10 },
    { item: 'no_customer_response', weight: 15 }
  ]);

  if (!isRecoverable) {
    providerScenario = 'permanent_failure';
  }

  // Use crypto for a pseudo-random event id to be realistic, but seeded PRNG for decisions
  const eventId = `evt_test_${rng.nextInt(1000000, 9999999)}`;
  const customerId = `cust_test_${rng.nextInt(10000, 99999)}`;
  
  return {
    scenarioId: scenario,
    sourceEvent: {
      eventId,
      eventType: rng.pick(EVENT_TYPES),
      amountMinor,
      currency: rng.pickWeighted([{ item: 'INR', weight: 90 }, { item: 'USD', weight: 10 }]),
      failureReason: scenario,
      metadata: {}
    },
    merchantPolicyReference: rng.pick(['pol_standard', 'pol_aggressive', 'pol_conservative']),
    maskedCustomerReference: customerId,
    knownAllowedChannels: rng.nextBoolean() ? ['sms', 'email'] : ['email'],
    eventTimestamp: new Date(Date.now() - rng.nextInt(0, 30 * 24 * 60 * 60 * 1000)).toISOString(),
    groundTruth: {
      recoverable: isRecoverable,
      successfulInterventions: isRecoverable ? ['sms', 'email'] : [],
      unsuccessfulInterventions: [],
      expectedRecoveryAmountMinor: isRecoverable && providerScenario !== 'permanent_failure' && providerScenario !== 'no_customer_response' ? amountMinor : '0',
      minimumAttempts: rng.nextInt(1, 2),
      maximumAttempts: rng.nextInt(3, 5),
      providerScenario: providerScenario as any,
      unsafeConditions: [],
      expectedEscalation: providerScenario === 'no_customer_response',
      expectedStop: !isRecoverable
    }
  };
}

function computeChecksum(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function run() {
  console.log(`Generating ${TOTAL_CASES} evaluation cases with seed ${SEED}...`);
  
  const cases: EvaluationCase[] = [];
  const scenarioCounts: Record<string, number> = {};

  for (let i = 0; i < TOTAL_CASES; i++) {
    const c = generateCase();
    cases.push(c);
    scenarioCounts[c.scenarioId] = (scenarioCounts[c.scenarioId] || 0) + 1;
  }

  // Split: 300 held-out, 100 train, 100 validation
  const heldOut = cases.slice(0, 300);
  const train = cases.slice(300, 400);
  const validation = cases.slice(400, 500);

  const dir = path.join(process.cwd(), 'data', 'evaluation', 'v1');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const writeJsonl = (filename: string, data: any[]) => {
    const filePath = path.join(dir, filename);
    const content = data.map(d => JSON.stringify(d)).join('\n');
    fs.writeFileSync(filePath, content);
    return filePath;
  };

  const heldOutPath = writeJsonl('heldout.jsonl', heldOut);
  writeJsonl('train.jsonl', train);
  writeJsonl('validation.jsonl', validation);
  fs.writeFileSync(path.join(dir, 'scenarios.json'), JSON.stringify(SCENARIOS, null, 2));

  const manifest: EvaluationManifest = {
    datasetVersion: 'v1',
    generatorVersion: VERSION,
    createdAt: new Date().toISOString(),
    seed: SEED,
    caseCount: TOTAL_CASES,
    checksum: computeChecksum(heldOutPath),
    scenarioDistribution: scenarioCounts,
    limitations: [
      "Synthetic data generated via seeded LCG.",
      "Customer metadata is completely masked.",
      "Does not reflect true production volume or timing.",
      "Requires explicit test adapters during evaluation runs.",
      "No leakage: Ground truth 'recoverable' status is never passed to scoring inputs."
    ]
  };

  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  
  console.log(`Generation complete.`);
  console.log(`Manifest created with checksum: ${manifest.checksum}`);
  console.log(`Scenario distribution:`, scenarioCounts);
}

run();
