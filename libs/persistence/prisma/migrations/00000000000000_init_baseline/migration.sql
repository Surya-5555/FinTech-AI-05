-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "externalReference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "configJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "externalReference" TEXT NOT NULL,
    "displayNameOrMaskedReference" TEXT NOT NULL,
    "consentEmail" TEXT NOT NULL,
    "consentSms" TEXT NOT NULL,
    "consentVoice" TEXT NOT NULL,
    "contactWindowMetadataJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueEvent" (
    "id" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "customerId" TEXT,
    "eventType" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "failureReason" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlationId" TEXT NOT NULL,
    "rawPayloadVersion" TEXT NOT NULL,
    "metadataJson" TEXT NOT NULL,
    "ingestionIdempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueCase" (
    "id" TEXT NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "customerId" TEXT,
    "amountAtRiskMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL,
    "recoveryScore" INTEGER,
    "rootCause" TEXT,
    "version" INTEGER NOT NULL,
    "correlationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "terminalAt" TIMESTAMP(3),

    CONSTRAINT "RevenueCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryPlan" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "interventionType" TEXT NOT NULL,
    "plannedAt" TIMESTAMP(3) NOT NULL,
    "reasonCodesJson" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "requiresHumanApproval" BOOLEAN NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "parametersJson" TEXT NOT NULL,
    "planStatus" TEXT NOT NULL,
    "diagnosisJson" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "supersededBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "interventionType" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "executionStartedAt" TIMESTAMP(3),
    "executionCompletedAt" TIMESTAMP(3),
    "externalReference" TEXT,
    "failureCode" TEXT,
    "retryAfter" TIMESTAMP(3),
    "correlationId" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterventionOutcome" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recoveredAmountMinor" BIGINT,
    "currency" TEXT,
    "resultMetadataJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterventionOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escalation" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "reasonCodesJson" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionMetadataJson" TEXT,

    CONSTRAINT "Escalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "actorType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "previousState" TEXT,
    "nextState" TEXT,
    "metadataJson" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationRun" (
    "id" TEXT NOT NULL,
    "datasetVersion" TEXT NOT NULL,
    "systemVersion" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "totalCases" INTEGER NOT NULL,
    "totalAtRiskMinor" BIGINT NOT NULL,
    "baselineRecoveredMinor" BIGINT NOT NULL,
    "systemRecoveredMinor" BIGINT NOT NULL,
    "incrementalRecoveredMinor" BIGINT NOT NULL,
    "recoveryRate" DOUBLE PRECISION NOT NULL,
    "interventionPrecision" DOUBLE PRECISION,
    "falseInterventionCount" INTEGER NOT NULL,
    "escalationCount" INTEGER NOT NULL,
    "stoppedCaseCount" INTEGER NOT NULL,
    "averageAttemptsPerCase" DOUBLE PRECISION NOT NULL,
    "medianRecoveryLatencyMs" INTEGER,
    "totalInferenceCostMinor" BIGINT,
    "metricsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationCaseResult" (
    "id" TEXT NOT NULL,
    "evaluationRunId" TEXT NOT NULL,
    "caseId" TEXT,
    "sourceEventReference" TEXT NOT NULL,
    "baselineOutcomeJson" TEXT NOT NULL,
    "systemOutcomeJson" TEXT NOT NULL,
    "wasRecovered" BOOLEAN NOT NULL,
    "recoveredAmountMinor" BIGINT NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationCaseResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInvocation" (
    "id" TEXT NOT NULL,
    "useCase" TEXT NOT NULL,
    "providerName" TEXT,
    "modelName" TEXT,
    "promptVersion" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "outputHash" TEXT,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "estimatedCostMinor" INTEGER,
    "correlationId" TEXT NOT NULL,
    "caseId" TEXT,
    "interventionId" TEXT,
    "safeMetadataJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIInvocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_externalReference_key" ON "Merchant"("externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_merchantId_externalReference_key" ON "Customer"("merchantId", "externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueEvent_ingestionIdempotencyKey_key" ON "RevenueEvent"("ingestionIdempotencyKey");

-- CreateIndex
CREATE INDEX "RevenueEvent_merchantId_occurredAt_idx" ON "RevenueEvent"("merchantId", "occurredAt");

-- CreateIndex
CREATE INDEX "RevenueEvent_eventType_occurredAt_idx" ON "RevenueEvent"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "RevenueEvent_correlationId_idx" ON "RevenueEvent"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueEvent_merchantId_externalEventId_eventType_key" ON "RevenueEvent"("merchantId", "externalEventId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueCase_sourceEventId_key" ON "RevenueCase"("sourceEventId");

-- CreateIndex
CREATE INDEX "RevenueCase_state_updatedAt_idx" ON "RevenueCase"("state", "updatedAt");

-- CreateIndex
CREATE INDEX "RevenueCase_merchantId_state_idx" ON "RevenueCase"("merchantId", "state");

-- CreateIndex
CREATE INDEX "RevenueCase_correlationId_idx" ON "RevenueCase"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryPlan_idempotencyKey_key" ON "RecoveryPlan"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RecoveryPlan_caseId_planStatus_idx" ON "RecoveryPlan"("caseId", "planStatus");

-- CreateIndex
CREATE INDEX "RecoveryPlan_plannedAt_idx" ON "RecoveryPlan"("plannedAt");

-- CreateIndex
CREATE INDEX "RecoveryPlan_correlationId_idx" ON "RecoveryPlan"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxEvent_idempotencyKey_key" ON "OutboxEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON "OutboxEvent"("aggregateType", "aggregateId");

-- CreateIndex
CREATE UNIQUE INDEX "Intervention_idempotencyKey_key" ON "Intervention"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Intervention_status_retryAfter_idx" ON "Intervention"("status", "retryAfter");

-- CreateIndex
CREATE INDEX "Intervention_caseId_createdAt_idx" ON "Intervention"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "Intervention_correlationId_idx" ON "Intervention"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "Intervention_caseId_interventionType_attemptNumber_key" ON "Intervention"("caseId", "interventionType", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InterventionOutcome_interventionId_key" ON "InterventionOutcome"("interventionId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_timestamp_idx" ON "AuditLog"("entityType", "entityId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_correlationId_timestamp_idx" ON "AuditLog"("correlationId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_action_timestamp_idx" ON "AuditLog"("action", "timestamp");

-- CreateIndex
CREATE INDEX "AIInvocation_useCase_status_createdAt_idx" ON "AIInvocation"("useCase", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AIInvocation_correlationId_idx" ON "AIInvocation"("correlationId");

-- CreateIndex
CREATE INDEX "AIInvocation_caseId_idx" ON "AIInvocation"("caseId");

-- AddForeignKey
ALTER TABLE "InterventionOutcome" ADD CONSTRAINT "InterventionOutcome_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

