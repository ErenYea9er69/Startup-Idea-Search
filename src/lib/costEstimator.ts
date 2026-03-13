interface CostEstimate {
  estimatedTavilyCredits: number;
  estimatedTokens: number;
  breakdown: {
    phase: string;
    tavilyCredits: number;
    estimatedTokens: number;
  }[];
}

export function estimateCost(config: {
  maxIterations: number;
  searchDepth: string;
  ideasPerIteration?: number;
}): CostEstimate {
  const { maxIterations, searchDepth, ideasPerIteration = 4 } = config;
  const creditsPerSearch = searchDepth === 'advanced' ? 2 : 1;

  const breakdown = [];

  // Per iteration
  const researchSearches = 5; // 5 multi-angle searches
  const validationSearches = ideasPerIteration * 3; // 3 Tavily-verified phases per idea
  const actionPlanSearches = 1;

  const perIterationCredits = (researchSearches + validationSearches + actionPlanSearches) * creditsPerSearch;

  // Token estimates per iteration
  const researchTokens = 15000; // research brief + query gen + synthesis
  const ideaGenTokens = 10000; // idea gen + trap ideas + screening
  const validationTokens = ideasPerIteration * 8 * 3000; // 8 phases × ~3k tokens each
  const scoringTokens = ideasPerIteration * 2000;
  const actionPlanTokens = 5000;

  const perIterationTokens = researchTokens + ideaGenTokens + validationTokens + scoringTokens + actionPlanTokens;

  for (let i = 1; i <= maxIterations; i++) {
    breakdown.push({
      phase: `Iteration ${i}`,
      tavilyCredits: perIterationCredits,
      estimatedTokens: perIterationTokens,
    });
  }

  return {
    estimatedTavilyCredits: perIterationCredits * maxIterations,
    estimatedTokens: perIterationTokens * maxIterations,
    breakdown,
  };
}
