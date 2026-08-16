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

5. DIALOGO (Fonia):
   Você deve gerar a transcrição exata da comunicação via rádio entre o operador (HAM) e a estação controle (BASE).
   Regras de Fonia:
   - Use reticências "..." APENAS para separar fragmentos lógicos do preâmbulo, endereço e texto (ex: "Número 14... Prioridade... Papa Uniform..."), não quebre a fala artificialmente no meio das frases.
   - IMPORTANTE: NUNCA adicione "..." no meio de um grupo de informações unidas. O indicativo do radioamador deve ser falado de uma vez só (ex: "Papa Uniform 3 X-ray Yankee Zulu"). NUNCA quebre soletragem, indicativos, números contínuos ou CEP com reticências.
   - Substitua o número 1 por "uno" e o 6 por "meia".
   - Números acima de 10 devem ser falados dígito a dígito antecedidos de "figuras". Ex: 14 vira "figuras uno quatro". Hora 1030 vira "uno zero três zero".
   - Indicativos devem ser soletrados com Alfabeto Fonético ICAO (ex: PU3XYZ -> Papa Uniform Três X-ray Yankee Zulu).
   - A UF no endereço deve ser falada por extenso (RS -> Rio Grande do Sul).
   - O mês na data deve ser falado por extenso (AGO -> Agosto).
   - Nomes difíceis ou estrangeiros: fale a palavra, diga "Soletro" e soletre com fonético (ex: Schirmer... Soletro... Sierra Charlie...).
   - Letras soltas/iniciais devem ser precedidas de "inicial" (ex: F -> inicial foxtrot).
   - Precedência falada por extenso (ex: P -> Prioridade).
   - Use "Break" antes de iniciar o texto e após terminar o texto.
   
   A estrutura da comunicação DEVE ser:
   1. HAM: "Estação Controle... aqui é [seu indicativo]... tenho tráfego."
   2. BASE: "[seu indicativo]... aqui Controle... prossiga."
   3. HAM: "Controle... tenho uma mensagem de [Precedência]... Pronto para transmitir?"
   4. BASE: "[seu indicativo]... aguarde um momento... Controle pronto... para copiar o seu tráfego... prossiga."
   5. HAM: "Número [numero]... [precedencia]... [hx se tiver]... [indicativo fonetico]... Check [check]... [origem]... Hora [hora] local... Data [data]... Endereço... [Endereço completo pausado logico]... Break."
   6. BASE: "Controle copiado... prossiga."
   7. HAM: "[Texto pausado e regras aplicadas]... Break... Assinatura [assinatura]... fim da mensagem... câmbio."
   8. BASE: "[seu indicativo]... aqui Controle... QSL sua mensagem... número [numero]... Muito obrigado... Câmbio."

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
  "scenario": string,
  "dialogue": [
    { "speaker": "HAM" | "BASE", "text": "texto da fala" }
  ]
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
