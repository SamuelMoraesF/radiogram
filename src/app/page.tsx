'use client';

import { useState, useRef, useCallback } from 'react';
import type { Radiogram, Difficulty, AppMode } from '@/lib/types';
import { RadiogramDisplay } from '@/components/radiogram-display';
import { useTheme } from '@/components/theme-provider';
import { applyRFNoise, type RFNoiseOptions } from '@/lib/rf-noise';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Radio,
  Mic,
  Volume2,
  Loader2,
  AlertTriangle,
  Zap,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Send,
  Square,
  Sun,
  Moon,
} from 'lucide-react';

export default function RadiogramSimulator() {
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<AppMode>('receive');
  const [radiogram, setRadiogram] = useState<Radiogram | null>(null);
  const [parsedRadiogram, setParsedRadiogram] = useState<Radiogram | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [error, setError] = useState<string | null>(null);

  // RF Noise settings
  const [noiseLevel, setNoiseLevel] = useState(0.3);
  const [staticBursts, setStaticBursts] = useState(true);
  const [signalFading, setSignalFading] = useState(true);
  const [driftAmount, setDriftAmount] = useState(0.15);
  const [showSettings, setShowSettings] = useState(false);

  // Audio refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const generateRadiogram = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setRadiogram(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty }),
      });

      if (!res.ok) throw new Error('Falha ao gerar radiograma');
      const data = await res.json();
      setRadiogram(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsGenerating(false);
    }
  }, [difficulty]);

  const speakRadiogram = useCallback(async () => {
    if (!radiogram) return;
    setIsSpeaking(true);
    setError(null);

    try {
      const speechText = formatForSpeech(radiogram);

      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: speechText }),
      });

      if (!res.ok) throw new Error('Falha ao gerar áudio');
      const data = await res.json();

      const noiseOpts: Partial<RFNoiseOptions> = {
        noiseLevel,
        staticBursts,
        signalFading,
        driftAmount,
      };

      const noisyAudio = await applyRFNoise(data.audio, noiseOpts);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      const binaryStr = atob(noisyAudio);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
      audio.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reproduzir');
      setIsSpeaking(false);
    }
  }, [radiogram, noiseLevel, staticBursts, signalFading, driftAmount]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscribedText('');
    setParsedRadiogram(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        await transcribeAndParse(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Não foi possível acessar o microfone. Verifique as permissões.');
      console.error(err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const transcribeAndParse = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) throw new Error('Falha na transcrição');
      const transcribeData = await transcribeRes.json();
      setTranscribedText(transcribeData.text);

      const parseRes = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcribeData.text }),
      });

      if (!parseRes.ok) throw new Error('Falha ao interpretar radiograma');
      const parseData = await parseRes.json();
      setParsedRadiogram(parseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na transcrição');
    } finally {
      setIsTranscribing(false);
    }
  };

  const reset = useCallback(() => {
    setRadiogram(null);
    setParsedRadiogram(null);
    setTranscribedText('');
    setError(null);
    stopAudio();
  }, [stopAudio]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-foreground" />
            <span className="text-sm font-semibold tracking-tight">
              USRA Radiograma
            </span>
            <span className="hidden sm:inline text-xs text-muted-foreground ml-1">
              Simulador EmComm
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={reset}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {/* Mode Tabs */}
        <Tabs
          value={mode}
          onValueChange={(v) => {
            setMode(v as AppMode);
            reset();
          }}
        >
          <TabsList className="h-9 bg-muted p-0.5">
            <TabsTrigger
              value="receive"
              className="text-xs gap-1.5 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Receber
            </TabsTrigger>
            <TabsTrigger
              value="transmit"
              className="text-xs gap-1.5 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Mic className="w-3.5 h-3.5" />
              Transmitir
            </TabsTrigger>
          </TabsList>

          {/* ═══ RECEIVE MODE ═══ */}
          <TabsContent value="receive" className="mt-5 space-y-4">
            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as Difficulty)}
              >
                <SelectTrigger className="w-[140px] h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy" className="text-xs">Fácil</SelectItem>
                  <SelectItem value="medium" className="text-xs">Médio</SelectItem>
                  <SelectItem value="hard" className="text-xs">Difícil</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={generateRadiogram}
                disabled={isGenerating}
                size="sm"
                className="h-8 text-xs font-medium"
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 mr-1.5" />
                )}
                {isGenerating ? 'Gerando…' : 'Gerar Radiograma'}
              </Button>

              {radiogram && (
                <Button
                  onClick={isSpeaking ? stopAudio : speakRadiogram}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                >
                  {isSpeaking ? (
                    <Square className="w-3 h-3 mr-1.5 fill-current" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {isSpeaking ? 'Parar' : 'Ouvir com Ruído RF'}
                </Button>
              )}
            </div>

            {/* RF Settings collapsible */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showSettings ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              Configurações de ruído RF
            </button>

            {showSettings && (
              <Card>
                <CardContent className="pt-4 pb-4 px-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs">
                      Nível de ruído ·{' '}
                      <span className="font-mono">{Math.round(noiseLevel * 100)}%</span>
                    </Label>
                    <Slider
                      value={[noiseLevel]}
                      onValueChange={(v) => setNoiseLevel(Array.isArray(v) ? v[0] : v)}
                      min={0}
                      max={1}
                      step={0.05}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">
                      Drift de frequência ·{' '}
                      <span className="font-mono">{Math.round(driftAmount * 100)}%</span>
                    </Label>
                    <Slider
                      value={[driftAmount]}
                      onValueChange={(v) => setDriftAmount(Array.isArray(v) ? v[0] : v)}
                      min={0}
                      max={0.5}
                      step={0.05}
                    />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Switch
                      checked={staticBursts}
                      onCheckedChange={setStaticBursts}
                      id="qrn"
                    />
                    <Label htmlFor="qrn" className="text-xs">Estática QRN</Label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Switch
                      checked={signalFading}
                      onCheckedChange={setSignalFading}
                      id="qsb"
                    />
                    <Label htmlFor="qsb" className="text-xs">Fading QSB</Label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* VU meter while speaking */}
            {isSpeaking && (
              <div className="flex items-center gap-2">
                <div className="flex items-end gap-px h-4">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-sm bg-foreground/60 animate-pulse"
                      style={{
                        height: `${Math.random() * 14 + 2}px`,
                        animationDelay: `${i * 40}ms`,
                        animationDuration: `${250 + Math.random() * 350}ms`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  Transmissão em andamento…
                </span>
              </div>
            )}

            {/* Radiogram */}
            {radiogram && <RadiogramDisplay radiogram={radiogram} />}
          </TabsContent>

          {/* ═══ TRANSMIT MODE ═══ */}
          <TabsContent value="transmit" className="mt-5 space-y-4">
            {/* Mic card */}
            <Card>
              <CardContent className="py-10 flex flex-col items-center gap-5">
                <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
                  Pressione o botão e dite o radiograma completo — preâmbulo,
                  endereço, texto e assinatura.
                </p>

                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isTranscribing}
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center
                    transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    ${
                      isRecording
                        ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 animate-pulse text-white'
                        : isTranscribing
                          ? 'bg-muted text-muted-foreground cursor-wait'
                          : 'bg-foreground text-background hover:opacity-90 shadow-sm'
                    }
                  `}
                >
                  {isTranscribing ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : isRecording ? (
                    <Square className="w-5 h-5 fill-current" />
                  ) : (
                    <Mic className="w-6 h-6" />
                  )}
                </button>

                <span className="text-xs text-muted-foreground">
                  {isTranscribing
                    ? 'Processando…'
                    : isRecording
                      ? 'Gravando — clique para parar'
                      : 'Clique para gravar'}
                </span>

                {/* Recording VU */}
                {isRecording && (
                  <div className="flex items-end gap-px h-5">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-0.5 rounded-full bg-red-500 animate-pulse"
                        style={{
                          height: `${Math.random() * 18 + 2}px`,
                          animationDelay: `${i * 30}ms`,
                          animationDuration: `${200 + Math.random() * 300}ms`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transcription */}
            {transcribedText && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Send className="w-3 h-3" />
                  Texto transcrito
                </h3>
                <Card>
                  <CardContent className="py-3 px-4">
                    <p className="text-sm font-mono text-foreground leading-relaxed">
                      {transcribedText}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Parsed radiogram */}
            {parsedRadiogram && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Radio className="w-3 h-3" />
                  Radiograma interpretado
                </h3>
                <RadiogramDisplay radiogram={parsedRadiogram} />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Reference */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground pt-2">
          <span>
            <Badge variant="outline" className="text-[10px] mr-1 font-mono">R</Badge>
            Rotina
          </span>
          <span>
            <Badge variant="outline" className="text-[10px] mr-1 font-mono">W</Badge>
            Bem-estar
          </span>
          <span>
            <Badge variant="outline" className="text-[10px] mr-1 font-mono">P</Badge>
            Prioridade
          </span>
          <span>
            <Badge variant="outline" className="text-[10px] mr-1 font-mono">E</Badge>
            Emergência
          </span>
          <span className="text-border">|</span>
          <span className="font-mono">X</span> = ponto final
          <span className="font-mono">QUERY</span> = ?
          <span className="font-mono">R</span> = decimal
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border mt-12">
        <div className="mx-auto max-w-3xl px-6 py-5 flex items-center justify-between text-xs text-muted-foreground">
          <span>USRA · União Santamariense de Radioamadores</span>
          <span>Formato ARRL · NTS</span>
        </div>
      </footer>
    </div>
  );
}

function formatForSpeech(radiogram: Radiogram): string {
  const parts: string[] = [];

  parts.push('Radiograma.');
  parts.push(`Número ${radiogram.preamble.number}.`);
  parts.push(
    `Precedência ${
      radiogram.preamble.precedence === 'EMERGENCY'
        ? 'Emergência'
        : radiogram.preamble.precedence === 'P'
          ? 'Prioridade'
          : radiogram.preamble.precedence === 'W'
            ? 'Bem-estar'
            : 'Rotina'
    }.`
  );

  if (radiogram.preamble.hx) {
    parts.push(`H X ${radiogram.preamble.hx}.`);
  }

  parts.push(
    `Estação de origem ${radiogram.preamble.stationOfOrigin.split('').join(' ')}.`
  );
  parts.push(`Check ${radiogram.preamble.check}.`);
  parts.push(`Origem ${radiogram.preamble.placeOfOrigin}.`);
  parts.push(`Hora ${radiogram.preamble.timeField}.`);
  parts.push(`Data ${radiogram.preamble.date}.`);

  parts.push('Endereço.');
  parts.push(radiogram.address.name + '.');
  parts.push(radiogram.address.street + '.');
  parts.push(
    `${radiogram.address.city} ${radiogram.address.state} ${radiogram.address.zip}.`
  );
  if (radiogram.address.phone) {
    parts.push(`Telefone ${radiogram.address.phone}.`);
  }

  parts.push('Texto. Início.');
  parts.push(
    radiogram.text
      .replace(/ X /g, '. ')
      .replace(/QUERY/g, ', interrogação, ')
      .replace(/(\d+)R(\d+)/g, '$1 ponto $2')
  );
  parts.push('Fim do texto.');

  parts.push(`Assinatura. ${radiogram.signature}.`);
  parts.push('Fim do radiograma.');

  return parts.join(' ');
}
