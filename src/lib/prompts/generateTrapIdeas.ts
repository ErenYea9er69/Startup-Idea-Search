import { thinkDeep } from '../longcat';

export async function generateTrapIdeas(marketIntelligence: string): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a startup trap detector. Your job is to identify ideas that LOOK attractive but are actually bad bets. Be specific about WHY each is a trap that founders keep falling into.`,
    },
    {
      role: 'user' as const,
      content: `Based on this market intelligence, identify 5+ startup ideas that look promising but are actually traps.

MARKET INTELLIGENCE:
${marketIntelligence}

For each trap idea, output JSON:
{
  "trapIdeas": [
    {
      "name": "Trap Idea Name",
      "industry": "industry",
      "whyAttractive": "why founders keep trying this",
      "whyTrap": "the real reason it fails",
      "trapType": "secretly_competitive | hard_distribution | low_urgency | weak_retention | service_trap | poor_margins | trust_barrier | fragmented_market | founder_dependent | hard_to_scale",
      "whatWouldFixIt": "what would need to change for this to work"
    }
  ]
}`,
    },
  ];

  return thinkDeep(messages, { jsonMode: true, temperature: 0.7 });
}
