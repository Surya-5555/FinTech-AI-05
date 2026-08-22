import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { AiService } from './ai.service';
import { DraftRequestDto } from './dto/draft-request.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('health')
  async getHealth() {
    return this.aiService.getHealth();
  }
}

@Controller('cases/:caseId')
export class CaseAiController {
  constructor(private readonly aiService: AiService) {}

  @Post('message-draft')
  async getMessageDraft(
    @Param('caseId') caseId: string,
    @Body() dto: DraftRequestDto,
  ) {
    return this.aiService.getMessageDraft(caseId, dto);
  }

  @Get('decision-explanation')
  async getDecisionExplanation(@Param('caseId') caseId: string) {
    return this.aiService.getDecisionExplanation(caseId);
  }
}
