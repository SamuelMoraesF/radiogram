import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    const { text: parsed } = await generateText({
      model: openai('gpt-5.6-terra'),
      system: `Você é um parser de radiogramas ARRL. Dado um texto ditado por voz (possivelmente com erros de transcrição), extraia os componentes do radiograma e retorne em JSON.

O formato esperado é:
{
  "preamble": {
    "number": number,
    "precedence": "R" | "W" | "P" | "EMERGENCY",
    "hx": string | null,
    "stationOfOrigin": string,
    "check": number,
    "placeOfOrigin": string,
    "timeField": string,
    "date": string
  },
  "address": {
    "name": string,
    "street": string,
    "city": string,
    "state": string,
    "zip": string,
    "phone": string
  },
  "text": string,
  "signature": string
}

Se não conseguir extrair algum campo, use string vazia. Tente interpretar indicativos de radioamador (PP5, PU5, PY5), nomes de cidades do RS, e termos de radiograma como X (ponto final), QUERY (interrogação), R (separador decimal).

Responda APENAS com o JSON, sem explicações.`,
      prompt: `Parse este texto ditado como radiograma:\n\n${text}`,
    });

    const jsonMatch = parsed.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: 'Failed to parse radiogram' }, { status: 500 });
    }

    const radiogram = JSON.parse(jsonMatch[0]);
    return Response.json(radiogram);
  } catch (error) {
    console.error('Parse error:', error);
    return Response.json({ error: 'Failed to parse radiogram' }, { status: 500 });
  }
}
