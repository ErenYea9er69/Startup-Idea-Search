import OpenAI from 'openai';
import { retryWithBackoff } from './retryHandler';

const apiKeys = [
  process.env.LONGCAT_API_KEY,
  process.env.LONGCAT_API_KEY_2,
  process.env.LONGCAT_API_KEY_3,
  process.env.LONGCAT_API_KEY_4,
  process.env.LONGCAT_API_KEY_5,
].filter(Boolean) as string[];

let currentKeyIndex = 0;

function getClient(): OpenAI {
  if (apiKeys.length === 0) throw new Error('No LongCat API keys provided');
  return new OpenAI({
    apiKey: apiKeys[currentKeyIndex],
    baseURL: 'https://api.longcat.chat/v1',
  });
}

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
    try {
      return await getClient().chat.completions.create({
        model: 'longcat-flash-thinking-2601',
        messages,
        temperature,
        max_tokens: maxTokens,
        ...(jsonMode && { response_format: { type: 'json_object' } }),
      });
    } catch (error: any) {
      if (error?.status === 401 || error?.status === 403 || error?.status === 429) {
        if (currentKeyIndex < apiKeys.length - 1) {
          currentKeyIndex++;
          console.log(`[LongCat] Rate limit or auth error. Switching to backup API Key ${currentKeyIndex + 1}`);
        }
      }
      throw error;
    }
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
    try {
      return await getClient().chat.completions.create({
        model: 'longcat-flash-chat',
        messages,
        temperature,
        max_tokens: maxTokens,
        ...(jsonMode && { response_format: { type: 'json_object' } }),
      });
    } catch (error: any) {
      if (error?.status === 401 || error?.status === 403 || error?.status === 429) {
        if (currentKeyIndex < apiKeys.length - 1) {
          currentKeyIndex++;
          console.log(`[LongCat] Rate limit or auth error. Switching to backup API Key ${currentKeyIndex + 1}`);
        }
      }
      throw error;
    }
  }, 3);

  const usage = response.usage;
  if (usage) {
    totalTokensUsed += (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
  }

  return response.choices[0]?.message?.content || '';
}
