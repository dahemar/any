import type { Credit, TagDefinition, Work } from '../types';

export interface ParsedCmsData {
  works: Work[];
  tags: TagDefinition[];
}

const normalizeKey = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

function rowsToRecords(values: string[][]): Record<string, string>[] {
  if (!values?.length) return [];

  const headers = (values[0] ?? []).map((cell) => normalizeKey(cell));
  const records: Record<string, string>[] = [];

  for (const row of values.slice(1)) {
    if (!row?.length || row.every((cell) => !String(cell ?? '').trim())) continue;

    const record: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i];
      if (!key) continue;
      record[key] = String(row[i] ?? '').trim();
    }

    const hasTitle = record.title || record.name;
    if (!record.id && !hasTitle && !record.role && !record.category) continue;

    records.push(record);
  }

  return records;
}

function getField(record: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[normalizeKey(key)] ?? record[key];
    if (value) return String(value).trim();
  }
  return '';
}

function parseTagsList(raw: string): string[] {
  return raw
    .split(/[,;|]/)
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

function isActiveValue(raw: string): boolean {
  const value = raw.trim().toLowerCase();
  if (!value) return true;
  return !['0', 'false', 'no', 'off', 'hidden', 'inactive'].includes(value);
}

function normalizeAssetUrl(value: string): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed;
  }
  return `/${trimmed.replace(/^\./, '')}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deriveId(record: Record<string, string>): string {
  const explicit = getField(record, 'id', 'work_id', 'work_slug', 'slug');
  if (explicit) return explicit;
  const title = getField(record, 'title', 'name');
  return title ? slugify(title) : '';
}

function sortByOrder<T extends { order?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function parseCmsFromFlatSheets(
  worksValues: string[][],
  creditsValues: string[][],
  tagsValues: string[][]
): ParsedCmsData {
  const workRecords = rowsToRecords(worksValues);
  const creditRecords = rowsToRecords(creditsValues);
  const tagRecords = rowsToRecords(tagsValues);

  const creditsByWork = new Map<string, Array<Credit & { order: number }>>();
  let creditIndex = 0;
  for (const row of creditRecords) {
    creditIndex++;
    const workTitle = getField(row, 'title', 'name');
    const explicitId = getField(row, 'work_id', 'id', 'work');
    const workId = explicitId || (workTitle ? slugify(workTitle) : '');
    const role = getField(row, 'role');
    const name = getField(row, 'name', 'person');
    const order = Number(getField(row, 'order', 'sort')) || creditIndex;
    if (!workId || !role) continue;
    if (!isActiveValue(getField(row, 'active', 'visible', 'published'))) continue;

    const list = creditsByWork.get(workId) ?? [];
    list.push({ role, name, order });
    creditsByWork.set(workId, list);
  }

  const tags: TagDefinition[] = [];
  for (const row of tagRecords) {
    const id = getField(row, 'id', 'tag', 'slug').toLowerCase();
    if (!id) continue;
    if (!isActiveValue(getField(row, 'active', 'visible', 'published'))) continue;

    const categoryRaw = getField(row, 'category', 'type') || 'mood';
    const category = categoryRaw === 'instrument' ? 'instrument' : 'mood';
    tags.push({ id, label: id, category });
  }

  const works: Work[] = [];
  let rowIndex = 0;
  for (const row of workRecords) {
    rowIndex++;
    const id = deriveId(row);
    if (!id) continue;
    if (!isActiveValue(getField(row, 'active', 'visible', 'published'))) continue;

    const title = getField(row, 'title', 'name') || id;
    const description = getField(row, 'description', 'synopsis', 'text') || undefined;
    const tagsFromRow = parseTagsList(getField(row, 'tags', 'tag', 'labels'));
    const videoUrl = normalizeAssetUrl(getField(row, 'video_url', 'video', 'video_file'));
    const thumbnail = normalizeAssetUrl(
      getField(row, 'thumbnail_url', 'thumbnail', 'poster_url', 'poster', 'cover_url')
    );
    const audioUrl = normalizeAssetUrl(getField(row, 'audio_url', 'mp3_url', 'audio', 'mp3'));
    const order = Number(getField(row, 'order', 'sort')) || rowIndex;

    const meta: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      if (value) meta[key] = value;
    }
    meta.order = String(order);
    meta.row = String(rowIndex);

    const credits = sortByOrder(creditsByWork.get(id) ?? []).map(({ role, name }) => ({ role, name }));

    const scenes: Work['scenes'] = [];
    if (videoUrl || thumbnail || audioUrl) {
      scenes.push({
        id: 'scene-01',
        videoUrl: videoUrl || '',
        thumbnail: thumbnail || undefined,
        audioUrl: audioUrl || undefined,
      });
    }

    works.push({
      id,
      title,
      description,
      tags: tagsFromRow.length > 0 ? tagsFromRow : undefined,
      scenes,
      credits: credits.length > 0 ? credits : undefined,
      meta,
    });
  }

  works.sort((a, b) => {
    const orderA = Number(a.meta?.order || a.meta?.sort || 0) || 0;
    const orderB = Number(b.meta?.order || b.meta?.sort || 0) || 0;
    if (orderA !== orderB) return orderA - orderB;
    return a.title.localeCompare(b.title);
  });

  return { works, tags };
}
