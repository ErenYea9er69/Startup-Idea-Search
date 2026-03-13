import { prisma } from './prisma';
import crypto from 'crypto';

function hashQuery(query: string): string {
  return crypto.createHash('sha256').update(query.toLowerCase().trim()).digest('hex');
}

export async function getCachedResults(query: string): Promise<{ results: unknown[]; answer?: string } | null> {
  const hash = hashQuery(query);

  try {
    const cached = await prisma.searchCache.findUnique({
      where: { queryHash: hash },
    });

    if (!cached) return null;
    if (new Date() > cached.expiresAt) {
      await prisma.searchCache.delete({ where: { queryHash: hash } });
      return null;
    }

    return cached.results as { results: unknown[]; answer?: string };
  } catch {
    return null;
  }
}

export async function setCachedResults(
  query: string,
  results: { results: unknown[]; answer?: string }
): Promise<void> {
  const hash = hashQuery(query);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h TTL

  try {
    await prisma.searchCache.upsert({
      where: { queryHash: hash },
      create: {
        queryHash: hash,
        query: query,
        results: results as any,
        expiresAt,
      },
      update: {
        results: results as any,
        expiresAt,
      },
    });
  } catch (error) {
    console.warn('[SearchCache] Failed to cache results:', error);
  }
}

export async function clearExpiredCache(): Promise<number> {
  const result = await prisma.searchCache.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}
