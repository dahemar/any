import { useCallback, useEffect, useState } from 'react';
import type { ThumbnailPalette } from '../lib/thumbnailColors';
import type { SiteSection, Work } from '../lib/types';
import AmbientGlow from './AmbientGlow';
import ContactPage from './ContactPage';
import SearchPage from './SearchPage';
import SiteNav from './SiteNav';
import VideoGrid from './VideoGrid';
import './App.css';

interface AppProps {
  works: Work[];
}

export default function App({ works: worksProp }: AppProps) {
  const [section, setSection] = useState<SiteSection>('anyways');
  const [focusWorkId, setFocusWorkId] = useState<string | null>(null);
  const [focusTagId, setFocusTagId] = useState<string | null>(null);
  const [ambient, setAmbient] = useState<{ palette: ThumbnailPalette | null; active: boolean }>({
    palette: null,
    active: false,
  });

  const handleAmbientChange = useCallback((palette: ThumbnailPalette | null, active: boolean) => {
    setAmbient({ palette, active });
  }, []);

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
      setAmbient({ palette: null, active: false });
    }
  }, [section]);

  return (
    <div className="any-app">
      <AmbientGlow palette={ambient.palette} active={ambient.active} />
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
        <SearchPage
          initialTagId={focusTagId}
          onInitialTagApplied={() => setFocusTagId(null)}
          onSelectWork={handleSelectWorkFromSearch}
        />
      )}

      {section === 'contact' && <ContactPage />}
    </div>
  );
}
