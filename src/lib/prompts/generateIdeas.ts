import { thinkDeep } from '../longcat';

export async function generateIdeas(
  marketIntelligence: string,
  rejectedIdeas: string[],
  founderProfile: string,
  customCriteria?: string
): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are an elite startup ideation engine. Generate startup ideas that maximize: probability of traction, speed to first revenue, capital efficiency, small-team execution feasibility.

HARD EXCLUSION RULES — Do NOT generate ideas that are:
- Generic AI copilots/agents/chatbots
- Generic "chat with your data" tools
- Generic content generation tools
- Generic CRM/marketing AI tools
- Broad horizontal productivity apps
- "Uber for X" marketplaces
- Social networks / creator apps
- Capital-intensive hardware
- Deep-tech moonshots / biotech / pharma
- Crypto speculation
- Ideas where the only moat is "we use AI"
- Disguised agencies / consulting
- Ideas where customer acquisition > building the product`,
    },
    {
      role: 'user' as const,
      content: `Based on this market intelligence, generate 3-5 startup ideas.

MARKET INTELLIGENCE:
${marketIntelligence}

FOUNDER PROFILE:
${founderProfile}

${customCriteria ? `CUSTOM CRITERIA: ${customCriteria}` : ''}

DO NOT suggest any of these previously rejected ideas:
${rejectedIdeas.length > 0 ? rejectedIdeas.join('\n') : 'None yet'}

For each idea, output JSON:
{
  "ideas": [
    {
      "name": "Idea Name",
      "industry": "industry/niche",
      "businessType": "product-SaaS | tooling | service-assisted | marketplace",
      "problem": "exact painful problem",
      "customer": "target customer/buyer",
      "budgetOwner": "who has budget authority",
      "currentWorkaround": "how they handle it now",
      "whyUnderserved": "why still unsolved",
      "whyNow": "what changed recently making this viable",
      "fastestMVP": "what the MVP looks like (be specific)",
      "goToMarket": "best acquisition channel: outbound | communities | partnerships | SEO | product-led | integration-led | referrals",
      "whySmallTeamCanWin": "why 1-5 people can pull this off",
      "potentialMoat": "defensibility over time",
      "expansionPath": "how it grows after initial niche",
      "biggestRisk": "the hidden risk most people would miss"
    }
  ]
}`,
    },
  ];

  return thinkDeep(messages, { jsonMode: true, temperature: 0.8, maxTokens: 8192 });
}
