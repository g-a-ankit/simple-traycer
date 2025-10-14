export interface LLMStrategy {
  generateResponse(
    prompt: string,
    options?: Record<string, any>,
  ): Promise<string>;
}
