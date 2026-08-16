# Simulador de Radiogramas (EmComm) - USRA

Um simulador interativo projetado para treinamento de radioamadores na comunicação de emergência (EmComm), focado no preenchimento e ditado de Radiogramas no padrão ARRL / NTS. Desenvolvido para a **USRA** (União Santamariense de Radioamadores).

🌐 **Acesse ao vivo:** [radiograma.vercel.app](https://radiograma.vercel.app)

## Funcionalidades

- **Geração de Cenários Realistas**: Utiliza IA para gerar cenários aleatórios de emergência no Rio Grande do Sul, preenchendo as informações básicas (Preâmbulo, Endereço e Texto).
- **Simulação de Rádio HF Realista**: O sistema reproduz um áudio da mensagem gerada simulando a fonia half-duplex real. Aplica filtros de ruído branco, efeitos de propagação (QSB e QRN), fading, além de respeitar todo o tempo de squelch e roger beeps entre os câmbios da Estação Controle e do Radioamador de campo.
- **Vozes Multilíngues (ElevenLabs v2.5 Turbo)**: Áudios gerados com fluidez e com sotaque condizente para o idioma local e fonética ICAO.
- **Interface Baseada em Formulário ARRL**: A interface replica visualmente um formulário padrão de Radiograma, garantindo familiaridade aos operadores em treinamento.
- **Biblioteca Rápida de Pró-Sinais e Mensagens ARL**: Acesso imediato a instruções de tratamento (HX) e Textos Numerados.

## Tecnologias Usadas

- **Next.js 14** (App Router)
- **React** + **Tailwind CSS**
- **Shadcn UI** (Componentes de acessibilidade e design system)
- **Vercel AI SDK** (@ai-sdk/openai, @ai-sdk/elevenlabs)
- **Web Audio API** (Processamento offline de áudio nativo para criar efeitos de rádio HF em tempo real no navegador)

## Como Rodar Localmente

1. Clone o repositório:
```bash
git clone https://github.com/SamuelMoraesF/radiogram.git
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env.local` na raiz contendo as seguintes chaves de API:
```env
OPENAI_API_KEY=sua_chave_aqui
ELEVENLABS_API_KEY=sua_chave_aqui
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```
O aplicativo estará rodando em `http://localhost:3000`.
