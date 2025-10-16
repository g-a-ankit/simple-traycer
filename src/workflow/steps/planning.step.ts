import { Injectable } from '@nestjs/common';
import inquirer from 'inquirer';
import { WorkflowContext } from '../workflow.interface';
import { WorkflowBase } from '../workflow.base';
import { PlanningService } from '../../planning/planning.service';
import { CreatePlanDto } from '../../planning/dto';

@Injectable()
export class PlanningStep extends WorkflowBase {
  constructor(private readonly planningService: PlanningService) {
    super();
  }

  async canHandle(context: WorkflowContext): Promise<boolean> {
    return context.currentStep === 'planning';
  }

  async execute(context: WorkflowContext): Promise<void> {
    if (!context.featureRequest) {
      console.log('No feature request found. Going back to feature-req step.');
      context.currentStep = 'feature-req';
      return;
    }
    console.log('Creating implementation plan...');
    const dto: CreatePlanDto = {
      featureRequest: context.featureRequest,
      useStoredContext: true,
      additionalInstructions: context.additionalInstructions,
      persistToFile: true,
    };
    context.plan = await this.planningService.createPlan(dto);
    console.log('Plan created successfully!');
    console.log(`Plan ID: ${context.plan.id}`);
    console.log(`Total Steps: ${context.plan.totalSteps}`);
    console.log(`Estimated Effort: ${context.plan.estimatedEffort}`);
    console.log('Steps:');
    context.plan.steps.forEach((step) => {
      console.log(` ${step.stepNumber}. ${step.title}`);
      console.log(`${step.description} \n`);
    });
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Proceed to next step?',
        choices: ['apply-changes', 'back', 'exit'],
      },
    ]);
    if (answers.action === 'apply-changes') {
      context.currentStep = 'apply-changes';
    } else if (answers.action === 'back') {
      context.currentStep = 'feature-req';
    } else if (answers.action === 'exit') {
      console.log('Exiting workflow.');
      process.exit(0);
    }
  }
}
