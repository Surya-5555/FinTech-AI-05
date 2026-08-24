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
    // Immutable policy enforcement for production environments.
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Manual policy overrides are disabled in production.');
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
