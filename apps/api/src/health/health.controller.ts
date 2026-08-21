import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  checkLive() {
    return { status: 'OK' };
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async checkReady() {
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      return { status: 'READY' };
    } catch (e) {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}
