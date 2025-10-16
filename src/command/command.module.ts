import { Module } from '@nestjs/common';
import { AnalyseCommand } from './commands';

@Module({
  providers: [AnalyseCommand],
})
export class CommandModule {}
