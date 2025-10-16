import { WorkflowContext, WorkflowStep } from './workflow.interface';

/**
 * Abstract base class for workflow steps implementing the Chain of Responsibility pattern.
 * Subclasses can inject services through their constructors, and those injected services
 * will be available when the steps are instantiated by NestJS's dependency injection container.
 */
export abstract class WorkflowBase implements WorkflowStep {
  private nextStep?: WorkflowStep;

  setNext(step: WorkflowStep): WorkflowStep {
    this.nextStep = step;
    return step;
  }

  async handle(context: WorkflowContext): Promise<void> {
    if (await this.canHandle(context)) {
      await this.execute(context);
    }
    if (this.nextStep) {
      await this.nextStep.handle(context);
    }
  }

  abstract canHandle(context: WorkflowContext): Promise<boolean>;
  abstract execute(context: WorkflowContext): Promise<void>;
}
