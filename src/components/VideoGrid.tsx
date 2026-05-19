import React, { useEffect, useMemo, useRef, useState } from 'react';
import { extractThumbnailPalette, type ThumbnailPalette } from '../lib/thumbnailColors';
import type { Work } from '../lib/types';
import CreditsPanel from './CreditsPanel';

interface VideoGridProps {
  works: Work[];
  initialWorkId?: string | null;
  onInitialWorkApplied?: () => void;
  onAmbientChange?: (palette: ThumbnailPalette | null, active: boolean) => void;
  onTagClick?: (tagId: string) => void;
}

interface FlatVideoItem {
  id: string;
  workId: string;
  title: string;
  description?: string;
  tags: string[];
  src?: string;
  thumbnail?: string;
  workIndex: number;
  sceneIndex: number;
}

function getSceneSource(scene?: Work['scenes'][number] | null): string | undefined {
  const src = scene?.proxiedVideoUrl ?? scene?.videoUrl;
  if (typeof src !== 'string') return undefined;
  const trimmed = src.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default function VideoGrid({
  works,
  initialWorkId,
  onInitialWorkApplied,
  onAmbientChange,
  onTagClick,
}: VideoGridProps) {
  const items: FlatVideoItem[] = useMemo(
    () =>
      works.flatMap((work, workIndex) =>
        work.scenes.map((scene, sceneIndex) => ({
          id: `${work.id}-${scene.id}`,
          workId: work.id,
          title: work.title,
          description: work.description,
          tags: work.tags ?? [],
          src: getSceneSource(scene),
          thumbnail: scene.thumbnail,
          workIndex,
          sceneIndex,
        }))
      ),
    [works]
  );

  const initialIndex =
    initialWorkId != null ? items.findIndex((item) => item.workId === initialWorkId) : -1;

  const [activeIndex, setActiveIndex] = useState<number | null>(
    initialIndex >= 0 ? initialIndex : null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  );
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (initialWorkId == null || initialIndex < 0) return;
    setActiveIndex(initialIndex);
    setIsPlaying(true);
    onInitialWorkApplied?.();
  }, [initialWorkId, initialIndex, onInitialWorkApplied]);

  useEffect(() => {
    items.forEach((item) => {
      if (item.thumbnail) {
        void extractThumbnailPalette(item.thumbnail);
      }
    });
  }, [items]);

  useEffect(() => {
    return () => {
      onAmbientChange?.(null, false);
    };
  }, [onAmbientChange]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };

    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    if (activeIndex !== null && activeIndex >= items.length) {
      setActiveIndex(items.length > 0 ? 0 : null);
      setIsPlaying(items.length > 0);
    }
  }, [activeIndex, items.length]);

  useEffect(() => {
    items.forEach((_, index) => {
      const video = videoRefs.current[index];
      if (!video) return;

      const isActive = index === activeIndex && isPlaying;
      if (!isActive) {
        try {
          video.pause();
          video.currentTime = 0;
          video.muted = true;
        } catch {
          // ignore pause/reset failures
        }
      }
    });

    if (activeIndex === null || !isPlaying) {
      activeVideoRef.current = null;
      return;
    }

    const activeVideo = videoRefs.current[activeIndex];
    if (!activeVideo) return;

    activeVideoRef.current = activeVideo;
    activeVideo.currentTime = 0;
    activeVideo.volume = 1;
    activeVideo.muted = false;

    activeVideo.play().catch(async () => {
      try {
        activeVideo.muted = true;
        await activeVideo.play();
        activeVideo.muted = false;
        activeVideo.volume = 1;
      } catch {
        // ignore autoplay failures; user can click again
      }
    });
  }, [activeIndex, isPlaying, items]);

  useEffect(() => {
    return () => {
      Object.values(videoRefs.current).forEach((video) => {
        if (!video) return;
        try {
          video.pause();
        } catch {
          // ignore cleanup failures
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!isMobileViewport || activeIndex === null) {
      return;
    }

    const activeItemId = items[activeIndex]?.id;
    if (!activeItemId) {
      return;
    }

    itemRefs.current[activeItemId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    });
  }, [activeIndex, isMobileViewport, items]);

  const activeItem = activeIndex !== null ? items[activeIndex] : null;
  const isPanelVisible = isMobileViewport ? activeItem !== null : true;
  const hasFocusState = hoveredIndex !== null || isPlaying;

  const handleCardClick = (index: number) => {
    if (activeIndex === index) {
      setIsPlaying((prev) => !prev);
      return;
    }

    setActiveIndex(index);
    setIsPlaying(true);
  };

  const applyAmbientForThumbnail = (thumbnail?: string) => {
    if (!thumbnail || isMobileViewport || !onAmbientChange) return;
    void extractThumbnailPalette(thumbnail).then((palette) => {
      onAmbientChange(palette, true);
    });
  };

  const handleCardMouseEnter = (index: number) => {
    if (isMobileViewport) return;
    setHoveredIndex(index);
    applyAmbientForThumbnail(items[index]?.thumbnail);
  };

  const handleGridMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setHoveredIndex(null);

    if (isMobileViewport) {
      onAmbientChange?.(null, false);
      return;
    }

    const playingItem = activeIndex !== null ? items[activeIndex] : null;
    if (isPlaying && playingItem?.thumbnail) {
      applyAmbientForThumbnail(playingItem.thumbnail);
      return;
    }

    onAmbientChange?.(null, false);
  };

  const handleStepNavigation = (direction: -1 | 1) => {
    if (items.length === 0) {
      return;
    }

    const startIndex = activeIndex ?? 0;
    const nextIndex = (startIndex + direction + items.length) % items.length;
    setActiveIndex(nextIndex);
    setIsPlaying(true);
  };

  if (items.length === 0) {
    return <div className="video-grid-empty">No videos found.</div>;
  }

  return (
    <div className={`scene-grid flat-scene-grid ${isPanelVisible ? 'panel-open' : ''}`}>
      <div
        className={`flat-scenes-container ${hasFocusState ? 'has-focus-state' : ''}`}
        role="list"
        aria-label="Video grid"
        onMouseLeave={handleGridMouseLeave}
      >
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            const isCurrentPlaying = isActive && isPlaying;

            return (
              <div
                key={item.id}
                role="listitem"
                className={`flat-scene-item ${isActive ? 'active' : ''} ${isCurrentPlaying ? 'playing' : ''} ${hoveredIndex === index ? 'hovered' : ''}`}
                ref={(element) => {
                  itemRefs.current[item.id] = element;
                }}
              >
                <button
                  type="button"
                  className="flat-scene-button"
                  onClick={() => handleCardClick(index)}
                  onMouseEnter={() => handleCardMouseEnter(index)}
                  onFocus={() => handleCardMouseEnter(index)}
                  aria-pressed={isActive}
                  aria-label={`${isCurrentPlaying ? 'Pause' : 'Play'} ${item.title}`}
                >
                  <span className="flat-scene-media">
                    <img src={item.thumbnail} alt="poster" className="flat-scene-poster" />
                    <video
                      className="flat-scene-video"
                      ref={(element) => {
                        videoRefs.current[index] = element;
                      }}
                      src={isActive ? item.src : undefined}
                      poster={item.thumbnail}
                      playsInline
                      preload={isActive ? 'auto' : 'none'}
                      muted
                      loop
                      onPlaying={() => {
                        setIsPlaying(true);
                        setActiveIndex(index);
                      }}
                      onPause={() => {
                        // when paused, keep activeIndex but ensure state reflects paused
                        if (activeIndex === index) setIsPlaying(false);
                      }}
                      style={{
                        objectFit: 'cover',
                        objectPosition: 'center center',
                        transform: 'translateZ(0) scale(1.035)',
                        transformOrigin: 'center center',
                        willChange: 'transform',
                      }}
                    />
                    <span className="play-pause-button" aria-hidden="true">
                      {isCurrentPlaying ? '❚❚' : '▶'}
                    </span>
                  </span>
                  <span className="flat-scene-caption">
                    <span className="flat-scene-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="flat-scene-title-row">
                      <span className="flat-scene-title">{item.title}</span>
                      {isCurrentPlaying ? (
                        <span className="flat-scene-playing-indicator" aria-hidden="true">
                          <span className="flat-scene-playing-line" />
                          <span className="flat-scene-playing-line" />
                          <span className="flat-scene-playing-line" />
                          <span className="flat-scene-playing-line" />
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>

                {isMobileViewport && isPanelVisible && isActive && items.length > 1 ? (
                  <div className="flat-scene-mobile-nav" aria-label="Video navigation">
                    <button
                      type="button"
                      className="flat-scene-mobile-arrow flat-scene-mobile-arrow-prev"
                      onClick={() => handleStepNavigation(-1)}
                      aria-label="Previous video"
                    >
                      &lt;
                    </button>
                    <button
                      type="button"
                      className="flat-scene-mobile-arrow flat-scene-mobile-arrow-next"
                      onClick={() => handleStepNavigation(1)}
                      aria-label="Next video"
                    >
                      &gt;
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
      </div>

      <CreditsPanel
        isVisible={isPanelVisible}
        title={activeItem?.title}
        description={activeItem?.description}
        tags={activeItem?.tags ?? []}
        emptyMessage="click on one of the videos"
        onTagClick={onTagClick}
        videoRef={activeVideoRef}
        currentWorkIndex={activeItem?.workIndex ?? 0}
        currentSceneIndex={activeItem?.sceneIndex ?? 0}
      />
    </div>
  );
}