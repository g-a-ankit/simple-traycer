import { Injectable } from '@nestjs/common';
import inquirer from 'inquirer';
import { WorkflowContext } from '../workflow.interface';
import { WorkflowBase } from '../workflow.base';
import { AgentService } from '../../agent/agent.service';
import { ApplyChangesService } from '../../apply-changes/apply-changes.service';
import { ExecutePlanDto } from '../../agent/dto';
import { ApplyChangesDto } from '../../apply-changes/dto';

@Injectable()
export class ApplyChangesStep extends WorkflowBase {
  constructor(
    private readonly agentService: AgentService,
    private readonly applyChangesService: ApplyChangesService,
  ) {
    super();
  }

  async canHandle(context: WorkflowContext): Promise<boolean> {
    return context.currentStep === 'apply-changes';
  }

  async execute(context: WorkflowContext): Promise<void> {
    if (!context.plan || !context.plan.id) {
      throw new Error('Plan not found. Please go back to planning step.');
    }

    console.log('Executing plan and applying changes...');

    const executeDto: ExecutePlanDto = {
      planId: context.plan.id,
      parallelExecution: false,
      persistToFile: true,
      dryRun: false,
    };

    const execution = await this.agentService.executePlan(executeDto);
    context.execution = execution;

    console.log(
      `Execution summary: Total tasks: ${execution.totalTasks}, Completed: ${execution.completedTasks}, Failed: ${execution.failedTasks}, Status: ${execution.status}`,
    );

    if (execution.failedTasks > 0) {
      const { cont } = await inquirer.prompt({
        type: 'confirm',
        name: 'cont',
        message: 'Execution has failures. Continue with applying changes?',
      });
      if (!cont) {
        console.log('Exiting workflow.');
        process.exit(0);
      }
    }

    const applyDto: ApplyChangesDto = {
      executionId: execution.executionId,
      dryRun: false,
      createBackup: true,
      overwriteExisting: true,
      createDirectories: true,
      useDiffMode: true,
    };

    const application = await this.applyChangesService.applyExecution(applyDto);
    context.application = application;

    console.log(
      `Application summary: Total files: ${application.totalFiles}, Successful: ${application.successfulFiles}, Failed: ${application.failedFiles}, Status: ${application.status}, Can rollback: ${application.canRollback}`,
    );

    const { choice } = await inquirer.prompt({
      type: 'list',
      name: 'choice',
      message: 'Proceed to next step?',
      choices: ['submit', 'exit'],
    });

    if (choice === 'submit') {
      context.currentStep = 'submit';
    } else {
      console.log('Exiting workflow.');
      process.exit(0);
    }
  }
}
