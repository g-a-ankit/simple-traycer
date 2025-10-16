import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { ApplyChangesController } from './apply-changes.controller';
import { ApplyChangesService } from './apply-changes.service';
import { CodebaseModule } from '../codebase/codebase.module';

@Module({
  imports: [AgentModule, CodebaseModule],
  controllers: [ApplyChangesController],
  providers: [ApplyChangesService],
  exports: [ApplyChangesService],
})
export class ApplyChangesModule {}
