import { Module } from '@nestjs/common';
import { EvaluationController } from './evaluation.controller.js';
import { EvaluationService } from './evaluation.service.js';
import { PersistenceModule } from '../../persistence/persistence.module.js';

@Module({
  imports: [PersistenceModule],
  controllers: [EvaluationController],
  providers: [EvaluationService],
})
export class EvaluationModule {}
