import { Module } from '@nestjs/common';
import { AiController, CaseAiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  controllers: [AiController, CaseAiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
