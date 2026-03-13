import { thinkDeep } from '../longcat';

export async function validateFailures(idea: string, fullValidationContext: string): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a startup failure analyst. Phase 7: FAILURE SCENARIOS. List the top 5 reasons this startup would fail. Be brutally realistic. Don't sugarcoat.`,
    },
    {
      role: 'user' as const,
      content: `List the top 5 failure scenarios for this startup idea.

IDEA:
${idea}

VALIDATION CONTEXT SO FAR:
${fullValidationContext}

Be brutally realistic. Consider:
- Market timing failures
- Distribution/acquisition failures
- Retention failures
- Competitive response
- Technical/operational failures
- Founder/team failures
- Financial/unit economics failures

Output JSON:
{
  "failureScenarios": [
    {
      "rank": 1,
      "scenario": "what goes wrong",
      "probability": "high | medium | low",
      "impact": "fatal | severe | manageable",
      "mitigation": "how to reduce this risk"
    }
  ],
  "mostLikelyDeathCause": "the single most likely way this dies",
  "founderTrap": "the execution trap founders fall into with this type of idea",
  "summary": "overall risk assessment"
}`,
    },
  ];

  return thinkDeep(messages, { jsonMode: true, temperature: 0.6 });
}
