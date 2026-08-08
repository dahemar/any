import { memo, useCallback, useEffect, useMemo, useState } from 'react';
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

const TagWordCloud = memo(function TagWordCloud({ tags, activeTagIds, onTagClick, ariaLabel }: TagWordCloudProps) {
  return (
    <div className="tag-word-cloud" role="list" aria-label={ariaLabel}>
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          role="listitem"
              className={`tag-cloud-word tag-cloud-word--${tag.size} tag-cloud-word--c${tag.colorIndex} ${activeTagIds.has(tag.id) ? 'active' : ''}`}
          onClick={() => onTagClick(tag.id)}
          aria-pressed={activeTagIds.has(tag.id)}
        >
          {tag.label}
        </button>
      ))}
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
