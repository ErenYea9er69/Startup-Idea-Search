import { thinkFast } from './longcat';

interface RejectedInfo {
  name: string;
  reason: string;
}

export async function extractPivotLessons(
  rejections: RejectedInfo[],
  validationResults: (Record<string, unknown> | null)[]
): Promise<Record<string, unknown>> {
  if (rejections.length === 0) {
    return { patterns: [], pivotStrategy: 'No rejections to learn from', adjustments: [] };
  }

  const rejectSummary = rejections.map((r) => `- ${r.name}: ${r.reason}`).join('\n');

  const messages = [
    {
      role: 'system' as const,
      content: `You are a pivot strategist. Analyze why startup ideas failed and suggest how to adjust the research strategy for the next iteration. Be specific and actionable.`,
    },
    {
      role: 'user' as const,
      content: `These ideas were rejected in the last iteration:

${rejectSummary}

Analyze the failure patterns and suggest pivots.

Output JSON:
{
  "patterns": ["pattern 1: most ideas failed because...", "pattern 2: ..."],
  "pivotStrategy": "how to adjust the search in the next iteration",
  "adjustments": ["specific adjustment 1", "specific adjustment 2"],
  "salvageableComponents": ["good parts from rejected ideas that could be remixed"]
}`,
    },
  ];

  const raw = await thinkFast(messages, { jsonMode: true, temperature: 0.6 });

  try {
    return JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
  } catch {
    return { patterns: [], pivotStrategy: raw, adjustments: [] };
  }
}
