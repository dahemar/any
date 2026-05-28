import { lazy, Suspense, useCallback, useState } from 'react';
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

  return (
    <div className="any-app">
      {section === 'anyways' ? <AmbientGlow /> : null}
      <SiteNav activeSection={section} onSectionChange={handleSectionChange} />

      {section === 'anyways' && (
        <VideoGrid
          works={worksProp}
          initialWorkId={focusWorkId}
          onInitialWorkApplied={() => setFocusWorkId(null)}
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
