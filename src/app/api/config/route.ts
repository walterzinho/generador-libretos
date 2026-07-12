import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    let settings = await db.settings.findUnique({ where: { id: 'main' } });
    if (!settings) {
      settings = await db.settings.create({ data: { id: 'main' } });
    }
    return NextResponse.json({
      geminiConfigured: !!settings.geminiApiKey,
      geminiModel: settings.geminiModel || 'gemini-2.5-flash',
      notionConfigured: !!settings.notionToken,
      notionDbReady: !!settings.notionDbId,
    });
  } catch {
    return NextResponse.json({ error: 'Error al leer configuración' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { geminiApiKey, notionToken, geminiModel } = body;

    let settings = await db.settings.findUnique({ where: { id: 'main' } });
    if (!settings) {
      settings = await db.settings.create({ data: { id: 'main' } });
    }

    const updated = await db.settings.update({
      where: { id: 'main' },
      data: {
        ...(geminiApiKey !== undefined && { geminiApiKey }),
        ...(geminiModel !== undefined && { geminiModel }),
        ...(notionToken !== undefined && { notionToken }),
      },
    });

    return NextResponse.json({ success: true, config: { geminiConfigured: !!updated.geminiApiKey, geminiModel: updated.geminiModel || 'gemini-2.5-flash', notionConfigured: !!updated.notionToken, notionDbReady: !!updated.notionDbId } });
  } catch {
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 });
  }
}