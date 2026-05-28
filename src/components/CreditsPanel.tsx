import { useCallback, useEffect, useRef, useState } from 'react';
import './CreditsPanel.css';
import VUMeter from './VUMeter';

interface CreditsPanelProps {
  isVisible: boolean;
  title?: string;
  description?: string;
  tags?: string[];
  emptyMessage?: string;
  onTagClick?: (tagId: string) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  currentWorkIndex?: number;
  currentSceneIndex?: number;
}

export default function CreditsPanel({
  isVisible,
  title,
  description,
  tags = [],
  emptyMessage,
  onTagClick,
  videoRef,
  currentWorkIndex = 0,
  currentSceneIndex = 0,
}: CreditsPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const [showBottomFade, setShowBottomFade] = useState(false);

  const updateBottomFade = useCallback(() => {
    const scrollRegion = scrollRegionRef.current;
    if (!scrollRegion || typeof window === 'undefined') {
      setShowBottomFade(false);
      return;
    }

    const threshold = 8;
    const hasHiddenContentBelow =
      scrollRegion.scrollTop + scrollRegion.clientHeight < scrollRegion.scrollHeight - threshold;
    setShowBottomFade(hasHiddenContentBelow);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const scrollRegion = scrollRegionRef.current;
    if (!scrollRegion) return;

    const handleViewportChange = () => updateBottomFade();
    const handlePanelScroll = () => updateBottomFade();

    updateBottomFade();
    scrollRegion.addEventListener('scroll', handlePanelScroll, { passive: true });
    window.addEventListener('resize', handleViewportChange);

    return () => {
      scrollRegion.removeEventListener('scroll', handlePanelScroll);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [isVisible, description, tags, title, updateBottomFade]);

  if (!isVisible) {
    return null;
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  const isMobileViewport =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

  return (
    <div
      ref={panelRef}
      className={`credits-panel visible ${showBottomFade ? 'show-bottom-fade' : ''}`}
      onWheel={handleWheel}
    >
      <div ref={scrollRegionRef} className="credits-scroll-region">
        <div className="credits-content">
          {title ? (
            <div className="credit-title-container">
              <span className="credit-title">{title}</span>
            </div>
          ) : emptyMessage ? (
            <div className="credits-empty-state">{emptyMessage}</div>
          ) : null}

          {description ? <p className="credits-description">{description}</p> : null}

          {tags.length > 0 ? (
            <div className="credits-tags" role="list" aria-label="Tags">
              {tags.map((tag) =>
                onTagClick ? (
                  <button
                    key={tag}
                    type="button"
                    className="tag-pill credits-tag-pill credits-tag-pill--link"
                    role="listitem"
                    onClick={() => onTagClick(tag)}
                  >
                    {tag}
                  </button>
                ) : (
                  <span key={tag} className="tag-pill credits-tag-pill" role="listitem">
                    {tag}
                  </span>
                )
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="credits-bottom-fade" aria-hidden="true" />

      {!isMobileViewport && (
        <VUMeter
          inCreditsPanel
          videoRef={videoRef}
          currentWorkIndex={currentWorkIndex}
          currentSceneIndex={currentSceneIndex}
        />
      )}
    </div>
  );
}
