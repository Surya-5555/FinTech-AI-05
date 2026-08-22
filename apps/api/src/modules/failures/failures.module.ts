import { Module } from '@nestjs/common';
import { FailuresController } from './failures.controller';
import { FailuresService } from './failures.service';

@Module({
  controllers: [FailuresController],
  providers: [FailuresService],
})
export class FailuresModule {}
