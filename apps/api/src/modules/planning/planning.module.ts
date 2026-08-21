import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller.js';
import { PlanningService } from './planning.service.js';

@Module({
  controllers: [PlanningController],
  providers: [
    PlanningService,
    {
      provide: 'PlanningRepository',
      useClass: require('@rr/persistence').PrismaPlanningRepository,
    },
  ],
})
export class PlanningModule {}
