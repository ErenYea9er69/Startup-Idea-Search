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
    baseURL: 'https://api.longcat.chat/openai',
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
      const result = await getClient().chat.completions.create({
        model: 'longcat-flash-thinking-2601',
        messages,
        temperature,
        max_tokens: maxTokens,
        ...(jsonMode && { response_format: { type: 'json_object' } }),
      });
      return result;
    } catch (error: any) {
      const status = error?.status;
      const message = error?.message;
      const body = error?.response?.body;
      
      console.error(`[LongCat] API error (${status}): ${message}`, body ? `Body: ${JSON.stringify(body)}` : '');

      if (status === 401 || status === 403 || status === 404 || status === 429) {
        if (apiKeys.length > 1) {
          const prevIndex = currentKeyIndex;
          currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
          console.log(`[LongCat] Switching API Key: ${prevIndex + 1} -> ${currentKeyIndex + 1}/${apiKeys.length}`);
        }
      }
      throw error;
    }
  }, 3);

  const content = response.choices[0]?.message?.content || '';
  const usage = response.usage;
  if (usage) {
    totalTokensUsed += (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
  }

  console.log(`[LongCat] thinkDeep success. Model: ${response.model}, Tokens: ${usage?.total_tokens || 0}, Content: ${content.substring(0, 100).replace(/\n/g, ' ')}...`);
  return content;
}

export async function thinkFast(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: ChatOptions = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 4096, jsonMode = false } = options;

  const response = await retryWithBackoff(async () => {
    try {
      const result = await getClient().chat.completions.create({
        model: 'longcat-flash-chat',
        messages,
        temperature,
        max_tokens: maxTokens,
        ...(jsonMode && { response_format: { type: 'json_object' } }),
      });
      return result;
    } catch (error: any) {
      const status = error?.status;
      const message = error?.message;
      const body = error?.response?.body;
      
      console.error(`[LongCat] API error (${status}): ${message}`, body ? `Body: ${JSON.stringify(body)}` : '');

      if (status === 401 || status === 403 || status === 404 || status === 429) {
        if (apiKeys.length > 1) {
          const prevIndex = currentKeyIndex;
          currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
          console.log(`[LongCat] Switching API Key: ${prevIndex + 1} -> ${currentKeyIndex + 1}/${apiKeys.length}`);
        }
      }
      throw error;
    }
  }, 3);

  const content = response.choices[0]?.message?.content || '';
  const usage = response.usage;
  if (usage) {
    totalTokensUsed += (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
  }

  console.log(`[LongCat] thinkFast success. Model: ${response.model}, Tokens: ${usage?.total_tokens || 0}, Content: ${content.substring(0, 100).replace(/\n/g, ' ')}...`);
  return content;
}
