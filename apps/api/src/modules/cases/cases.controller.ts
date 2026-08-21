import { Controller, Get, Query, Param, NotFoundException } from '@nestjs/common';
import { CasesService } from './cases.service.js';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  async getCases(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('merchantId') merchantId?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const offsetNum = offset ? parseInt(offset, 10) : undefined;
    const query: { limit?: number; offset?: number; merchantId?: string } = {};
    if (limitNum !== undefined) query.limit = limitNum;
    if (offsetNum !== undefined) query.offset = offsetNum;
    if (merchantId !== undefined) query.merchantId = merchantId;
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
