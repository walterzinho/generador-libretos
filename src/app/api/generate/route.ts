import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `Eres un experto creador de libretos para radio. Tu única función es generar textos listos para ser leídos al micrófono.

EMISORA:
- Nombre: emisora digital Voces Campesinas
- Sitio web: www.vocecampesinas.co

REGLAS FIJAS (NUNCA las rompas):
1. En CADA libreto debes incluir al menos una vez "emisora digital Voces Campesinas" y "www.vocecampesinas.co".
2. SOLO entrega el texto que se va a leer al aire. NUNCA incluyas instrucciones de tono, intensidad, pausas, velocidad, énfasis, ni indiques quién locuta. Cero marcas de dirección escénica.
3. Escribe en español.
4. Los textos deben sonar naturales al hablarlos en voz alta.

TIPOS DE LIBRETO:

ENTRADA (1 a 2 minutos de locución):
- Saludo de bienvenida personalizado con el nombre del locutor/locutora.
- Nombre de la franja.
- Referencia al horario exacto de la franja para conectar con el oyente (ej: "son las 6 de la mañana", "en esta tarde de martes").
- Contexto del momento (mañana, tarde, noche, día de la semana, festividad, clima, etc.), adaptando el tono al horario.
- Mensaje o reflexión breve que dé personalidad a la franja. Si hay playlist, conéctalo con artistas o canciones. Si no, mantén un tema general y versátil.
- Mención de lo que se va a escuchar (géneros, artistas, o referencia musical general).
- Identidad: incluye "emisora digital Voces Campesinas" y "www.vocecampesinas.co".
- Frase de transición hacia la música.

PUENTE (MÁXIMO 15 segundos, aprox. 2 a 3 líneas cortas):
- Mención rápida de la franja o la emisora.
- Frase corta que conecte lo que se escuchó con lo que viene, o simplemente mantenga la atención del oyente.
- Máxima brevedad y funcionalidad.

PUENTE LARGO (30 a 45 segundos):
- Similar al puente pero con más desarrollo. Puede incluir un dato curioso, mención de un artista, o reflexión breve.
- Mención de la emisora.
- Útil para franjas de 2+ horas para variar la dinámica.

SALIDA (1 a 2 minutos de locución):
- Cierre temático de la franja (reflexión, pensamiento, o mensaje final coherente con el horario y género).
- Despedida personalizada con el nombre del locutor/locutora.
- Referencia al horario (ej: "nos vemos mañana a las 6", "hasta la próxima noche").
- Agradecimiento al oyente por la sintonía.
- Identidad: incluye "emisora digital Voces Campesinas" y "www.vocecampesinas.co".
- Despedida final.

ADAPTACIÓN DE TONO POR HORARIO:
- Mañana: más enérgico, motivador.
- Tarde: relajado, amigable.
- Noche: íntimo, reflexivo, tranquilo.
- Madrugada: suave, de compañía nocturna.
Estos tonos se reflejan en el CONTENIDO del texto, nunca como instrucciones.`;

function buildUserPrompt(data: {
  franja: string;
  genero: string;
  duracion: string;
  cantidadPuentes: number;
  incluirPuentesLargos: boolean;
  cantidadPuentesLargos: number;
  playlist: string;
  locutorNombre: string;
  franjaHorario: string;
}): string {
  let prompt = `Genera un paquete de libretos para la siguiente franja:

NOMBRE DE LA FRANJA: ${data.franja}
GÉNERO(S) MUSICAL(ES): ${data.genero}
DURACIÓN DE LA FRANJA: ${data.duracion}`;

  if (data.locutorNombre && data.locutorNombre.trim()) {
    prompt += `\nLOCUTOR/LOCUTORA: ${data.locutorNombre.trim()}`;
  }

  if (data.franjaHorario && data.franjaHorario.trim()) {
    prompt += `\nHORARIO DE EMISIÓN: ${data.franjaHorario.trim()}`;
  }

  if (data.playlist && data.playlist.trim()) {
    prompt += `\nPLAYLIST DE REFERENCIA:\n${data.playlist.trim()}`;
  } else {
    prompt += '\nSIN PLAYLIST: genera los libretos de forma general y versátil.';
  }

  prompt += `\n\nGENERAR:
- 5 opciones de ENTRADA
- ${data.cantidadPuentes} opciones de PUENTE`;
  
  if (data.incluirPuentesLargos && data.cantidadPuentesLargos > 0) {
    prompt += `\n- ${data.cantidadPuentesLargos} opciones de PUENTE LARGO`;
  }

  prompt += '\n- 5 opciones de SALIDA';

  prompt += `\n\nResponde SOLO con el JSON, sin texto adicional antes o después.`;

  return prompt;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const settings = await db.settings.findUnique({ where: { id: 'main' } });
    const provider = settings?.provider || 'google';

    if (provider === 'google' && !settings?.geminiApiKey) {
      return NextResponse.json({ error: 'API Key de Gemini no configurada. Ve a Configuración.' }, { status: 400 });
    }
    if (provider === 'openrouter' && !settings?.openRouterKey) {
      return NextResponse.json({ error: 'API Key de OpenRouter no configurada. Ve a Configuración.' }, { status: 400 });
    }

    const body = await req.json();
    const { franja, genero, duracion, cantidadPuentes, incluirPuentesLargos, cantidadPuentesLargos, playlist, locutorNombre, franjaHorario } = body;

    if (!franja?.trim() || !genero?.trim()) {
      return NextResponse.json({ error: 'El nombre de la franja y el género son obligatorios.' }, { status: 400 });
    }

    const userPrompt = buildUserPrompt({
      franja: franja.trim(),
      genero: genero.trim(),
      duracion: duracion || '2 horas',
      cantidadPuentes: cantidadPuentes || 3,
      incluirPuentesLargos: incluirPuentesLargos || false,
      cantidadPuentesLargos: cantidadPuentesLargos || 2,
      playlist: playlist || '',
      locutorNombre: locutorNombre || '',
      franjaHorario: franjaHorario || '',
    });

    const jsonFormatHint = '\n\nResponde SIEMPRE en este formato JSON exacto:\n{\n  "entradas": [\n    {"numero": 1, "texto": "..."},\n    {"numero": 2, "texto": "..."},\n    {"numero": 3, "texto": "..."},\n    {"numero": 4, "texto": "..."},\n    {"numero": 5, "texto": "..."}\n  ],\n  "puentes": [\n    {"numero": 1, "texto": "..."},\n    ...\n  ],\n  "puentesLargos": [\n    {"numero": 1, "texto": "..."},\n    ...\n  ],\n  "salidas": [\n    {"numero": 1, "texto": "..."},\n    {"numero": 2, "texto": "..."},\n    {"numero": 3, "texto": "..."},\n    {"numero": 4, "texto": "..."},\n    {"numero": 5, "texto": "..."}\n  ]\n}\n\nSi no se pidieron puentes largos, incluye "puentesLargos" como array vacío [].';

    let textContent: string | undefined;

    if (provider === 'openrouter') {
      // OpenRouter uses OpenAI-compatible format
      const orModel = settings.geminiModel || 'gemini-2.5-flash';
      const modelMap: Record<string, string> = {
        'gemini-2.5-flash': 'google/gemini-2.5-flash-preview',
        'gemini-2.0-flash': 'google/gemini-2.0-flash-001',
        'gemini-1.5-flash': 'google/gemini-1.5-flash',
        'gemini-2.5-pro': 'google/gemini-2.5-pro-preview',
      };
      const orModelId = modelMap[orModel] || modelMap['gemini-2.5-flash'];

      const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.openRouterKey}`,
          'HTTP-Referer': 'https://vocecampesinas.co',
          'X-Title': 'SisGelfram',
        },
        body: JSON.stringify({
          model: orModelId,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt + jsonFormatHint },
          ],
          temperature: 0.8,
          max_tokens: 8192,
          response_format: { type: 'json_object' },
        }),
      });

      if (!orResponse.ok) {
        const errText = await orResponse.text();
        return NextResponse.json({ error: `Error de OpenRouter API (${orResponse.status}): ${errText}` }, { status: orResponse.status });
      }

      const orData = await orResponse.json();
      textContent = orData.choices?.[0]?.message?.content;

      if (!textContent) {
        return NextResponse.json({ error: 'OpenRouter no devolvió contenido. Intenta de nuevo.' }, { status: 500 });
      }
    } else {
      // Google AI Studio - con retry como MensajesCortos
      const model = settings.geminiModel || 'gemini-2.5-flash';
      const apiVersions = ['v1', 'v1beta'];
      const fallbackModels = [model, 'gemini-2.5-flash'];
      const uniqueModels = [...new Set(fallbackModels)];
      let lastError = '';

      let resolved = false;
      for (const tryModel of uniqueModels) {
        if (resolved) break;
        for (const apiVersion of apiVersions) {
          if (resolved) break;
          try {
            const geminiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${tryModel}:generateContent?key=${settings.geminiApiKey}`;

            const geminiBody = {
              system_instruction: {
                parts: [{ text: SYSTEM_PROMPT }],
              },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: userPrompt + jsonFormatHint }],
                },
              ],
              generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 8192,
                responseMimeType: 'application/json',
              },
            };

            const response = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(geminiBody),
            });

            if (response.ok) {
              const data: GeminiResponse = await response.json();
              textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (textContent) resolved = true;
            } else {
              const errText = await response.text();
              lastError = `Error ${response.status} con ${apiVersion}/${tryModel}: ${errText}`;
              // Si es error de ubicación, seguir intentando
              if (response.status === 400 || response.status === 429) continue;
              // Otro error, parar
              break;
            }
          } catch (e) {
            lastError = `Error de conexión con ${apiVersion}/${tryModel}: ${e}`;
          }
        }
      }

      if (!resolved || !textContent) {
        return NextResponse.json({ error: `Error de Gemini API: ${lastError}. Intenta con otro modelo.` }, { status: 500 });
      }
    }

    let parsed: {
      entradas: Array<{ numero: number; texto: string }>;
      puentes: Array<{ numero: number; texto: string }>;
      puentesLargos?: Array<{ numero: number; texto: string }>;
      salidas: Array<{ numero: number; texto: string }>;
    };

    try {
      parsed = JSON.parse(textContent);
    } catch {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: 'No se pudo parsear la respuesta de Gemini.' }, { status: 500 });
      }
    }

    const generation = await db.generation.create({
      data: {
        franja: franja.trim(),
        genero: genero.trim(),
        duracion: duracion || '2 horas',
        playlist: playlist || null,
        libretos: {
          create: [
            ...parsed.entradas.map((e) => ({ tipo: 'ENTRADA', numero: e.numero, contenido: e.texto })),
            ...parsed.puentes.map((p) => ({ tipo: 'PUENTE', numero: p.numero, contenido: p.texto })),
            ...(parsed.puentesLargos || []).map((p) => ({ tipo: 'PUENTE_LARGO', numero: p.numero, contenido: p.texto })),
            ...parsed.salidas.map((s) => ({ tipo: 'SALIDA', numero: s.numero, contenido: s.texto })),
          ],
        },
      },
      include: { libretos: true },
    });

    const grouped = {
      entradas: generation.libretos.filter((l) => l.tipo === 'ENTRADA').sort((a, b) => a.numero - b.numero),
      puentes: generation.libretos.filter((l) => l.tipo === 'PUENTE').sort((a, b) => a.numero - b.numero),
      puentesLargos: generation.libretos.filter((l) => l.tipo === 'PUENTE_LARGO').sort((a, b) => a.numero - b.numero),
      salidas: generation.libretos.filter((l) => l.tipo === 'SALIDA').sort((a, b) => a.numero - b.numero),
    };

    return NextResponse.json({
      success: true,
      generationId: generation.id,
      franja: generation.franja,
      genero: generation.genero,
      createdAt: generation.createdAt,
      ...grouped,
    });
  } catch (e) {
    return NextResponse.json({ error: `Error interno: ${e}` }, { status: 500 });
  }
}