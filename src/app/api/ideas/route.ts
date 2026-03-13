export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const order = searchParams.get('order') || 'desc';

  try {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { industry: { contains: search } },
        { problem: { contains: search } },
      ];
    }

    const ideas = await prisma.idea.findMany({
      where,
      orderBy: { [sortBy]: order },
      take: 50,
    });

    return NextResponse.json(ideas);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idea = await prisma.idea.create({
      data: {
        name: body.name,
        industry: body.industry || '',
        problem: body.problem || '',
        customer: body.customer || '',
        status: 'promising',
      },
    });

    return NextResponse.json(idea);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
