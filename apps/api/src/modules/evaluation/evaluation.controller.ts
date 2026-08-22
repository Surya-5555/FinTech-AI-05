import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';

@Controller('evaluation')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Get('runs')
  async getRuns() {
    return this.evaluationService.getRuns();
  }

  @Get('runs/:runId')
  async getRunById(@Param('runId') runId: string) {
    const run = await this.evaluationService.getRunById(runId);
    if (!run) {
      throw new NotFoundException(`Evaluation run ${runId} not found`);
    }
    return run;
  }
}
