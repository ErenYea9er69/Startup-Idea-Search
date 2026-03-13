export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const action = body.action;

  try {
    if (action === 'pause') {
      await prisma.pipelineRun.update({ where: { id }, data: { status: 'paused' } });
      return NextResponse.json({ status: 'paused' });
    }

    if (action === 'resume') {
      await prisma.pipelineRun.update({ where: { id }, data: { status: 'running' } });
      return NextResponse.json({ status: 'resumed' });
    }

    if (action === 'cancel') {
      await prisma.pipelineRun.update({ where: { id }, data: { status: 'cancelled' } });
      const global = globalThis as any;
      if (global.__pipelineStatus) global.__pipelineStatus[id] = 'failed';
      return NextResponse.json({ status: 'cancelled' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
