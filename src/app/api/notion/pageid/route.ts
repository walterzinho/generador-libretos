import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const settings = await db.settings.findUnique({ where: { id: 'main' } });

    if (!settings?.notionToken) {
      return NextResponse.json({ error: 'Token de Notion no configurado' }, { status: 400 });
    }

    const { pageId } = await req.json();

    if (!pageId?.trim()) {
      return NextResponse.json({ error: 'Page ID requerido' }, { status: 400 });
    }

    await db.settings.update({
      where: { id: 'main' },
      data: { notionPageId: pageId.trim() },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al guardar Page ID' }, { status: 500 });
  }
}