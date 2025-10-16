import { Command, CommandRunner, Option } from 'nest-commander';

@Command({ name: 'analyze', description: 'Say hello' })
export class AnalyseCommand extends CommandRunner {
  async run(
    passedParams: string[],
    options?: Record<string, any>,
  ): Promise<void> {
    console.log(`👋 Hello World!`);
  }
}
