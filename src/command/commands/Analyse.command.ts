import { Command, CommandRunner, Option } from 'nest-commander';
import { WorkflowService } from '../../workflow/workflow.service';

@Command({
  name: 'analyze',
  description: 'Analyze codebase and run interactive workflow',
})
export class AnalyseCommand extends CommandRunner {
  constructor(private readonly workflowService: WorkflowService) {
    super();
  }
  async run(
    passedParams: string[],
    options?: Record<string, any>,
  ): Promise<void> {
    await this.workflowService.start(options?.path);
  }

  @Option({
    flags: '-p, --path [path]',
    description: 'absolute path to codebase to be analyzed',
    required: true,
  })
  parseName(val: string): string {
    return val;
  }
}
