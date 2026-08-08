import { memo, useEffect, useRef } from 'react';

export interface VideoGridCardItem {
  id: string;
  title: string;
  src?: string;
  audioSrc?: string;
  thumbnail?: string;
}

export interface VideoGridCardProps {
  item: VideoGridCardItem;
  index: number;
  workIndex: number;
  sceneIndex: number;
  isActive: boolean;
  isCurrentPlaying: boolean;
  isHovered: boolean;
  onCardClick: (index: number) => void;
  onCardHover: (index: number) => void;
  onCardPointerDown: (index: number) => void;
  onPlaying: (index: number) => void;
  onPause: (index: number) => void;
  setItemRef: (id: string, element: HTMLDivElement | null) => void;
  setVideoRef: (index: number, element: HTMLVideoElement | null) => void;
  setAudioRef: (index: number, element: HTMLAudioElement | null) => void;
}

/**
 * Assign a src to a media element only when it actually changed.
 *
 * Comparing `el.src !== rawSrc` is buggy for relative URLs: the `.src`
 * property always returns the absolutized URL, so a relative `rawSrc`
 * (e.g. `/api/proxy?url=...`) never matches and the element gets reset on
 * every render — aborting any in-flight load and preventing playback.
 * `getAttribute('src')` returns the literal value we set, so it is safe.
 */
function ensureMediaSrc(el: HTMLMediaElement, rawSrc: string): void {
  if (el.getAttribute('src') !== rawSrc) {
    el.src = rawSrc;
  }
}

function VideoGridCard({
  item,
  index,
  workIndex,
  sceneIndex,
  isActive,
  isCurrentPlaying,
  isHovered,
  onCardClick,
  onCardHover,
  onCardPointerDown,
  onPlaying,
  onPause,
  setItemRef,
  setVideoRef,
  setAudioRef,
}: VideoGridCardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Single owner of the <audio> element lifecycle: src, preload, play/pause.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !item.audioSrc) return;

    ensureMediaSrc(audio, item.audioSrc);

    const shouldPreload = isActive || isHovered || index < 2;
    audio.preload = shouldPreload ? 'auto' : 'none';

    if (!(isActive && isCurrentPlaying)) {
      if (!audio.paused) audio.pause();
      return;
    }

    audio.muted = false;
    audio.volume = 1;

    let cancelled = false;
    const tryPlay = () => {
      if (cancelled) return;
      audio.play().catch(() => {
        // autoplay/network failures are retried on the next canplay
      });
    };

    if (audio.readyState >= 3) {
      // HAVE_FUTURE_DATA — can start immediately
      tryPlay();
      return;
    }

    if (audio.readyState < 2 && shouldPreload) {
      audio.load();
    }
    audio.addEventListener('canplay', tryPlay);
    return () => {
      cancelled = true;
      audio.removeEventListener('canplay', tryPlay);
    };
  }, [isActive, isCurrentPlaying, isHovered, index, item.audioSrc]);

  return (
    <div
      role="listitem"
      data-work-index={workIndex}
      data-scene-index={sceneIndex}
      className={`flat-scene-item ${isActive ? 'active' : ''} ${isCurrentPlaying ? 'playing' : ''} ${isHovered ? 'hovered' : ''} ${!item.src ? 'no-video' : ''}`}
      ref={(element) => {
        setItemRef(item.id, element);
      }}
    >
      <button
        type="button"
        className="flat-scene-button"
        onClick={() => onCardClick(index)}
        onPointerDown={() => onCardPointerDown(index)}
        onMouseEnter={() => onCardHover(index)}
        onFocus={() => onCardHover(index)}
        aria-pressed={isActive}
        aria-label={`${isCurrentPlaying ? 'Pause' : 'Play'} ${item.title}`}
      >
        <span className="flat-scene-media">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt=""
              className="flat-scene-poster"
              loading={index < 4 ? 'eager' : 'lazy'}
              fetchPriority={index < 4 ? 'high' : 'auto'}
              decoding="async"
              draggable={false}
            />
          ) : null}
          <video
            className="flat-scene-video"
            ref={(element) => {
              setVideoRef(index, element);
            }}
            src={isActive ? item.src : undefined}
            playsInline
            preload={isActive ? 'auto' : 'none'}
            muted={Boolean(item.audioSrc)}
            loop
            onPlaying={() => onPlaying(index)}
            onPause={() => onPause(index)}
          />
          {item.audioSrc ? (
            <audio
              ref={(element) => {
                audioRef.current = element;
                setAudioRef(index, element);
              }}
              className="flat-scene-audio"
              preload="none"
              loop
              crossOrigin="anonymous"
              hidden
            />
          ) : null}
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
    </div>
  );
}

export default memo(VideoGridCard);
