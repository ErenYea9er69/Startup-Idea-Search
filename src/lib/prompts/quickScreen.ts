import { thinkFast } from '../longcat';

export async function quickScreen(
  ideas: string, 
  rejectedIdeas: string[], 
  founderDNA: { skills: string[], budget: string, timeCommitment: string } | null
): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a rapid startup screener. Your job is to quickly eliminate obviously bad ideas before deep validation. 
      BE RUTHLESS. Kill ideas that are clearly a bad match for the founder's DNA or are generic garbage.`,
    },
    {
      role: 'user' as const,
      content: `FOUNDER DNA:
- Skills: ${founderDNA?.skills.join(', ') || 'Generalist'}
- Budget Path: ${founderDNA?.budget || 'Bootstrap'}
- Time: ${founderDNA?.timeCommitment || 'Full-time'}

IDEAS:
${ideas}

PREVIOUSLY REJECTED:
${rejectedIdeas.slice(0, 10).join(', ') || 'None'}

Kill criteria:
- Poor Founder-Idea Fit (Founder lacks skills even for an MVP)
- Budget mismatch (Venture-scale idea for a $0 budget founder)
- Too similar to existing well-funded solutions
- Generic AI wrapper with no real moat
- Too similar to a previously rejected idea

Output JSON:
{
  "survivors": [
    {
      "name": "Idea Name",
      "passed": true,
      "reason": "why it passed the screen"
    }
  ],
  "killed": [
    {
      "name": "Idea Name",
      "passed": false,
      "reason": "why it was killed"
    }
  ]
}`,
    },
  ];

  return thinkFast(messages, { jsonMode: true, temperature: 0.5 });
}
