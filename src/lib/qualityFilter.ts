import { SearchResult } from './tavily';

const MIN_RELEVANCE_SCORE = 0.4;

export function filterSearchResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  
  return results
    .filter((r) => {
      if (r.score < MIN_RELEVANCE_SCORE) return false;
      
      const domain = extractDomain(r.url);
      if (seen.has(domain)) return false;
      seen.add(domain);
      
      if (!r.content || r.content.length < 50) return false;
      
      return true;
    })
    .sort((a, b) => {
      const aPriority = isStartupSource(a.url) ? 0.15 : 0;
      const bPriority = isStartupSource(b.url) ? 0.15 : 0;
      return (b.score + bPriority) - (a.score + aPriority);
    });
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

const STARTUP_DOMAINS = [
  'producthunt.com',
  'crunchbase.com',
  'indiehackers.com',
  'g2.com',
  'capterra.com',
  'ycombinator.com',
  'betalist.com',
];

function isStartupSource(url: string): boolean {
  const domain = extractDomain(url);
  return STARTUP_DOMAINS.some((d) => domain.includes(d));
}

export function summarizeResults(results: SearchResult[]): string {
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}\nSource: ${r.url}`)
    .join('\n\n---\n\n');
}
