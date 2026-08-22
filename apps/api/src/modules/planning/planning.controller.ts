import { Controller, Post, Get, Param, Body, Headers, UseGuards } from '@nestjs/common';
import { OperatorAuthGuard } from '../../common/guards/operator-auth.guard';
import { PlanningService } from './planning.service';
import { CreatePlanDto } from './dto/create-plan.dto';

@Controller('cases/:caseId/plans')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Post()
  @UseGuards(OperatorAuthGuard)
  async createPlan(
    @Param('caseId') caseId: string,
    @Body() dto: CreatePlanDto,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.planningService.createPlan(caseId, dto.policyVersion, correlationId);
  }

  @Get()
  async listPlans(@Param('caseId') caseId: string) {
    const plans = await this.planningService.listPlans(caseId);
    return {
      plans: plans.map(p => ({
        planId: p.planId,
        interventionType: p.interventionType,
        plannedAt: p.plannedAt,
        reasonCodes: p.reasonCodes,
        planStatus: p.planStatus,
        requiresHumanApproval: p.requiresHumanApproval,
      }))
    };
  }
  @Post(':planId/enqueue')
  @UseGuards(OperatorAuthGuard)
  async enqueuePlan(
    @Param('caseId') caseId: string,
    @Param('planId') planId: string,
    @Headers('x-correlation-id') correlationId?: string
  ) {
    return this.planningService.enqueuePlan(caseId, planId, correlationId);
  }
}
