import { Module } from '@nestjs/common';
import { ContextService } from './context.service';

@Module({
  providers: [ContextService]
})
export class ContextModule {}
