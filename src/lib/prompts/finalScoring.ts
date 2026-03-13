import { thinkDeep } from '../longcat';

export async function finalScoring(idea: string, allPhaseResults: string, founderProfile: string): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `Final scoring for this startup idea. RUTHLESS ADVISOR. Keep reasoning very concise (1-2 sentences). JSON ONLY.`,
    },
    {
      role: 'user' as const,
      content: `Final scoring for this startup idea.

IDEA:
${idea}

ALL VALIDATION RESULTS:
${allPhaseResults}

FOUNDER PROFILE:
${founderProfile}

Score 1-10 on each dimension:
1. Competition Realism (10 = truly less competitive, not just obscure)
2. Pain Intensity (how much it hurts)
3. Buyer Urgency (will they buy NOW?)
4. Budget Clarity (clear budget owner?)
5. Ease of MVP (how fast to build v1?)
6. Ease of Distribution (can you reach customers?)
7. Speed to First Revenue (days/weeks to first $?)
8. Retention Potential (will they keep paying?)
9. Capital Efficiency (how little money needed?)
10. Small-Team Feasibility (can 1-5 people do this?)
11. Defensibility Over Time (moat at year 2-3?)
12. Expansion Potential (room to grow?)
13. Service Business Risk (10 = pure product, 1 = disguised service)
14. Hidden Red Ocean Risk (10 = truly open, 1 = secretly crowded)

Then compute composite scores (0-100):
- Overall Winnability = weighted average emphasizing pain, urgency, feasibility
- Cash-Flow Potential = emphasizing retention, revenue speed, capital efficiency
- Venture-Scale Potential = emphasizing expansion, market size, defensibility
- Solo Founder Feasibility = emphasizing small-team, MVP ease, distribution

Then classify into ONE category:
- winnability (best overall odds)
- boring-strong (strong cash flow, not flashy)
- venture-backable (lower competition + high expansion)
- solo-founder (best for 1-person team)
- ai-defensible (uses AI narrowly + workflow-specific + defensible)

Then give a verdict:
🚀 Exceptional opportunity
✅ Promising but needs strong differentiation
⚠️ High risk / very competitive
❌ Not worth pursuing

Output JSON:
{
  "scores": {
    "competitionRealism": 7,
    "painIntensity": 8,
    "buyerUrgency": 6,
    "budgetClarity": 7,
    "easeOfMVP": 8,
    "easeOfDistribution": 5,
    "speedToFirstRevenue": 7,
    "retentionPotential": 8,
    "capitalEfficiency": 9,
    "smallTeamFeasibility": 8,
    "defensibilityOverTime": 5,
    "expansionPotential": 6,
    "serviceBusinessRisk": 8,
    "hiddenRedOceanRisk": 7
  },
  "compositeScores": {
    "overallWinnability": 72,
    "cashFlowPotential": 68,
    "ventureScalePotential": 55,
    "soloFounderFeasibility": 80
  },
  "category": "solo-founder",
  "verdict": "✅",
  "verdictLabel": "Promising but needs strong differentiation",
  "founderFitScore": 75,
  "reasoning": "detailed explanation of the verdict",
  "oneLineSummary": "one-sentence summary of this idea's potential"
}`,
    },
  ];

  return thinkDeep(messages, { jsonMode: true, temperature: 0.4, maxTokens: 4096 });
}
