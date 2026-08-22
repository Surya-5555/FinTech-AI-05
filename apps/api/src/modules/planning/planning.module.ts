import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';

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
