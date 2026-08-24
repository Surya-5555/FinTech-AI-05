import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import {
  EvaluationCase,
  EvaluationManifest,
  EvaluationGroundTruth
} from '../libs/evaluation/src/dataset/schemas';

// Simple deterministic PRNG (Mulberry32)
function createPRNG(seed: number) {
  let a = seed;
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

const SEED = 42;
const random = createPRNG(SEED);

// Random helpers
function randomInt(min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

const scenarioCounts = {
  SCN_INSUFFICIENT_FUNDS: 205,
  SCN_BANK_TIMEOUT: 94,
  SCN_CARD_EXPIRED: 71,
  SCN_DO_NOT_HONOR: 54,
  SCN_INVALID_CVV: 53,
  SCN_FRAUD_SUSPECTED: 23
};

const splits = {
  train: 165,
  validation: 165,
  heldout: 170
};

function generateGroundTruth(scenarioId: string, amountMinor: string): EvaluationGroundTruth {
  let recoverable = false;
  let successfulInterventions: string[] = [];
  let unsuccessfulInterventions: string[] = [];
  let expectedRecoveryAmountMinor = "0";
  let minimumAttempts = 1;
  let maximumAttempts = 3;
  let providerScenario: EvaluationGroundTruth["providerScenario"] = 'permanent_failure';
  let unsafeConditions: string[] = [];
  let expectedEscalation = false;
  let expectedStop = false;

  switch (scenarioId) {
    case 'SCN_INSUFFICIENT_FUNDS':
      recoverable = false;
      expectedStop = true;
      break;
    case 'SCN_BANK_TIMEOUT':
      recoverable = true;
      successfulInterventions = ['RETRY_PAYMENT'];
      expectedRecoveryAmountMinor = amountMinor;
      providerScenario = random() > 0.5 ? 'success' : 'timeout_once_then_success';
      minimumAttempts = providerScenario === 'success' ? 1 : 2;
      break;
    case 'SCN_CARD_EXPIRED':
      recoverable = true;
      successfulInterventions = ['PAYMENT_LINK_SMS', 'PAYMENT_LINK_EMAIL'];
      expectedRecoveryAmountMinor = amountMinor;
      providerScenario = 'payment_link_paid_after_event';
      break;
    case 'SCN_DO_NOT_HONOR':
      recoverable = false;
      expectedEscalation = true;
      expectedStop = true;
      break;
    case 'SCN_INVALID_CVV':
      recoverable = true;
      successfulInterventions = ['PAYMENT_LINK_SMS'];
      expectedRecoveryAmountMinor = amountMinor;
      providerScenario = 'payment_link_paid_after_event';
      break;
    case 'SCN_FRAUD_SUSPECTED':
      recoverable = false;
      unsafeConditions = ['FRAUD_FLAG'];
      expectedStop = true;
      break;
  }

  return {
    recoverable,
    successfulInterventions,
    unsuccessfulInterventions,
    expectedRecoveryAmountMinor,
    minimumAttempts,
    maximumAttempts,
    providerScenario,
    unsafeConditions,
    expectedEscalation,
    expectedStop
  };
}

function generateCase(index: number, scenarioId: string): EvaluationCase {
  const amountMinor = randomInt(10000, 500000).toString(); // ₹100 to ₹5,000
  return {
    scenarioId,
    sourceEvent: {
      eventId: `evt_eval_${index}_${randomInt(1000, 9999)}`,
      eventType: 'payment.failed',
      amountMinor,
      currency: 'INR',
      failureReason: scenarioId,
      metadata: {}
    },
    merchantPolicyReference: 'pol_default',
    maskedCustomerReference: `cust_${randomInt(10000, 99999)}`,
    knownAllowedChannels: ['SMS', 'EMAIL'],
    eventTimestamp: new Date(Date.now() - randomInt(0, 10000000)).toISOString(),
    groundTruth: generateGroundTruth(scenarioId, amountMinor)
  };
}

function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,  randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

function generateDataset() {
  const allCases: EvaluationCase[] = [];
  let globalIndex = 0;

  for (const [scenario, count] of Object.entries(scenarioCounts)) {
    for (let i = 0; i < count; i++) {
      allCases.push(generateCase(globalIndex++, scenario));
    }
  }

  // Shuffle predictably
  shuffle(allCases);

  const train = allCases.slice(0, splits.train);
  const validation = allCases.slice(splits.train, splits.train + splits.validation);
  const heldout = allCases.slice(splits.train + splits.validation);

  const outputDir = path.resolve(__dirname, '../data/evaluation/v1');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const writeJsonl = (filename: string, data: EvaluationCase[]) => {
    const filePath = path.join(outputDir, filename);
    const content = data.map(d => JSON.stringify(d)).join('\n');
    fs.writeFileSync(filePath, content);
    return content;
  };

  const trainContent = writeJsonl('train.jsonl', train);
  const valContent = writeJsonl('validation.jsonl', validation);
  const heldoutContent = writeJsonl('heldout.jsonl', heldout);

  const fullContent = trainContent + valContent + heldoutContent;
  const checksum = crypto.createHash('sha256').update(fullContent).digest('hex');

  const manifest: EvaluationManifest = {
    datasetVersion: '1.0.0',
    generatorVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    seed: SEED,
    caseCount: allCases.length,
    checksum,
    scenarioDistribution: scenarioCounts,
    limitations: [
      'Simulated dataset for benchmarking only',
      'No real PII or production data'
    ]
  };

  fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Successfully generated ${allCases.length} evaluation cases in ${outputDir}`);
  console.log(`Checksum: ${checksum}`);
}

generateDataset();
