import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { slugifyTagId } from '../lib/cms/tags';
import type { TagDefinition, Work } from '../lib/types';
import './SearchPage.css';

type CloudSize = 'sm' | 'md' | 'lg';

type NormalizedWork = {
  work: Work;
  normalizedTagIds: Set<string>;
};

interface CloudTag extends TagDefinition {
  count: number;
  size: CloudSize;
  position: number;
  colorIndex: number;
}

const CLOUD_COLOR_COUNT = 10;

interface SearchPageProps {
  works: Work[];
  tags: TagDefinition[];
  initialTagId?: string | null;
  onInitialTagApplied?: () => void;
  onSelectWork?: (workId: string) => void;
}

function groupTags(tags: TagDefinition[]) {
  return tags.reduce(
    (acc, tag) => {
      if (tag.category === 'instrument') acc.instrument.push(tag);
      else acc.mood.push(tag);
      return acc;
    },
    { mood: [] as TagDefinition[], instrument: [] as TagDefinition[] }
  );
}

function buildCloudTags(tags: TagDefinition[], tagCounts: Map<string, number>): CloudTag[] {
  const weighted = tags.map((tag) => ({
    tag,
    count: Math.max(tagCounts.get(tag.id) ?? 0, 1),
  }));

  const maxCount = Math.max(...weighted.map((entry) => entry.count), 1);

  return weighted
    .map(({ tag, count }, index) => {
      const ratio = count / maxCount;
      let size: CloudSize = 'sm';
      if (ratio >= 0.72) size = 'lg';
      else if (ratio >= 0.42) size = 'md';

      return { ...tag, count, size, position: index, colorIndex: index % CLOUD_COLOR_COUNT };
    })
    .sort((a, b) => b.count - a.count);
}

function tagLabel(labelMap: Map<string, string>, tagId: string): string {
  return labelMap.get(tagId) ?? tagId;
}

interface TagWordCloudProps {
  tags: CloudTag[];
  activeTagIds: Set<string>;
  onTagClick: (tagId: string) => void;
  ariaLabel: string;
}

const SIZE_PX: Record<CloudSize, number> = { sm: 12.2, md: 13.1, lg: 14.1 };

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface PlacedWord {
  index: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface CloudLayout {
  words: PlacedWord[];
  width: number;
  height: number;
}

/**
 * Classic word-cloud layout: archimedean spiral placement with collision
 * detection (à la Wordle). Words are measured on a canvas, placed biggest
 * first from the center outward along a spiral, never overlapping. Each
 * word's spiral direction/start angle is seeded from its tag id, so the
 * scatter looks organic but stays stable across renders. Adding a tag just
 * re-runs the layout — collisions can never happen by construction.
 */
function layoutCloud(tags: CloudTag[]): CloudLayout {
  if (tags.length === 0 || typeof document === 'undefined') {
    return { words: [], width: 0, height: 0 };
  }

  const ctx = document.createElement('canvas').getContext('2d');
  const PAD_X = 16;
  const PAD_Y = 12;

  const measured = tags.map((tag, index) => {
    const px = SIZE_PX[tag.size];
    let textWidth = tag.label.length * px * 0.55;
    if (ctx) {
      ctx.font = `400 ${px}px Manrope, sans-serif`;
      textWidth = ctx.measureText(tag.label).width;
    }
    return { index, width: textWidth + PAD_X, height: px + PAD_Y };
  });

  // Biggest words first, placed from the center outward.
  const placementOrder = [...measured].sort((a, b) => b.width * b.height - a.width * a.height);
  const placed: { index: number; x: number; y: number; width: number; height: number }[] = [];

  const collides = (x: number, y: number, width: number, height: number) =>
    placed.some(
      (p) => Math.abs(p.x - x) * 2 < p.width + width && Math.abs(p.y - y) * 2 < p.height + height
    );

  for (const item of placementOrder) {
    const seed = hashSeed(tags[item.index].id);
    const dir = seed % 2 === 0 ? 1 : -1;
    let t = ((seed % 628) / 100) * dir; // random-ish start angle
    let x = 0;
    let y = 0;
    let guard = 0;
    do {
      const r = 5.2 * Math.abs(t);
      x = Math.cos(t) * r * 1.5; // elliptical: wider than tall
      y = Math.sin(t) * r * 0.82;
      t += 0.3 * dir;
    } while (collides(x, y, item.width, item.height) && ++guard < 1200);
    placed.push({ ...item, x, y });
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of placed) {
    minX = Math.min(minX, p.x - p.width / 2);
    maxX = Math.max(maxX, p.x + p.width / 2);
    minY = Math.min(minY, p.y - p.height / 2);
    maxY = Math.max(maxY, p.y + p.height / 2);
  }

  return {
    words: placed.map((p) => ({
      index: p.index,
      left: p.x - p.width / 2 - minX,
      top: p.y - p.height / 2 - minY,
      width: p.width,
      height: p.height,
    })),
    width: maxX - minX,
    height: maxY - minY,
  };
}

const TagWordCloud = memo(function TagWordCloud({ tags, activeTagIds, onTagClick, ariaLabel }: TagWordCloudProps) {
  const layout = useMemo(() => layoutCloud(tags), [tags]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Scale the whole cloud down (never up) to fit narrow viewports, keeping
  // the collision-free layout intact.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || layout.width === 0) return;
    const update = () => {
      const available = wrap.clientWidth;
      setScale(Math.min(1, available / layout.width));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [layout.width]);

  return (
    <div className="tag-word-cloud" ref={wrapRef} role="list" aria-label={ariaLabel}>
      <div
        className="tag-cloud-stage"
        style={{ width: layout.width * scale, height: layout.height * scale }}
      >
        <div
          className="tag-cloud-scatter"
          style={{
            width: layout.width,
            height: layout.height,
            transform: scale !== 1 ? `scale(${scale})` : undefined,
          }}
        >
          {layout.words.map((word) => {
            const tag = tags[word.index];
            return (
              <button
                key={tag.id}
                type="button"
                role="listitem"
                className={`tag-cloud-word tag-cloud-word--${tag.size} tag-cloud-word--c${tag.colorIndex} ${activeTagIds.has(tag.id) ? 'active' : ''}`}
                style={{ left: word.left, top: word.top }}
                onClick={() => onTagClick(tag.id)}
                aria-pressed={activeTagIds.has(tag.id)}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default function SearchPage({
  works,
  tags,
  initialTagId,
  onInitialTagApplied,
  onSelectWork,
}: SearchPageProps) {
  const [activeTagIds, setActiveTagIds] = useState<Set<string>>(new Set());

  const worksWithNormalizedTags = useMemo<NormalizedWork[]>(
    () =>
      works.map((work) => ({
        work,
        normalizedTagIds: new Set(
          (work.tags ?? []).map(slugifyTagId).filter((tagId) => tagId.length > 0)
        ),
      })),
    [works]
  );

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of worksWithNormalizedTags) {
      for (const tagId of entry.normalizedTagIds) {
        counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
      }
    }
    return counts;
  }, [worksWithNormalizedTags]);

  const grouped = useMemo(() => groupTags(tags), [tags]);
  const moodCloud = useMemo(() => buildCloudTags(grouped.mood, tagCounts), [grouped.mood, tagCounts]);
  const instrumentCloud = useMemo(
    () => buildCloudTags(grouped.instrument, tagCounts),
    [grouped.instrument, tagCounts]
  );

  const tagLabelMap = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag.label])),
    [tags]
  );

  const selectedTagIds = useMemo(() => Array.from(activeTagIds), [activeTagIds]);
  const hasActiveFilters = activeTagIds.size > 0;

  const matchedWorks = useMemo(
    () =>
      hasActiveFilters
        ? worksWithNormalizedTags
            .filter(({ normalizedTagIds }) => selectedTagIds.every((tagId) => normalizedTagIds.has(tagId)))
            .map(({ work }) => work)
        : [],
    [hasActiveFilters, selectedTagIds, worksWithNormalizedTags]
  );

  useEffect(() => {
    if (!initialTagId) return;

    setActiveTagIds((current) => {
      const next = new Set(current);
      next.add(initialTagId);
      return next;
    });

    onInitialTagApplied?.();
  }, [initialTagId, onInitialTagApplied]);

  const handleTagClick = useCallback((tagId: string) => {
    setActiveTagIds((current) => {
      const next = new Set(current);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }, []);

  const handleRemoveTag = useCallback((tagId: string) => {
    setActiveTagIds((current) => {
      const next = new Set(current);
      next.delete(tagId);
      return next;
    });
  }, []);

  return (
    <div className="search-page">
      <div className="search-layout">
        <div className="search-clouds">
          <section className="search-cloud-section" aria-labelledby="search-moods-heading">
            <h2 id="search-moods-heading" className="search-cloud-heading">
              moods
            </h2>
            <TagWordCloud
              tags={moodCloud}
              activeTagIds={activeTagIds}
              onTagClick={handleTagClick}
              ariaLabel="Mood tags"
            />
          </section>

          <section className="search-cloud-section" aria-labelledby="search-instruments-heading">
            <h2 id="search-instruments-heading" className="search-cloud-heading">
              instruments
            </h2>
            <TagWordCloud
              tags={instrumentCloud}
              activeTagIds={activeTagIds}
              onTagClick={handleTagClick}
              ariaLabel="Instrument tags"
            />
          </section>
        </div>

        <section className={`search-matches ${hasActiveFilters ? 'visible' : ''}`} aria-live="polite">
          {hasActiveFilters ? (
            <>
              <h2 className="search-matches-heading">pieces tagged</h2>
              <div className="search-active-filters" role="list" aria-label="Active filters">
                {selectedTagIds.map((tagId) => (
                  <span key={tagId} className="filter-pill" role="listitem">
                    <span className="filter-pill-label">{tagLabel(tagLabelMap, tagId)}</span>
                    <button
                      type="button"
                      className="filter-pill-remove"
                      onClick={() => handleRemoveTag(tagId)}
                      aria-label={`Remove ${tagLabel(tagLabelMap, tagId)}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {matchedWorks.length > 0 ? (
                <ul className="search-matches-list">
                  {matchedWorks.map((work) => {
                    const thumbnail = work.scenes[0]?.thumbnail;

                    return (
                      <li key={work.id}>
                        <button
                          type="button"
                          className="search-match-card"
                          onClick={() => onSelectWork?.(work.id)}
                        >
                          {thumbnail ? (
                            <img src={thumbnail} alt="" className="search-match-thumbnail" loading="lazy" />
                          ) : null}
                          <span className="search-match-copy">
                            <span className="search-match-title">{work.title}</span>
                            {work.description ? (
                              <span className="search-match-description">{work.description}</span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="search-matches-empty">no pieces yet.</p>
              )}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
