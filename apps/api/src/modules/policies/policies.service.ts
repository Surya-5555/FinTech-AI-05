import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { getPrismaClient } from '@rr/persistence';

@Injectable()
export class PoliciesService {
  async getMerchantPolicy(merchantId: string) {
    const prisma = getPrismaClient();
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant ${merchantId} not found`);
    }

    return JSON.parse(merchant.configJson);
  }

  async updateMerchantPolicy(merchantId: string, policyData: any) {
    // In a real env, we'd check if we are in production. We can fake it or just throw 403 for now.
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('FEATURE_NOT_AVAILABLE');
    }

    const prisma = getPrismaClient();
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant ${merchantId} not found`);
    }

    const updated = await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        configJson: JSON.stringify(policyData),
      },
    });

    return JSON.parse(updated.configJson);
  }
}
