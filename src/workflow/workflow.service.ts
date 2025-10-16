// src/workflow/workflow.service.ts
import { Injectable } from '@nestjs/common';
import { WorkflowContext } from './workflow.interface';
import {
  AnalyzeStep,
  ApplyChangesStep,
  FeatureRequestStep,
  PlanningStep,
  SubmitStep,
} from './steps';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly analyzeStep: AnalyzeStep,
    private readonly featureRequestStep: FeatureRequestStep,
    private readonly planningStep: PlanningStep,
    private readonly applyChangesStep: ApplyChangesStep,
    private readonly submitStep: SubmitStep,
  ) {}

  async start(path: string): Promise<void> {
    this.analyzeStep
      .setNext(this.featureRequestStep)
      .setNext(this.planningStep)
      .setNext(this.applyChangesStep)
      .setNext(this.submitStep);

    const context: WorkflowContext = { currentStep: 'analyse', path, data: {} };

    await this.analyzeStep.handle(context);
  }
}
