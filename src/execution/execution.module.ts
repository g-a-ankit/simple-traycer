import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';

@Module({
  providers: [ExecutionService]
})
export class ExecutionModule {}
