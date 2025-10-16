import inquirer from 'inquirer';
import { Injectable } from '@nestjs/common';
import { WorkflowContext } from '../workflow.interface';
import { WorkflowBase } from '../workflow.base';
import { CodebaseService } from '../../codebase/codebase.service';
import { AnalyzeCodebaseDto } from '../../codebase/dto';

@Injectable()
export class AnalyzeStep extends WorkflowBase {
  constructor(private readonly codebaseService: CodebaseService) {
    super();
  }

  async canHandle(context: WorkflowContext): Promise<boolean> {
    return context.currentStep === 'analyse';
  }

  async execute(context: WorkflowContext): Promise<void> {
    if (!context.path) {
      const { path } = await inquirer.prompt([
        {
          type: 'input',
          name: 'path',
          message: 'Enter the codebase path:',
          validate: (input: string) =>
            input.trim() !== '' || 'Path cannot be empty',
        },
      ]);
      context.path = path;
    }

    const dto = new AnalyzeCodebaseDto();
    dto.path = context.path as any;
    dto.excludePatterns = ['node_modules/**', '.git/**', 'dist/**'];

    context.codebaseContext = await this.codebaseService.analyzeCodebase(dto);

    console.log(
      `Analysis complete: ${context.codebaseContext.totalFiles} files, ${context.codebaseContext.totalDirectories} directories, file types: ${JSON.stringify(context.codebaseContext.fileTypes)}`,
    );

    const { next } = await inquirer.prompt([
      {
        type: 'list',
        name: 'next',
        message: 'Proceed to next step?',
        choices: ['feature-req', 'exit'],
      },
    ]);

    if (next === 'feature-req') {
      context.currentStep = 'feature-req';
    } else {
      console.log('Exiting workflow.');
      process.exit(0);
    }
  }
}
