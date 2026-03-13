import { thinkDeep } from '../longcat';

export async function validateMarket(idea: string, marketData: string): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a market and monetization analyst. Phase 5: MARKET & MONETIZATION REALITY. Analyze whether this could become a real business. Use the market data provided.`,
    },
    {
      role: 'user' as const,
      content: `Analyze market and monetization for this startup idea.

IDEA:
${idea}

MARKET DATA:
${marketData}

Evaluate:
- Potential customers (how many?)
- Willingness to pay (evidence?)
- Best pricing model
- Estimated revenue potential (monthly ARR at scale)
- Lifestyle SaaS vs venture-scale opportunity
- Monetization risks

Output JSON:
{
  "potentialCustomers": "estimate with reasoning",
  "willingnessToPay": "high | medium | low",
  "evidenceOfWTP": "what evidence supports willingness to pay",
  "bestPricingModel": "subscription | usage | freemium | one_time | enterprise",
  "suggestedPrice": "$X/month",
  "estimatedARR": "$X at 1000 customers",
  "scaleType": "lifestyle | bootstrapped | venture_scale",
  "monetizationRisks": ["risks"],
  "marketOpportunityScore": 7,
  "summary": "assessment of monetization reality"
}`,
    },
  ];

  return thinkDeep(messages, { jsonMode: true, temperature: 0.5 });
}
