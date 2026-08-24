import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { RazorpayController } from './razorpay.controller';

@Module({
  controllers: [EventsController, RazorpayController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
