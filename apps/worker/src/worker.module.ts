import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { RecoveryPlanExecutionProcessor } from './processors/recovery-plan-execution.processor';
import { ReconciliationProcessor } from './processors/reconciliation.processor';
import { PrismaExecutionRepository, PrismaPlanningRepository } from '@rr/persistence';

import { ProviderFactory } from './providers/provider.factory';
import { RazorpayAdapter } from './providers/razorpay/razorpay.adapter';
import { RazorpayTestModeRecoveryAdapter } from './providers/razorpay/razorpay-test-mode-recovery.adapter';
import { RazorpayRetryAdapter } from './providers/razorpay/razorpay-retry.adapter';
import { TwilioAdapter } from './providers/twilio/twilio.adapter';
import { ResendAdapter } from './providers/email/resend.adapter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
      prefix: process.env.QUEUE_PREFIX || 'rr',
    }),
    BullModule.registerQueue({
      name: 'recovery-plan-execution',
    }),
    BullModule.registerQueue({
      name: 'reconciliation',
    }),
  ],
  providers: [
    RecoveryPlanExecutionProcessor,
    ReconciliationProcessor,
    ProviderFactory,
    RazorpayAdapter,
    RazorpayTestModeRecoveryAdapter,
    RazorpayRetryAdapter,
    TwilioAdapter,
    ResendAdapter,
    {
      provide: 'ExecutionRepository',
      useClass: PrismaExecutionRepository,
    },
    {
      provide: 'PlanningRepository',
      useClass: PrismaPlanningRepository,
    },
  ],
})
export class WorkerModule {}
