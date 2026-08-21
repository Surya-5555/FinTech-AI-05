import { Injectable } from '@nestjs/common';
import { getPrismaClient } from '@rr/persistence';

@Injectable()
export class CasesService {
  async getCases(query: { limit?: number; offset?: number; merchantId?: string }) {
    const prisma = getPrismaClient();
    const take = query.limit || 10;
    const skip = query.offset || 0;

    const where = query.merchantId ? { merchantId: query.merchantId } : {};

    const [items, total] = await Promise.all([
      prisma.revenueCase.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.revenueCase.count({ where }),
    ]);

    return {
      items,
      total,
      limit: take,
      offset: skip,
    };
  }
}
