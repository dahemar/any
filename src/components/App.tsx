import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import type { SiteSection, TagDefinition, Work } from '../lib/types';
import type { ParsedIntro } from '../lib/googleSheets/parseAnyWorks';
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
  intro?: ParsedIntro;
}

export default function App({ works: worksProp, tags: tagsProp, intro }: AppProps) {
  const [works, setWorks] = useState<Work[]>(worksProp);
  const [tags, setTags] = useState<TagDefinition[]>(tagsProp);
  const [section, setSection] = useState<SiteSection>('anyway');
  const [focusWorkId, setFocusWorkId] = useState<string | null>(null);
  const [focusTagId, setFocusTagId] = useState<string | null>(null);

  // The SSR HTML can be served from a CDN cache, so poll the works API to
  // pick up Google Sheets edits quickly: on mount, every 60s, and whenever
  // the tab regains focus.
  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const res = await fetch('/api/works', { headers: { accept: 'application/json' } });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data?.works) || data.works.length === 0) return;
        setWorks(data.works);
        if (Array.isArray(data.tags)) setTags(data.tags);
      } catch {
        // network hiccup — keep showing current data
      }
    };

    refresh();
    const interval = setInterval(refresh, 15_000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

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
          <HeroPage intro={intro} />
          <VideoGrid
            works={works}
            initialWorkId={focusWorkId}
            onInitialWorkApplied={() => setFocusWorkId(null)}
            onTagClick={handleOpenSearchTag}
          />
        </>
      )}

      {section === 'search' && (
        <Suspense fallback={null}>
          <SearchPage
            works={works}
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
