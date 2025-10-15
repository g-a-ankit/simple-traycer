import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { CodebaseModule } from 'src/codebase/codebase.module';
import { PlanningModule } from 'src/planning';
import { AIProviderFactory } from './ai-provider';

@Module({
  imports: [CodebaseModule, PlanningModule],
  controllers: [AgentController],
  providers: [AgentService, AIProviderFactory],
  exports: [AgentService],
})
export class AgentModule {}
