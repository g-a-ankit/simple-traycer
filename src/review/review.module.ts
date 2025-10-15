import { Module } from '@nestjs/common';
import { PlanningModule } from '../planning/planning.module';
import { AgentModule } from '../agent/agent.module';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';

@Module({
  imports: [PlanningModule, AgentModule],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}