import { lazy, Suspense, useCallback, useState } from 'react';
import type { SiteSection, TagDefinition, Work } from '../lib/types';
import AmbientGlow from './AmbientGlow';
import HeroPage from './HeroPage';
import SiteNav from './SiteNav';
import VideoGrid from './VideoGrid';
import './App.css';

const SearchPage = lazy(() => import('./SearchPage'));
const ContactPage = lazy(() => import('./ContactPage'));

interface AppProps {
  works: Work[];
  tags: TagDefinition[];
}

export default function App({ works: worksProp, tags }: AppProps) {
  const [section, setSection] = useState<SiteSection>('anyway');
  const [focusWorkId, setFocusWorkId] = useState<string | null>(null);
  const [focusTagId, setFocusTagId] = useState<string | null>(null);
  const handleSelectWorkFromSearch = useCallback((workId: string) => {
    setFocusWorkId(workId);
    setFocusTagId(null);
    setSection('anyway');
  }, []);

  const handleOpenSearchTag = useCallback((tagId: string) => {
    setFocusTagId(tagId);
    setFocusWorkId(null);
    setSection('search');
  }, []);

  const handleSectionChange = useCallback((next: SiteSection) => {
    setSection(next);
    if (next !== 'anyway') {
      setFocusWorkId(null);
    }
    if (next !== 'search') {
      setFocusTagId(null);
    }
  }, []);

  return (
    <div className="any-app">
      {section === 'anyway' ? <AmbientGlow /> : null}
      <SiteNav activeSection={section} onSectionChange={handleSectionChange} />

      {section === 'anyway' && (
        <>
          <HeroPage />
          <VideoGrid
            works={worksProp}
            initialWorkId={focusWorkId}
            onInitialWorkApplied={() => setFocusWorkId(null)}
            onTagClick={handleOpenSearchTag}
          />
        </>
      )}

      {section === 'search' && (
        <Suspense fallback={null}>
          <SearchPage
            works={worksProp}
            tags={tags}
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
