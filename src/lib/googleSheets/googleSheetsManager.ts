import fs from 'node:fs/promises';
import path from 'node:path';
import type { TagDefinition, Work } from '../types';
import { googleSheetsConfig, isGoogleSheetsConfigured } from './config';
import { parseCmsFromFlatSheets, type ParsedCmsData } from './parseAnyWorks';

const CACHE_PATH = path.resolve(process.cwd(), '.cache/any-cms.json');
const IS_VERCEL_RUNTIME = Boolean(process.env.VERCEL);

const R2_PUBLIC_HOST = 'pub-ab92f061862e4c32b9117317c7b77334.r2.dev';

const memoryCache = new Map<string, { data: ParsedCmsData; storedAt: number }>();
const CACHE_KEY = 'anyCms';
const CACHE_TTL_MS = 30_000;

export function clearMemoryCache(): void {
  memoryCache.delete(CACHE_KEY);
}

function getFreshMemoryCache(): ParsedCmsData | null {
  const entry = memoryCache.get(CACHE_KEY);
  if (!entry) return null;
  if (Date.now() - entry.storedAt > CACHE_TTL_MS) {
    memoryCache.delete(CACHE_KEY);
    return null;
  }
  return entry.data.works.length > 0 ? entry.data : null;
}

function rewriteR2PublicUrl(url: string): string {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith('.r2.dev')) {
      parsed.hostname = R2_PUBLIC_HOST;
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
  if (url.startsWith('/api/proxy')) return url;

  try {
    const parsed = new URL(url);
    const rewritten = rewriteR2PublicUrl(url);
    if (shouldProxyHost(parsed.hostname)) {
      return `/api/proxy?url=${encodeURIComponent(rewritten)}`;
    }
    return rewritten;
  } catch {
    return url;
  }
}

function shouldProxyHost(hostname: string): boolean {
  return (
    ['github.com', 'release-assets.githubusercontent.com'].includes(hostname) ||
    hostname.endsWith('.s3.amazonaws.com') ||
    hostname.endsWith('.r2.dev')
  );
}

function buildProxiedUrl(videoUrl: string): string | undefined {
  if (!videoUrl) return undefined;
  if (videoUrl.startsWith('/api/proxy')) return videoUrl;
  try {
    const parsed = new URL(videoUrl);
    if (!shouldProxyHost(parsed.hostname)) return undefined;
    return `/api/proxy?url=${encodeURIComponent(rewriteR2PublicUrl(videoUrl))}`;
  } catch {
    return undefined;
  }
}

export function normalizeWorksForDelivery(works: Work[]): Work[] {
  return (works || []).map((work) => ({
    ...work,
    scenes: (work.scenes || []).map((scene) => {
      const rawVideoUrl =
        typeof scene.videoUrl === 'string' ? rewritePossiblyProxiedUrl(scene.videoUrl) : '';
      const existingProxied =
        typeof scene.proxiedVideoUrl === 'string'
          ? rewritePossiblyProxiedUrl(scene.proxiedVideoUrl)
          : undefined;
      const thumbnail =
        typeof scene.thumbnail === 'string' ? rewriteR2PublicUrl(scene.thumbnail) : scene.thumbnail;
      const audioUrl =
        typeof scene.audioUrl === 'string' ? rewritePossiblyProxiedUrl(scene.audioUrl) : scene.audioUrl;

      return {
        ...scene,
        videoUrl: rawVideoUrl,
        proxiedVideoUrl: existingProxied || buildProxiedUrl(rawVideoUrl),
        thumbnail,
        audioUrl,
      };
    }),
  }));
}

async function fetchSheetValues(range: string, timeoutMs = 12000): Promise<string[][]> {
  const { spreadsheetId, apiKey } = googleSheetsConfig;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      console.warn(`[googleSheets] ${range} returned ${response.status}`);
      return [];
    }
    const data = await response.json();
    return Array.isArray(data?.values) ? (data.values as string[][]) : [];
  } catch (error) {
    console.warn(`[googleSheets] failed to fetch ${range}`, error);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      out.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  out.push(current.trim());
  return out;
}

function parseCsvText(csvContent: string): string[][] {
  return (csvContent || '')
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim().length > 0)
    .map((line) => parseCsvLine(line));
}

async function fetchGvizSheetAsRows(sheetName: string, timeoutMs = 12000): Promise<string[][]> {
  const { spreadsheetId } = googleSheetsConfig;
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return [];
    const text = await response.text();
    if (text.trimStart().startsWith('<')) return [];
    return parseCsvText(text);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function batchFetchSheetValues(ranges: string[]): Promise<string[][][]> {
  const { spreadsheetId, apiKey } = googleSheetsConfig;
  const qs = ranges.map((range) => `ranges=${encodeURIComponent(range)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${qs}&key=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      console.warn(`[googleSheets] batchGet returned ${response.status}`);
      return ranges.map(() => []);
    }
    const data = await response.json();
    const valueRanges = Array.isArray(data?.valueRanges) ? data.valueRanges : [];
    return ranges.map((_, index) => {
      const values = valueRanges[index]?.values;
      return Array.isArray(values) ? (values as string[][]) : [];
    });
  } catch (error) {
    console.warn('[googleSheets] batchGet failed', error);
    return ranges.map(() => []);
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadFromCache(): Promise<ParsedCmsData | null> {
  if (IS_VERCEL_RUNTIME) return null;
  try {
    const raw = await fs.readFile(CACHE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as ParsedCmsData;
    if (parsed && Array.isArray(parsed.works)) return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function saveToCache(data: ParsedCmsData): Promise<void> {
  if (IS_VERCEL_RUNTIME) return;
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function fetchFromGoogleSheets(): Promise<ParsedCmsData> {
  if (!isGoogleSheetsConfigured()) {
    return { works: [], tags: [] };
  }

  if (!IS_VERCEL_RUNTIME) {
    const cached = getFreshMemoryCache();
    if (cached) return cached;
  }

  const tabNames = [
    googleSheetsConfig.worksRange,
    googleSheetsConfig.creditsRange,
    googleSheetsConfig.tagsRange,
    googleSheetsConfig.introRange,
  ];

  let [worksRows, creditsRows, tagsRows, introRows] = await batchFetchSheetValues(tabNames);

  if (!worksRows.length) {
    worksRows = await fetchGvizSheetAsRows(googleSheetsConfig.worksRange);
  }
  if (!creditsRows.length) {
    creditsRows = await fetchGvizSheetAsRows(googleSheetsConfig.creditsRange);
  }
  if (!tagsRows.length) {
    tagsRows = await fetchGvizSheetAsRows(googleSheetsConfig.tagsRange);
  }
  if (!introRows.length) {
    introRows = await fetchGvizSheetAsRows(googleSheetsConfig.introRange);
  }

  const parsed = parseCmsFromFlatSheets(worksRows, creditsRows, tagsRows, introRows);
  const normalized: ParsedCmsData = {
    works: normalizeWorksForDelivery(parsed.works),
    tags: parsed.tags,
    intro: parsed.intro,
  };

  if (normalized.works.length > 0) {
    memoryCache.set(CACHE_KEY, { data: normalized, storedAt: Date.now() });
    try {
      await saveToCache(normalized);
    } catch (error) {
      console.warn('[googleSheets] saveToCache failed', error);
    }
  }

  return normalized;
}

export async function loadCmsData(options?: { force?: boolean }): Promise<ParsedCmsData> {
  const force = Boolean(options?.force);
  if (force) clearMemoryCache();

  if (!isGoogleSheetsConfigured()) {
    return { works: [], tags: [] };
  }

  try {
    const fetched = await fetchFromGoogleSheets();
    if (fetched.works.length > 0) return fetched;
  } catch (error) {
    console.warn('[googleSheets] fetch failed', error);
  }

  if (!IS_VERCEL_RUNTIME && !force) {
    const cached = await loadFromCache();
    if (cached && cached.works.length > 0) {
      return {
        works: normalizeWorksForDelivery(cached.works),
        tags: cached.tags,
        intro: cached.intro,
      };
    }
  }

  return { works: [], tags: [] };
}

export type { ParsedCmsData, TagDefinition, Work };
