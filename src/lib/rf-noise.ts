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
  audioBase64: string,
  options: Partial<RFNoiseOptions> = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const audioContext = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

  // Decode the input audio
  const binaryStr = atob(audioBase64);
  const audioBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    audioBytes[i] = binaryStr.charCodeAt(i);
  }
  const audioBuffer = await audioContext.decodeAudioData(audioBytes.buffer.slice(0));

  const duration = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;

  // Create offline context for processing
  const offlineCtx = new OfflineAudioContext(
    numChannels,
    Math.ceil(duration * sampleRate),
    sampleRate
  );

  // === Source: Original audio ===
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  // === Bandpass filter: simulate HF radio bandwidth (300Hz - 3000Hz) ===
  const bandpassLow = offlineCtx.createBiquadFilter();
  bandpassLow.type = 'highpass';
  bandpassLow.frequency.value = 300;
  bandpassLow.Q.value = 0.7;

  const bandpassHigh = offlineCtx.createBiquadFilter();
  bandpassHigh.type = 'lowpass';
  bandpassHigh.frequency.value = 3000;
  bandpassHigh.Q.value = 0.7;

  // === Slight resonance peak around 1kHz (radio speaker character) ===
  const resonance = offlineCtx.createBiquadFilter();
  resonance.type = 'peaking';
  resonance.frequency.value = 1200;
  resonance.gain.value = 4;
  resonance.Q.value = 1.5;

  // === White noise generator ===
  const noiseLength = Math.ceil(duration * sampleRate);
  const noiseBuffer = offlineCtx.createBuffer(1, noiseLength, sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);

  for (let i = 0; i < noiseLength; i++) {
    // Base white noise
    let noise = (Math.random() * 2 - 1) * opts.noiseLevel * 0.4;

    // Add occasional static bursts (QRN)
    if (opts.staticBursts && Math.random() < 0.0003) {
      const burstLength = Math.floor(Math.random() * 800 + 200);
      const burstAmplitude = Math.random() * 0.6 + 0.3;
      for (let j = 0; j < burstLength && i + j < noiseLength; j++) {
        noiseData[i + j] =
          (Math.random() * 2 - 1) * burstAmplitude * opts.noiseLevel;
      }
      i += Math.floor(burstLength * 0.8);
      continue;
    }

    // Add crackle pops
    if (Math.random() < 0.001) {
      noise += (Math.random() > 0.5 ? 1 : -1) * Math.random() * 0.3 * opts.noiseLevel;
    }

    noiseData[i] = noise;
  }

  const noiseSource = offlineCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  // Bandpass the noise too
  const noiseBandpassLow = offlineCtx.createBiquadFilter();
  noiseBandpassLow.type = 'highpass';
  noiseBandpassLow.frequency.value = 200;

  const noiseBandpassHigh = offlineCtx.createBiquadFilter();
  noiseBandpassHigh.type = 'lowpass';
  noiseBandpassHigh.frequency.value = 4000;

  // === Signal fading (QSB) using LFO ===
  const signalGain = offlineCtx.createGain();
  signalGain.gain.value = 1.0;

  if (opts.signalFading) {
    // Simulate ionospheric fading with slow gain modulation
    const fadePoints = Math.ceil(duration * 4); // 4 points per second
    const currentTime = offlineCtx.currentTime;
    for (let i = 0; i <= fadePoints; i++) {
      const t = currentTime + (i / fadePoints) * duration;
      // Combine multiple sine waves for natural fading
      const fade =
        0.7 +
        0.15 * Math.sin(2 * Math.PI * 0.3 * t) +
        0.1 * Math.sin(2 * Math.PI * 0.7 * t + 1.2) +
        0.05 * Math.sin(2 * Math.PI * 1.5 * t + 0.5);
      signalGain.gain.linearRampToValueAtTime(
        Math.max(0.3, Math.min(1.0, fade)),
        t
      );
    }
  }

  // === Frequency drift (pitch wobble) ===
  if (opts.driftAmount > 0) {
    const driftPoints = Math.ceil(duration * 3);
    const currentTime = offlineCtx.currentTime;
    for (let i = 0; i <= driftPoints; i++) {
      const t = currentTime + (i / driftPoints) * duration;
      const drift =
        1.0 +
        opts.driftAmount *
          0.003 *
          (Math.sin(2 * Math.PI * 0.2 * t) +
            0.5 * Math.sin(2 * Math.PI * 0.5 * t + 0.8));
      source.playbackRate.linearRampToValueAtTime(drift, t);
    }
  }

  // === Light compression to simulate radio AGC ===
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 10;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.1;

  // === Final output gain ===
  const outputGain = offlineCtx.createGain();
  outputGain.gain.value = 0.85;

  // === Wire it all up ===
  // Signal path: source -> bandpass -> resonance -> fading -> compressor -> output
  source.connect(bandpassLow);
  bandpassLow.connect(bandpassHigh);
  bandpassHigh.connect(resonance);
  resonance.connect(signalGain);
  signalGain.connect(compressor);

  // Noise path: noise -> noise bandpass -> compressor
  noiseSource.connect(noiseBandpassLow);
  noiseBandpassLow.connect(noiseBandpassHigh);
  noiseBandpassHigh.connect(compressor);

  // Final: compressor -> output -> destination
  compressor.connect(outputGain);
  outputGain.connect(offlineCtx.destination);

  // Start everything
  source.start(0);
  noiseSource.start(0);

  // Render
  const renderedBuffer = await offlineCtx.startRendering();

  // Encode to WAV
  const wavBlob = encodeWAV(renderedBuffer);
  const arrayBuffer = await wavBlob.arrayBuffer();
  const resultBase64 = uint8ArrayToBase64(new Uint8Array(arrayBuffer));

  await audioContext.close();

  return resultBase64;
}

function encodeWAV(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
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
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels and write samples
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(audioBuffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
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
