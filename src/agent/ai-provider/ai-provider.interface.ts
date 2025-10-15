import { ChatRole } from 'src/common/enum';

export abstract class AIProvider {
  abstract chat(
    messages: ChatMessage[],
    options?: AIProviderOptions,
  ): Promise<AIResponse>;

  abstract getProviderName(): string;

  abstract isRateLimitError(error: any): boolean;

  async generateCode(
    prompt: string,
    options?: AIProviderOptions,
  ): Promise<AIResponse> {
    const systemMessage: ChatMessage = {
      role: ChatRole.system,
      content: 'You are an expert software developer.',
    };
    const userMessage: ChatMessage = {
      role: ChatRole.user,
      content: prompt,
    };
    return this.chat([systemMessage, userMessage], options);
  }

  async generatePlan(
    prompt: string,
    options?: AIProviderOptions,
  ): Promise<AIResponse> {
    const systemMessage: ChatMessage = {
      role: ChatRole.system,
      content: 'You are a senior software architect.',
    };
    const userMessage: ChatMessage = {
      role: ChatRole.user,
      content: prompt,
    };
    return this.chat([systemMessage, userMessage], options);
  }

  abstract parseStructuredResponse(rawResponse: string): any;
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface AIProviderOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}
