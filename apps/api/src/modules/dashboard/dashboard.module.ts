import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { PersistenceModule } from '../../persistence/persistence.module.js';

@Module({
  imports: [PersistenceModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
