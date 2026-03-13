import { tavily } from '@tavily/core';
import { retryWithBackoff } from './retryHandler';
import { getCachedResults, setCachedResults } from './searchCache';

const client = tavily({ apiKey: process.env.TAVILY_API_KEY! });

let totalCreditsUsed = 0;

export function getTavilyCredits() {
  return totalCreditsUsed;
}

export function resetCreditCounter() {
  totalCreditsUsed = 0;
}

const STARTUP_DOMAINS = [
  'producthunt.com',
  'crunchbase.com',
  'indiehackers.com',
  'g2.com',
  'capterra.com',
  'ycombinator.com',
  'betalist.com',
  'alternativeto.net',
];

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface SearchOptions {
  searchDepth?: 'basic' | 'advanced';
  maxResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  topic?: 'general' | 'news';
  timeRange?: 'day' | 'week' | 'month' | 'year';
  includeAnswer?: boolean;
  useCache?: boolean;
}

async function search(
  query: string,
  options: SearchOptions = {}
): Promise<{ results: SearchResult[]; answer?: string }> {
  const {
    searchDepth = 'advanced',
    maxResults = 10,
    includeDomains,
    excludeDomains,
    topic = 'general',
    timeRange,
    includeAnswer = false,
    useCache = true,
  } = options;

  if (useCache) {
    const cached = await getCachedResults(query);
    if (cached) return cached as { results: SearchResult[]; answer?: string };
  }

  const response = await retryWithBackoff(async () => {
    return client.search(query, {
      searchDepth,
      maxResults,
      ...(includeDomains && { includeDomains }),
      ...(excludeDomains && { excludeDomains }),
      topic,
      ...(timeRange && { timeRange }),
      ...(includeAnswer && { includeAnswer: true }),
    });
  }, 3);

  totalCreditsUsed += searchDepth === 'advanced' ? 2 : 1;

  const result = {
    results: (response.results || []).map((r: Record<string, unknown>) => ({
      title: String(r.title || ''),
      url: String(r.url || ''),
      content: String(r.content || ''),
      score: Number(r.score || 0),
    })),
    answer: typeof response.answer === 'string' ? response.answer : undefined,
  };

  if (useCache) {
    await setCachedResults(query, result);
  }

  return result;
}

export async function searchMarketGaps(
  query: string,
  options: SearchOptions = {}
): Promise<{ results: SearchResult[]; answer?: string }> {
  return search(query, {
    searchDepth: 'advanced',
    maxResults: 10,
    includeAnswer: true,
    ...options,
  });
}

export async function searchCompetitors(
  ideaName: string,
  industry: string
): Promise<{ results: SearchResult[]; answer?: string }> {
  return search(`${ideaName} ${industry} competitors alternatives software SaaS`, {
    searchDepth: 'advanced',
    maxResults: 10,
    includeAnswer: true,
  });
}

export async function searchStartupEcosystem(
  query: string
): Promise<{ results: SearchResult[]; answer?: string }> {
  return search(query, {
    searchDepth: 'basic',
    maxResults: 15,
    includeDomains: STARTUP_DOMAINS,
  });
}

export async function searchTrends(
  industry: string
): Promise<{ results: SearchResult[]; answer?: string }> {
  return search(`${industry} startup trends 2025 2026 emerging opportunities`, {
    searchDepth: 'basic',
    maxResults: 10,
    topic: 'news',
    timeRange: 'month',
    includeAnswer: true,
  });
}

export async function verifyProblem(
  problem: string,
  industry: string
): Promise<{ results: SearchResult[]; answer?: string }> {
  return search(`"${problem}" ${industry} pain point frustration need solution`, {
    searchDepth: 'advanced',
    maxResults: 8,
    includeAnswer: true,
  });
}

export async function searchPricing(
  ideaName: string,
  industry: string
): Promise<{ results: SearchResult[]; answer?: string }> {
  return search(`${ideaName} ${industry} pricing plans market size revenue`, {
    searchDepth: 'basic',
    maxResults: 8,
    includeAnswer: true,
  });
}
