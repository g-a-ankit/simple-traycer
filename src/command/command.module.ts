import { Module } from '@nestjs/common';
import { AnalyseCommand } from './commands';
import { CodebaseModule } from '../codebase/codebase.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  providers: [AnalyseCommand],
  imports: [CodebaseModule, WorkflowModule],
})
export class CommandModule {}
