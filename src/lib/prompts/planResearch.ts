import { thinkFast } from '../longcat';

export async function planResearch(
  focusAreas: string[],
  excludedCategories: string[],
  previousFailures: string[],
  founderSkills: string[],
  customCriteria?: string
): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a startup research strategist. Your job is to create a focused research plan for finding underserved market gaps. Think about WHAT to search for and WHY - be strategic, not generic.`,
    },
    {
      role: 'user' as const,
      content: `Create a research plan for finding startup opportunities.

FOCUS AREAS: ${focusAreas.length > 0 ? focusAreas.join(', ') : 'Open to any industry'}
EXCLUDED: ${excludedCategories.length > 0 ? excludedCategories.join(', ') : 'None'}
FOUNDER SKILLS: ${founderSkills.length > 0 ? founderSkills.join(', ') : 'General'}
${customCriteria ? `CUSTOM CRITERIA: ${customCriteria}` : ''}

${previousFailures.length > 0 ? `
PREVIOUS FAILURES (avoid these patterns):
${previousFailures.map((f, i) => `${i + 1}. ${f}`).join('\n')}
` : ''}

Output a JSON object with:
{
  "researchAngles": [
    {
      "angle": "description of what to research",
      "rationale": "why this angle could reveal good opportunities",
      "searchType": "market_gaps | failed_startups | trends | pain_points | ecosystem"
    }
  ],
  "avoidPatterns": ["patterns to avoid based on previous failures"],
  "keyInsight": "one sentence about the overall research strategy"
}`,
    },
  ];

  return thinkFast(messages, { jsonMode: true, temperature: 0.8 });
}
