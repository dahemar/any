import sheetsManager, {
  clearMemoryCache,
  fetchFromGoogleSheets,
  loadFromCache,
  saveToCache,
} from '../../../../theatre-works-layout-extract-2026-03-26/starter/src/utils/googleSheetsManager';
import type { Work, WorksStats } from '../types';

const LEGACY_R2_HOST = 'pub-16fb774f4ada4a69b6c70bc856201eeb.r2.dev';
const CANONICAL_R2_HOST = 'pub-f04cf0f8494f457e889559aa0b6e57b7.r2.dev';

function rewriteR2PublicUrlIfNeeded(url: string): string {
  if (!url || typeof url !== 'string') return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === LEGACY_R2_HOST) {
      parsed.hostname = CANONICAL_R2_HOST;
      parsed.protocol = 'https:';
      return parsed.toString();
    }
  } catch {
    return url;
  }
  return url;
}

function rewritePossiblyProxiedUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;
  if (!url.startsWith('/api/proxy/')) return rewriteR2PublicUrlIfNeeded(url);

  const encoded = url.slice('/api/proxy/'.length);
  try {
    const decoded = decodeURIComponent(encoded);
    const rewritten = rewriteR2PublicUrlIfNeeded(decoded);
    if (rewritten.startsWith('http://') || rewritten.startsWith('https://')) return rewritten;
  } catch {
    return url;
  }

  return url;
}

function shouldProxyHost(hostname: string): boolean {
  return (
    ['github.com', 'release-assets.githubusercontent.com'].includes(hostname) ||
    hostname.endsWith('.s3.amazonaws.com')
  );
}

function buildProxiedUrl(videoUrl: string): string | undefined {
  if (!videoUrl || typeof videoUrl !== 'string') return undefined;
  const rewritten = rewritePossiblyProxiedUrl(videoUrl);
  if (rewritten.startsWith('/api/proxy/')) return rewritten;

  try {
    const parsed = new URL(rewritten);
    if (!shouldProxyHost(parsed.hostname)) return undefined;
    return `/api/proxy/${encodeURIComponent(rewritten)}`;
  } catch {
    return undefined;
  }
}

export function normalizeWorksForDelivery(works: Work[]): Work[] {
  const allowProxyUrls = !process.env.VERCEL;

  return (works || []).map((work) => ({
    ...work,
    scenes: (work.scenes || []).map((scene) => {
      const rawVideoUrl = typeof scene.videoUrl === 'string' ? rewritePossiblyProxiedUrl(scene.videoUrl) : '';
      const existingProxied = typeof scene.proxiedVideoUrl === 'string'
        ? rewritePossiblyProxiedUrl(scene.proxiedVideoUrl)
        : undefined;

      return {
        ...scene,
        videoUrl: rawVideoUrl,
        proxiedVideoUrl: allowProxyUrls ? (existingProxied || buildProxiedUrl(rawVideoUrl)) : undefined,
      };
    }),
  }));
}

export function getWorksStats(works: Work[]): WorksStats {
  return {
    totalWorks: works.length,
    totalVideos: works.reduce((sum, work) => sum + (work.scenes?.length || 0), 0),
  };
}

export async function loadWorks(options?: { force?: boolean }): Promise<Work[]> {
  return (await sheetsManager.loadTheatreWorksData(options)) as Work[];
}

export async function loadWorksForApi(force = false): Promise<Work[]> {
  if (force) clearMemoryCache();

  const jsonWorks = async (): Promise<Work[]> => {
    const fetched = await fetchFromGoogleSheets();
    return Array.isArray(fetched) ? normalizeWorksForDelivery(fetched as Work[]) : [];
  };

  if (process.env.VERCEL) {
    return jsonWorks();
  }

  try {
    const fresh = await jsonWorks();
    if (fresh.length > 0) {
      await saveToCache(fresh);
      return fresh;
    }
  } catch {
    // fall through to cache
  }

  const cached = force ? null : await loadFromCache();
  if (Array.isArray(cached) && cached.length > 0) {
    return normalizeWorksForDelivery(cached as Work[]);
  }

  return [];
}
