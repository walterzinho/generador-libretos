import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const generations = await db.generation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        libretos: {
          orderBy: [{ tipo: 'asc' }, { numero: 'asc' }],
        },
      },
    });

    const result = generations.map((g) => ({
      id: g.id,
      franja: g.franja,
      genero: g.genero,
      duracion: g.duracion,
      createdAt: g.createdAt,
      totalLibretos: g.libretos.length,
      tipos: [
        g.libretos.filter((l) => l.tipo === 'ENTRADA').length > 0 ? `${g.libretos.filter((l) => l.tipo === 'ENTRADA').length} entradas` : null,
        g.libretos.filter((l) => l.tipo === 'PUENTE').length > 0 ? `${g.libretos.filter((l) => l.tipo === 'PUENTE').length} puentes` : null,
        g.libretos.filter((l) => l.tipo === 'PUENTE_LARGO').length > 0 ? `${g.libretos.filter((l) => l.tipo === 'PUENTE_LARGO').length} puentes largos` : null,
        g.libretos.filter((l) => l.tipo === 'SALIDA').length > 0 ? `${g.libretos.filter((l) => l.tipo === 'SALIDA').length} salidas` : null,
      ].filter(Boolean).join(', '),
      libretos: g.libretos.map((l) => ({
        id: l.id,
        tipo: l.tipo,
        numero: l.numero,
        contenido: l.contenido,
      })),
    }));

    return NextResponse.json({ generations: result });
  } catch {
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await db.generation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}