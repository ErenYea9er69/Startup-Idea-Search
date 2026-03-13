import { prisma } from './prisma';
import { searchMarketGaps, searchStartupEcosystem, searchTrends, searchCompetitors, verifyProblem, searchPricing, getTavilyCredits, resetCreditCounter, SearchResult } from './tavily';
import { getTokensUsed, resetTokenCounter } from './longcat';
import { filterSearchResults, summarizeResults } from './qualityFilter';
import { planResearch } from './prompts/planResearch';
import { buildSearchQueries } from './prompts/buildSearchQueries';
import { synthesizeResearch } from './prompts/synthesizeResearch';
import { generateIdeas } from './prompts/generateIdeas';
import { generateTrapIdeas } from './prompts/generateTrapIdeas';
import { quickScreen } from './prompts/quickScreen';
import { validateProblem } from './prompts/validateProblem';
import { validateCompetitors } from './prompts/validateCompetitors';
import { validateCompetition } from './prompts/validateCompetition';
import { validateFeasibility } from './prompts/validateFeasibility';
import { validateMarket } from './prompts/validateMarket';
import { validateDifferentiation } from './prompts/validateDifferentiation';
import { validateFailures } from './prompts/validateFailures';
import { finalScoring } from './prompts/finalScoring';
import { generateActionPlan } from './prompts/generateActionPlan';
import { extractPivotLessons } from './pivotEngine';

export interface PipelineConfig {
  focusAreas: string[];
  excludedCategories: string[];
  scoringThreshold: number;
  maxIterations: number;
  searchDepth: string;
  country?: string;
  customCriteria?: string;
}

export interface PipelineEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

type EventCallback = (event: PipelineEvent) => void;

function safeJsonParse(text: string, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  try {
    // Attempt to find JSON block
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const cleaned = jsonMatch[0].trim();
      return JSON.parse(cleaned);
    }
    
    // Fallback to original cleaning if no match
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    console.warn('[Pipeline] Failed to parse JSON from text:', text.substring(0, 100) + '...');
    return fallback;
  }
}

export async function runPipeline(
  runId: string,
  config: PipelineConfig,
  onEvent: EventCallback
): Promise<void> {
  resetTokenCounter();
  resetCreditCounter();

  const emit = (type: string, data: Record<string, unknown>) => {
    onEvent({ type, data, timestamp: new Date().toISOString() });
  };

  try {
    await prisma.pipelineRun.update({
      where: { id: runId },
      data: { status: 'running', currentPhase: 'init' },
    });

    // Load founder profile
    const founderProfile = await prisma.founderProfile.findUnique({ where: { id: 'default' } });
    const founderStr = founderProfile
      ? `Skills: ${JSON.stringify(founderProfile.skills)}, Budget: ${founderProfile.budget}, Team: ${founderProfile.teamSize}, Time: ${founderProfile.timeCommitment}`
      : 'No profile set — assume solo technical founder';

    // Load rejected ideas
    const rejectedIdeas = await prisma.rejectedIdea.findMany();
    const rejectedNames = rejectedIdeas.map((r) => `${r.name} (rejected because: ${r.reason})`);

    let iteration = 0;
    let hasWinners = false;
    let successCount = 0;

    while (iteration < config.maxIterations && !hasWinners) {
      iteration++;
      emit('iteration_start', { iteration, maxIterations: config.maxIterations });

      // Check if paused
      const currentRun = await prisma.pipelineRun.findUnique({ where: { id: runId } });
      if (currentRun?.status === 'paused' || currentRun?.status === 'cancelled') {
        emit('pipeline_paused', { iteration });
        return;
      }

      try {
        // ═══ STEP 1: Research Planning ═══
        emit('phase_start', { phase: 'research_planning', iteration });
        await prisma.pipelineRun.update({ where: { id: runId }, data: { currentPhase: 'research_planning', currentStep: 1 } });

        const previousFailures = iteration > 1
          ? (await prisma.iteration.findMany({ where: { runId }, orderBy: { number: 'desc' }, take: 1 }))
              .map((i) => JSON.stringify(i.failureLessons || ''))
          : [];

        const researchPlanRaw = await planResearch(
          config.focusAreas,
          config.excludedCategories,
          [...rejectedNames.slice(0, 10), ...previousFailures],
          founderProfile ? (founderProfile.skills as string[]) : [],
          config.customCriteria
        );
        const researchPlan = safeJsonParse(researchPlanRaw);
        if (!researchPlan || Object.keys(researchPlan).length === 0) {
           throw new Error('Failed to generate valid research plan JSON');
        }
        emit('research_plan', { plan: researchPlan });

      // ═══ STEP 2: Build Search Queries ═══
      emit('phase_start', { phase: 'building_queries', iteration });
      const queriesRaw = await buildSearchQueries(researchPlanRaw, config.focusAreas, rejectedNames.slice(0, 10));
      const queries = safeJsonParse(queriesRaw) as { queries?: { query: string; type: string }[] };
      const queryList = queries.queries || [];
      emit('queries_built', { queries: queryList });

      // ═══ STEP 3: Multi-Angle Search ═══
      emit('phase_start', { phase: 'searching', iteration });
      await prisma.pipelineRun.update({ where: { id: runId }, data: { currentPhase: 'searching', currentStep: 3 } });

      const allResults: SearchResult[] = [];
      const searchPromises = queryList.map(async (q) => {
        try {
          let results;
          if (q.type === 'ecosystem') {
            results = await searchStartupEcosystem(q.query);
          } else if (q.type === 'trends') {
            results = await searchTrends(q.query);
          } else {
            results = await searchMarketGaps(q.query, { searchDepth: config.searchDepth === 'basic' ? 'basic' : 'advanced' });
          }
          emit('search_result', { query: q.query, resultCount: results.results.length });
          return results.results;
        } catch (err) {
          emit('search_error', { query: q.query, error: String(err) });
          return [];
        }
      });

      const searchResultArrays = await Promise.all(searchPromises);
      for (const arr of searchResultArrays) {
        allResults.push(...arr);
      }

      // ═══ STEP 4: Quality Filter ═══
      const filtered = filterSearchResults(allResults);
      emit('filtered', { rawCount: allResults.length, filteredCount: filtered.length });
      const searchSummary = summarizeResults(filtered);

      // Save iteration search data
      const iterationRecord = await prisma.iteration.create({
        data: {
          runId,
          number: iteration,
          researchBrief: researchPlan as any,
          searchQueries: queryList as any,
          rawSearchResults: allResults.slice(0, 20) as any,
          filteredResults: filtered.slice(0, 15) as any,
        },
      });

      // ═══ STEP 5: Synthesize Research ═══
      emit('phase_start', { phase: 'synthesizing', iteration });
      await prisma.pipelineRun.update({ where: { id: runId }, data: { currentPhase: 'synthesizing', currentStep: 5 } });
      const synthesisRaw = await synthesizeResearch(searchSummary);
      const synthesis = safeJsonParse(synthesisRaw);
      emit('synthesis_complete', { topInsight: synthesis.topInsight || 'Research synthesized' });

      await prisma.iteration.update({
        where: { id: iterationRecord.id },
        data: { synthesizedResearch: synthesisRaw },
      });

      // ═══ STEP 6: Generate Ideas ═══
      emit('phase_start', { phase: 'generating_ideas', iteration });
      await prisma.pipelineRun.update({ where: { id: runId }, data: { currentPhase: 'generating_ideas', currentStep: 6 } });
      const ideasRaw = await generateIdeas(synthesisRaw, rejectedNames, founderStr, config.customCriteria);
      const ideasData = safeJsonParse(ideasRaw) as { ideas?: Record<string, unknown>[] };
      const ideas = ideasData.ideas || [];
      emit('ideas_generated', { count: ideas.length, ideas: ideas.map((i) => ({ name: i.name, industry: i.industry })) });

      await prisma.iteration.update({
        where: { id: iterationRecord.id },
        data: { generatedIdeas: ideas as any },
      });

      // ═══ STEP 7: Generate Trap Ideas ═══
      emit('phase_start', { phase: 'trap_detection', iteration });
      const trapRaw = await generateTrapIdeas(synthesisRaw);
      const trapData = safeJsonParse(trapRaw) as { trapIdeas?: Record<string, unknown>[] };
      const trapIdeas = trapData.trapIdeas || [];

      await prisma.iteration.update({
        where: { id: iterationRecord.id },
        data: { trapIdeas: trapIdeas as any },
      });

      // Save trap ideas to DB
      for (const trap of trapIdeas) {
        try {
          await prisma.idea.create({
            data: {
              runId,
              name: String(trap.name || 'Unnamed Trap'),
              industry: String(trap.industry || 'Unknown'),
              problem: String(trap.whyAttractive || ''),
              customer: '',
              status: 'trap',
              validation: trap as any,
            },
          });
        } catch {}
      }

      emit('traps_identified', { count: trapIdeas.length });

      // ═══ STEP 8: Quick Screen ═══
      emit('phase_start', { phase: 'screening', iteration });
      const screenRaw = await quickScreen(JSON.stringify(ideas), rejectedNames);
      const screenData = safeJsonParse(screenRaw) as { survivors?: { name: string }[]; killed?: { name: string; reason: string }[] };
      const survivorNames = (screenData.survivors || []).map((s) => s.name);
      const survivors = ideas.filter((i) => survivorNames.includes(String(i.name)));
      emit('screening_complete', { survived: survivors.length, killed: (screenData.killed || []).length });

      if (survivors.length === 0) {
        emit('no_survivors', { iteration });
        const lessons = await extractPivotLessons(screenData.killed || [], []);
        await prisma.iteration.update({
          where: { id: iterationRecord.id },
          data: { failureLessons: lessons as any, pivotReason: 'All ideas killed in quick screen' },
        });
        continue;
      }

      // ═══ STEP 9: Deep Validation ═══
      emit('phase_start', { phase: 'deep_validation', iteration });
      await prisma.pipelineRun.update({ where: { id: runId }, data: { currentPhase: 'deep_validation', currentStep: 9 } });

      const validationPromises = survivors.map(async (idea) => {
        const ideaStr = JSON.stringify(idea);
        const ideaName = String(idea.name);
        const ideaIndustry = String(idea.industry);
        const ideaProblem = String(idea.problem || '');

        try {
          // Phase 1: Problem Reality + Tavily verify
          emit('validation', { idea: ideaName, phase: 1, name: 'Problem Reality Test' });
          const problemEvidence = await verifyProblem(ideaProblem, ideaIndustry);
          const phase1Raw = await validateProblem(ideaStr, summarizeResults(problemEvidence.results));
          const phase1 = safeJsonParse(phase1Raw);

          // Phase 2: Competitor Search + Tavily
          emit('validation', { idea: ideaName, phase: 2, name: 'Competitor Investigation' });
          const compResults = await searchCompetitors(ideaName, ideaIndustry);
          const phase2Raw = await validateCompetitors(ideaStr, summarizeResults(compResults.results));
          const phase2 = safeJsonParse(phase2Raw);

          // Phase 3: Competition Saturation
          emit('validation', { idea: ideaName, phase: 3, name: 'Competition Saturation' });
          const phase3Raw = await validateCompetition(ideaStr, phase2Raw);
          const phase3 = safeJsonParse(phase3Raw);

          // Phase 4: Build Feasibility
          emit('validation', { idea: ideaName, phase: 4, name: 'Build Feasibility' });
          const phase4Raw = await validateFeasibility(ideaStr, founderStr);
          const phase4 = safeJsonParse(phase4Raw);

          // Phase 5: Market & Monetization + Tavily
          emit('validation', { idea: ideaName, phase: 5, name: 'Market & Monetization' });
          const pricingResults = await searchPricing(ideaName, ideaIndustry);
          const phase5Raw = await validateMarket(ideaStr, summarizeResults(pricingResults.results));
          const phase5 = safeJsonParse(phase5Raw);

          // Phase 6: Differentiation
          emit('validation', { idea: ideaName, phase: 6, name: 'Differentiation Stress Test' });
          const phase6Raw = await validateDifferentiation(ideaStr, phase2Raw);
          const phase6 = safeJsonParse(phase6Raw);

          // Phase 7: Failure Scenarios
          emit('validation', { idea: ideaName, phase: 7, name: 'Failure Scenarios' });
          const contextSoFar = JSON.stringify({ phase1, phase2, phase3, phase4, phase5, phase6 });
          const phase7Raw = await validateFailures(ideaStr, contextSoFar);
          const phase7 = safeJsonParse(phase7Raw);

          // Phase 8: Final Scoring
          emit('validation', { idea: ideaName, phase: 8, name: 'Final Scoring' });
          const allPhases = JSON.stringify({ phase1, phase2, phase3, phase4, phase5, phase6, phase7 });
          const phase8Raw = await finalScoring(ideaStr, allPhases, founderStr);
          const phase8 = safeJsonParse(phase8Raw);

          // Collect sources
          const sources = [
            ...problemEvidence.results.map((r) => r.url),
            ...compResults.results.map((r) => r.url),
            ...pricingResults.results.map((r) => r.url),
          ].filter(Boolean).slice(0, 20);

          const overallScore = Number((phase8.compositeScores as Record<string, number>)?.overallWinnability || 0);

          return {
            idea,
            validation: { phase1, phase2, phase3, phase4, phase5, phase6, phase7, phase8 },
            scores: phase8.scores,
            compositeScores: phase8.compositeScores,
            overallScore,
            category: phase8.category,
            verdict: phase8.verdict,
            verdictLabel: phase8.verdictLabel,
            founderFitScore: phase8.founderFitScore,
            competitors: phase2.competitors,
            sources,
          };
        } catch (err) {
          emit('validation_error', { idea: ideaName, error: String(err) });
          return null;
        }
      });

      const validatedResults = (await Promise.all(validationPromises)).filter(Boolean);

      // ═══ STEP 10: Score & Decide ═══
      emit('phase_start', { phase: 'scoring', iteration });

      const iterationRejections: { name: string; reason: string }[] = [];

      for (const result of validatedResults) {
        if (!result) continue;

        const isWinner = result.overallScore >= config.scoringThreshold;
        const status = isWinner ? 'promising' : 'rejected';

        // Save idea to DB
        const savedIdea = await prisma.idea.create({
          data: {
            runId,
            name: String(result.idea.name),
            industry: String(result.idea.industry),
            businessType: String(result.idea.businessType || ''),
            problem: String(result.idea.problem || ''),
            customer: String(result.idea.customer || ''),
            budgetOwner: String(result.idea.budgetOwner || ''),
            currentWorkaround: String(result.idea.currentWorkaround || ''),
            whyNow: String(result.idea.whyNow || ''),
            fastestMVP: String(result.idea.fastestMVP || ''),
            goToMarket: String(result.idea.goToMarket || ''),
            status,
            category: String(result.category || ''),
            overallScore: result.overallScore,
            scores: result.scores as any,
            compositeScores: result.compositeScores as any,
            validation: result.validation as any,
            sources: result.sources as any,
            competitors: result.competitors as any,
            founderFitScore: Number(result.founderFitScore) || undefined,
          },
        });

        if (isWinner) {
          hasWinners = true;
          emit('idea_accepted', { name: result.idea.name, score: result.overallScore, verdict: result.verdictLabel, category: result.category });

          // Generate action plan for winners
          emit('phase_start', { phase: 'action_plan', iteration });
          try {
            const planRaw = await generateActionPlan(JSON.stringify(result.idea), JSON.stringify(result.validation));
            const plan = safeJsonParse(planRaw);
            await prisma.idea.update({
              where: { id: savedIdea.id },
              data: { actionPlan: plan as any },
            });
            emit('action_plan_generated', { idea: result.idea.name });
          } catch {}
        } else {
          const reason = String(result.verdictLabel || `Score ${result.overallScore} below threshold ${config.scoringThreshold}`);
          emit('idea_rejected', { name: result.idea.name, score: result.overallScore, reason });

          // Add to blacklist
          try {
            await prisma.rejectedIdea.create({
              data: {
                name: String(result.idea.name),
                reason,
                category: String(result.idea.industry || ''),
                failedPhase: findWeakestPhase(result.scores as Record<string, number>),
              },
            });
          } catch {}

          iterationRejections.push({ name: String(result.idea.name), reason });
        }
      }

      // Update iteration with failure lessons
      if (iterationRejections.length > 0) {
        const lessons = await extractPivotLessons(iterationRejections, validatedResults);
        await prisma.iteration.update({
          where: { id: iterationRecord.id },
          data: {
            failureLessons: lessons as any,
            pivotReason: hasWinners ? undefined : `${iterationRejections.length} ideas rejected. ${JSON.stringify(lessons).slice(0, 200)}`,
          },
        });
        emit('pivot_learning', { lessons });
      }

      // Update run stats
      await prisma.pipelineRun.update({
        where: { id: runId },
        data: {
          totalIterations: iteration,
          tokensUsed: getTokensUsed(),
          tavilyCredits: getTavilyCredits(),
          currentStep: 12,
        },
      });

      successCount++;
      } catch (iterationError) {
        const errMsg = iterationError instanceof Error ? iterationError.message : String(iterationError);
        console.error(`[Pipeline] Iteration ${iteration} failed: ${errMsg}`);
        emit('iteration_error', { iteration, error: errMsg });
        // Continue to next iteration instead of crashing the entire pipeline
        continue;
      }
    }

    if (successCount === 0 && iteration > 0) {
      throw new Error(`Pipeline failed: All ${iteration} iterations encountered errors. Check logs for details.`);
    }

    // ═══ PIPELINE COMPLETE ═══
    const promisingCount = await prisma.idea.count({ where: { runId, status: 'promising' } });
    const rejectedCount = await prisma.idea.count({ where: { runId, status: 'rejected' } });
    const trapCount = await prisma.idea.count({ where: { runId, status: 'trap' } });

    await prisma.pipelineRun.update({
      where: { id: runId },
      data: {
        status: 'completed',
        currentPhase: 'done',
        tokensUsed: getTokensUsed(),
        tavilyCredits: getTavilyCredits(),
      },
    });

    emit('complete', {
      promisingCount,
      rejectedCount,
      trapCount,
      iterations: iteration,
      tokensUsed: getTokensUsed(),
      tavilyCredits: getTavilyCredits(),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await prisma.pipelineRun.update({
      where: { id: runId },
      data: {
        status: 'failed',
        errorLog: { error: errorMsg, tokensUsed: getTokensUsed(), tavilyCredits: getTavilyCredits() } as any,
      },
    });
    emit('error', { error: errorMsg });
    throw error;
  }
}

function findWeakestPhase(scores: Record<string, number> | undefined): string | undefined {
  if (!scores) return undefined;
  let weakest = '';
  let lowest = 11;
  for (const [key, val] of Object.entries(scores)) {
    if (typeof val === 'number' && val < lowest) {
      lowest = val;
      weakest = key;
    }
  }
  return weakest || undefined;
}
