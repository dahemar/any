import { useEffect, useRef, useState } from 'react';
import type { ThumbnailPalette } from '../lib/thumbnailColors';
import './AmbientGlow.css';

interface AmbientGlowProps {
  palette: ThumbnailPalette | null;
  active: boolean;
}

function paletteKey(palette: ThumbnailPalette): string {
  return `${palette.primary}|${palette.secondary}|${palette.accent}`;
}

export default function AmbientGlow({ palette, active }: AmbientGlowProps) {
  const [frontSlot, setFrontSlot] = useState<0 | 1>(0);
  const [slots, setSlots] = useState<[ThumbnailPalette | null, ThumbnailPalette | null]>([null, null]);
  const lastKeyRef = useRef<string | null>(null);
  const stackRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);
  const motionRef = useRef({
    level: 0,
    low: 0,
    phase: 0,
  });

  useEffect(() => {
    if (!active) {
      lastKeyRef.current = null;
      return;
    }
    if (!palette) return;

    const key = paletteKey(palette);
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    setFrontSlot((currentFront) => {
      const nextFront: 0 | 1 = currentFront === 0 ? 1 : 0;
      setSlots((prev) => {
        const next: [ThumbnailPalette | null, ThumbnailPalette | null] = [...prev];
        next[nextFront] = palette;
        return next;
      });
      return nextFront;
    });
  }, [palette, active]);

  const show = active && (slots[0] !== null || slots[1] !== null);

  useEffect(() => {
    const stack = stackRef.current;
    if (!show || !stack || typeof window === 'undefined') {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return undefined;
    }

    let lastFrame = 0;

    const animate = (time: number) => {
      animationFrameRef.current = window.requestAnimationFrame(animate);

      // Keep this around 30fps: enough for a liquid shimmer, cheaper than full-rate updates.
      if (time - lastFrame < 33) return;
      lastFrame = time;

      const analyser = (window as any).GLOBAL_ANALYSER as AnalyserNode | undefined;
      let targetLevel = 0.08;
      let targetLow = 0.08;

      if (analyser) {
        if (!audioDataRef.current || audioDataRef.current.length !== analyser.frequencyBinCount) {
          audioDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        }

        analyser.getByteFrequencyData(audioDataRef.current);

        const data = audioDataRef.current;
        const lowEnd = Math.max(8, Math.floor(data.length * 0.18));
        const midEnd = Math.max(lowEnd + 1, Math.floor(data.length * 0.46));
        let lowSum = 0;
        let midSum = 0;

        for (let i = 0; i < lowEnd; i += 1) lowSum += data[i];
        for (let i = lowEnd; i < midEnd; i += 1) midSum += data[i];

        targetLow = lowSum / lowEnd / 255;
        targetLevel = (lowSum + midSum * 0.72) / (lowEnd + (midEnd - lowEnd) * 0.72) / 255;
      }

      const motion = motionRef.current;
      motion.level = motion.level * 0.88 + targetLevel * 0.12;
      motion.low = motion.low * 0.9 + targetLow * 0.1;
      motion.phase += 0.018 + motion.low * 0.016;

      const ripple = Math.sin(motion.phase) * motion.level;
      const counterRipple = Math.cos(motion.phase * 0.72) * motion.low;

      stack.style.setProperty('--audio-level', motion.level.toFixed(3));
      stack.style.setProperty('--audio-low', motion.low.toFixed(3));
      stack.style.setProperty('--glow-shift-x', `${(ripple * 10).toFixed(2)}px`);
      stack.style.setProperty('--glow-rise', `${(-motion.low * 14).toFixed(2)}px`);
      stack.style.setProperty('--glow-scale', (1.025 + motion.level * 0.045).toFixed(3));
      stack.style.setProperty('--glow-ripple', `${(counterRipple * 8).toFixed(2)}px`);
      stack.style.setProperty('--audio-white-alpha', (0.16 + motion.low * 0.16).toFixed(3));
      stack.style.setProperty('--audio-side-alpha', (0.14 + motion.low * 0.08).toFixed(3));
      stack.style.setProperty('--audio-bottom-alpha', (0.34 + motion.level * 0.18).toFixed(3));
      stack.style.setProperty('--audio-bottom-light-alpha', (0.06 + motion.low * 0.12).toFixed(3));
      stack.style.setProperty('--audio-bottom-light-alpha-soft', (0.048 + motion.low * 0.096).toFixed(3));
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [show]);

  const renderLayer = (slot: 0 | 1, layerPalette: ThumbnailPalette | null) => {
    if (!layerPalette) return null;
    const isFront = frontSlot === slot && show;

    return (
      <div
        key={slot}
        className={`ambient-glow-layer ${isFront ? 'is-front' : ''}`}
        style={
          {
            '--glow-primary': layerPalette.primary,
            '--glow-secondary': layerPalette.secondary,
            '--glow-accent': layerPalette.accent,
          } as React.CSSProperties
        }
      />
    );
  };

  return (
    <div ref={stackRef} className={`ambient-glow-stack ${show ? 'is-active' : ''}`} aria-hidden="true">
      {renderLayer(0, slots[0])}
      {renderLayer(1, slots[1])}
    </div>
  );
}
