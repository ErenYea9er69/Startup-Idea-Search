export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const run = await prisma.pipelineRun.findUnique({
      where: { id },
      include: {
        iterations: { orderBy: { number: 'asc' } },
        ideas: { orderBy: { overallScore: 'desc' } },
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
