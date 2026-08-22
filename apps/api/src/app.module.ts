import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import { SystemModule } from './system/system.module';
import { PersistenceModule } from './persistence/persistence.module';
import { MetricsModule } from './system/metrics.module';
import configuration from './config/configuration';
import { randomUUID } from 'crypto';

import { EventsModule } from './modules/events/events.module';
import { CasesModule } from './modules/cases/cases.module';
import { PlanningModule } from './modules/planning/planning.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { OutboxPublisherModule } from './modules/outbox-publisher/outbox-publisher.module';
import { InterventionsModule } from './modules/interventions/interventions.module';
import { AiModule } from './modules/ai/ai.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FailuresModule } from './modules/failures/failures.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    LoggerModule.forRoot({
      pinoHttp: ({
        level: process.env.LOG_LEVEL || 'info',
        genReqId: (req: any) => {
          return req.headers['x-correlation-id'] || randomUUID();
        },
        redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.token', 'req.body.apiKey'],
        customProps: (req: any, res: any) => ({
          context: 'HTTP',
          correlationId: req.headers['x-correlation-id'],
        }),
        transport: process.env.APP_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
      } as any),
    }),
    HealthModule,
    SystemModule,
    PersistenceModule,
    MetricsModule,
    EventsModule,
    CasesModule,
    PlanningModule,
    PoliciesModule,
    OutboxPublisherModule,
    InterventionsModule,
    AiModule,
    EvaluationModule,
    DashboardModule,
    FailuresModule,
  ],
})
export class AppModule {}
