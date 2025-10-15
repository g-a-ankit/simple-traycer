export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export interface AIProviderConfig {
  provider: string;
}

export interface AppConfig {
  port: number;
  environment: string;
}

export interface CodebaseConfig {
  rootPath: string;
}

export interface Config {
  aiProvider: AIProviderConfig;
  gemini: GeminiConfig;
  app: AppConfig;
  codebase: CodebaseConfig;
}
