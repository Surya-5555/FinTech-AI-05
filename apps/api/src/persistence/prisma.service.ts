import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { getPrismaClient } from '@rr/persistence';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  public client = getPrismaClient();

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
