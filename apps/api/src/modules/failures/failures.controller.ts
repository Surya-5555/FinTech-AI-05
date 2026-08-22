import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { FailuresService } from './failures.service';

@Controller('failures')
export class FailuresController {
  constructor(private readonly failuresService: FailuresService) {}

  @Get('runs')
  async getRuns() {
    return this.failuresService.getRuns();
  }

  @Get('runs/:runId')
  async getRunById(@Param('runId') runId: string) {
    const run = await this.failuresService.getRunById(runId);
    if (!run) {
      throw new NotFoundException(`Failure run ${runId} not found`);
    }
    return run;
  }
}
