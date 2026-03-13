import { thinkFast } from '../longcat';

export async function buildSearchQueries(
  researchPlan: string,
  focusAreas: string[],
  previousFailures: string[]
): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `You generate precise, targeted web search queries for finding startup opportunities. Each query should target a different angle. Make queries specific enough to find actionable information, not generic.`,
    },
    {
      role: 'user' as const,
      content: `Based on this research plan, generate 5 targeted search queries.

RESEARCH PLAN:
${researchPlan}

FOCUS AREAS: ${focusAreas.join(', ') || 'Open'}

${previousFailures.length > 0 ? `AVOID TOPICS RELATED TO: ${previousFailures.slice(0, 5).join(', ')}` : ''}

Output JSON:
{
  "queries": [
    {
      "query": "the actual search query string",
      "type": "market_gaps | failed_startups | trends | pain_points | ecosystem",
      "rationale": "what we hope to find"
    }
  ]
}`,
    },
  ];

  return thinkFast(messages, { jsonMode: true, temperature: 0.8 });
}
