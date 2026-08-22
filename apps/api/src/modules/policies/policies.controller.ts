import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { OperatorAuthGuard } from '../../common/guards/operator-auth.guard';
import { PoliciesService } from './policies.service';

@Controller('policies/merchants/:merchantId')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  async getMerchantPolicy(@Param('merchantId') merchantId: string) {
    return this.policiesService.getMerchantPolicy(merchantId);
  }

  @Put()
  @UseGuards(OperatorAuthGuard)
  async updateMerchantPolicy(
    @Param('merchantId') merchantId: string,
    @Body() policyData: any
  ) {
    return this.policiesService.updateMerchantPolicy(merchantId, policyData);
  }
}
