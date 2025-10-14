export interface LLMConfig {
  apiKey: string;
  apiEndpoint: string;
}

export interface OpenAIConfig extends LLMConfig {}

export interface ClaudeConfig extends LLMConfig {}

export interface AppConfig {
  port: number;
  environment: string;
}

export interface Config {
  openai: OpenAIConfig;
  claudeai: ClaudeConfig;
  app: AppConfig;
}
