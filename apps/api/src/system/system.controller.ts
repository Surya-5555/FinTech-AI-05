import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('system')
export class SystemController {
  constructor(private config: ConfigService) {}

  @Get('version')
  getVersion() {
    return {
      service: '@rr/api',
      version: '1.0.0',
      environment: this.config.get('APP_ENV') || 'development',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('resilience/status')
  getResilienceStatus() {
    return {
      status: 'OK',
      circuitBreakers: {
        razorpayApi: 'CLOSED',
        llmProvider: 'CLOSED',
        redis: 'CLOSED'
      },
      queueDepths: {
        outbox: 0,
        interventions: 0
      },
      timestamp: new Date().toISOString()
    };
  }
}
