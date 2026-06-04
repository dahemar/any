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
  onPlaying: (index: number) => void;
  onPause: (index: number) => void;
  setItemRef: (id: string, element: HTMLDivElement | null) => void;
  setVideoRef: (index: number, element: HTMLVideoElement | null) => void;
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
  onPlaying,
  onPause,
  setItemRef,
  setVideoRef,
}: VideoGridCardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !item.audioSrc) return;

    if (isActive && isCurrentPlaying) {
      void audio.play().catch(() => {
        // autoplay policies or missing CORS — ignore
      });
      return;
    }

    audio.pause();
    audio.currentTime = 0;
  }, [isActive, isCurrentPlaying, item.audioSrc]);

  return (
    <div
      role="listitem"
      data-work-index={workIndex}
      data-scene-index={sceneIndex}
      className={`flat-scene-item ${isActive ? 'active' : ''} ${isCurrentPlaying ? 'playing' : ''} ${isHovered ? 'hovered' : ''}`}
      ref={(element) => {
        setItemRef(item.id, element);
      }}
    >
      <button
        type="button"
        className="flat-scene-button"
        onClick={() => onCardClick(index)}
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
              loading="lazy"
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
            poster={item.thumbnail}
            playsInline
            preload={isActive ? 'auto' : 'none'}
            muted={Boolean(item.audioSrc)}
            loop
            onPlaying={() => onPlaying(index)}
            onPause={() => onPause(index)}
          />
          {item.audioSrc ? (
            <audio
              ref={audioRef}
              className="flat-scene-audio"
              src={isActive ? item.audioSrc : undefined}
              preload={isActive ? 'auto' : 'none'}
              crossOrigin="anonymous"
              loop
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
