import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const settings = await db.settings.findUnique({ where: { id: 'main' } });
    if (!settings?.notionToken) {
      return NextResponse.json({ error: 'Token de Notion no configurado' }, { status: 400 });
    }

    const parentPageId = settings.notionPageId;

    if (!parentPageId) {
      return NextResponse.json(
        { error: 'Se necesita un Page ID de Notion. Ve a Notion, comparte una página con tu integración y pega el ID aquí.' },
        { status: 400 }
      );
    }

    const response = await fetch('https://api.notion.com/v1/databases', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { type: 'page_id', page_id: parentPageId },
        title: [
          {
            type: 'text',
            text: { content: 'Libretos Voces Campesinas' },
          },
        ],
        properties: {
          'Franja': { title: {} },
          'Género': {
            rich_text: {},
          },
          'Tipo': {
            select: {
              options: [
                { name: 'Entrada', color: 'green' },
                { name: 'Puente', color: 'yellow' },
                { name: 'Puente Largo', color: 'orange' },
                { name: 'Salida', color: 'blue' },
              ],
            },
          },
          'Opción': {
            number: {},
          },
          'Contenido': {
            rich_text: {},
          },
          'Fecha Generación': {
            date: {},
          },
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Error de Notion: ${err}` }, { status: response.status });
    }

    const dbResult = await response.json();

    await db.settings.update({
      where: { id: 'main' },
      data: { notionDbId: dbResult.id },
    });

    return NextResponse.json({
      success: true,
      databaseId: dbResult.id,
      url: dbResult.url,
    });
  } catch (e) {
    return NextResponse.json({ error: `Error al crear base de datos: ${e}` }, { status: 500 });
  }
}