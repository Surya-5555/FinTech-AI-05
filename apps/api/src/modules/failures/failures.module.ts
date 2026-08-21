import { Module } from '@nestjs/common';
import { FailuresController } from './failures.controller.js';
import { FailuresService } from './failures.service.js';

@Module({
  controllers: [FailuresController],
  providers: [FailuresService],
})
export class FailuresModule {}
