import { useEffect, useMemo, useState } from 'react';
import { getWorksForTag, getWorksForTags } from '../lib/cms/tags';
import type { TagDefinition, Work } from '../lib/types';
import './SearchPage.css';

type CloudSize = 'sm' | 'md' | 'lg';

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
  return {
    mood: tags.filter((tag) => tag.category === 'mood'),
    instrument: tags.filter((tag) => tag.category === 'instrument'),
  };
}

function buildCloudTags(tags: TagDefinition[], works: Work[]): CloudTag[] {
  const weighted = tags.map((tag) => ({
    tag,
    count: Math.max(getWorksForTag(works, tag.id).length, 1),
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

function tagLabel(tags: TagDefinition[], tagId: string): string {
  return tags.find((tag) => tag.id === tagId)?.label ?? tagId;
}

interface TagWordCloudProps {
  tags: CloudTag[];
  activeTagIds: Set<string>;
  onTagClick: (tagId: string) => void;
  ariaLabel: string;
}

function TagWordCloud({ tags, activeTagIds, onTagClick, ariaLabel }: TagWordCloudProps) {
  return (
    <div className="tag-word-cloud" role="list" aria-label={ariaLabel}>
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          role="listitem"
          className={`tag-cloud-word tag-cloud-word--${tag.size} tag-cloud-word--p${tag.position % 18} tag-cloud-word--c${tag.colorIndex} ${activeTagIds.has(tag.id) ? 'active' : ''}`}
          onClick={() => onTagClick(tag.id)}
          aria-pressed={activeTagIds.has(tag.id)}
        >
          {tag.label}
        </button>
      ))}
    </div>
  );
}

export default function SearchPage({
  works,
  tags,
  initialTagId,
  onInitialTagApplied,
  onSelectWork,
}: SearchPageProps) {
  const [activeTagIds, setActiveTagIds] = useState<Set<string>>(new Set());
  const grouped = useMemo(() => groupTags(tags), [tags]);
  const moodCloud = useMemo(() => buildCloudTags(grouped.mood, works), [grouped.mood, works]);
  const instrumentCloud = useMemo(
    () => buildCloudTags(grouped.instrument, works),
    [grouped.instrument, works]
  );

  const selectedTagIds = useMemo(
    () => Array.from(activeTagIds),
    [activeTagIds]
  );

  const hasActiveFilters = selectedTagIds.length > 0;

  const matchedWorks = useMemo(
    () => (hasActiveFilters ? getWorksForTags(works, selectedTagIds) : []),
    [hasActiveFilters, selectedTagIds, works]
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

  const handleTagClick = (tagId: string) => {
    setActiveTagIds((current) => {
      const next = new Set(current);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const handleRemoveTag = (tagId: string) => {
    setActiveTagIds((current) => {
      const next = new Set(current);
      next.delete(tagId);
      return next;
    });
  };

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
                    <span className="filter-pill-label">{tagLabel(tags, tagId)}</span>
                    <button
                      type="button"
                      className="filter-pill-remove"
                      onClick={() => handleRemoveTag(tagId)}
                      aria-label={`Remove ${tagLabel(tags, tagId)}`}
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
