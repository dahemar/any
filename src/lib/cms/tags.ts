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
  // When the sheet defines tags, it is the source of truth: only tags
  // listed there appear on the site. Tags discovered in works but absent
  // from the sheet (e.g. a deleted tag still referenced by a track) must
  // NOT reappear.
  if (sheetTags.length > 0) {
    return [...sheetTags].sort((a, b) => a.label.localeCompare(b.label));
  }

  // Offline/fallback mode (no sheet tags): merge fallback definitions with
  // tags discovered from the bundled works data.
  const merged = new Map<string, TagDefinition>();

  for (const tag of FALLBACK_TAGS) {
    merged.set(tag.id, tag);
  }
  for (const tag of tagsFromWorks(works)) {
    if (!merged.has(tag.id)) merged.set(tag.id, tag);
  }

  return Array.from(merged.values()).sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Drop work tags that are not defined in the given tag definitions, so a
 * tag deleted from the sheet stops showing up on tracks (credits panel,
 * search matching) instead of lingering as an orphan.
 */
export function filterWorksTags(works: Work[], tags: TagDefinition[]): Work[] {
  const defined = new Set(tags.map((tag) => tag.id));
  return works.map((work) => ({
    ...work,
    tags: (work.tags ?? []).filter((tag) => defined.has(slugifyTagId(tag))),
  }));
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
