import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import { SystemModule } from './system/system.module';
import { PersistenceModule } from './persistence/persistence.module';
import { MetricsModule } from './system/metrics.module';
import configuration from './config/configuration';
import { randomUUID } from 'crypto';

import { EventsModule } from './modules/events/events.module.js';
import { CasesModule } from './modules/cases/cases.module.js';
import { PlanningModule } from './modules/planning/planning.module.js';
import { PoliciesModule } from './modules/policies/policies.module.js';
import { OutboxPublisherModule } from './modules/outbox-publisher/outbox-publisher.module.js';
import { InterventionsModule } from './modules/interventions/interventions.module.js';
import { AiModule } from './modules/ai/ai.module.js';

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
        redact: ['req.headers.authorization', 'req.headers.cookie'],
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
    InterventionsModule,
    AiModule,
  ],
})
export class AppModule {}
