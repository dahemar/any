import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Credit, Work } from '../lib/types';
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
  credits?: Credit[];
  src?: string;
  audioSrc?: string;
  thumbnail?: string;
  workIndex: number;
  sceneIndex: number;
}

const PROXY_HOSTNAMES = ['github.com', 'release-assets.githubusercontent.com'];

function shouldProxyUrl(url: URL): boolean {
  return (
    PROXY_HOSTNAMES.includes(url.hostname) ||
    url.hostname.endsWith('.s3.amazonaws.com') ||
    url.hostname.endsWith('.r2.dev')
  );
}

function buildProxyUrl(rawUrl: string): string {
  return `/api/proxy?url=${encodeURIComponent(rawUrl)}`;
}

function getSceneSource(scene?: Work['scenes'][number] | null): string | undefined {
  const src = scene?.proxiedVideoUrl ?? scene?.videoUrl;
  if (typeof src !== 'string') return undefined;
  const trimmed = src.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getSceneAudioSource(scene?: Work['scenes'][number] | null): string | undefined {
  const src = scene?.audioUrl;
  if (typeof src !== 'string') return undefined;
  const trimmed = src.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('/api/proxy')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (shouldProxyUrl(parsed)) {
        return buildProxyUrl(trimmed);
      }
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

function pauseMedia(media: HTMLMediaElement) {
  try {
    media.pause();
    media.currentTime = 0;
    if (media instanceof HTMLVideoElement) {
      media.muted = true;
      media.removeAttribute('src');
    }
    media.load();
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
          credits: work.credits,
          src: getSceneSource(scene),
          audioSrc: getSceneAudioSource(scene),
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
  const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({});
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastActiveIndexRef = useRef<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeItem = activeIndex !== null ? items[activeIndex] : null;
  const isPanelVisible = isMobileViewport ? activeItem !== null : true;

  useEffect(() => {
    return () => {
      if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
    };
  }, []);

  const cancelPendingClose = useCallback(() => {
    // A close (mobile ×) schedules activeIndex=null after 250ms. Any new
    // interaction before that fires must cancel it, otherwise the freshly
    // selected track gets deselected by the stale timer.
    if (closingTimerRef.current) {
      clearTimeout(closingTimerRef.current);
      closingTimerRef.current = null;
    }
  }, []);

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
      if (previousVideo) pauseMedia(previousVideo);
      const previousAudio = audioRefs.current[previousIndex];
      if (previousAudio) pauseMedia(previousAudio);
    }

    if (activeIndex === null || !isPlaying) {
      if (activeIndex !== null && !isPlaying) {
        const pausedVideo = videoRefs.current[activeIndex];
        if (pausedVideo && !pausedVideo.paused) {
          pausedVideo.pause();
        }
      }
      activeVideoRef.current = null;
      activeAudioRef.current = null;
      lastActiveIndexRef.current = activeIndex;
      return;
    }

    const activeVideo = videoRefs.current[activeIndex];
    const activeAudio = audioRefs.current[activeIndex] ?? null;
    activeAudioRef.current = activeAudio;

    if (activeVideo) {
      const hasSource = Boolean(activeVideo.getAttribute('src'));
      if (hasSource) {
        activeVideoRef.current = activeVideo;
        if (previousIndex !== activeIndex) {
          activeVideo.currentTime = 0;
        }
        activeVideo.volume = 1;
        activeVideo.muted = Boolean(activeItem?.audioSrc);

        activeVideo.play().catch(async () => {
          try {
            activeVideo.muted = true;
            await activeVideo.play();
            if (!activeItem?.audioSrc) {
              activeVideo.muted = false;
              activeVideo.volume = 1;
            }
          } catch {
            // ignore autoplay failures
          }
        });
      } else {
        activeVideoRef.current = null;
      }
    } else {
      activeVideoRef.current = null;
    }

    lastActiveIndexRef.current = activeIndex;
  }, [activeIndex, isPlaying]);

  useEffect(() => {
    return () => {
      Object.values(videoRefs.current).forEach((video) => {
        if (video) pauseMedia(video);
      });
      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) pauseMedia(audio);
      });
    };
  }, []);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const activeItemId = items[activeIndex]?.id;
    if (!activeItemId) {
      return;
    }

    const element = itemRefs.current[activeItemId];
    if (!element) {
      return;
    }

    if (isMobileViewport) {
      element.scrollIntoView({
        behavior: 'instant',
        block: 'start',
        inline: 'nearest',
      });
      return;
    }

    if (!isPlaying) {
      return;
    }

    requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });
  }, [activeIndex, isMobileViewport, isPlaying, items]);

  const hasFocusState = hoveredIndex !== null || isPlaying;

  const handleCardClick = useCallback(
    (index: number) => {
      cancelPendingClose();

      if (activeIndex === index && isPlaying) {
        const video = videoRefs.current[index];
        const audio = audioRefs.current[index];
        if (video) pauseMedia(video);
        if (audio) pauseMedia(audio);
        setIsPlaying(false);
        return;
      }

      if (activeIndex !== null && activeIndex !== index) {
        const previousVideo = videoRefs.current[activeIndex];
        const previousAudio = audioRefs.current[activeIndex];
        if (previousVideo) pauseMedia(previousVideo);
        if (previousAudio) pauseMedia(previousAudio);
      }

      // Playback is owned by the effects (VideoGridCard owns the <audio>,
      // the playback effect below owns the <video>). We only update state
      // here so there is a single play() call path and no AbortError races
      // from concurrent play() requests on the same element.
      setActiveIndex(index);
      setIsPlaying(true);
    },
    [activeIndex, isPlaying, cancelPendingClose]
  );

  const handleCardPointerDown = useCallback(
    (index: number) => {
      cancelPendingClose();

      // Start the audio network request as early as possible (pointerdown
      // fires before click), so playback can start sooner. The card effect
      // stays the single owner of play().
      const audio = audioRefs.current[index];
      const audioSrc = items[index]?.audioSrc;
      if (!audio || !audioSrc) return;

      if (audio.getAttribute('src') !== audioSrc) {
        audio.src = audioSrc;
      }
      audio.preload = 'auto';
      if (audio.readyState < 2) {
        audio.load();
      }
    },
    [items, cancelPendingClose]
  );

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

  const handleStopMobile = useCallback(() => {
    const video = activeIndex !== null ? videoRefs.current[activeIndex] : null;
    const audio = activeIndex !== null ? audioRefs.current[activeIndex] : null;
    if (video) pauseMedia(video);
    if (audio) pauseMedia(audio);
    setIsPlaying(false);
    setHoveredIndex(null);
    if (closingTimerRef.current) clearTimeout(closingTimerRef.current);
    closingTimerRef.current = setTimeout(() => {
      setActiveIndex(null);
    }, 250);
  }, [activeIndex]);

  const setItemRef = useCallback((id: string, element: HTMLDivElement | null) => {
    itemRefs.current[id] = element;
  }, []);

  const setVideoRef = useCallback((index: number, element: HTMLVideoElement | null) => {
    videoRefs.current[index] = element;
  }, []);

  const setAudioRef = useCallback((index: number, element: HTMLAudioElement | null) => {
    audioRefs.current[index] = element;
  }, []);

  if (items.length === 0) {
    return <div className="video-grid-empty">No videos found.</div>;
  }

  const isMobilePlaying = isMobileViewport && activeIndex !== null && isPlaying;

  return (
    <div className={`scene-grid flat-scene-grid ${isPanelVisible ? 'panel-open' : ''} ${isMobilePlaying ? 'mobile-playing' : ''}`}>
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
            onCardPointerDown={handleCardPointerDown}
            onPlaying={handlePlaying}
            onPause={handlePause}
            setItemRef={setItemRef}
            setVideoRef={setVideoRef}
            setAudioRef={setAudioRef}
          />
        ))}
      </div>

      <CreditsPanel
        isVisible={isPanelVisible}
        title={activeItem?.title}
        description={activeItem?.description}
        credits={activeItem?.credits}
        tags={activeItem?.tags ?? []}
        emptyMessage="click on one of the images"
        onTagClick={onTagClick}
        videoRef={activeVideoRef}
        audioRef={activeAudioRef}
        currentWorkIndex={activeItem?.workIndex ?? 0}
        currentSceneIndex={activeItem?.sceneIndex ?? 0}
        onClose={isMobilePlaying ? handleStopMobile : undefined}
      />
    </div>
  );
}
