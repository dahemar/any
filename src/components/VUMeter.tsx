import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './VUMeter.css';

// Global Web Audio API context
let GLOBAL_AUDIO_CONTEXT: AudioContext | null = null;
let GLOBAL_ANALYSER: AnalyserNode | null = null;
const CONNECTED_AUDIO_ELEMENTS = new WeakSet<HTMLMediaElement>();

// Initialize global context
const initGlobalAudioContext = () => {
  if (!GLOBAL_AUDIO_CONTEXT) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      GLOBAL_AUDIO_CONTEXT = new AudioContextClass();
      GLOBAL_ANALYSER = GLOBAL_AUDIO_CONTEXT.createAnalyser();
      GLOBAL_ANALYSER.fftSize = 256;
      GLOBAL_ANALYSER.smoothingTimeConstant = 0.55;
      
      GLOBAL_ANALYSER.connect(GLOBAL_AUDIO_CONTEXT.destination);
      
      (window as any).GLOBAL_AUDIO_CONTEXT = GLOBAL_AUDIO_CONTEXT;
      (window as any).GLOBAL_ANALYSER = GLOBAL_ANALYSER;
    } catch (error) {
      console.error('Error initializing global AudioContext:', error);
    }
  }
  return { context: GLOBAL_AUDIO_CONTEXT, analyser: GLOBAL_ANALYSER };
};

// Check if a media element can safely be connected to Web Audio API.
// createMediaElementSource on a cross-origin video without crossOrigin attribute
// causes the browser to SILENTLY MUTE all audio output from that element.
const isSafeForWebAudio = (el: HTMLMediaElement): boolean => {
  // Same-origin or blob/data URLs are always safe
  const src = el.currentSrc || el.src || '';
  if (!src || src.startsWith('blob:') || src.startsWith('data:')) return true;

  try {
    const srcUrl = new URL(src, window.location.href);
    // Same origin — safe
    if (srcUrl.origin === window.location.origin) return true;
  } catch {
    return true; // relative URL or unparseable — treat as same-origin
  }

  // Cross-origin: only safe if the element was loaded with crossOrigin attribute
  // (which makes the browser enforce CORS and allows Web Audio to read audio data)
  return el.crossOrigin !== null;
};

// Connect audio/video element to global analyser
const connectMediaToAnalyser = (mediaElement: HTMLMediaElement | null) => {
  if (!mediaElement) return;
  
  if (CONNECTED_AUDIO_ELEMENTS.has(mediaElement)) return;

  // IMPORTANT: Do NOT call createMediaElementSource on cross-origin media without
  // crossOrigin attribute — doing so silences the element's audio output permanently.
  if (!isSafeForWebAudio(mediaElement)) {
    // Mark as "connected" so we don't retry, but skip actual Web Audio connection
    CONNECTED_AUDIO_ELEMENTS.add(mediaElement);
    return;
  }

  const mediaEl = mediaElement as any;
  if (mediaEl._webAudioSource || mediaEl._audioNode) {
    CONNECTED_AUDIO_ELEMENTS.add(mediaElement);
    return;
  }

  const { context, analyser } = initGlobalAudioContext();
  if (!context || !analyser) return;

  try {
    if (context.state === 'suspended') {
      context.resume().catch(err => {
        console.error('Error resuming AudioContext:', err);
      });
    }
    
    const source = context.createMediaElementSource(mediaElement);
    source.connect(analyser);
    
    CONNECTED_AUDIO_ELEMENTS.add(mediaElement);
    mediaEl._webAudioSource = source;
    mediaEl._audioNode = source;
  } catch (error: any) {
    if (error.message && (error.message.includes('already connected') || error.message.includes('MediaElementSourceNode'))) {
      CONNECTED_AUDIO_ELEMENTS.add(mediaElement);
      return;
    }
    console.error('Error connecting media to analyser:', error);
  }
};

interface VUMeterProps {
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  currentWorkIndex: number;
  currentSceneIndex: number;
  inCreditsPanel?: boolean;
}

export default function VUMeter({ videoRef, audioRef, currentWorkIndex, currentSceneIndex, inCreditsPanel = false }: VUMeterProps) {
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const lastActiveMediaRef = useRef<HTMLMediaElement | null>(null);
  const freqBufferRef = useRef<Uint8Array | null>(null);
  const waveBufferRef = useRef<Uint8Array | null>(null);
  const freqScratchRef = useRef<number[]>([]);
  const waveScratchRef = useRef<number[]>([]);
  const lastDrawRef = useRef(0);
  const silentFramesRef = useRef(0);

  const resolvePlayingMedia = () => {
    // Fast path: reuse the last known playing media without touching the DOM.
    const last = lastActiveMediaRef.current;
    if (last && last.isConnected && !last.paused && !last.ended) {
      return last;
    }
    if (audioRef?.current && !audioRef.current.paused && !audioRef.current.ended && audioRef.current.currentTime > 0) {
      return audioRef.current;
    }
    if (videoRef?.current && !videoRef.current.paused && !videoRef.current.ended && videoRef.current.currentTime > 0) {
      return videoRef.current;
    }
    // Slow path fallback (refs not wired yet): scan the document.
    const medias = Array.from(document.querySelectorAll('audio, video')) as HTMLMediaElement[];
    return medias.find(media => !media.paused && !media.ended && media.currentTime > 0) || null;
  };

  const connectTargetMedia = (mediaElement: HTMLMediaElement | null) => {
    if (!mediaElement || mediaElement === lastActiveMediaRef.current) return;
    lastActiveMediaRef.current = mediaElement;
    connectMediaToAnalyser(mediaElement);
  };

  const getFallbackAudioData = () => {
    const bufferLength = 128;
    if (!freqScratchRef.current || freqScratchRef.current.length !== bufferLength) {
      freqScratchRef.current = new Array(bufferLength);
      waveScratchRef.current = new Array(bufferLength);
    }

    const frequencies = freqScratchRef.current;
    const waveform = waveScratchRef.current;
    const time = performance.now() / 1000;

    // Multiple drifting harmonics so peaks and valleys genuinely reshape
    // over time instead of a fixed silhouette wobbling in place.
    for (let i = 0; i < bufferLength; i += 1) {
      const f = i / bufferLength;
      const h1 = Math.sin(f * Math.PI * 2 * (2.2 + Math.sin(time * 0.31) * 1.4) + time * 2.1);
      const h2 = Math.sin(f * Math.PI * 2 * (5.1 + Math.sin(time * 0.17) * 2.2) - time * 1.3);
      const h3 = Math.sin(f * Math.PI * 2 * (9.7 + Math.cos(time * 0.23) * 3.1) + time * 3.7);
      const energy = 0.45 + 0.3 * Math.sin(time * 0.9) * Math.sin(time * 0.37);
      const v = (h1 * 0.55 + h2 * 0.3 + h3 * 0.15) * energy;
      waveform[i] = v * 0.7;
      frequencies[i] = Math.max(0.03, Math.abs(v) * (0.6 + 0.4 * Math.sin(time * 1.7 + f * 9)));
    }

    return { waveform, frequencies };
  };

  const getAudioData = () => {
    const media = lastActiveMediaRef.current;
    const isConnected = media && ((media as any)._audioNode || (media as any)._webAudioSource);
    if (!GLOBAL_ANALYSER || !isConnected) {
      return getFallbackAudioData();
    }

    try {
      const bufferLength = GLOBAL_ANALYSER.frequencyBinCount;
      if (!freqBufferRef.current || freqBufferRef.current.length !== bufferLength) {
        freqBufferRef.current = new Uint8Array(bufferLength);
        waveBufferRef.current = new Uint8Array(bufferLength);
        freqScratchRef.current = new Array(bufferLength);
        waveScratchRef.current = new Array(bufferLength);
      }

      const dataArray = freqBufferRef.current;
      const waveformData = waveBufferRef.current!;
      GLOBAL_ANALYSER.getByteFrequencyData(dataArray);
      GLOBAL_ANALYSER.getByteTimeDomainData(waveformData);

      const frequencies = freqScratchRef.current;
      const waveform = waveScratchRef.current;
      for (let i = 0; i < bufferLength; i += 1) {
        frequencies[i] = dataArray[i] / 255;
        waveform[i] = (waveformData[i] - 128) / 128;
      }

      return { waveform, frequencies };
    } catch {
      return getFallbackAudioData();
    }
  };

  // Pencil-sketch waveform: layered burgundy strokes with hand-tremor
  // wobble, pressure-weighted segments and tapered ends — matching the
  // hand-drawn logo style, but driven by the live audio analyser.
  const drawWaveform = (waveform: number[], frequencies: number[], time: number) => {
    if (!waveformRef.current) return;

    const canvas = waveformRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const points = waveform.length;
    if (!points) return;

    const totalEnergy = frequencies.reduce((a, b) => a + b, 0) / (frequencies.length || 1);
    const isSilent =
      !waveform.length ||
      (totalEnergy < 0.01 && waveform.every((w) => Math.abs(w) < 0.01));

    const t = time / 1000;
    const ACCENT = '122, 33, 49';
    const amplitude = height * 0.42;

    // Light smoothing on the time-domain wave only — the frequency bins
    // stay raw so each frame's spectral peaks carve real new valleys.
    const wave = waveform.map((v, i) => {
      const p = waveform[Math.max(0, i - 1)] ?? v;
      const n = waveform[Math.min(points - 1, i + 1)] ?? v;
      return (p + v * 2 + n) / 4;
    });
    const freq = frequencies;

    // Frequency average — used to make the spectrum bipolar (peaks AND
    // valleys that actually move with the music, not a uniform offset).
    const freqAvg = freq.reduce((a, b) => a + b, 0) / (freq.length || 1);

    // Wide envelope: only the very ends settle flat, most of the line is
    // free to form peaks.
    const env = (i: number) => Math.pow(Math.sin((Math.PI * i) / (points - 1)), 0.7);

    // Smooth animated pseudo-noise = hand tremor (texture, not shape).
    const noise = (i: number, phase: number, speed: number) =>
      Math.sin(i * 0.9 + t * speed + phase) * 0.6 +
      Math.sin(i * 0.23 - t * speed * 0.7 + phase * 2) * 0.4;

    const pointAt = (
      i: number,
      waveGain: number,
      freqGain: number,
      wobbleAmp: number,
      phase: number,
      harmonic: number
    ) => {
      const f = i / (points - 1);
      const x = f * width;
      const e = env(i);
      // Bipolar spectral drive + time-domain wave = peaks/valleys that
      // reshape every frame with the music.
      const signal = (wave[i] * waveGain + (freq[i] - freqAvg) * 2.2 * freqGain) * e;
      const wobble = noise(i, phase, 1.1) * wobbleAmp * (0.3 + 0.7 * e);
      const curl = Math.sin(f * Math.PI * 2 * harmonic + t * 1.7 + phase) * 0.03 * e;
      const y = height / 2 - (signal + curl) * amplitude + wobble;
      return { x, y };
    };

    const strokePass = (opts: {
      waveGain: number;
      freqGain: number;
      alpha: number;
      width: number;
      wobble: number;
      phase: number;
      harmonic: number;
    }) => {
      ctx.beginPath();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = opts.width;
      ctx.strokeStyle = `rgba(${ACCENT}, ${opts.alpha})`;
      for (let i = 0; i < points; i++) {
        const { x, y } = pointAt(i, opts.waveGain, opts.freqGain, opts.wobble, opts.phase, opts.harmonic);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    if (isSilent) {
      // Resting pencil line with a faint tremor.
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(${ACCENT}, 0.32)`;
      for (let i = 0; i < points; i++) {
        const x = (i / (points - 1)) * width;
        const y = height / 2 + noise(i, 0, 0.8) * 0.6;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      return;
    }

    // Main confident stroke — full spectral drive.
    strokePass({ waveGain: 1.1, freqGain: 1.0, alpha: 0.8, width: 1.5, wobble: 0.55, phase: 0, harmonic: 7 });
    // Sketch echo — the artist redrawing the line, reading the wave more.
    strokePass({ waveGain: 0.9, freqGain: 0.75, alpha: 0.32, width: 0.9, wobble: 1.0, phase: 2.1, harmonic: 11 });
    // Loose inverted under-sketch for depth.
    strokePass({ waveGain: -0.55, freqGain: -0.4, alpha: 0.2, width: 0.8, wobble: 1.4, phase: 4.4, harmonic: 5 });

    // Pressure emphasis: re-ink short segments where the music peaks.
    ctx.lineWidth = 2.1;
    ctx.strokeStyle = `rgba(${ACCENT}, 0.26)`;
    const SEG = 6;
    for (let s = 0; s < points - SEG; s += SEG) {
      const local = Math.abs(wave[s]) + Math.abs(freq[s] - freqAvg) * 2;
      if (local < 0.3) continue;
      ctx.beginPath();
      for (let i = s; i <= Math.min(s + SEG, points - 1); i++) {
        const { x, y } = pointAt(i, 1.1, 1.0, 0.55, 0, 7);
        if (i === s) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  };

  useEffect(() => {
    const animate = (time: number) => {
      intervalRef.current = requestAnimationFrame(animate);
      if (!isMountedRef.current || document.hidden) return;
      if (time - lastDrawRef.current < 40) return;

      const playingMedia = resolvePlayingMedia();
      if (!playingMedia || playingMedia.paused) {
        silentFramesRef.current += 1;
        if (silentFramesRef.current > 2) return;
      } else {
        silentFramesRef.current = 0;
        connectTargetMedia(playingMedia);
      }

      lastDrawRef.current = time;
      const { waveform, frequencies } = getAudioData();
      drawWaveform(waveform, frequencies, time);
    };

    intervalRef.current = requestAnimationFrame(animate);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        cancelAnimationFrame(intervalRef.current);
      }
    };
  }, [audioRef, videoRef]);

  // Connect and reconnect video element to analyser when it changes
  useEffect(() => {
    const getActiveMedia = () => {
      if (audioRef?.current) return audioRef.current;
      if (videoRef?.current) return videoRef.current;
      const selector = `[data-work-index="${currentWorkIndex}"][data-scene-index="${currentSceneIndex}"] audio, [data-work-index="${currentWorkIndex}"][data-scene-index="${currentSceneIndex}"] video`;
      return document.querySelector(selector) as HTMLMediaElement | null;
    };

    const ensureAudioContext = () => {
      if (GLOBAL_AUDIO_CONTEXT && GLOBAL_AUDIO_CONTEXT.state === 'suspended') {
        GLOBAL_AUDIO_CONTEXT.resume().catch(err => {
          console.error('Error resuming AudioContext:', err);
        });
      }
    };

    const connectActiveMedia = () => {
      const activeMedia = getActiveMedia();
      if (!activeMedia) return;
      ensureAudioContext();
      connectMediaToAnalyser(activeMedia);
    };

    const handlePlay = (event: Event) => {
      const target = event.target as HTMLMediaElement | null;
      if (target && (target.tagName === 'VIDEO' || target.tagName === 'AUDIO')) {
        ensureAudioContext();
        connectMediaToAnalyser(target);
      }
    };

    const activeMedia = getActiveMedia();
    const handleLoadedMetadata = () => connectActiveMedia();
    const handleCanPlay = () => connectActiveMedia();

    if (activeMedia) {
      activeMedia.addEventListener('loadedmetadata', handleLoadedMetadata);
      activeMedia.addEventListener('canplay', handleCanPlay);
    }

    document.addEventListener('play', handlePlay, true);

    if (activeMedia && activeMedia.readyState >= 1) {
      connectActiveMedia();
    }

    return () => {
      document.removeEventListener('play', handlePlay, true);
      if (activeMedia) {
        activeMedia.removeEventListener('loadedmetadata', handleLoadedMetadata);
        activeMedia.removeEventListener('canplay', handleCanPlay);
      }
    };
  }, [audioRef, videoRef, currentWorkIndex, currentSceneIndex]);

  if (typeof document === 'undefined') return null;

  let containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '2rem',
    right: '2rem',
    width: 'calc(26% - 4rem)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 99999,
    overflow: 'visible',
    pointerEvents: 'none',
  };

  if (inCreditsPanel) {
    // For in-panel mode we avoid absolute positioning to prevent clipping
    // inside the panel's scrolling area. Styles will be provided by
    // `.credits-vumeter` in CSS (sticky positioning).
    containerStyle = {
      display: 'flex',
      justifyContent: 'flex-end',
      pointerEvents: 'none',
      width: '100%'
    } as React.CSSProperties;
  }

  const waveformW = inCreditsPanel ? 255 : 170;
  const waveformH = inCreditsPanel ? 108 : 72;

  const waveformCanvasStyle: React.CSSProperties = {
    display: 'block',
    background: 'transparent',
    width: `${waveformW}px`,
    height: `${waveformH}px`,
    minWidth: `${waveformW}px`,
    minHeight: `${waveformH}px`,
    flexShrink: 0,
  };

  const meterNode = (
    <div className={`vumeter-container ${inCreditsPanel ? 'in-credits-panel' : ''}`} style={containerStyle}>
      <canvas ref={waveformRef} className="waveform-canvas" width={waveformW} height={waveformH} style={waveformCanvasStyle} />
    </div>
  );

  if (inCreditsPanel) {
    // render inline inside credits panel
    return (
      <div className="credits-vumeter" style={containerStyle}>
        {meterNode}
      </div>
    );
  }

  return ReactDOM.createPortal(meterNode, document.body);
}
