import { Module } from '@nestjs/common';
import { OutboxPublisherService } from './outbox-publisher.service';
import { PrismaOutboxRepository } from '@rr/persistence';

@Module({
  providers: [
    OutboxPublisherService,
    {
      provide: 'OutboxRepository',
      useClass: PrismaOutboxRepository,
    },
  ],
})
export class OutboxPublisherModule {}
