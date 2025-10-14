import { Injectable, Logger } from '@nestjs/common';
import type { LLMStrategy } from './llm.interface';

@Injectable()
export class LLMService {
  strategy: LLMStrategy;
  private logger: Logger = new Logger(LLMService.name);

  constructor(strategy: LLMStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: LLMStrategy) {
    this.logger.log('setting the strategy as', strategy);
    this.strategy = strategy;
  }

  async ask(prompt: string): Promise<string> {
    this.logger.log('executing from LLM stragety');
    return this.strategy.generateResponse(prompt);
  }
}
