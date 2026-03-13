import { thinkFast } from '../longcat';

export async function buildSearchQueries(
  researchPlan: string,
  focusAreas: string[],
  pastFailures: string
): Promise<string> {
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const messages = [
    {
      role: 'system' as const,
      content: `You generate precise, targeted web search queries for finding startup opportunities. Current Date: ${currentDate}.
Focus on finding "unmet pain" and "high-signal complaints". Use search operators like site:reddit.com or site:news.ycombinator.com where appropriate.`,
    },
    {
      role: 'user' as const,
      content: `Based on this research plan, generate 5-7 targeted search queries.
      
CURRENT DATE: ${currentDate}
RESEARCH PLAN:
${researchPlan}

FOCUS AREAS: ${focusAreas.join(', ') || 'Open'}
${pastFailures ? `REFRAIN FROM PATHS THAT LED TO: ${pastFailures.substring(0, 500)}` : ''}

For each query, try to find:
1. Real user frustrations (not just market reports).
2. Tech stacks or legacy tools being "sunsetted" or hated in 2025/2026.
3. Emerging gaps in ${currentDate}.

Output JSON:
{
  "queries": [
    {
      "query": "the actual search query string (e.g. 'site:reddit.com intitle:complaint [Topic]')",
      "type": "market_gaps | failed_startups | trends | pain_points | ecosystem",
      "isContrarian": boolean,
      "rationale": "what specific high-signal data we are hunting"
    }
  ]
}`,
    },
  ];

  return thinkFast(messages, { jsonMode: true, temperature: 0.8 });
}
