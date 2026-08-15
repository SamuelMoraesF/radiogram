'use client';

import { useState, useRef, useCallback } from 'react';
import type { Radiogram, Difficulty, AppMode } from '@/lib/types';
import { RadiogramDisplay } from '@/components/radiogram-display';
import { applyRFNoise, type RFNoiseOptions } from '@/lib/rf-noise';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Settings,
  RotateCcw,
  Send,
  Square,
} from 'lucide-react';

export default function RadiogramSimulator() {
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
      // Format radiogram text for speech
      const speechText = formatForSpeech(radiogram);

      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: speechText }),
      });

      if (!res.ok) throw new Error('Falha ao gerar áudio');
      const data = await res.json();

      // Apply RF noise
      const noiseOpts: Partial<RFNoiseOptions> = {
        noiseLevel,
        staticBursts,
        signalFading,
        driftAmount,
      };

      const noisyAudio = await applyRFNoise(data.audio, noiseOpts);

      // Play audio
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
      // Step 1: Transcribe
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) throw new Error('Falha na transcrição');
      const transcribeData = await transcribeRes.json();
      setTranscribedText(transcribeData.text);

      // Step 2: Parse into radiogram structure
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-600/20 flex items-center justify-center">
              <Radio className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-zinc-100">
                USRA Radiograma
              </h1>
              <p className="text-[11px] text-zinc-500 tracking-wide">
                Simulador EmComm · Santa Maria RS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-zinc-400 hover:text-zinc-200 h-8"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="text-zinc-400 hover:text-zinc-200 h-8"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* RF Noise Settings Panel */}
        {showSettings && (
          <Card className="bg-zinc-900/70 border-zinc-800/80">
            <CardHeader className="pb-3 pt-4 px-5">
              <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Configurações de Ruído RF
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">
                    Nível de Ruído: {Math.round(noiseLevel * 100)}%
                  </Label>
                  <Slider
                    value={[noiseLevel]}
                    onValueChange={(v) => setNoiseLevel(Array.isArray(v) ? v[0] : v)}
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">
                    Drift de Frequência: {Math.round(driftAmount * 100)}%
                  </Label>
                  <Slider
                    value={[driftAmount]}
                    onValueChange={(v) => setDriftAmount(Array.isArray(v) ? v[0] : v)}
                    min={0}
                    max={0.5}
                    step={0.05}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={staticBursts}
                    onCheckedChange={setStaticBursts}
                    id="static-bursts"
                  />
                  <Label htmlFor="static-bursts" className="text-xs text-zinc-400">
                    Estática QRN
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={signalFading}
                    onCheckedChange={setSignalFading}
                    id="signal-fading"
                  />
                  <Label htmlFor="signal-fading" className="text-xs text-zinc-400">
                    Fading QSB
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mode Tabs */}
        <Tabs
          value={mode}
          onValueChange={(v) => {
            setMode(v as AppMode);
            reset();
          }}
        >
          <TabsList className="bg-zinc-900/80 border border-zinc-800/80 h-10 p-1">
            <TabsTrigger
              value="receive"
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-amber-400 text-xs tracking-wide gap-1.5 px-4"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Receber
            </TabsTrigger>
            <TabsTrigger
              value="transmit"
              className="data-[state=active]:bg-zinc-800 data-[state=active]:text-amber-400 text-xs tracking-wide gap-1.5 px-4"
            >
              <Mic className="w-3.5 h-3.5" />
              Transmitir
            </TabsTrigger>
          </TabsList>

          {/* RECEIVE MODE */}
          <TabsContent value="receive" className="space-y-4 mt-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as Difficulty)}
              >
                <SelectTrigger className="w-[160px] h-9 bg-zinc-900/80 border-zinc-800 text-xs">
                  <SelectValue placeholder="Dificuldade" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="easy" className="text-xs">
                    🟢 Fácil
                  </SelectItem>
                  <SelectItem value="medium" className="text-xs">
                    🟡 Médio
                  </SelectItem>
                  <SelectItem value="hard" className="text-xs">
                    🔴 Difícil
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={generateRadiogram}
                disabled={isGenerating}
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold h-9 px-4 text-xs tracking-wide"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Gerando…
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 mr-1.5" />
                    Gerar Radiograma
                  </>
                )}
              </Button>

              {radiogram && (
                <>
                  <Button
                    onClick={isSpeaking ? stopAudio : speakRadiogram}
                    disabled={isSpeaking && false}
                    size="sm"
                    variant="outline"
                    className="border-zinc-700 h-9 px-4 text-xs"
                  >
                    {isSpeaking ? (
                      <>
                        <Square className="w-3 h-3 mr-1.5 fill-current" />
                        Parar
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 mr-1.5" />
                        Ouvir com Ruído RF
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>

            {/* VU Meter effect while speaking */}
            {isSpeaking && (
              <div className="flex items-center gap-2 px-1">
                <div className="flex items-center gap-[3px] h-5">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-sm animate-pulse"
                      style={{
                        height: `${Math.random() * 16 + 4}px`,
                        backgroundColor:
                          i < 10
                            ? 'rgb(34 197 94)'
                            : i < 13
                              ? 'rgb(234 179 8)'
                              : 'rgb(239 68 68)',
                        animationDelay: `${i * 50}ms`,
                        animationDuration: `${300 + Math.random() * 400}ms`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-zinc-500 tracking-wide">
                  TX em andamento…
                </span>
              </div>
            )}

            {/* Radiogram Display */}
            {radiogram && <RadiogramDisplay radiogram={radiogram} />}
          </TabsContent>

          {/* TRANSMIT MODE */}
          <TabsContent value="transmit" className="space-y-4 mt-4">
            <Card className="bg-zinc-900/50 border-zinc-800/80">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col items-center gap-4">
                  <p className="text-xs text-zinc-400 text-center max-w-md leading-relaxed">
                    Pressione o botão abaixo e dite o radiograma completo.
                    Inclua preâmbulo, endereço, texto e assinatura.
                  </p>

                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing}
                    size="lg"
                    className={`rounded-full w-20 h-20 ${
                      isRecording
                        ? 'bg-red-600 hover:bg-red-500 animate-pulse shadow-lg shadow-red-900/40'
                        : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
                    }`}
                  >
                    {isTranscribing ? (
                      <Loader2 className="w-7 h-7 animate-spin text-zinc-400" />
                    ) : isRecording ? (
                      <Square className="w-6 h-6 fill-white text-white" />
                    ) : (
                      <Mic className="w-7 h-7 text-zinc-300" />
                    )}
                  </Button>

                  <span className="text-[11px] text-zinc-500 tracking-wide">
                    {isTranscribing
                      ? 'Processando áudio…'
                      : isRecording
                        ? 'Gravando… Clique para parar'
                        : 'Clique para gravar'}
                  </span>
                </div>

                {/* Recording VU meter */}
                {isRecording && (
                  <div className="flex justify-center">
                    <div className="flex items-center gap-[3px] h-6">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1 rounded-sm animate-pulse bg-red-500"
                          style={{
                            height: `${Math.random() * 20 + 4}px`,
                            animationDelay: `${i * 40}ms`,
                            animationDuration: `${200 + Math.random() * 300}ms`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transcribed Text */}
            {transcribedText && (
              <Card className="bg-zinc-900/50 border-zinc-800/80">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-xs text-zinc-400 flex items-center gap-2">
                    <Send className="w-3.5 h-3.5" />
                    Texto Transcrito
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <p className="text-sm text-zinc-200 font-mono leading-relaxed bg-zinc-800/40 rounded p-3">
                    {transcribedText}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Parsed Radiogram */}
            {parsedRadiogram && (
              <div className="space-y-2">
                <h3 className="text-xs text-zinc-400 font-semibold tracking-wide uppercase flex items-center gap-2 px-1">
                  <Radio className="w-3.5 h-3.5" />
                  Radiograma Interpretado
                </h3>
                <RadiogramDisplay radiogram={parsedRadiogram} />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Error display */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-950/30 border border-red-900/40">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Reference card */}
        <Card className="bg-zinc-900/30 border-zinc-800/60">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-zinc-500">
              <span>
                <Badge variant="outline" className="text-[10px] mr-1.5 border-emerald-800/50 text-emerald-500">
                  R
                </Badge>
                Rotina
              </span>
              <span>
                <Badge variant="outline" className="text-[10px] mr-1.5 border-amber-800/50 text-amber-500">
                  W
                </Badge>
                Bem-estar
              </span>
              <span>
                <Badge variant="outline" className="text-[10px] mr-1.5 border-orange-800/50 text-orange-500">
                  P
                </Badge>
                Prioridade
              </span>
              <span>
                <Badge variant="outline" className="text-[10px] mr-1.5 border-red-800/50 text-red-500">
                  E
                </Badge>
                Emergência
              </span>
              <span className="text-zinc-600">|</span>
              <span>X = ponto final</span>
              <span>QUERY = ?</span>
              <span>R = decimal (146R52)</span>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 mt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-[11px] text-zinc-600">
          <span>USRA · União Santamariense de Radioamadores</span>
          <span>Formato ARRL · Padrão NTS</span>
        </div>
      </footer>
    </div>
  );
}

function formatForSpeech(radiogram: Radiogram): string {
  const parts: string[] = [];

  parts.push('Radiograma.');
  parts.push(
    `Número ${radiogram.preamble.number}.`
  );
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
