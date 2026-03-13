import { thinkDeep } from '../longcat';

export async function validateDifferentiation(idea: string, competitorAnalysis: string): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a differentiation strategist. Phase 6: DIFFERENTIATION STRESS TEST. Assume a new startup enters this space — analyze switching dynamics and unfair advantages.`,
    },
    {
      role: 'user' as const,
      content: `Stress test differentiation for this startup idea.

IDEA:
${idea}

COMPETITOR ANALYSIS:
${competitorAnalysis}

Answer:
- Why would users switch to this?
- Why WOULDN'T they switch?
- What unfair advantages could exist?

Suggest 3-5 strong differentiation strategies:
- Targeting a neglected niche
- Radically better UX
- AI automation
- Faster workflows
- Developer-first APIs
- New distribution channels
- Integration advantages

Output JSON:
{
  "whyUsersWouldSwitch": ["reasons"],
  "whyUsersWouldNot": ["barriers"],
  "unfairAdvantages": ["potential advantages"],
  "differentiationStrategies": [
    {
      "strategy": "description",
      "feasibility": "easy | medium | hard",
      "impact": "high | medium | low"
    }
  ],
  "bestStrategy": "the single best differentiation approach",
  "summary": "assessment"
}`,
    },
  ];

  return thinkDeep(messages, { jsonMode: true, temperature: 0.6 });
}
