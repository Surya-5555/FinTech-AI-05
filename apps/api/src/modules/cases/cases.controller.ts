import { Controller, Get, Query, Param, NotFoundException } from '@nestjs/common';
import { CasesService } from './cases.service';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  async getCases(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('merchantId') merchantId?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const query: { limit?: number; cursor?: string; merchantId?: string } = {};
    if (limitNum !== undefined) query.limit = limitNum;
    if (cursor) query.cursor = cursor;
    if (merchantId) query.merchantId = merchantId;
    return this.casesService.getCases(query);
  }

  @Get(':id')
  async getCaseById(@Param('id') id: string) {
    const caseItem = await this.casesService.getCaseById(id);
    if (!caseItem) {
      throw new NotFoundException(`Case ${id} not found`);
    }
    return caseItem;
  }
}
