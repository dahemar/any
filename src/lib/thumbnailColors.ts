export interface ThumbnailPalette {
  primary: string;
  secondary: string;
  accent: string;
}

const paletteCache = new Map<string, ThumbnailPalette>();
const pending = new Map<string, Promise<ThumbnailPalette>>();

const FALLBACK_PALETTE: ThumbnailPalette = {
  primary: 'rgb(238, 228, 248)',
  secondary: 'rgb(232, 238, 248)',
  accent: 'rgb(248, 242, 252)',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / delta) % 6;
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      default:
        h = (rn - gn) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function mixWithWhite(r: number, g: number, b: number, amount: number): [number, number, number] {
  const t = clamp(amount, 0, 1);
  return [
    Math.round(r + (255 - r) * t),
    Math.round(g + (255 - g) * t),
    Math.round(b + (255 - b) * t),
  ];
}

function toPastelGlowColor(
  r: number,
  g: number,
  b: number,
  options?: { whiteMix?: number; lightnessBias?: number }
): string {
  const whiteMix = options?.whiteMix ?? 0.18;
  const lightnessBias = options?.lightnessBias ?? 0;
  const [h, s, l] = rgbToHsl(r, g, b);

  const pastelS = clamp(s * 0.6 + 0.12, 0.18, 0.68);
  const pastelL = clamp(0.62 + l * 0.18 + lightnessBias, 0.58, 0.84);

  let hue = h;
  const isCool = h >= 165 && h < 285;
  const isWarm = h < 55 || h >= 305;
  if (isCool) hue = (h + 2) % 360;
  else if (isWarm) hue = (h + 1) % 360;

  let [pr, pg, pb] = hslToRgb(hue, pastelS, pastelL);
  [pr, pg, pb] = mixWithWhite(pr, pg, pb, whiteMix);

  if (isCool) {
    pb = clamp(pb + 4, 0, 255);
  } else if (isWarm) {
    pr = clamp(pr + 4, 0, 255);
    pg = clamp(pg + 2, 0, 255);
  }

  return `rgb(${pr}, ${pg}, ${pb})`;
}

function averageBucket(
  buckets: Map<string, { r: number; g: number; b: number; count: number }>
): { r: number; g: number; b: number } | null {
  let best: { r: number; g: number; b: number; count: number } | null = null;

  buckets.forEach((bucket) => {
    if (!best || bucket.count > best.count) {
      best = bucket;
    }
  });

  if (!best) return null;
  const { count, r, g, b } = best;
  return { r: r / count, g: g / count, b: b / count };
}

function samplePaletteFromImageData(data: Uint8ClampedArray): ThumbnailPalette {
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
  const midBuckets = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < data.length; i += 24) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 40) continue;

    const [, s, l] = rgbToHsl(r, g, b);
    if (l < 0.1 || l > 0.94) continue;

    const key = `${Math.round(r / 40)}-${Math.round(g / 40)}-${Math.round(b / 40)}`;
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.count += 1;
    buckets.set(key, bucket);

    if (s > 0.1 && l > 0.22 && l < 0.78) {
      const mBucket = midBuckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
      mBucket.r += r;
      mBucket.g += g;
      mBucket.b += b;
      mBucket.count += 1;
      midBuckets.set(key, mBucket);
    }
  }

  const base = averageBucket(midBuckets) ?? averageBucket(buckets) ?? { r: 220, g: 215, b: 210 };
  const secondaryBase = averageBucket(buckets) ?? base;

  return {
    primary: toPastelGlowColor(base.r, base.g, base.b, { whiteMix: 0.16 }),
    secondary: toPastelGlowColor(secondaryBase.r, secondaryBase.g, secondaryBase.b, {
      whiteMix: 0.2,
    }),
    accent: toPastelGlowColor(base.r, base.g, base.b, { whiteMix: 0.24, lightnessBias: 0.01 }),
  };
}

function decodePalette(imageUrl: string): Promise<ThumbnailPalette> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('no canvas context');

        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        const palette = samplePaletteFromImageData(imageData.data);
        paletteCache.set(imageUrl, palette);
        resolve(palette);
      } catch {
        resolve(FALLBACK_PALETTE);
      }
    };

    img.onerror = () => resolve(FALLBACK_PALETTE);
    img.src = imageUrl;
  });
}

export function extractThumbnailPalette(imageUrl: string): Promise<ThumbnailPalette> {
  const cached = paletteCache.get(imageUrl);
  if (cached) return Promise.resolve(cached);

  const inFlight = pending.get(imageUrl);
  if (inFlight) return inFlight;

  if (typeof window === 'undefined') {
    return Promise.resolve(FALLBACK_PALETTE);
  }

  const promise = decodePalette(imageUrl).finally(() => {
    pending.delete(imageUrl);
  });
  pending.set(imageUrl, promise);
  return promise;
}

/** Warm palette cache when the browser is idle (hover/play still decode on demand). */
export function prefetchThumbnailPalette(imageUrl: string): void {
  if (!imageUrl || paletteCache.has(imageUrl) || pending.has(imageUrl)) return;

  const run = () => {
    void extractThumbnailPalette(imageUrl);
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 2500 });
  } else {
    window.setTimeout(run, 120);
  }
}
