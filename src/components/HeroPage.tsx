import { useCallback, useEffect, useRef, useState } from 'react';
import './HeroPage.css';
import type { ParsedIntro } from '../lib/googleSheets/parseAnyWorks';

const MAX_BLUR = 6;

const defaultIntro: ParsedIntro = {
  title: 'sound library',
  description: [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  ],
};

export default function HeroPage({ intro = defaultIntro }: { intro?: ParsedIntro }) {
  const containerRef = useRef<HTMLElement>(null);
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
    const onScroll = () => {
      updateScrollProgress();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [updateScrollProgress]);

  const blurPx = scrollProgress * MAX_BLUR;
  const opacity = Math.max(0, 1 - scrollProgress);

  // As the user scrolls down, a subtle burgundy glow grows around the
  // logo edges, and the reds in the image deepen slightly.
  const glowOpacity = 0.08 + scrollProgress * 0.42;
  const glowRadius = scrollProgress * 20;
  const logoSaturation = 1 + scrollProgress * 0.35;
  const logoBrightness = 1 - scrollProgress * 0.12;

  const textStyle: React.CSSProperties = {
    opacity,
    backdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
    WebkitBackdropFilter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
  };

  const logoStyle: React.CSSProperties = {
    filter:
      `brightness(${logoBrightness}) saturate(${logoSaturation}) ` +
      `drop-shadow(0 0 ${glowRadius}px rgba(122, 33, 49, ${glowOpacity}))`,
  };

  return (
    <section ref={containerRef} className="hero-page">
      <div className="hero-logo-container">
        <img
          src="/logo.png"
          alt=""
          className="hero-logo"
          style={logoStyle}
          draggable={false}
        />
      </div>
      <div className="hero-text" style={textStyle}>
        <h2 className="hero-title">{intro.title}</h2>
        {intro.description.map((paragraph, i) => (
          <p key={i} className="hero-description">{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
