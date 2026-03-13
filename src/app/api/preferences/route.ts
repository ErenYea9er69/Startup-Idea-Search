export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let prefs = await prisma.userPreference.findUnique({ where: { id: 'default' } });
    if (!prefs) {
      prefs = await prisma.userPreference.create({
        data: { id: 'default' },
      });
    }
    return NextResponse.json(prefs);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  try {
    const prefs = await prisma.userPreference.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        ...body,
      },
      update: body,
    });

    return NextResponse.json(prefs);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
