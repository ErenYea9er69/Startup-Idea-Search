import { thinkDeep } from '../longcat';

export async function validateProblem(idea: string, webEvidence: string): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: `You are a ruthless startup validator. Phase 1: PROBLEM REALITY TEST. Your job is to determine if the problem is REAL and meaningful, not imagined. Use the web evidence provided to back your analysis.`,
    },
    {
      role: 'user' as const,
      content: `Validate this startup idea's problem.

IDEA:
${idea}

WEB EVIDENCE:
${webEvidence}

Analyze:
- Who actually experiences this problem
- How frequently it occurs
- How painful it is (1-10)
- Whether people are already paying to solve it
- Whether it's a must-have or a nice-to-have

Warning signs to check:
- Artificial or weak problem
- Problem only developers find interesting
- Problem people tolerate without paying

Output JSON:
{
  "problemExists": true/false,
  "whoExperiences": "description",
  "frequency": "daily | weekly | monthly | rarely",
  "painLevel": 8,
  "alreadyPayingToSolve": true/false,
  "mustHaveOrNiceToHave": "must-have | nice-to-have",
  "warningSignsFound": ["list of concerns"],
  "evidenceFromWeb": ["specific findings from web evidence"],
  "problemStrengthScore": 7,
  "summary": "one paragraph brutally honest assessment"
}`,
    },
  ];

  return thinkDeep(messages, { jsonMode: true, temperature: 0.5 });
}
