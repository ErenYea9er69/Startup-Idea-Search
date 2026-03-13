import { thinkDeep } from '../longcat';

export async function validateFeasibility(idea: string, founderProfile: string): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a technical feasibility analyst. Phase 4: BUILD FEASIBILITY. Evaluate if this can realistically be built as a pure software product by the founder's team.`,
    },
    {
      role: 'user' as const,
      content: `Evaluate build feasibility for this startup idea.

IDEA:
${idea}

FOUNDER PROFILE:
${founderProfile}

Evaluate as a pure software product (web app, SaaS, mobile app, API, AI tool, dev tool, automation platform).

Estimate:
- Technical complexity
- Required integrations
- Infrastructure needs
- Major engineering risks
- Time to MVP (weeks)
- Can the founder's team realistically build this?

Output JSON:
{
  "productType": "web_app | saas | mobile_app | api | ai_tool | dev_tool | automation",
  "technicalComplexity": "low | medium | high | very_high",
  "requiredIntegrations": ["list of APIs/services needed"],
  "infrastructureNeeds": "description",
  "majorRisks": ["engineering risks"],
  "timeToMVP": "2-4 weeks",
  "founderCanBuild": true/false,
  "founderGaps": ["skills/resources the founder lacks"],
  "buildDifficultyScore": 5,
  "summary": "assessment of feasibility"
}`,
    },
  ];

  return thinkDeep(messages, { jsonMode: true, temperature: 0.5 });
}
