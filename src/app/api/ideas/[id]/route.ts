export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const idea = await prisma.idea.findUnique({
      where: { id },
      include: { chatMessages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!idea) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(idea);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const idea = await prisma.idea.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.userNotes !== undefined && { userNotes: body.userNotes }),
        ...(body.category !== undefined && { category: body.category }),
      },
    });

    return NextResponse.json(idea);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.idea.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
