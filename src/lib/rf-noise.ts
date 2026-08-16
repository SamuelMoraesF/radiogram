export interface RFNoiseOptions {
  noiseLevel: number; // 0-1, how much noise
  staticBursts: boolean;
  signalFading: boolean;
  driftAmount: number; // 0-1, frequency drift
}

const DEFAULT_OPTIONS: RFNoiseOptions = {
  noiseLevel: 0.3,
  staticBursts: true,
  signalFading: true,
  driftAmount: 0.15,
};

export async function applyRFNoise(
  audioBase64Input: string | string[],
  options: Partial<RFNoiseOptions> = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const audioContext = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext)();

  const base64List = Array.isArray(audioBase64Input) ? audioBase64Input : [audioBase64Input];
  const audioBuffers: AudioBuffer[] = [];

  for (const b64 of base64List) {
    const binaryStr = atob(b64);
    const audioBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      audioBytes[i] = binaryStr.charCodeAt(i);
    }
    const buf = await audioContext.decodeAudioData(audioBytes.buffer.slice(0));
    audioBuffers.push(buf);
  }

  const sampleRate = audioBuffers[0].sampleRate;
  
  // Calculate total duration including 1.5s gaps between turns
  const GAP_SECONDS = 1.5;
  const BEEP_SECONDS = 0.1;
  const totalDuration = audioBuffers.reduce((acc, buf) => acc + (buf.length / sampleRate) + GAP_SECONDS, 0);

  // ── Force MONO output (single channel) ──
  const offlineCtx = new OfflineAudioContext(
    1,
    Math.ceil(totalDuration * sampleRate),
    sampleRate
  );

  // ═══════════════════════════════════════════
  //  VHF/UHF NBFM Radio Chain
  // ═══════════════════════════════════════════

  // 1. Pre-emphasis (boost highs like FM transmitter)
  const preEmphasis = offlineCtx.createBiquadFilter();
  preEmphasis.type = 'highshelf';
  preEmphasis.frequency.value = 2500;
  preEmphasis.gain.value = 6;

  // 2. Hard bandpass: NBFM voice is ~300Hz–2800Hz
  const hpf = offlineCtx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 350;
  hpf.Q.value = 0.8;

  const lpf = offlineCtx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 2800;
  lpf.Q.value = 0.8;

  // 3. Second-order rolloff for steeper filter walls
  const hpf2 = offlineCtx.createBiquadFilter();
  hpf2.type = 'highpass';
  hpf2.frequency.value = 300;
  hpf2.Q.value = 0.5;

  const lpf2 = offlineCtx.createBiquadFilter();
  lpf2.type = 'lowpass';
  lpf2.frequency.value = 3000;
  lpf2.Q.value = 0.5;

  // 4. Radio speaker resonance
  const speakerRes1 = offlineCtx.createBiquadFilter();
  speakerRes1.type = 'peaking';
  speakerRes1.frequency.value = 1800;
  speakerRes1.gain.value = 7;
  speakerRes1.Q.value = 1.8;

  const speakerRes2 = offlineCtx.createBiquadFilter();
  speakerRes2.type = 'peaking';
  speakerRes2.frequency.value = 800;
  speakerRes2.gain.value = 3;
  speakerRes2.Q.value = 1.2;

  const subCut = offlineCtx.createBiquadFilter();
  subCut.type = 'highpass';
  subCut.frequency.value = 500;
  subCut.Q.value = 0.5;

  // 5. De-emphasis
  const deEmphasis = offlineCtx.createBiquadFilter();
  deEmphasis.type = 'highshelf';
  deEmphasis.frequency.value = 2500;
  deEmphasis.gain.value = -4;

  // 6. Heavy compression
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.value = -30;
  compressor.knee.value = 5;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.002;
  compressor.release.value = 0.05;

  // 7. Second stage limiter
  const limiter = offlineCtx.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.02;

  // === Noise generator ===
  const noiseLength = Math.ceil(totalDuration * sampleRate);
  const noiseBuffer = offlineCtx.createBuffer(1, noiseLength, sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);

  for (let i = 0; i < noiseLength; i++) {
    let noise = (Math.random() * 2 - 1) * opts.noiseLevel * 0.35;
    if (opts.staticBursts && Math.random() < 0.0001) {
      const burstLen = Math.floor(Math.random() * 300 + 50);
      const burstAmp = Math.random() * 0.3 + 0.15;
      for (let j = 0; j < burstLen && i + j < noiseLength; j++) {
        noiseData[i + j] = (Math.random() * 2 - 1) * burstAmp * opts.noiseLevel;
      }
      i += Math.floor(burstLen * 0.7);
      continue;
    }
    if (Math.random() < 0.0005) {
      noise += (Math.random() > 0.5 ? 1 : -1) * Math.random() * 0.15 * opts.noiseLevel;
    }
    noiseData[i] = noise;
  }

  const noiseSource = offlineCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const noiseHpf = offlineCtx.createBiquadFilter();
  noiseHpf.type = 'highpass';
  noiseHpf.frequency.value = 400;

  const noiseLpf = offlineCtx.createBiquadFilter();
  noiseLpf.type = 'lowpass';
  noiseLpf.frequency.value = 3500;

  const noiseGain = offlineCtx.createGain();
  noiseGain.gain.value = 0; // Starts silent (squelched)

  // === Squelch burst buffers ===
  const squelchLength = Math.ceil(0.15 * sampleRate); // 150ms
  const squelchOpenBuffer = offlineCtx.createBuffer(1, squelchLength, sampleRate);
  const squelchCloseBuffer = offlineCtx.createBuffer(1, squelchLength, sampleRate);
  const sqOpenData = squelchOpenBuffer.getChannelData(0);
  const sqCloseData = squelchCloseBuffer.getChannelData(0);

  for (let i = 0; i < squelchLength; i++) {
    const t = i / squelchLength;
    sqOpenData[i] = (Math.random() * 2 - 1) * Math.exp(-t * 12) * 0.7;
    sqCloseData[i] = (Math.random() * 2 - 1) * Math.pow(t, 0.3) * Math.exp(-(t - 0.3) * 8) * 0.7;
  }

  const sqBpf = offlineCtx.createBiquadFilter();
  sqBpf.type = 'bandpass';
  sqBpf.frequency.value = 2000;
  sqBpf.Q.value = 0.5;

  const sqGain = offlineCtx.createGain();
  sqGain.gain.value = 1.2;

  // === Output gain ===
  const outputGain = offlineCtx.createGain();
  outputGain.gain.value = 0.75;

  // ═══════════════════════════════════════════
  //  Signal Chain Wiring
  // ═══════════════════════════════════════════

  // Create a master Voice Gain so we can apply fading/flutter just to the voice and not the beep/squelch
  const voiceGain = offlineCtx.createGain();
  voiceGain.gain.value = 1.0;

  if (opts.signalFading) {
    const fadePoints = Math.ceil(totalDuration * 8);
    for (let i = 0; i <= fadePoints; i++) {
      const t = (i / fadePoints) * totalDuration;
      const fade =
        0.85 +
        0.08 * Math.sin(2 * Math.PI * 1.2 * t) +
        0.05 * Math.sin(2 * Math.PI * 3.1 * t + 0.7) +
        0.02 * Math.sin(2 * Math.PI * 7.3 * t + 2.1);
      voiceGain.gain.linearRampToValueAtTime(Math.max(0.5, Math.min(1.0, fade)), t);
    }
  }

  // Chain: Voice -> Flutter -> PreEmph -> Filters -> DeEmph -> Compressor
  voiceGain.connect(preEmphasis);
  preEmphasis.connect(hpf);
  hpf.connect(lpf);
  lpf.connect(hpf2);
  hpf2.connect(lpf2);
  lpf2.connect(speakerRes1);
  speakerRes1.connect(speakerRes2);
  speakerRes2.connect(subCut);
  subCut.connect(deEmphasis);
  deEmphasis.connect(compressor);

  noiseSource.connect(noiseHpf);
  noiseHpf.connect(noiseLpf);
  noiseLpf.connect(noiseGain);
  noiseGain.connect(compressor);

  compressor.connect(limiter);
  limiter.connect(outputGain);

  sqBpf.connect(sqGain);
  sqGain.connect(outputGain);
  outputGain.connect(offlineCtx.destination);

  // ═══════════════════════════════════════════
  //  Scheduling Loop
  // ═══════════════════════════════════════════

  noiseSource.start(0);

  let currentTime = 0;

  for (const buf of audioBuffers) {
    const turnDuration = buf.length / sampleRate;

    // 1. Squelch Opens
    const sqOpen = offlineCtx.createBufferSource();
    sqOpen.buffer = squelchOpenBuffer;
    sqOpen.connect(sqBpf);
    sqOpen.start(currentTime);

    // Turn noise on (radio unsquelched)
    noiseGain.gain.setValueAtTime(0, currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.8, currentTime + 0.05);

    // 2. Play Voice (downmixed to mono)
    const monoBuf = offlineCtx.createBuffer(1, buf.length, sampleRate);
    const mData = monoBuf.getChannelData(0);
    const numInputChannels = buf.numberOfChannels;
    for (let i = 0; i < buf.length; i++) {
      let sum = 0;
      for (let c = 0; c < numInputChannels; c++) {
        sum += buf.getChannelData(c)[i];
      }
      mData[i] = sum / numInputChannels;
    }

    const voiceSource = offlineCtx.createBufferSource();
    voiceSource.buffer = monoBuf;
    
    // Add subtle drift per chunk
    if (opts.driftAmount > 0) {
      const driftPoints = Math.ceil(turnDuration * 4);
      for (let i = 0; i <= driftPoints; i++) {
        const t = currentTime + (i / driftPoints) * turnDuration;
        const drift = 1.0 + opts.driftAmount * 0.001 * Math.sin(2 * Math.PI * 0.15 * t + 0.3);
        voiceSource.playbackRate.linearRampToValueAtTime(drift, t);
      }
    }

    voiceSource.connect(voiceGain);
    voiceSource.start(currentTime + 0.1); // Small delay after squelch open

    const endTime = currentTime + 0.1 + turnDuration;

    // 3. Roger Beep
    const osc = offlineCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1200; // Classic VHF beep freq
    
    const beepGain = offlineCtx.createGain();
    beepGain.gain.setValueAtTime(0, endTime);
    beepGain.gain.linearRampToValueAtTime(0.5, endTime + 0.01);
    beepGain.gain.setValueAtTime(0.5, endTime + BEEP_SECONDS - 0.01);
    beepGain.gain.linearRampToValueAtTime(0, endTime + BEEP_SECONDS);

    osc.connect(beepGain);
    beepGain.connect(outputGain); // Bypass compression for clear beep
    
    osc.start(endTime);
    osc.stop(endTime + BEEP_SECONDS);

    // 4. Squelch Closes
    const sqClose = offlineCtx.createBufferSource();
    sqClose.buffer = squelchCloseBuffer;
    sqClose.connect(sqBpf);
    sqClose.start(endTime + BEEP_SECONDS);

    // Turn noise off (radio squelched)
    noiseGain.gain.setValueAtTime(0.8, endTime + BEEP_SECONDS);
    noiseGain.gain.linearRampToValueAtTime(0, endTime + BEEP_SECONDS + 0.1);

    // Advance time for next turn
    currentTime = endTime + BEEP_SECONDS + GAP_SECONDS;
  }

  // Render
  const renderedBuffer = await offlineCtx.startRendering();

  // ── Apply soft clipping (FM deviation distortion) ──
  const rendered = renderedBuffer.getChannelData(0);
  for (let i = 0; i < rendered.length; i++) {
    // Tanh soft clipping — characteristic of FM limiters
    rendered[i] = Math.tanh(rendered[i] * 1.8) * 0.9;
  }

  // Encode to WAV (mono)
  const wavBlob = encodeWAV(renderedBuffer);
  const arrayBuffer = await wavBlob.arrayBuffer();
  const resultBase64 = uint8ArrayToBase64(new Uint8Array(arrayBuffer));

  await audioContext.close();

  return resultBase64;
}

function encodeWAV(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels; // will be 1 (mono)
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = audioBuffer.length;
  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(audioBuffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}
