import { useCallback, useEffect, useRef, useState } from 'react';
import './HeroPage.css';

const POINTS = 128;
const MAX_BLUR = 6;

function generateSimulatedData(phase: number): { waveform: number[]; frequencies: number[] } {
  const waveform: number[] = [];
  const frequencies: number[] = [];

  for (let i = 0; i < POINTS; i++) {
    const envelope = Math.pow(Math.sin((Math.PI * i) / (POINTS - 1)), 2.5);
    const w =
      Math.sin(phase + i * 0.18) * 0.55 +
      Math.sin(phase * 1.6 + i * 0.09) * 0.35 +
      Math.sin(phase * 0.55 + i * 0.04) * 0.25 +
      Math.sin(phase * 2.1 + i * 0.26) * 0.18;
    waveform.push(w * envelope);
    const f =
      Math.sin(phase * 0.8 + i * 0.03) * 0.5 +
      Math.sin(phase * 1.2 + i * 0.12) * 0.3 +
      0.5;
    frequencies.push(Math.abs(f) * envelope * 0.7);
  }

  return { waveform, frequencies };
}

export default function HeroPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const phaseRef = useRef(0);
  const targetPhaseRef = useRef(0);
  const lastScrollYRef = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  const rafRef = useRef<number | null>(null);
  const heroBottomRef = useRef(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  const updateScrollProgress = useCallback(() => {
    if (heroBottomRef.current <= 0) return;
    const scrollY = window.scrollY;
    const progress = Math.min(1, Math.max(0, scrollY / (heroBottomRef.current * 0.65)));
    setScrollProgress(progress);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      const el = containerRef.current;
      const rect = el.getBoundingClientRect();
      heroBottomRef.current = window.scrollY + rect.top + rect.height;
      updateScrollProgress();
    }
  }, [updateScrollProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const SCROLL_FACTOR = 0.005;
    const SMOOTHING = 0.12;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };

    resize();
    window.addEventListener('resize', resize);

    const drawWaveform = (
      waveform: number[],
      frequencies: number[],
      w: number,
      h: number
    ) => {
      const totalEnergy = frequencies.reduce((a, b) => a + b, 0) / (frequencies.length || 1);

      const getHorizontalFade = (maxAlpha: number) => {
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, 'rgba(122, 33, 49, 0)');
        grad.addColorStop(0.2, `rgba(122, 33, 49, ${maxAlpha * 0.35})`);
        grad.addColorStop(0.5, `rgba(122, 33, 49, ${maxAlpha})`);
        grad.addColorStop(0.8, `rgba(122, 33, 49, ${maxAlpha * 0.35})`);
        grad.addColorStop(1, 'rgba(122, 33, 49, 0)');
        return grad;
      };

      const getVerticalGlow = (maxAlpha: number) => {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, `rgba(122, 33, 49, ${maxAlpha * 0.15})`);
        grad.addColorStop(0.25, `rgba(122, 33, 49, ${maxAlpha * 0.55})`);
        grad.addColorStop(0.5, `rgba(122, 33, 49, ${maxAlpha})`);
        grad.addColorStop(0.75, `rgba(122, 33, 49, ${maxAlpha * 0.55})`);
        grad.addColorStop(1, `rgba(122, 33, 49, ${maxAlpha * 0.15})`);
        return grad;
      };

      const isSilent =
        !waveform.length ||
        (totalEnergy < 0.01 && waveform.every((v) => Math.abs(v) < 0.01));

      if (isSilent) {
        ctx.beginPath();
        ctx.fillStyle = getVerticalGlow(0.18);
        ctx.fillRect(0, h / 2 - 0.5, w, 1);
        return;
      }

      const points = waveform.length;

      let smoothFreqs = [...frequencies];
      for (let pass = 0; pass < 3; pass++) {
        smoothFreqs = smoothFreqs.map((v, i, arr) => {
          const p2 = arr[Math.max(0, i - 2)] || v;
          const p1 = arr[Math.max(0, i - 1)] || v;
          const n1 = arr[Math.min(points - 1, i + 1)] || v;
          const n2 = arr[Math.min(points - 2, i + 2)] || v;
          return (p2 + p1 + v * 2 + n1 + n2) / 6;
        });
      }

      let smoothWave = [...waveform];
      for (let pass = 0; pass < 2; pass++) {
        smoothWave = smoothWave.map((v, i, arr) => {
          const p1 = arr[Math.max(0, i - 1)] || v;
          const n1 = arr[Math.min(points - 1, i + 1)] || v;
          return (p1 + v * 2 + n1) / 4;
        });
      }

      const drawRibbonFill = (
        timeScale: number,
        freqScale: number,
        maxAlpha: number,
        glowScale = 0
      ) => {
        ctx.beginPath();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const getAmp = (i: number) => {
          const fraction = i / (points - 1);
          const env = Math.pow(Math.sin(Math.PI * fraction), 2.5);
          const f = smoothFreqs[i] * freqScale;
          const wv = smoothWave[i] * timeScale;
          return (f + wv) * env * (h / 2);
        };

        for (let i = 0; i < points; i++) {
          const x = (i / (points - 1)) * w;
          const y = h / 2 - getAmp(i);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        for (let i = points - 1; i >= 0; i--) {
          const x = (i / (points - 1)) * w;
          const y = h / 2 + getAmp(i);
          ctx.lineTo(x, y);
        }

        ctx.closePath();

        if (glowScale > 0) {
          const glowIntensity = Math.min(1.0, totalEnergy * 1.8);
          ctx.shadowBlur = 12 + glowIntensity * 18;
          ctx.shadowColor = `rgba(122, 33, 49, ${0.3 + glowIntensity * 0.35})`;
        }

        ctx.fillStyle = getVerticalGlow(maxAlpha);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        const fade = getHorizontalFade(maxAlpha * 0.5);
        ctx.fillStyle = fade;
        ctx.fill();
      };

      drawRibbonFill(0.12, 0.60, 0.06);
      drawRibbonFill(0.40, 0.35, 0.12);
      drawRibbonFill(-0.50, 0.25, 0.18);
      drawRibbonFill(0.70, 0.09, 0.35, 1);
    };

    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      const diff = targetPhaseRef.current - phaseRef.current;
      phaseRef.current += diff * SMOOTHING;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const { waveform, frequencies } = generateSimulatedData(phaseRef.current);
      drawWaveform(waveform, frequencies, w, h);

      ctx.restore();

      if (Math.abs(diff) < 0.0001) {
        rafRef.current = null;
        return;
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    const startRaf = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(draw);
    };

    const onScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;
      lastScrollYRef.current = currentScrollY;
      targetPhaseRef.current += delta * SCROLL_FACTOR;
      updateScrollProgress();
      startRaf();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    startRaf();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateScrollProgress]);

  const blurPx = scrollProgress * MAX_BLUR;
  const isHidden = scrollProgress >= 1;
  const style: React.CSSProperties = {
    opacity: isHidden ? 0 : Math.max(0, 1 - scrollProgress * 1.2),
    backdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
    WebkitBackdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
    pointerEvents: isHidden ? 'none' : undefined,
  };

  return (
    <section ref={containerRef} className="hero-page" style={style}>
      <div className="hero-wave-container">
        <canvas ref={canvasRef} className="hero-wave-canvas" aria-hidden="true" />
      </div>
      <h2 className="hero-title">sound library</h2>
      <p className="hero-description">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      </p>
      <p className="hero-description">
        Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
      </p>
    </section>
  );
}
