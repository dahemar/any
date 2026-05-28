import { useEffect, useMemo, useState } from 'react';
import { allSearchTags, getWorksForTag, getWorksForTags } from '../data/works';
import type { TagDefinition } from '../lib/types';
import './SearchPage.css';

type CloudSize = 'sm' | 'md' | 'lg';
type TagCategory = TagDefinition['category'];

interface ActiveTagFilters {
  mood: string | null;
  instrument: string | null;
}

interface CloudTag extends TagDefinition {
  count: number;
  size: CloudSize;
  position: number;
  colorIndex: number;
}

const CLOUD_COLOR_COUNT = 10;
const EMPTY_FILTERS: ActiveTagFilters = { mood: null, instrument: null };

interface SearchPageProps {
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

function buildCloudTags(tags: TagDefinition[]): CloudTag[] {
  const weighted = tags.map((tag) => ({
    tag,
    count: Math.max(getWorksForTag(tag.id).length, 1),
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
  activeTagId: string | null;
  onTagClick: (tagId: string) => void;
  ariaLabel: string;
}

function TagWordCloud({ tags, activeTagId, onTagClick, ariaLabel }: TagWordCloudProps) {
  return (
    <div className="tag-word-cloud" role="list" aria-label={ariaLabel}>
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          role="listitem"
          className={`tag-cloud-word tag-cloud-word--${tag.size} tag-cloud-word--p${tag.position % 18} tag-cloud-word--c${tag.colorIndex} ${activeTagId === tag.id ? 'active' : ''}`}
          onClick={() => onTagClick(tag.id)}
          aria-pressed={activeTagId === tag.id}
        >
          {tag.label}
        </button>
      ))}
    </div>
  );
}

export default function SearchPage({
  initialTagId,
  onInitialTagApplied,
  onSelectWork,
}: SearchPageProps) {
  const [activeFilters, setActiveFilters] = useState<ActiveTagFilters>(EMPTY_FILTERS);
  const grouped = useMemo(() => groupTags(allSearchTags), []);
  const moodCloud = useMemo(() => buildCloudTags(grouped.mood), [grouped.mood]);
  const instrumentCloud = useMemo(() => buildCloudTags(grouped.instrument), [grouped.instrument]);

  const selectedTagIds = useMemo(
    () => [activeFilters.mood, activeFilters.instrument].filter((id): id is string => Boolean(id)),
    [activeFilters]
  );

  const hasActiveFilters = selectedTagIds.length > 0;

  const matchedWorks = useMemo(
    () => (hasActiveFilters ? getWorksForTags(selectedTagIds) : []),
    [hasActiveFilters, selectedTagIds]
  );

  const matchesHeading = useMemo(() => {
    const parts: string[] = [];
    if (activeFilters.mood) parts.push(tagLabel(allSearchTags, activeFilters.mood));
    if (activeFilters.instrument) parts.push(tagLabel(allSearchTags, activeFilters.instrument));
    return parts.join(' + ');
  }, [activeFilters]);

  useEffect(() => {
    if (!initialTagId) return;

    const initialTag = allSearchTags.find((tag) => tag.id === initialTagId);
    if (initialTag?.category === 'instrument') {
      setActiveFilters({ mood: null, instrument: initialTagId });
    } else {
      setActiveFilters({ mood: initialTagId, instrument: null });
    }

    onInitialTagApplied?.();
  }, [initialTagId, onInitialTagApplied]);

  const handleTagClick = (tagId: string, category: TagCategory) => {
    setActiveFilters((current) => {
      const key = category;
      return {
        ...current,
        [key]: current[key] === tagId ? null : tagId,
      };
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
              activeTagId={activeFilters.mood}
              onTagClick={(tagId) => handleTagClick(tagId, 'mood')}
              ariaLabel="Mood tags"
            />
          </section>

          <section className="search-cloud-section" aria-labelledby="search-instruments-heading">
            <h2 id="search-instruments-heading" className="search-cloud-heading">
              instruments
            </h2>
            <TagWordCloud
              tags={instrumentCloud}
              activeTagId={activeFilters.instrument}
              onTagClick={(tagId) => handleTagClick(tagId, 'instrument')}
              ariaLabel="Instrument tags"
            />
          </section>
        </div>

        <section className={`search-matches ${hasActiveFilters ? 'visible' : ''}`} aria-live="polite">
          {hasActiveFilters ? (
            <>
              <h2 className="search-matches-heading">pieces tagged {matchesHeading}</h2>
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
