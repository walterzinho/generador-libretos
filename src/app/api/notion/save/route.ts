import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

interface LibretoItem {
  tipo: string;
  numero: number;
  contenido: string;
}

export async function POST(req: NextRequest) {
  try {
    const settings = await db.settings.findUnique({ where: { id: 'main' } });
    if (!settings?.notionToken || !settings.notionDbId) {
      return NextResponse.json({ error: 'Notion no configurado. Configura el token y crea la base de datos primero.' }, { status: 400 });
    }

    const { generationId, franja, genero } = await req.json();

    const libretos = await db.libreto.findMany({
      where: { generationId },
      orderBy: [{ tipo: 'asc' }, { numero: 'asc' }],
    });

    if (libretos.length === 0) {
      return NextResponse.json({ error: 'No hay libretos para guardar' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    let created = 0;
    let errors: string[] = [];

    for (const libreto of libretos) {
      let tipoNotion = 'Puente';
      if (libreto.tipo === 'ENTRADA') tipoNotion = 'Entrada';
      else if (libreto.tipo === 'SALIDA') tipoNotion = 'Salida';
      else if (libreto.tipo === 'PUENTE_LARGO') tipoNotion = 'Puente Largo';

      try {
        const response = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.notionToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            parent: { database_id: settings.notionDbId },
            properties: {
              'Franja': {
                title: [{ type: 'text', text: { content: `${franja} - ${tipoNotion} #${libreto.numero}` } }],
              },
              'Género': {
                rich_text: [{ type: 'text', text: { content: genero || 'General' } }],
              },
              'Tipo': {
                select: { name: tipoNotion },
              },
              'Opción': {
                number: libreto.numero,
              },
              'Contenido': {
                rich_text: [{ type: 'text', text: { content: libreto.contenido } }],
              },
              'Fecha Generación': {
                date: { start: today },
              },
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          errors.push(`Error en ${tipoNotion} #${libreto.numero}: ${errText}`);
        } else {
          created++;
        }
      } catch (e) {
        errors.push(`Error en ${tipoNotion} #${libreto.numero}: ${e}`);
      }
    }

    return NextResponse.json({
      success: true,
      created,
      total: libretos.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    return NextResponse.json({ error: `Error al guardar en Notion: ${e}` }, { status: 500 });
  }
}