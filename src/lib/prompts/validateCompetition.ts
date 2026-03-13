import { thinkDeep } from '../longcat';

export async function validateCompetition(idea: string, competitorAnalysis: string): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a competition analyst. Phase 3: COMPETITION SATURATION ANALYSIS. Evaluate how crowded the space really is across ALL dimensions of competition, not just direct competitors.`,
    },
    {
      role: 'user' as const,
      content: `Evaluate competition saturation for this startup idea.

IDEA:
${idea}

COMPETITOR ANALYSIS:
${competitorAnalysis}

Evaluate competition across these 10 dimensions:
1. Direct software competitors
2. Indirect substitutes (Excel, agencies, consultants)
3. Incumbent entrenchment
4. Buyer inertia / switching resistance
5. Trust barrier
6. Distribution difficulty
7. Channel crowding
8. Time to prove value
9. Regulatory/compliance friction
10. Hidden operational complexity

Classify the market:
- Empty market (possibly no demand)
- Early market
- Growing market
- Saturated market
- Red ocean (extremely competitive)

Output JSON:
{
  "marketClassification": "early | growing | saturated | red_ocean | empty",
  "competitionDimensions": {
    "directCompetitors": { "score": 5, "analysis": "..." },
    "indirectSubstitutes": { "score": 5, "analysis": "..." },
    "incumbentEntrenchment": { "score": 5, "analysis": "..." },
    "buyerInertia": { "score": 5, "analysis": "..." },
    "trustBarrier": { "score": 5, "analysis": "..." },
    "distributionDifficulty": { "score": 5, "analysis": "..." },
    "channelCrowding": { "score": 5, "analysis": "..." },
    "timeToProveValue": { "score": 5, "analysis": "..." },
    "regulatoryFriction": { "score": 5, "analysis": "..." },
    "operationalComplexity": { "score": 5, "analysis": "..." }
  },
  "barriersToEntry": ["list"],
  "switchingCosts": "high | medium | low",
  "networkEffects": "strong | weak | none",
  "competitionScore": 6,
  "summary": "brutally honest assessment"
}`,
    },
  ];

  return thinkDeep(messages, { jsonMode: true, temperature: 0.5 });
}
