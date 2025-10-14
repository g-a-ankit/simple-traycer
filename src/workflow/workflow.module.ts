import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';

@Module({
  providers: [WorkflowService]
})
export class WorkflowModule {}
