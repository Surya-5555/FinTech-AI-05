import { Module } from '@nestjs/common';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { CaseOrchestratorService } from './case-orchestrator.service';
import { PlanningModule } from '../planning/planning.module';

@Module({
  imports: [PlanningModule],
  controllers: [CasesController],
  providers: [CasesService, CaseOrchestratorService],
  exports: [CasesService],
})
export class CasesModule {}
