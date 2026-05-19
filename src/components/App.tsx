import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import type { ThumbnailPalette } from '../lib/thumbnailColors';
import type { SiteSection, Work } from '../lib/types';
import AmbientGlow from './AmbientGlow';
import SiteNav from './SiteNav';
import VideoGrid from './VideoGrid';
import './App.css';

const SearchPage = lazy(() => import('./SearchPage'));
const ContactPage = lazy(() => import('./ContactPage'));

interface AppProps {
  works: Work[];
}

export default function App({ works: worksProp }: AppProps) {
  const [section, setSection] = useState<SiteSection>('anyways');
  const [focusWorkId, setFocusWorkId] = useState<string | null>(null);
  const [focusTagId, setFocusTagId] = useState<string | null>(null);
  const [ambientPalette, setAmbientPalette] = useState<ThumbnailPalette | null>(null);
  const [ambientActive, setAmbientActive] = useState(false);
  const [ambientFrozen, setAmbientFrozen] = useState(false);

  const handleAmbientChange = useCallback(
    (palette: ThumbnailPalette | null, active: boolean, frozen = false) => {
      setAmbientPalette(palette);
      setAmbientActive(active);
      setAmbientFrozen(active && frozen);
    },
    []
  );

  const handleSelectWorkFromSearch = useCallback((workId: string) => {
    setFocusWorkId(workId);
    setFocusTagId(null);
    setSection('anyways');
  }, []);

  const handleOpenSearchTag = useCallback((tagId: string) => {
    setFocusTagId(tagId);
    setFocusWorkId(null);
    setSection('search');
  }, []);

  const handleSectionChange = useCallback((next: SiteSection) => {
    setSection(next);
    if (next !== 'anyways') {
      setFocusWorkId(null);
    }
    if (next !== 'search') {
      setFocusTagId(null);
    }
  }, []);

  useEffect(() => {
    if (section !== 'anyways') {
      setAmbientPalette(null);
      setAmbientActive(false);
      setAmbientFrozen(false);
    }
  }, [section]);

  return (
    <div className="any-app">
      <AmbientGlow palette={ambientPalette} active={ambientActive} frozen={ambientFrozen} />
      <SiteNav activeSection={section} onSectionChange={handleSectionChange} />

      {section === 'anyways' && (
        <VideoGrid
          works={worksProp}
          initialWorkId={focusWorkId}
          onInitialWorkApplied={() => setFocusWorkId(null)}
          onAmbientChange={handleAmbientChange}
          onTagClick={handleOpenSearchTag}
        />
      )}

      {section === 'search' && (
        <Suspense fallback={null}>
          <SearchPage
            initialTagId={focusTagId}
            onInitialTagApplied={() => setFocusTagId(null)}
            onSelectWork={handleSelectWorkFromSearch}
          />
        </Suspense>
      )}

      {section === 'contact' && (
        <Suspense fallback={null}>
          <ContactPage />
        </Suspense>
      )}
    </div>
  );
}
