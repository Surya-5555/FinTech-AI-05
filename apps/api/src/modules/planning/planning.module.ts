import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { PrismaPlanningRepository } from '@rr/persistence';

@Module({
  controllers: [PlanningController],
  providers: [
    PlanningService,
    {
      provide: 'PlanningRepository',
      useClass: PrismaPlanningRepository,
    },
  ],
  exports: [PlanningService, 'PlanningRepository'],
})
export class PlanningModule {}
