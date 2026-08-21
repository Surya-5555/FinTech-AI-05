import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { RecoveryPlanExecutionProcessor } from './processors/recovery-plan-execution.processor.js';
import { PrismaExecutionRepository, PrismaPlanningRepository } from '@rr/persistence';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
      prefix: process.env.QUEUE_PREFIX || 'rr',
    }),
    // If you need to explicitly register the queue here, you can do it like this:
    // BullModule.registerQueue({
    //   name: 'recovery-plan-execution',
    // }),
  ],
  providers: [
    RecoveryPlanExecutionProcessor,
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
