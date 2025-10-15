import { Module } from '@nestjs/common';
import { CodebaseModule } from '../codebase/codebase.module';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { AIProviderFactory } from '../agent/ai-provider';

@Module({
  imports: [CodebaseModule],
  controllers: [PlanningController],
  providers: [PlanningService, AIProviderFactory],
  exports: [PlanningService],
})
export class PlanningModule {}
