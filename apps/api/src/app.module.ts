import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import { SystemModule } from './system/system.module';
import { PersistenceModule } from './persistence/persistence.module';
import { MetricsModule } from './system/metrics.module';
import configuration from './config/configuration';
import { randomUUID } from 'crypto';

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
  ],
})
export class AppModule {}
