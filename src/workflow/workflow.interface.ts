import { CodebaseContextDto } from '../codebase/dto';
import { PlanDto } from '../planning/dto';
import { PlanExecutionResultDto } from '../agent/dto';
import { ApplicationResultDto } from '../apply-changes/dto';
import { SubmissionResultDto } from '../submission/dto';

export interface WorkflowContext {
  currentStep: string;
  path?: string;
  codebaseContext?: CodebaseContextDto;
  featureRequest?: string;
  additionalInstructions?: string;
  plan?: PlanDto;
  execution?: PlanExecutionResultDto;
  application?: ApplicationResultDto;
  submission?: SubmissionResultDto;
  data: Record<string, any>;
}

export interface WorkflowStep {
  setNext(step: WorkflowStep): WorkflowStep;
  handle(context: WorkflowContext): Promise<void>;
  canHandle(context: WorkflowContext): Promise<boolean>;
  execute(context: WorkflowContext): Promise<void>;
}
