import { thinkFast } from '../longcat';

export async function planResearch(
  focusAreas: string[],
  excludedCategories: string[],
  pastRejections: string, // Detailed failures: "Name: Reason (Phase)"
  founderSkills: string[],
  customCriteria?: string
): Promise<string> {
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const messages = [
    {
      role: 'system' as const,
      content: `You are a startup research strategist. Current Date: ${currentDate}.
Your job is to create a focused research plan for finding underserved market gaps. 
Think about WHAT to search for and WHY - be strategic, not generic.
You have a "Graveyard" of past rejected ideas. DO NOT repeat these mistakes.`,
    },
    {
      role: 'user' as const,
      content: `Create a research plan for finding startup opportunities in March 2026.
      
CURRENT DATE: ${currentDate}
FOCUS AREAS: ${focusAreas.length > 0 ? focusAreas.join(', ') : 'Open to any industry'}
EXCLUDED: ${excludedCategories.length > 0 ? excludedCategories.join(', ') : 'None'}
FOUNDER SKILLS: ${founderSkills.length > 0 ? founderSkills.join(', ') : 'General'}
${customCriteria ? `CUSTOM CRITERIA: ${customCriteria}` : ''}

THE GRAVEYARD (Past Failures & Lessons):
${pastRejections || 'No previous failures recorded yet.'}

Output a JSON object with:
{
  "researchAngles": [
    {
      "angle": "description of what to research",
      "rationale": "why this angle could reveal good opportunities",
      "searchType": "market_gaps | failed_startups | trends | pain_points | ecosystem",
      "isContrarian": true
    }
  ],
  "failureSynthesis": "One paragraph analyzing why past ideas died and what to avoid now",
  "keyInsight": "One sentence about the overall research strategy for 2026"
}`,
    },
  ];

  return thinkFast(messages, { jsonMode: true, temperature: 0.8 });
}
