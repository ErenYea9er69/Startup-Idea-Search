export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let profile = await prisma.founderProfile.findUnique({ where: { id: 'default' } });
    if (!profile) {
      profile = await prisma.founderProfile.create({
        data: { id: 'default' },
      });
    }
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  try {
    const profile = await prisma.founderProfile.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...body },
      update: body,
    });

    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
