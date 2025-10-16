import { Module } from '@nestjs/common';
import { CodebaseModule } from '../codebase/codebase.module';
import { PlanningModule } from '../planning/planning.module';
import { AgentModule } from '../agent/agent.module';
import { ApplyChangesModule } from '../apply-changes/apply-changes.module';
import { SubmissionModule } from '../submission/submission.module';
import {
  AnalyzeStep,
  FeatureRequestStep,
  PlanningStep,
  ApplyChangesStep,
  SubmitStep,
} from './steps';
import { WorkflowService } from './workflow.service';

@Module({
  imports: [
    CodebaseModule,
    PlanningModule,
    AgentModule,
    ApplyChangesModule,
    SubmissionModule,
  ],
  providers: [
    WorkflowService,
    AnalyzeStep,
    FeatureRequestStep,
    PlanningStep,
    ApplyChangesStep,
    SubmitStep,
  ],
  exports: [WorkflowService],
})
export class WorkflowModule {}
