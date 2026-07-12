import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    let settings = await db.settings.findUnique({ where: { id: 'main' } });
    if (!settings) {
      return NextResponse.json({ error: 'Primero guarda la configuración general (API Key y Token de Notion)' }, { status: 400 });
    }

    if (!settings.notionToken) {
      return NextResponse.json({ error: 'Token de Notion no configurado. Guárdalo primero en la configuración general.' }, { status: 400 });
    }

    const { pageId } = await req.json();

    if (!pageId?.trim()) {
      return NextResponse.json({ error: 'Page ID requerido' }, { status: 400 });
    }

    await db.settings.update({
      where: { id: 'main' },
      data: { notionPageId: pageId.trim().replace(/-/g, '') },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error saving Notion page ID:', e);
    return NextResponse.json({ error: `Error al guardar Page ID: ${e}` }, { status: 500 });
  }
}