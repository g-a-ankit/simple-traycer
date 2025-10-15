import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider } from './ai-provider.interface';
import { GeminiProvider } from './providers';

@Injectable()
export class AIProviderFactory {
  private primaryProvider: AIProvider;
  private currentProvider: AIProvider;
  private readonly logger = new Logger(AIProviderFactory.name);
  private providerMap = new Map<string, AIProvider>();

  constructor(private configService: ConfigService) {
    const aiProviderConfig = this.configService.get('aiProvider');
    const primaryName = aiProviderConfig.provider;
    this.primaryProvider = this.createProvider(primaryName) as any;
    if (!this.primaryProvider) {
      throw new Error(`Failed to create primary provider: ${primaryName}`);
    }
    this.currentProvider = this.primaryProvider;
    this.providerMap.set(primaryName, this.primaryProvider);
    this.logger.log(
      `Primary provider: ${primaryName}, Fallback enabled: ${aiProviderConfig.enableFallback}`,
    );
  }

  getProvider(): AIProvider {
    return this.currentProvider;
  }

  async executeWithFallback<T>(
    operation: (provider: AIProvider) => Promise<T>,
  ): Promise<T> {
    let lastError: any;
    let provider = this.currentProvider;
    const triedProviders: string[] = [];
    while (provider) {
      triedProviders.push(provider.getProviderName());
      try {
        return await operation(provider);
      } catch (error) {
        lastError = error;
        // TODO: implement fallback mechanism to choose different ai-provider incase of failures
        throw error;
      }
    }
    this.logger.error(
      `All providers failed. Tried: ${triedProviders.join(', ')}`,
    );
    throw lastError;
  }

  resetToPrimary(): void {
    this.currentProvider = this.primaryProvider;
    this.logger.log(
      `Reset to primary provider: ${this.primaryProvider.getProviderName()}`,
    );
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providerMap.keys());
  }

  private createProvider(providerName: string): AIProvider | null {
    const config = this.configService.get(providerName);
    if (!config || !config.apiKey) {
      this.logger.warn(`No API key for provider: ${providerName}`);
      return null;
    }
    let provider: AIProvider | null = null;
    switch (providerName) {
      case 'gemini':
        provider = new GeminiProvider(config);
        break;

      default:
        this.logger.warn(`Unknown provider: ${providerName}`);
        return null;
    }
    if (provider) {
      this.logger.log(`Created provider: ${providerName}`);
    }
    return provider;
  }

  private isRateLimitError(error: any, provider: AIProvider): boolean {
    return (
      provider.isRateLimitError(error) ||
      error.status === 429 ||
      error.code === 'rate_limit_exceeded' ||
      error.message?.toLowerCase().includes('rate limit')
    );
  }
}
