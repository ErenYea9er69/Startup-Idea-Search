export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { estimateCost } from '@/lib/costEstimator';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const estimate = estimateCost({
    maxIterations: body.maxIterations || 5,
    searchDepth: body.searchDepth || 'advanced',
    ideasPerIteration: body.ideasPerIteration || 4,
  });

  return NextResponse.json(estimate);
}
