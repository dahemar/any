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
      GLOBAL_ANALYSER.smoothingTimeConstant = 0.8;
      
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
  currentWorkIndex: number;
  currentSceneIndex: number;
  inCreditsPanel?: boolean;
}

export default function VUMeter({ videoRef, currentWorkIndex, currentSceneIndex, inCreditsPanel = false }: VUMeterProps) {
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const lastActiveVideoRef = useRef<HTMLVideoElement | null>(null);

  const findPlayingVideo = () => {
    const videos = Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];
    return videos.find(video => !video.paused && !video.ended && video.currentTime > 0) || null;
  };

  const ensureConnectedToPlayingVideo = () => {
    const targetVideo = videoRef?.current ?? findPlayingVideo();
    if (targetVideo && targetVideo !== lastActiveVideoRef.current) {
      lastActiveVideoRef.current = targetVideo;
      connectMediaToAnalyser(targetVideo);
    }
  };

  // Get audio data for visualizations
  const getAudioData = () => {
    if (!GLOBAL_ANALYSER) return { waveform: [], frequencies: [] };

    try {
      const bufferLength = GLOBAL_ANALYSER.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      GLOBAL_ANALYSER.getByteFrequencyData(dataArray);

      const waveformData = new Uint8Array(bufferLength);
      GLOBAL_ANALYSER.getByteTimeDomainData(waveformData);
      
      const waveform = Array.from(waveformData).map(value => (value - 128) / 128);
      const frequencies = Array.from(dataArray).map(v => v / 255);

      return { waveform, frequencies };
    } catch (error) {
      return { waveform: [], frequencies: [] };
    }
  };

  // Draw elegant, complex, fluid auroral waveform
  const drawWaveform = (waveform: number[], frequencies: number[]) => {
    if (!waveformRef.current) return;
    
    const canvas = waveformRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);

    // Calculate base energy for dynamic effects (glow, intensity)
    const totalEnergy = frequencies.reduce((a, b) => a + b, 0) / (frequencies.length || 1);

    // Create a sophisticated horizontal gradient for perfect fading edges
    const getGradient = (maxAlpha: number) => {
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, 'rgba(122, 33, 49, 0)');
      grad.addColorStop(0.25, `rgba(122, 33, 49, ${maxAlpha * 0.5})`);
      grad.addColorStop(0.5, `rgba(122, 33, 49, ${maxAlpha})`);
      grad.addColorStop(0.75, `rgba(122, 33, 49, ${maxAlpha * 0.5})`);
      grad.addColorStop(1, 'rgba(122, 33, 49, 0)');
      return grad;
    };

    // Detect practically silent state to flatten gracefully
    const isSilent = !waveform.length || 
      (totalEnergy < 0.01 && waveform.every(w => Math.abs(w) < 0.01));

    if (isSilent) {
      ctx.beginPath();
      ctx.strokeStyle = getGradient(0.3); // Subtle resting gradient
      ctx.lineWidth = 1;
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    // Heavy smooth for the frequency data to create fluid, breathing hills
    let smoothFreqs = [...frequencies];
    for (let pass = 0; pass < 3; pass++) {
      smoothFreqs = smoothFreqs.map((v, i, arr) => {
         const p2 = arr[Math.max(0, i - 2)] || v;
         const p1 = arr[Math.max(0, i - 1)] || v;
         const n1 = arr[Math.min(arr.length - 1, i + 1)] || v;
         const n2 = arr[Math.min(arr.length - 2, i + 2)] || v;
         return (p2 + p1 + v * 2 + n1 + n2) / 6;
      });
    }

    // Smooth time domain to keep the macro movements and drop harsh static/noise
    let smoothWave = [...waveform];
    for (let pass = 0; pass < 2; pass++) {
      smoothWave = smoothWave.map((v, i, arr) => {
         const p1 = arr[Math.max(0, i - 1)] || v;
         const n1 = arr[Math.min(arr.length - 1, i + 1)] || v;
         return (p1 + v * 2 + n1) / 4;
      });
    }

    const points = waveform.length;

    // Helper to draw interlocking symmetrical fluid ribbons with studio-finish gradients
    const drawFilledRibbon = (
      timeScale: number, 
      freqScale: number, 
      strokeMaxOpacity: number, 
      fillMaxOpacity: number,
      addGlow = false
    ) => {
      ctx.beginPath();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      
      const getAmp = (i: number) => {
        // Hanning-like window function for a tight core, flattening earlier at edges
        const fraction = i / (points - 1);
        const env = Math.pow(Math.sin(Math.PI * fraction), 2.5);
        const f = smoothFreqs[i] * freqScale;
        const w = smoothWave[i] * timeScale;
        
        return (f + w) * env * (height / 2);
      };

      // Top edge
      for (let i = 0; i < points; i++) {
        const x = (i / (points - 1)) * width;
        const y = height / 2 - getAmp(i);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      // Bottom edge mirroring backwards
      for (let i = points - 1; i >= 0; i--) {
        const x = (i / (points - 1)) * width;
        const y = height / 2 + getAmp(i);
        ctx.lineTo(x, y);
      }
      
      ctx.closePath();
      
      ctx.fillStyle = getGradient(fillMaxOpacity);
      ctx.fill();
      
      if (strokeMaxOpacity > 0) {
        if (addGlow) {
          // Dynamic glow based on real-time audio energy
          const glowIntensity = Math.min(1.0, totalEnergy * 1.5);
          ctx.shadowBlur = 8 + (glowIntensity * 12);
          ctx.shadowColor = `rgba(122, 33, 49, ${0.4 + glowIntensity * 0.4})`;
        }

        ctx.lineWidth = addGlow ? 1.2 : 0.8;
        ctx.strokeStyle = getGradient(strokeMaxOpacity);
        ctx.stroke();

        // Reset shadow to prevent bleeding to other layers
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      }
    };

    // 1. Slow, faint outer aura (mostly driven by frequencies/bass)
    drawFilledRibbon(0.15, 0.75, 0.05, 0.04);
    
    // 2. Medium interlocking ribbon (mix of wave and frequency)
    drawFilledRibbon(0.55, 0.40, 0.15, 0.08);
    
    // 3. Inverted wave ribbon (intersects beautifully with #2)
    drawFilledRibbon(-0.65, 0.30, 0.20, 0.06);

    // 4. Central tight reactive core thread (high time-reactivity, with dynamic glow)
    drawFilledRibbon(0.85, 0.10, 0.50, 0.20, true);

    // 5. Elegant sharp central spine for visual anchorage (laser sharp, no glow)
    ctx.beginPath();
    ctx.strokeStyle = getGradient(0.85);
    ctx.lineWidth = 1;
    for (let i = 0; i < points; i++) {
        const x = (i / (points - 1)) * width;
        const env = Math.pow(Math.sin(Math.PI * (i / (points - 1))), 3);
        const y = height / 2 + (smoothWave[i] * 0.5 * env * (height / 2));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (!isMountedRef.current) return;

      ensureConnectedToPlayingVideo();
      
      const { waveform, frequencies } = getAudioData();
      drawWaveform(waveform, frequencies);
      
      intervalRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        cancelAnimationFrame(intervalRef.current);
      }
    };
  }, []);

  // Connect and reconnect video element to analyser when it changes
  useEffect(() => {
    const getActiveVideo = () => {
      if (videoRef?.current) return videoRef.current;
      const selector = `[data-work-index="${currentWorkIndex}"][data-scene-index="${currentSceneIndex}"] video`;
      return document.querySelector(selector) as HTMLVideoElement | null;
    };

    const ensureAudioContext = () => {
      if (GLOBAL_AUDIO_CONTEXT && GLOBAL_AUDIO_CONTEXT.state === 'suspended') {
        GLOBAL_AUDIO_CONTEXT.resume().catch(err => {
          console.error('Error resuming AudioContext:', err);
        });
      }
    };

    const connectActiveVideo = () => {
      const activeVideo = getActiveVideo();
      if (!activeVideo) return;
      ensureAudioContext();
      connectMediaToAnalyser(activeVideo);
    };

    const handlePlay = (event: Event) => {
      const target = event.target as HTMLVideoElement | null;
      if (target && target.tagName === 'VIDEO') {
        ensureAudioContext();
        connectMediaToAnalyser(target);
      }
    };

    const activeVideo = getActiveVideo();
    const handleLoadedMetadata = () => connectActiveVideo();
    const handleCanPlay = () => connectActiveVideo();

    if (activeVideo) {
      activeVideo.addEventListener('loadedmetadata', handleLoadedMetadata);
      activeVideo.addEventListener('canplay', handleCanPlay);
    }

    document.addEventListener('play', handlePlay, true);

    if (activeVideo && activeVideo.readyState >= 1) {
      connectActiveVideo();
    }

    return () => {
      document.removeEventListener('play', handlePlay, true);
      if (activeVideo) {
        activeVideo.removeEventListener('loadedmetadata', handleLoadedMetadata);
        activeVideo.removeEventListener('canplay', handleCanPlay);
      }
    };
  }, [videoRef, currentWorkIndex, currentSceneIndex]);

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

  const waveformCanvasStyle: React.CSSProperties = {
    display: 'block',
    background: 'transparent',
    width: '170px',
    height: '72px',
    minWidth: '170px',
    minHeight: '72px',
    flexShrink: 0,
  };

  const meterNode = (
    <div className={`vumeter-container ${inCreditsPanel ? 'in-credits-panel' : ''}`} style={containerStyle}>
      <canvas ref={waveformRef} className="waveform-canvas" width="170" height="72" style={waveformCanvasStyle} />
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
