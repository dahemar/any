import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Work } from '../lib/types';
import CreditsPanel from './CreditsPanel';
import VideoGridCard from './VideoGridCard';

interface VideoGridProps {
  works: Work[];
  initialWorkId?: string | null;
  onInitialWorkApplied?: () => void;
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

function pauseVideo(video: HTMLVideoElement) {
  try {
    video.pause();
    video.currentTime = 0;
    video.muted = true;
    video.removeAttribute('src');
    video.load();
  } catch {
    // ignore pause/reset failures
  }
}

export default function VideoGrid({
  works,
  initialWorkId,
  onInitialWorkApplied,
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
  const lastActiveIndexRef = useRef<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (initialWorkId == null || initialIndex < 0) return;
    setActiveIndex(initialIndex);
    setIsPlaying(true);
    onInitialWorkApplied?.();
  }, [initialWorkId, initialIndex, onInitialWorkApplied]);

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
    const previousIndex = lastActiveIndexRef.current;

    if (previousIndex !== null && previousIndex !== activeIndex) {
      const previousVideo = videoRefs.current[previousIndex];
      if (previousVideo) pauseVideo(previousVideo);
    }

    if (activeIndex === null || !isPlaying) {
      if (activeIndex !== null && !isPlaying) {
        const pausedVideo = videoRefs.current[activeIndex];
        if (pausedVideo && !pausedVideo.paused) {
          pausedVideo.pause();
        }
      }
      activeVideoRef.current = null;
      lastActiveIndexRef.current = activeIndex;
      return;
    }

    const activeVideo = videoRefs.current[activeIndex];
    if (!activeVideo) {
      lastActiveIndexRef.current = activeIndex;
      return;
    }

    activeVideoRef.current = activeVideo;
    if (previousIndex !== activeIndex) {
      activeVideo.currentTime = 0;
    }
    activeVideo.volume = 1;
    activeVideo.muted = false;

    activeVideo.play().catch(async () => {
      try {
        activeVideo.muted = true;
        await activeVideo.play();
        activeVideo.muted = false;
        activeVideo.volume = 1;
      } catch {
        // ignore autoplay failures
      }
    });

    lastActiveIndexRef.current = activeIndex;
  }, [activeIndex, isPlaying]);

  useEffect(() => {
    return () => {
      Object.values(videoRefs.current).forEach((video) => {
        if (video) pauseVideo(video);
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

  const handleCardClick = useCallback((index: number) => {
    if (activeIndex === index && isPlaying) {
      const video = videoRefs.current[index];
      if (video) {
        video.pause();
      }
      setIsPlaying(false);
      return;
    }

    if (activeIndex === index) {
      setIsPlaying(true);
      return;
    }

    setActiveIndex(index);
    setIsPlaying(true);
  }, [activeIndex, isPlaying]);

  const handleCardHover = useCallback(
    (index: number) => {
      if (isMobileViewport) return;
      setHoveredIndex(index);
    },
    [isMobileViewport]
  );

  const handleGridMouseLeave = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const nextTarget = event.relatedTarget as Node | null;
      if (nextTarget && event.currentTarget.contains(nextTarget)) {
        return;
      }

      setHoveredIndex(null);
    },
    []
  );

  const handlePlaying = useCallback((index: number) => {
    const video = videoRefs.current[index];
    if (video?.paused) return;
    setIsPlaying(true);
    setActiveIndex(index);
  }, []);

  const handlePause = useCallback(
    (index: number) => {
      setActiveIndex((current) => {
        if (current === index) setIsPlaying(false);
        return current;
      });
    },
    []
  );

  const setItemRef = useCallback((id: string, element: HTMLDivElement | null) => {
    itemRefs.current[id] = element;
  }, []);

  const setVideoRef = useCallback((index: number, element: HTMLVideoElement | null) => {
    videoRefs.current[index] = element;
  }, []);

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
        {items.map((item, index) => (
          <VideoGridCard
            key={item.id}
            item={item}
            index={index}
            workIndex={item.workIndex}
            sceneIndex={item.sceneIndex}
            isActive={index === activeIndex}
            isCurrentPlaying={index === activeIndex && isPlaying}
            isHovered={hoveredIndex === index}
            onCardClick={handleCardClick}
            onCardHover={handleCardHover}
            onPlaying={handlePlaying}
            onPause={handlePause}
            setItemRef={setItemRef}
            setVideoRef={setVideoRef}
          />
        ))}
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
