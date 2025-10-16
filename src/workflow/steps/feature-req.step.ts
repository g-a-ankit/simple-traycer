import { Injectable } from '@nestjs/common';
import inquirer from 'inquirer';
import { WorkflowContext } from '../workflow.interface';
import { WorkflowBase } from '../workflow.base';

@Injectable()
export class FeatureRequestStep extends WorkflowBase {
  constructor() {
    super();
  }
  async canHandle(context: WorkflowContext): Promise<boolean> {
    return context.currentStep === 'feature-req';
  }

  async execute(context: WorkflowContext): Promise<void> {
    console.log(
      'Please provide your feature request and any additional instructions.',
    );
    const answers = await inquirer.prompt([
      {
        type: 'editor',
        name: 'featureRequest',
        message: 'Enter your feature request:',
        validate: (input: string) =>
          input.trim() !== '' || 'Feature request cannot be empty.',
      },
      {
        type: 'editor',
        name: 'additionalInstructions',
        message: 'Enter additional instructions (optional):',
      },
    ]);
    context.featureRequest = answers.featureRequest;
    if (answers.additionalInstructions.trim()) {
      context.additionalInstructions = answers.additionalInstructions;
    }
    console.log(`\nFeature Request: ${context.featureRequest}`);
    if (context.additionalInstructions) {
      console.log(`Additional Instructions: ${context.additionalInstructions}`);
    }
    const { nextStep } = await inquirer.prompt({
      type: 'list',
      name: 'nextStep',
      message: 'Proceed to next step?',
      choices: ['planning', 'back', 'exit'],
    });
    if (nextStep === 'planning') {
      context.currentStep = 'planning';
    } else if (nextStep === 'back') {
      context.currentStep = 'analyse';
    } else if (nextStep === 'exit') {
      console.log('Exiting workflow.');
      process.exit(0);
    }
  }
}
