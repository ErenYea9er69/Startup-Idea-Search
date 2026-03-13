import { thinkDeep } from '../longcat';

export async function synthesizeResearch(searchResults: string): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a market intelligence analyst. Synthesize raw search results into a structured market intelligence report that highlights underserved gaps, pain points, and opportunities.`,
    },
    {
      role: 'user' as const,
      content: `Synthesize these search results into a market intelligence report.

SEARCH RESULTS:
${searchResults}

Output JSON:
{
  "marketGaps": [
    {
      "gap": "description of the gap",
      "evidence": "what evidence supports this",
      "industry": "industry/niche",
      "urgency": "high | medium | low",
      "sourceUrls": ["urls that support this finding"]
    }
  ],
  "painPoints": [
    {
      "pain": "description",
      "who": "who experiences this",
      "currentSolution": "how they handle it now",
      "sourceUrls": ["urls"]
    }
  ],
  "trends": [
    {
      "trend": "description",
      "relevance": "why it creates opportunity",
      "timeframe": "emerging | growing | mature"
    }
  ],
  "failedApproaches": [
    {
      "approach": "what was tried",
      "whyFailed": "why it didn't work",
      "lesson": "what to learn from this"
    }
  ],
  "topInsight": "the single most promising finding from all research"
}`,
    },
  ];

  return thinkDeep(messages, { jsonMode: true, temperature: 0.6 });
}
