import { Controller, Get, Put, Param, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { PoliciesService } from './policies.service';

@Controller('policies/merchants/:merchantId')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  async getMerchantPolicy(@Param('merchantId') merchantId: string) {
    return this.policiesService.getMerchantPolicy(merchantId);
  }

  @Put()
  async updateMerchantPolicy(
    @Param('merchantId') merchantId: string,
    @Body() policyData: any,
    @Headers('authorization') authHeader?: string
  ) {
    if (!authHeader || authHeader !== 'Bearer API_AUTH_TOKEN') {
      throw new UnauthorizedException('Missing or invalid authorization token');
    }
    return this.policiesService.updateMerchantPolicy(merchantId, policyData);
  }
}
