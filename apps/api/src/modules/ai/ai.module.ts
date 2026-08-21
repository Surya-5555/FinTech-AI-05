import { Module } from '@nestjs/common';
import { AiController, CaseAiController } from './ai.controller.js';
import { AiService } from './ai.service.js';

@Module({
  controllers: [AiController, CaseAiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
