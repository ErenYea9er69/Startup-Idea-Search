export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runPipeline, PipelineConfig, PipelineEvent } from '@/lib/pipeline';
import { estimateCost } from '@/lib/costEstimator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config: PipelineConfig = {
      focusAreas: body.focusAreas || [],
      excludedCategories: body.excludedCategories || [],
      scoringThreshold: body.scoringThreshold || 70,
      maxIterations: body.maxIterations || 5,
      searchDepth: body.searchDepth || 'advanced',
      country: body.country,
      customCriteria: body.customCriteria,
    };

    const estimate = estimateCost({
      maxIterations: config.maxIterations,
      searchDepth: config.searchDepth,
    });

    const run = await prisma.pipelineRun.create({
      data: {
        config: config as any,
        status: 'queued',
        estimatedCost: estimate as any,
      },
    });

    // Start pipeline in background (non-blocking)
    const events: PipelineEvent[] = [];
    const eventCallback = (event: PipelineEvent) => {
      events.push(event);
    };

    // Store events in a global map for SSE streaming
    const global = globalThis as any;
    if (!global.__pipelineEvents) global.__pipelineEvents = {};
    if (!global.__pipelineStatus) global.__pipelineStatus = {};
    global.__pipelineEvents[run.id] = events;
    global.__pipelineStatus[run.id] = 'running';

    // Run pipeline asynchronously
    runPipeline(run.id, config, eventCallback)
      .then(() => {
        global.__pipelineStatus[run.id] = 'completed';
      })
      .catch((err) => {
        global.__pipelineStatus[run.id] = 'failed';
        events.push({
          type: 'error',
          data: { error: String(err) },
          timestamp: new Date().toISOString(),
        });
      });

    return NextResponse.json({
      id: run.id,
      status: 'queued',
      estimatedCost: estimate,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const runs = await prisma.pipelineRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        _count: {
          select: { ideas: true, iterations: true },
        },
      },
    });

    return NextResponse.json(runs);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
