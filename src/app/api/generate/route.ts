import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const RADIOGRAM_SYSTEM_PROMPT = `Você é um simulador de comunicações de emergência (EmComm) para treinamento de radioamadores da USRA (União Santamariense de Radioamadores) em Santa Maria, RS, Brasil.

Gere uma mensagem de radiograma formal seguindo o formato ARRL, simulando um cenário de desastre natural realista para a região de Santa Maria e interior do RS. Os cenários possíveis incluem:
- Enchentes e inundações (rio Vacacaí, arroios urbanos)
- Tempestades severas com vendavais
- Granizo intenso
- Deslizamentos de terra no Morro do Cerrito ou Morro da Cruz
- Tornados (região da campanha gaúcha)
- Secas prolongadas com incêndios florestais
- Temporal com queda de energia generalizada

O radiograma deve conter EXATAMENTE estas 4 seções:

1. PREÂMBULO:
   - Número: número sequencial (ex: 47)
   - Precedência: R (Rotina), W (Bem-estar), P (Prioridade) ou EMERGENCY
   - HX: instrução de tratamento opcional (HXA, HXB, HXC, HXD, HXE, HXF, HXG)
   - Estação de Origem: indicativo fictício brasileiro (PP5xxx, PU5xxx, PY5xxx)
   - Check: número de palavras do texto
   - Local de Origem: cidade no RS (Santa Maria, Caçapava do Sul, São Sepé, Itaara, etc.)
   - Hora de Registro: formato HHMM (ex: 1430)
   - Data: formato dia mês abreviado (ex: 15 AGO)

2. ENDEREÇO:
   Nome e endereço do destinatário (sem pontuação), incluindo cidade estado e CEP

3. TEXTO:
   Máximo 25 palavras. Sem pontuação normal. Use X como ponto final (exceto no último grupo). QUERY para interrogação. R para separador decimal. A mensagem deve descrever uma situação de emergência realista.

4. ASSINATURA:
   Nome do remetente com indicativo de radioamador

Responda APENAS com o radiograma em JSON no seguinte formato:
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
  "signature": string,
  "scenario": string
}`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { difficulty = 'medium' } = body;

    let difficultyPrompt = '';
    if (difficulty === 'easy') {
      difficultyPrompt = 'Gere uma mensagem simples de Rotina (R) com texto curto de até 10 palavras, cenário menos urgente.';
    } else if (difficulty === 'medium') {
      difficultyPrompt = 'Gere uma mensagem de Prioridade (P) ou Bem-estar (W) com texto de 10-20 palavras.';
    } else {
      difficultyPrompt = 'Gere uma mensagem de EMERGENCY com texto próximo de 25 palavras, cenário crítico, use HX instructions.';
    }

    const { text } = await generateText({
      model: openai('gpt-5.6-terra'),
      system: RADIOGRAM_SYSTEM_PROMPT,
      prompt: difficultyPrompt,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: 'Failed to parse radiogram' }, { status: 500 });
    }

    const radiogram = JSON.parse(jsonMatch[0]);
    return Response.json(radiogram);
  } catch (error) {
    console.error('Generate error:', error);
    return Response.json({ error: 'Failed to generate radiogram' }, { status: 500 });
  }
}
