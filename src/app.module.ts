import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentModule } from './agent/agent.module';
import { ConfigAppModule } from './config-app/config-app.module';
import { CodebaseModule } from './codebase/codebase.module';
import { PlanningModule } from './planning/planning.module';
import { ReviewModule } from './review/review.module';
import { UserModule } from './user/user.module';
import { WorkflowModule } from './workflow/workflow.module';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { ApplyChangesModule } from './apply-changes/apply-changes.module';
import { CommandModule } from './command/command.module';

@Module({
  imports: [
    AgentModule,
    ConfigAppModule,
    CodebaseModule,
    PlanningModule,
    ReviewModule,
    UserModule,
    WorkflowModule,
    AuthModule,
    ApplyChangesModule,
    CommandModule,
  ],
  controllers: [AppController],
  providers: [AppService, AuthService],
})
export class AppModule {}
