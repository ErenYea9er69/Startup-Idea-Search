import { prisma } from './prisma';
import { retryWithBackoff } from './retryHandler';
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
  if (!text) return fallback;
  try {
    // Basic cleanup
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let jsonStr = jsonMatch ? jsonMatch[0] : text;
    
    // JSON REPAIR: If it looks truncated (missing closing braces), try to fix
    let openBraces = (jsonStr.match(/\{/g) || []).length;
    let closeBraces = (jsonStr.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      console.warn(`[Pipeline] Attempting to repair truncated JSON (${openBraces} vs ${closeBraces})`);
      jsonStr += '}'.repeat(openBraces - closeBraces);
    }

    return JSON.parse(jsonStr);
  } catch (err) {
    console.warn('[Pipeline] Failed to parse JSON from text:', text.substring(0, 100) + '...');
    return fallback;
  }
}

async function checkCancellation(runId: string) {
  const global = globalThis as any;
  const memStatus = global.__pipelineStatus?.[runId];
  
  // Check memory first for speed
  if (memStatus === 'stopped') {
    console.log(`[Pipeline][StopCheck] STOPPED (Memory) for run ${runId}`);
    throw new Error('Pipeline stopped by user');
  }

  // Check DB as source of truth
  const run = await prisma.pipelineRun.findUnique({
    where: { id: runId },
    select: { status: true }
  });
  
  if (run?.status === 'stopped') {
    console.log(`[Pipeline][StopCheck] STOPPED (DB) for run ${runId}`);
    if (global.__pipelineStatus) {
      global.__pipelineStatus[runId] = 'stopped';
    }
    throw new Error('Pipeline stopped by user');
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

    // Load rejected ideas (Deep Failure Memory)
    const rejectedIdeas = await prisma.rejectedIdea.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    const rejectedContext = rejectedIdeas.map((r) => `- ${r.name}: ${r.reason} (Failed Phase: ${r.failedPhase || 'Unknown'})`).join('\n');
    const rejectedNamesOnly = rejectedIdeas.map(r => r.name);

    let iteration = 0;
    let hasWinners = false;
    let successCount = 0;

    while (iteration < config.maxIterations && !hasWinners) {
      await checkCancellation(runId);
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
              .join('\n')
          : '';

        const fullFailureContext = `HISTORICAL REJECTIONS:\n${rejectedContext}\n\nPREVIOUS ITERATION LESSONS:\n${previousFailures}`;

        const researchPlanRaw = await planResearch(
          config.focusAreas,
          config.excludedCategories,
          fullFailureContext,
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
      const queriesRaw = await buildSearchQueries(
        researchPlanRaw, 
        config.focusAreas, 
        fullFailureContext
      );
      const queries = safeJsonParse(queriesRaw) as { queries?: { query: string; type: string }[] };
      const queryList = queries.queries || [];
      emit('queries_built', { queries: queryList });

      // ═══ STEP 3: Multi-Angle Search ═══
      await checkCancellation(runId);
      emit('phase_start', { phase: 'searching', iteration });
      await prisma.pipelineRun.update({ where: { id: runId }, data: { currentPhase: 'searching', currentStep: 3 } });

      const allResults: SearchResult[] = [];
      const searchPromises = queryList.map(async (q) => {
        try {
          await checkCancellation(runId);
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
      await checkCancellation(runId);
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
      await checkCancellation(runId);
      emit('phase_start', { phase: 'generating_ideas', iteration });
      await prisma.pipelineRun.update({ where: { id: runId }, data: { currentPhase: 'generating_ideas', currentStep: 6 } });
      const ideasRaw = await generateIdeas(synthesisRaw, rejectedNamesOnly, founderStr, config.customCriteria);
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
      const screenRaw = await quickScreen(JSON.stringify(ideas), rejectedNamesOnly);
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

      // ═══ STEP 9: Deep Validation ═══
      emit('phase_start', { phase: 'deep_validation', iteration });
      await prisma.pipelineRun.update({ where: { id: runId }, data: { currentPhase: 'deep_validation', currentStep: 9 } });

      const validatedResults: any[] = [];
      
      // Sequential processing to prevent API bursts and handle each idea with full retry attention
      for (const idea of survivors) {
        await checkCancellation(runId);
        const ideaName = String(idea.name);
        const ideaIndustry = String(idea.industry);
        const ideaProblem = String(idea.problem || '');
        const ideaStr = JSON.stringify(idea);

        let problemEvidence: any = { results: [] };
        let compResults: any = { results: [] };
        let pricingResults: any = { results: [] };

        // Helper for micro-phase retries within the idea validation
        const runPhase = async (name: string, phase: number, fn: () => Promise<string>) => {
          // HEARTBEAT: Prevent 30min stream timeout during long calculations
          const heartbeat = setInterval(() => {
            emit('pulse', { idea: ideaName, phase });
          }, 30000); // Pulse every 30s

          try {
            return await retryWithBackoff(async () => {
               emit('validation', { idea: ideaName, phase, name });
               const raw = await fn();
               const parsed = safeJsonParse(raw);
               // Basic ghost protection: if it's empty or null, something went wrong
               if (!parsed || Object.keys(parsed).length === 0) {
                 throw new Error(`Empty response from AI in ${name}`);
               }
               return { raw, parsed };
            }, 2); // 2 internal retries per phase
          } finally {
            clearInterval(heartbeat);
          }
        };

        try {
          // Phase 1: Problem Reality
          const { parsed: phase1, raw: phase1Raw } = await runPhase('Problem Reality Test', 1, async () => {
            problemEvidence = await verifyProblem(ideaProblem, ideaIndustry);
            return await validateProblem(ideaStr, summarizeResults(problemEvidence.results));
          });

          // Phase 2: Competitor Investigation
          const { parsed: phase2, raw: phase2Raw } = await runPhase('Competitor Investigation', 2, async () => {
            compResults = await searchCompetitors(ideaName, ideaIndustry);
            return await validateCompetitors(ideaStr, summarizeResults(compResults.results));
          });

          // Phase 3: Competition Saturation
          const { parsed: phase3, raw: phase3Raw } = await runPhase('Competition Saturation', 3, async () => {
            return await validateCompetition(ideaStr, phase2Raw);
          });

          // Phase 4: Build Feasibility
          const { parsed: phase4 } = await runPhase('Build Feasibility', 4, async () => {
            return await validateFeasibility(ideaStr, founderStr);
          });

          // Phase 5: Market & Monetization
          const { parsed: phase5 } = await runPhase('Market & Monetization', 5, async () => {
            pricingResults = await searchPricing(ideaName, ideaIndustry);
            return await validateMarket(ideaStr, summarizeResults(pricingResults.results));
          });

          // Phase 6: Differentiation
          const { parsed: phase6 } = await runPhase('Differentiation Stress Test', 6, async () => {
            return await validateDifferentiation(ideaStr, phase2Raw);
          });

          // Phase 7: Failure Scenarios
          const { parsed: phase7 } = await runPhase('Failure Scenarios', 7, async () => {
            const contextSoFar = JSON.stringify({ phase1, phase2, phase3, phase4, phase5, phase6 });
            return await validateFailures(ideaStr, contextSoFar);
          });

          // Phase 8: Final Scoring
          const { parsed: phase8 } = await runPhase('Final Scoring', 8, async () => {
            const allPhases = JSON.stringify({ phase1, phase2, phase3, phase4, phase5, phase6, phase7 });
            const raw = await finalScoring(ideaStr, allPhases, founderStr);
            const parsed = safeJsonParse(raw);
            
            // GHOST IDEA PROTECTION: Ensure scores exist and are valid
            const s = parsed.scores || {};
            const total = Object.values(s).reduce((a: any, b: any) => a + b, 0);
            if (total === 0) {
              throw new Error("GHOST IDEA DETECTED: AI returned 0 scores on all metrics. Retrying final scoring.");
            }
            return raw;
          });

          // Collect sources
          const sources = [
            ...(problemEvidence.results || []).map((r: any) => r.url),
            ...(compResults.results || []).map((r: any) => r.url),
            ...(pricingResults.results || []).map((r: any) => r.url),
          ].filter(Boolean).slice(0, 20);
          
          validatedResults.push({
            idea,
            validation: { phase1, phase2, phase3, phase4, phase5, phase6, phase7, phase8 },
            scores: phase8.scores,
            compositeScores: phase8.compositeScores,
            overallScore: Number((phase8.compositeScores as any)?.overallWinnability || 0),
            category: phase8.category,
            verdict: phase8.verdict,
            verdictLabel: phase8.verdictLabel,
            founderFitScore: phase8.founderFitScore,
            competitors: phase2.competitors,
            sources,
          });

        } catch (err) {
          emit('validation_error', { idea: ideaName, error: String(err) });
          console.error(`[Pipeline] Failed to validate idea ${ideaName}:`, err);
        }
      }

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
        
        // If it was stopped by user, don't continue to next iteration
        if (errMsg.includes('stopped by user')) {
          console.log(`[Pipeline] Termination confirmed for ${runId}`);
          return;
        }
        
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
