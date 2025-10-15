import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIProvider,
  ChatMessage,
  AIProviderOptions,
  AIResponse,
} from '../ai-provider.interface';
import type { GeminiConfig } from '../../../config-app/config.interface';

@Injectable()
export class GeminiProvider implements AIProvider {
  private readonly client: GoogleGenerativeAI;
  private readonly defaultModel: string;
  private readonly model: any;
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(private readonly config: GeminiConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.defaultModel = config.model || 'gemini-2.5-flash';
    this.model = this.client.getGenerativeModel({ model: this.defaultModel });
  }

  getProviderName(): string {
    return 'gemini';
  }

  async chat(
    messages: ChatMessage[],
    options?: AIProviderOptions,
  ): Promise<AIResponse> {
    const modelName = options?.model || this.defaultModel;
    const model = this.client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: options?.temperature,
        maxOutputTokens: options?.maxTokens,
      },
    });

    // Extract system instruction
    const systemMessage = messages.find((msg) => msg.role === 'system');
    const systemInstruction = systemMessage?.content;

    // Filter out system messages for history
    const conversationMessages = messages.filter(
      (msg) => msg.role !== 'system',
    );

    if (conversationMessages.length === 0) {
      throw new Error('No conversation messages provided');
    }

    let result;
    if (
      conversationMessages.length === 1 &&
      conversationMessages[0].role === 'user'
    ) {
      // Single user message
      const prompt = systemInstruction
        ? `${systemInstruction}\n\n${conversationMessages[0].content}`
        : conversationMessages[0].content;
      result = await model.generateContent(prompt);
    } else {
      const history = this.buildHistory(conversationMessages);
      const chat = model.startChat({
        history: history.slice(0, -1), // All except last
        generationConfig: {
          temperature: options?.temperature,
          maxOutputTokens: options?.maxTokens,
        },
      });
      const lastMessage = history[history.length - 1];
      result = await chat.sendMessage(lastMessage.parts[0].text);
    }

    const response = result.response;
    const content = response.text();
    const finishReason = response.candidates?.[0]?.finishReason || 'STOP';

    const usage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          completionTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0,
        }
      : undefined;

    return {
      content,
      model: modelName,
      provider: this.getProviderName(),
      usage,
      finishReason,
    };
  }

  async generateCode(
    prompt: string,
    options?: AIProviderOptions,
  ): Promise<AIResponse> {
    const systemMessage: ChatMessage = {
      role: 'system',
      content: 'You are an expert software developer.',
    };
    const userMessage: ChatMessage = {
      role: 'user',
      content: prompt,
    };
    return this.chat([systemMessage, userMessage], options);
  }

  async generatePlan(
    prompt: string,
    options?: AIProviderOptions,
  ): Promise<AIResponse> {
    const systemMessage: ChatMessage = {
      role: 'system',
      content: 'You are a senior software architect.',
    };
    const userMessage: ChatMessage = {
      role: 'user',
      content: prompt,
    };
    return this.chat([systemMessage, userMessage], options);
  }

  isRateLimitError(error: any): boolean {
    return (
      error.status === 429 ||
      error.statusCode === 429 ||
      error.message?.includes('RESOURCE_EXHAUSTED') ||
      error.message?.includes('quota')
    );
  }

  parseStructuredResponse(rawResponse: string): any {
    // 1. Direct JSON Parse (Simplest Case)
    try {
      return JSON.parse(rawResponse.trim());
    } catch (e) {
      // Continue to next strategy
    }

    // 2. Extract from Markdown Code Blocks
    const markdownMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (markdownMatch) {
      try {
        return JSON.parse(markdownMatch[1].trim());
      } catch (e) {
        // Continue to next strategy
      }
    }

    // 3. Extract JSON Object from Text
    const objectMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch (e) {
        // Continue to next strategy
      }
    }

    // 4. Extract JSON Array from Text
    const arrayMatch = rawResponse.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (e) {
        // Continue to next strategy
      }
    }

    // 5. Final Fallback - Throw Descriptive Error
    throw new Error(
      `Failed to parse Gemini response as JSON. Response may not contain valid JSON structure. Response starts with: ${rawResponse.substring(0, 200)}`,
    );
  }

  private buildHistory(messages: ChatMessage[]) {
    return messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
  }
}
