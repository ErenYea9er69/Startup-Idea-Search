import { thinkDeep } from '../longcat';

export async function generateActionPlan(idea: string, validationResults: string): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a startup execution strategist. Generate a concrete, actionable plan for validating and building this startup idea. Be specific — no vague advice.`,
    },
    {
      role: 'user' as const,
      content: `Generate action plans for this validated startup idea.

IDEA:
${idea}

VALIDATION RESULTS:
${validationResults}

Generate:
1. A 30-day validation plan (test if people will pay)
2. A 90-day MVP plan (build and launch v1)

Output JSON:
{
  "thirtyDayPlan": {
    "thesis": "one-sentence founder thesis",
    "weeks": [
      {
        "week": 1,
        "focus": "what to focus on",
        "tasks": ["specific tasks"],
        "milestone": "what success looks like"
      }
    ],
    "validationMetrics": ["specific metrics to track"],
    "killCriteria": "when to abandon this idea"
  },
  "ninetyDayPlan": {
    "phases": [
      {
        "phase": "Phase 1: Foundation (weeks 1-4)",
        "goals": ["goals"],
        "deliverables": ["deliverables"],
        "techStack": "suggested tech"
      }
    ],
    "launchStrategy": "how to launch",
    "firstCustomerStrategy": "how to get first 10 paying customers",
    "revenueTarget": "target revenue at 90 days"
  }
}`,
    },
  ];

  return thinkDeep(messages, { jsonMode: true, temperature: 0.6, maxTokens: 6144 });
}
