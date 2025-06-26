declare const Deno: { env: { get(key: string): string | undefined } };

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIChatCompletionRequest {
  model: string;
  messages: OpenAIChatMessage[];
  temperature?: number;
}

export interface OpenAIChatCompletionResponse {
  choices: {
    message: {
      role: string;
      content: string;
    }
  }[];
}

export async function openaiChatCompletion(requestBody: OpenAIChatCompletionRequest): Promise<OpenAIChatCompletionResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
  if (!response.ok) throw new Error('OpenAI API call failed');
  return await response.json() as OpenAIChatCompletionResponse;
} 