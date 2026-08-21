import { Controller, Get, Param, Query } from '@nestjs/common';
import { InterventionsService } from './interventions.service.js';

@Controller('interventions')
export class InterventionsController {
  constructor(private readonly interventionsService: InterventionsService) {}

  @Get()
  async getInterventions(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('caseId') caseId?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const offsetNum = offset ? parseInt(offset, 10) : undefined;
    const query: { limit?: number; offset?: number; caseId?: string } = {};
    
    if (limitNum !== undefined) query.limit = limitNum;
    if (offsetNum !== undefined) query.offset = offsetNum;
    if (caseId !== undefined) query.caseId = caseId;
    
    return this.interventionsService.getInterventions(query);
  }

  @Get(':id')
  async getInterventionById(@Param('id') id: string) {
    return this.interventionsService.getInterventionById(id);
  }
}
