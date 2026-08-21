import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')

package_json = """{
  "name": "@rr/persistence",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "generate": "prisma generate",
    "db:push": "prisma db push",
    "typecheck": "tsc --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "@rr/contracts": "workspace:*",
    "@rr/domain": "workspace:*",
    "@rr/utils": "workspace:*"
  },
  "devDependencies": {
    "prisma": "^5.22.0"
  }
}
"""

tsconfig_json = """{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "."
  },
  "include": ["src/**/*", "test/**/*", "prisma/**/*"]
}
"""

schema_prisma = """
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Merchant {
  id              String   @id @default(cuid())
  externalReference String @unique
  name            String
  segment         String
  status          String
  configJson      String   @db.Text
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Customer {
  id                           String   @id @default(cuid())
  merchantId                   String
  externalReference            String
  displayNameOrMaskedReference String
  consentEmail                 String
  consentSms                   String
  consentVoice                 String
  contactWindowMetadataJson    String   @db.Text
  createdAt                    DateTime @default(now())
  updatedAt                    DateTime @updatedAt

  @@unique([merchantId, externalReference])
}

model RevenueEvent {
  id                       String   @id @default(cuid())
  externalEventId          String
  merchantId               String
  customerId               String?
  eventType                String
  amountMinor              BigInt
  currency                 String
  failureReason            String?
  occurredAt               DateTime
  receivedAt               DateTime @default(now())
  correlationId            String
  rawPayloadVersion        String
  metadataJson             String   @db.Text
  ingestionIdempotencyKey  String   @unique
  createdAt                DateTime @default(now())

  @@unique([merchantId, externalEventId, eventType])
  @@index([merchantId, occurredAt])
  @@index([eventType, occurredAt])
  @@index([correlationId])
}

model RevenueCase {
  id                String    @id @default(cuid())
  sourceEventId     String    @unique
  merchantId        String
  customerId        String?
  amountAtRiskMinor BigInt
  currency          String
  state             String
  attemptCount      Int
  recoveryScore     Int?
  rootCause         String?
  version           Int
  correlationId     String
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  terminalAt        DateTime?

  @@index([state, updatedAt])
  @@index([merchantId, state])
  @@index([correlationId])
}

model RecoveryPlan {
  id                    String   @id @default(cuid())
  caseId                String
  interventionType      String
  plannedAt             DateTime
  reasonCodesJson       String   @db.Text
  policyVersion         String
  requiresHumanApproval Boolean
  idempotencyKey        String   @unique
  parametersJson        String   @db.Text
  planStatus            String
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([caseId, planStatus])
  @@index([plannedAt])
}

model Intervention {
  id                 String    @id @default(cuid())
  planId             String
  caseId             String
  interventionType   String
  attemptNumber      Int
  status             String
  idempotencyKey     String    @unique
  executionStartedAt DateTime?
  executionCompletedAt DateTime?
  externalReference  String?
  failureCode        String?
  retryAfter         DateTime?
  correlationId      String
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@unique([caseId, interventionType, attemptNumber])
  @@index([status, retryAfter])
  @@index([caseId, createdAt])
  @@index([correlationId])
}

model InterventionOutcome {
  id                   String   @id @default(cuid())
  interventionId       String   @unique
  status               String
  recoveredAmountMinor BigInt?
  currency             String?
  resultMetadataJson   String   @db.Text
  createdAt            DateTime @default(now())
}

model Escalation {
  id                     String    @id @default(cuid())
  caseId                 String
  reasonCodesJson        String    @db.Text
  priority               String
  status                 String
  createdAt              DateTime  @default(now())
  resolvedAt             DateTime?
  resolvedBy             String?
  resolutionMetadataJson String?   @db.Text
}

model AuditLog {
  id            String   @id @default(cuid())
  timestamp     DateTime
  actorType     String
  action        String
  entityType    String
  entityId      String
  correlationId String
  previousState String?
  nextState     String?
  metadataJson  String   @db.Text

  @@index([entityType, entityId, timestamp])
  @@index([correlationId, timestamp])
  @@index([action, timestamp])
}

model EvaluationRun {
  id                      String    @id @default(cuid())
  datasetVersion          String
  systemVersion           String
  policyVersion           String
  status                  String
  startedAt               DateTime
  completedAt             DateTime?
  totalCases              Int
  totalAtRiskMinor        BigInt
  baselineRecoveredMinor  BigInt
  systemRecoveredMinor    BigInt
  incrementalRecoveredMinor BigInt
  recoveryRate            Float
  interventionPrecision   Float?
  falseInterventionCount  Int
  escalationCount         Int
  stoppedCaseCount        Int
  averageAttemptsPerCase  Float
  medianRecoveryLatencyMs Int?
  totalInferenceCostMinor BigInt?
  metricsJson             String    @db.Text
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
}

model EvaluationCaseResult {
  id                   String   @id @default(cuid())
  evaluationRunId      String
  caseId               String?
  sourceEventReference String
  baselineOutcomeJson  String   @db.Text
  systemOutcomeJson    String   @db.Text
  wasRecovered         Boolean
  recoveredAmountMinor BigInt
  failureReason        String?
  createdAt            DateTime @default(now())
}
"""

index_ts = """
export * from './client/index.js';
export * from './repositories/contracts/index.js';
export * from './repositories/prisma/index.js';
export * from './mappers/index.js';
export * from './errors/index.js';
"""

client_index_ts = """
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export function setPrismaClient(client: PrismaClient) {
  prisma = client;
}
"""

errors_index_ts = """
export class ConcurrencyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConcurrencyConflictError';
  }
}
"""

mappers_index_ts = """
// Placeholder mappers for translating between Prisma types and Domain types.
import { RevenueCase, RecoveryPlan, AuditLog, InterventionOutcome, EvaluationRun, RevenueEvent, EventType, PaymentFailureReason, RevenueCaseState, InterventionType, InterventionStatus, AuditActorType, AuditAction } from '@rr/contracts';
import type { 
  RevenueCase as PrismaRevenueCase, 
  RecoveryPlan as PrismaRecoveryPlan, 
  AuditLog as PrismaAuditLog,
  Intervention as PrismaIntervention,
  EvaluationRun as PrismaEvaluationRun,
  RevenueEvent as PrismaRevenueEvent
} from '@prisma/client';
import { createMoney } from '@rr/domain';

export function prismaRevenueEventToContract(pr: PrismaRevenueEvent): RevenueEvent {
  return {
    eventId: pr.id as any,
    externalEventId: pr.externalEventId,
    merchantId: pr.merchantId as any,
    customerId: (pr.customerId || '') as any,
    eventType: pr.eventType as EventType,
    occurredAt: pr.occurredAt,
    amount: createMoney(pr.amountMinor, pr.currency),
    failureReason: pr.failureReason ? (pr.failureReason as PaymentFailureReason) : undefined,
    correlationId: pr.correlationId as any,
    rawPayloadVersion: pr.rawPayloadVersion,
    metadata: JSON.parse(pr.metadataJson),
  };
}

export function prismaRevenueCaseToContract(pr: PrismaRevenueCase): RevenueCase {
  return {
    caseId: pr.id as any,
    sourceEventId: pr.sourceEventId as any,
    merchantId: pr.merchantId as any,
    customerId: (pr.customerId || '') as any,
    amountAtRisk: createMoney(pr.amountAtRiskMinor, pr.currency),
    state: pr.state as RevenueCaseState,
    attemptCount: pr.attemptCount,
    recoveryScore: pr.recoveryScore ?? undefined,
    rootCause: pr.rootCause ?? undefined,
    createdAt: pr.createdAt,
    updatedAt: pr.updatedAt,
    version: pr.version,
    correlationId: pr.correlationId as any,
  };
}
// Additional mappers will be filled in as needed.
"""

repos_contracts_index_ts = """
import { RevenueCase, RevenueEvent, AuditLog, RecoveryPlan, InterventionOutcome, EvaluationRun } from '@rr/contracts';

export interface RevenueCaseRepository {
  findById(id: string): Promise<RevenueCase | null>;
  create(rc: RevenueCase): Promise<void>;
  transitionWithVersion(rc: RevenueCase, nextState: string, newVersion: number): Promise<void>;
}

export interface RevenueEventRepository {
  createOrReturnExisting(event: RevenueEvent): Promise<RevenueEvent>;
}

export interface AuditLogRepository {
  appendAuditLog(log: AuditLog): Promise<void>;
}
// Further repository interfaces will be expanded in next phases.
"""

repos_prisma_index_ts = """
import { RevenueCaseRepository, RevenueEventRepository, AuditLogRepository } from '../contracts/index.js';
import { getPrismaClient } from '../../client/index.js';
import { RevenueCase, RevenueEvent, AuditLog } from '@rr/contracts';
import { prismaRevenueCaseToContract, prismaRevenueEventToContract } from '../../mappers/index.js';
import { ConcurrencyConflictError } from '../../errors/index.js';

export class PrismaRevenueCaseRepository implements RevenueCaseRepository {
  async findById(id: string): Promise<RevenueCase | null> {
    const prisma = getPrismaClient();
    const result = await prisma.revenueCase.findUnique({ where: { id } });
    if (!result) return null;
    return prismaRevenueCaseToContract(result);
  }

  async create(rc: RevenueCase): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.revenueCase.create({
      data: {
        id: rc.caseId,
        sourceEventId: rc.sourceEventId,
        merchantId: rc.merchantId,
        customerId: rc.customerId || null,
        amountAtRiskMinor: rc.amountAtRisk.amountMinor,
        currency: rc.amountAtRisk.currency,
        state: rc.state,
        attemptCount: rc.attemptCount,
        recoveryScore: rc.recoveryScore ?? null,
        rootCause: rc.rootCause ?? null,
        version: rc.version,
        correlationId: rc.correlationId,
      }
    });
  }

  async transitionWithVersion(rc: RevenueCase, nextState: string, newVersion: number): Promise<void> {
    const prisma = getPrismaClient();
    const result = await prisma.revenueCase.updateMany({
      where: {
        id: rc.caseId,
        version: rc.version,
      },
      data: {
        state: nextState,
        version: newVersion,
      }
    });
    if (result.count === 0) {
      throw new ConcurrencyConflictError(`Version mismatch or case not found: ${rc.caseId}`);
    }
  }
}

export class PrismaAuditLogRepository implements AuditLogRepository {
  async appendAuditLog(log: AuditLog): Promise<void> {
    const prisma = getPrismaClient();
    await prisma.auditLog.create({
      data: {
        id: log.auditLogId,
        timestamp: log.timestamp,
        actorType: log.actorType,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        correlationId: log.correlationId,
        previousState: log.previousState ?? null,
        nextState: log.nextState ?? null,
        metadataJson: JSON.stringify(log.metadata),
      }
    });
  }
}
"""

persistence_readme_md = """# Persistence Layer

This library handles all interactions with PostgreSQL via Prisma.
Domain models and contracts are strictly separated from persistence details. Prisma models are mapped to pure domain entities inside `libs/persistence/src/mappers/`.
"""

test_integration = """
import { expect, test } from 'vitest';
import { ConcurrencyConflictError } from '../src/errors/index.js';

test('ConcurrencyConflictError instantiates correctly', () => {
  const err = new ConcurrencyConflictError('conflict');
  expect(err.name).toBe('ConcurrencyConflictError');
});
"""

docs_persistence = """# Persistence Architecture

- **PostgreSQL**: Selected as the primary transactional store due to its robustness and support for JSONB (though we treat json as text here for generic fallback) and strict consistency.
- **Prisma**: Serves as the ORM and migration tool.
- **Transaction Boundaries**: Domain actions like state transitions map to a single database transaction.
- **Idempotency**: Implemented using unique constraints on idempotency keys across execution attempts.
- **Optimistic Concurrency**: Enforced on `RevenueCase` via a `version` column.
- **Audit Logging**: Strictly append-only.
- **Money Representation**: `amountMinor` as BIGINT to prevent floating point imprecision.
"""

docs_data_model = """# Data Model

```mermaid
erDiagram
  Merchant ||--o{ RevenueCase : has
  Customer ||--o{ RevenueCase : has
  RevenueEvent ||--o| RevenueCase : creates
  RevenueCase ||--o{ RecoveryPlan : owns
  RecoveryPlan ||--o{ Intervention : contains
  Intervention ||--o| InterventionOutcome : yields
```

- BigInt used for all currency to avoid floating point errors.
- Version-based optimistic locking on RevenueCase state.
"""

docs_adr_008 = """# ADR 008: PostgreSQL and Prisma Persistence

## Context
We need a stable database to persist revenue cases, plans, and audit logs while honoring strict money safety and concurrency rules.

## Decision
- We use PostgreSQL for strong transactional guarantees.
- Prisma will manage the schema and generated query client.
- The Domain layer will remain completely oblivious to Prisma (`libs/domain` cannot import `@prisma/client`). Mappers in `libs/persistence` will translate.
- All monetary values are strictly saved as BIGINT minor units. No floats.
- Audit logs are append-only. No deletion API is exposed.
"""

write_file('libs/persistence/package.json', package_json)
write_file('libs/persistence/tsconfig.json', tsconfig_json)
write_file('libs/persistence/prisma/schema.prisma', schema_prisma)
write_file('libs/persistence/src/errors/index.ts', errors_index_ts)
write_file('libs/persistence/src/mappers/index.ts', mappers_index_ts)
write_file('libs/persistence/src/repositories/contracts/index.ts', repos_contracts_index_ts)
write_file('libs/persistence/src/repositories/prisma/index.ts', repos_prisma_index_ts)
write_file('libs/persistence/src/client/index.ts', client_index_ts)
write_file('libs/persistence/src/index.ts', index_ts)
write_file('libs/persistence/README.md', persistence_readme_md)
write_file('libs/persistence/test/integration.test.ts', test_integration)
write_file('docs/architecture/PERSISTENCE.md', docs_persistence)
write_file('docs/architecture/DATA_MODEL.md', docs_data_model)
write_file('docs/decisions/ADR-008-postgresql-prisma-persistence.md', docs_adr_008)

# Add .env.example values
env_example_path = '.env.example'
with open(env_example_path, 'a') as f:
    f.write('\\nDATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public"\\n')
    f.write('TEST_DATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/testdb?schema=public"\\n')

print("Persistence scaffold complete.")
