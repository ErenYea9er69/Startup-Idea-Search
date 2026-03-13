import { thinkFast } from '../longcat';

export async function quickScreen(ideas: string, rejectedIdeas: string[]): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a rapid startup screener. Your job is to quickly eliminate obviously bad ideas before deep validation. Be ruthless but fair. Kill ideas that clearly violate exclusion rules or have obvious fatal flaws.`,
    },
    {
      role: 'user' as const,
      content: `Quickly screen these startup ideas. Kill any that are obviously bad.

IDEAS:
${ideas}

PREVIOUSLY REJECTED (similar ideas should be killed):
${rejectedIdeas.slice(0, 10).join(', ') || 'None'}

Kill criteria:
- Too similar to existing well-funded solutions
- Clearly a service business disguised as software
- Generic AI wrapper with no real moat
- Customer acquisition would be harder than building
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
