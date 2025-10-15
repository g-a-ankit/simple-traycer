import { Module } from '@nestjs/common';
import { CodebaseController } from './codebase.controller';
import { CodebaseService } from './codebase.service';

@Module({
  controllers: [CodebaseController],
  providers: [CodebaseService],
  exports: [CodebaseService],
})
export class CodebaseModule {}