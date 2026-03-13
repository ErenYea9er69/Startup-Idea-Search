import OpenAI from 'openai';
import { retryWithBackoff } from './retryHandler';

const client = new OpenAI({
  apiKey: process.env.LONGCAT_API_KEY,
  baseURL: 'https://api.longcat.chat/v1',
});

let totalTokensUsed = 0;

export function getTokensUsed() {
  return totalTokensUsed;
}

export function resetTokenCounter() {
  totalTokensUsed = 0;
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export async function thinkDeep(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: ChatOptions = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 8192, jsonMode = false } = options;

  const response = await retryWithBackoff(async () => {
    return client.chat.completions.create({
      model: 'longcat-flash-thinking-2601',
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode && { response_format: { type: 'json_object' } }),
    });
  }, 3);

  const usage = response.usage;
  if (usage) {
    totalTokensUsed += (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
  }

  return response.choices[0]?.message?.content || '';
}

export async function thinkFast(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: ChatOptions = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 4096, jsonMode = false } = options;

  const response = await retryWithBackoff(async () => {
    return client.chat.completions.create({
      model: 'longcat-flash-chat',
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode && { response_format: { type: 'json_object' } }),
    });
  }, 3);

  const usage = response.usage;
  if (usage) {
    totalTokensUsed += (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
  }

  return response.choices[0]?.message?.content || '';
}
