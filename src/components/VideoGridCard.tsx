import { memo } from 'react';

export interface VideoGridCardItem {
  id: string;
  title: string;
  src?: string;
  thumbnail?: string;
}

export interface VideoGridCardProps {
  item: VideoGridCardItem;
  index: number;
  isActive: boolean;
  isCurrentPlaying: boolean;
  isHovered: boolean;
  showMobileNav: boolean;
  canStep: boolean;
  onCardClick: (index: number) => void;
  onCardHover: (index: number) => void;
  onStep: (direction: -1 | 1) => void;
  onPlaying: (index: number) => void;
  onPause: (index: number) => void;
  setItemRef: (id: string, element: HTMLDivElement | null) => void;
  setVideoRef: (index: number, element: HTMLVideoElement | null) => void;
}

function VideoGridCard({
  item,
  index,
  isActive,
  isCurrentPlaying,
  isHovered,
  showMobileNav,
  canStep,
  onCardClick,
  onCardHover,
  onStep,
  onPlaying,
  onPause,
  setItemRef,
  setVideoRef,
}: VideoGridCardProps) {
  return (
    <div
      role="listitem"
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
            muted
            loop
            onPlaying={() => onPlaying(index)}
            onPause={() => onPause(index)}
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

      {showMobileNav && isActive && canStep ? (
        <div className="flat-scene-mobile-nav" aria-label="Video navigation">
          <button
            type="button"
            className="flat-scene-mobile-arrow flat-scene-mobile-arrow-prev"
            onClick={() => onStep(-1)}
            aria-label="Previous video"
          >
            &lt;
          </button>
          <button
            type="button"
            className="flat-scene-mobile-arrow flat-scene-mobile-arrow-next"
            onClick={() => onStep(1)}
            aria-label="Next video"
          >
            &gt;
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default memo(VideoGridCard);
