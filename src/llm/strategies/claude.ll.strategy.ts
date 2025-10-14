import { LLMStrategy } from '../llm.interface';
import axios from 'axios';

export class ClaudeStrategy implements LLMStrategy {
  async generateResponse(prompt: string): Promise<string> {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-opus-20240229',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': process.env.CLAUDE_API_KEY,
        },
      },
    );

    return response.data.content[0].text;
  }
}
