export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { thinkDeep } from '@/lib/longcat';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const messages = await prisma.chatMessage.findMany({
      where: { ideaId: id },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const idea = await prisma.idea.findUnique({ where: { id } });
    if (!idea) return NextResponse.json({ error: 'Idea not found' }, { status: 404 });

    // Save user message
    await prisma.chatMessage.create({
      data: { ideaId: id, role: 'user', content: body.message },
    });

    // Get chat history
    const history = await prisma.chatMessage.findMany({
      where: { ideaId: id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // Build context
    const messages = [
      {
        role: 'system' as const,
        content: `You are a startup advisor having a deep-dive conversation about a specific startup idea. You have full context of its validation analysis. Be helpful, specific, and actionable.

IDEA CONTEXT:
Name: ${idea.name}
Industry: ${idea.industry}
Problem: ${idea.problem}
Score: ${idea.overallScore}/100
Status: ${idea.status}
Validation: ${JSON.stringify(idea.validation || {}).slice(0, 3000)}`,
      },
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const response = await thinkDeep(messages, { temperature: 0.7 });

    // Save assistant response
    await prisma.chatMessage.create({
      data: { ideaId: id, role: 'assistant', content: response },
    });

    return NextResponse.json({ role: 'assistant', content: response });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
