import { works as fallbackWorks } from '../../data/works';
import type { TagDefinition, Work, WorksStats } from '../types';
import { loadCmsData } from '../googleSheets/googleSheetsManager';
import type { ParsedIntro } from '../googleSheets/parseAnyWorks';
import { filterWorksTags, mergeTagDefinitions } from './tags';

export interface SiteCmsData {
  works: Work[];
  tags: TagDefinition[];
  intro?: ParsedIntro;
  source: 'sheets' | 'fallback';
}

const fallbackIntro: ParsedIntro = {
  title: 'sound library',
  description: [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  ],
};

export async function loadSiteCms(options?: { force?: boolean }): Promise<SiteCmsData> {
  const remote = await loadCmsData(options);

  if (remote.works.length > 0) {
    const tags = mergeTagDefinitions(remote.tags, remote.works);
    return {
      works: filterWorksTags(remote.works, tags),
      tags,
      intro: remote.intro || fallbackIntro,
      source: 'sheets',
    };
  }

  const tags = mergeTagDefinitions([], fallbackWorks);
  return {
    works: filterWorksTags(fallbackWorks, tags),
    tags,
    intro: fallbackIntro,
    source: 'fallback',
  };
}

export async function loadWorksForPage(options?: { force?: boolean }): Promise<Work[]> {
  const cms = await loadSiteCms(options);
  return cms.works;
}

export function getWorksStats(works: Work[]): WorksStats {
  return {
    totalWorks: works.length,
    totalVideos: works.reduce((sum, work) => sum + (work.scenes?.length || 0), 0),
  };
}
