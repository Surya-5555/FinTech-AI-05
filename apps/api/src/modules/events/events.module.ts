import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { RazorpayController } from './razorpay.controller';
import { RazorpayEventsProcessor } from './razorpay-events.processor';
import { IngestionProcessor } from './ingestion.processor';
import { PlanningModule } from '../planning/planning.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'razorpay-events',
    }),
    BullModule.registerQueue({
      name: 'ingestion',
    }),
    PlanningModule,
  ],
  controllers: [EventsController, RazorpayController],
  providers: [EventsService, RazorpayEventsProcessor, IngestionProcessor],
  exports: [EventsService],
})
export class EventsModule {}
