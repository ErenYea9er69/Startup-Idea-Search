import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    // 1. Mark all active runs in DB as stopped
    await prisma.pipelineRun.updateMany({
      where: {
        status: { in: ['running', 'queued'] }
      },
      data: { status: 'stopped' }
    });

    // 2. Update global status map to signal current running processes to stop
    const global = globalThis as any;
    if (global.__pipelineStatus) {
      Object.keys(global.__pipelineStatus).forEach(id => {
        if (global.__pipelineStatus[id] === 'running') {
          global.__pipelineStatus[id] = 'stopped';
        }
      });
    }

    return NextResponse.json({ success: true, message: 'All active pipelines signaled to stop' });
  } catch (error) {
    console.error('[StopAll] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
