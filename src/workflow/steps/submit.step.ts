import { Injectable } from '@nestjs/common';
import inquirer from 'inquirer';
import { WorkflowContext } from '../workflow.interface';
import { WorkflowBase } from '../workflow.base';
import { SubmissionService } from '../../submission/submission.service';
import { ExportDto, CommitDto } from '../../submission/dto';

@Injectable()
export class SubmitStep extends WorkflowBase {
  constructor(private readonly submissionService: SubmissionService) {
    super();
  }

  async canHandle(context: WorkflowContext): Promise<boolean> {
    return context.currentStep === 'submit';
  }

  async execute(context: WorkflowContext): Promise<void> {
    if (!context.execution || !context.execution.executionId) {
      throw new Error('Execution not found or invalid');
    }

    console.log('Choose submission method:');
    const { submissionMethod } = await inquirer.prompt([
      {
        type: 'list',
        name: 'submissionMethod',
        message: 'How would you like to submit the changes?',
        choices: ['export', 'commit', 'skip'],
      },
    ]);

    if (submissionMethod === 'export') {
      const { outputDirectory } = await inquirer.prompt({
        type: 'input',
        name: 'outputDirectory',
        message: 'Output directory:',
        default: './output',
      });
      const { overwriteExisting } = await inquirer.prompt({
        type: 'confirm',
        name: 'overwriteExisting',
        message: 'Overwrite existing files?',
        default: true,
      });
      const { preserveStructure } = await inquirer.prompt({
        type: 'confirm',
        name: 'preserveStructure',
        message: 'Preserve directory structure?',
        default: true,
      });
      const dto: ExportDto = {
        executionId: context.execution.executionId,
        outputDirectory,
        overwriteExisting,
        preserveStructure,
      };
      const result = await this.submissionService.exportFiles(dto);
      context.submission = result;
      console.log(
        `Export Summary: Submission ID: ${result.submissionId}, Total Files: ${result.totalFiles}, Successful: ${result.successfulFiles}, Failed: ${result.failedFiles}, Output Directory: ${result.outputDirectory}`,
      );
    } else if (submissionMethod === 'commit') {
      const { repositoryPath } = await inquirer.prompt({
        type: 'input',
        name: 'repositoryPath',
        message: 'Repository path:',
        default: context.codebaseContext?.rootPath || process.cwd(),
      });
      const { commitMessage } = await inquirer.prompt({
        type: 'input',
        name: 'commitMessage',
        message: 'Commit message:',
        validate: (input: string) => input.trim() !== '',
      });
      const { branchName } = await inquirer.prompt({
        type: 'input',
        name: 'branchName',
        message: 'Branch name (optional):',
      });
      const { createBranch } = await inquirer.prompt({
        type: 'confirm',
        name: 'createBranch',
        message: 'Create new branch?',
        default: false,
      });
      const { push } = await inquirer.prompt({
        type: 'confirm',
        name: 'push',
        message: 'Push to remote?',
        default: false,
      });
      const dto: CommitDto = {
        executionId: context.execution.executionId,
        repositoryPath,
        commitMessage,
        branchName: branchName || undefined,
        createBranch,
        push,
        baseBranch: '',
        remote: '',
        addAll: false,
      };
      const result = await this.submissionService.commitToGit(dto);
      context.submission = result;
      console.log(
        `Commit Summary: Submission ID: ${result.submissionId}, Commit Hash: ${result.commitHash}, Branch: ${result.branchName}, Files Committed: ${result.totalFiles}, Pushed: ${result.pushed}`,
      );
    } else if (submissionMethod === 'skip') {
      console.log('Skipping submission. Changes have been applied locally.');
    }

    console.log('Workflow completed successfully!');
    console.log('Workflow Summary:');
    console.log(`Analysis: ${context.codebaseContext ? 'Completed' : 'N/A'}`);
    console.log(`Feature Request: ${context.featureRequest || 'N/A'}`);
    console.log(`Plan ID: ${context.plan?.id || 'N/A'}`);
    console.log(`Execution ID: ${context.execution?.executionId || 'N/A'}`);
    console.log(
      `Application ID: ${context.application?.applicationId || 'N/A'}`,
    );
    console.log(`Submission ID: ${context.submission?.submissionId || 'N/A'}`);
  }
}
