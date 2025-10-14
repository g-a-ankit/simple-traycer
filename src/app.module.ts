import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LLMModule } from './llm/llm.module';
import { ConfigAppModule } from './config-app/config-app.module';
import { ContextModule } from './context/context.module';
import { PlanningModule } from './planning/planning.module';
import { ExecutionModule } from './execution/execution.module';
import { ReviewModule } from './review/review.module';
import { SubmissionModule } from './submission/submission.module';
import { UserModule } from './user/user.module';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [LLMModule, ConfigAppModule, ContextModule, PlanningModule, ExecutionModule, ReviewModule, SubmissionModule, UserModule, WorkflowModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
