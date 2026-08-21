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
}
