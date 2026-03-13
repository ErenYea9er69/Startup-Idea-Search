import { thinkDeep } from '../longcat';

export async function validateCompetitors(idea: string, competitorData: string): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a competitive intelligence researcher. Phase 2: EXISTING SOLUTION INVESTIGATION. Analyze the competitive landscape using real web data. Be thorough — check for direct competitors, indirect substitutes, and manual workarounds.`,
    },
    {
      role: 'user' as const,
      content: `Analyze the competitive landscape for this startup idea.

IDEA:
${idea}

COMPETITOR RESEARCH DATA:
${competitorData}

List relevant competitors including:
- Direct software competitors
- Indirect substitutes (Excel, agencies, consultants, in-house tools)
- Large tech companies with overlapping features
- Manual workflows people already use

For each competitor explain: what they do well, what they do poorly, their pricing, their positioning.

Then answer: Is the problem already solved well enough?

Output JSON:
{
  "competitors": [
    {
      "name": "Company Name",
      "type": "direct | indirect | bigtech | manual",
      "whatTheyDoWell": "strengths",
      "whatTheyDoPoorly": "weaknesses",
      "pricing": "pricing model if found",
      "positioning": "who they target",
      "url": "website if found"
    }
  ],
  "alreadySolvedWellEnough": true/false,
  "gapsInExistingSolutions": ["list of gaps competitors don't address"],
  "competitorCount": 5,
  "summary": "one paragraph assessment of competitive landscape"
}`,
    },
  ];

  return thinkDeep(messages, { jsonMode: true, temperature: 0.5 });
}
