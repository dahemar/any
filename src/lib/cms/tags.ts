import { moodTags, instrumentTags } from '../../data/works';
import type { TagDefinition, Work } from '../types';

const FALLBACK_TAGS: TagDefinition[] = [...moodTags, ...instrumentTags];

export function slugifyTagId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function inferCategory(tagId: string): TagDefinition['category'] {
  if (instrumentTags.some((tag) => tag.id === tagId)) return 'instrument';
  return 'mood';
}

function tagsFromWorks(works: Work[]): TagDefinition[] {
  const seen = new Map<string, TagDefinition>();

  for (const work of works) {
    for (const rawTag of work.tags ?? []) {
      const id = slugifyTagId(rawTag);
      if (!id || seen.has(id)) continue;
      seen.set(id, {
        id,
        label: rawTag.trim(),
        category: inferCategory(id),
      });
    }
  }

  return Array.from(seen.values());
}

export function mergeTagDefinitions(sheetTags: TagDefinition[], works: Work[]): TagDefinition[] {
  const merged = new Map<string, TagDefinition>();

  // Sheet tags are authoritative — they define the canonical category.
  for (const tag of sheetTags) {
    merged.set(tag.id, tag);
  }

  // Fallback definitions fill gaps the sheet didn't cover.
  for (const tag of FALLBACK_TAGS) {
    if (!merged.has(tag.id)) merged.set(tag.id, tag);
  }

  // Tags discovered in works but missing from both the sheet and
  // fallback definitions are a last resort (inferCategory is a best-guess).
  for (const tag of tagsFromWorks(works)) {
    if (!merged.has(tag.id)) merged.set(tag.id, tag);
  }

  return Array.from(merged.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export function getWorksForTag(works: Work[], tagId: string): Work[] {
  return getWorksForTags(works, [tagId]);
}

export function getWorksForTags(works: Work[], tagIds: string[]): Work[] {
  const normalized = tagIds.map(slugifyTagId).filter(Boolean);
  if (normalized.length === 0) return [];

  return works.filter((work) =>
    normalized.every((tagId) =>
      (work.tags ?? []).some((tag) => slugifyTagId(tag) === tagId)
    )
  );
}
