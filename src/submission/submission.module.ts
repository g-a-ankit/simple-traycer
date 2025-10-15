import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { ReviewModule } from '../review/review.module';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';

@Module({
  imports: [AgentModule, ReviewModule],
  controllers: [SubmissionController],
  providers: [SubmissionService],
  exports: [SubmissionService],
})
export class SubmissionModule {}