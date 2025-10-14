import { LLMStrategy } from '../llm.interface';
import axios from 'axios';

export class OpenAIStrategy implements LLMStrategy {
  async generateResponse(prompt: string): Promise<string> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      },
    );

    return response.data.choices[0].message.content;
  }
}
