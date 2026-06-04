import { works as fallbackWorks } from '../../data/works';
import type { TagDefinition, Work, WorksStats } from '../types';
import { loadCmsData } from '../googleSheets/googleSheetsManager';
import { mergeTagDefinitions } from './tags';

export interface SiteCmsData {
  works: Work[];
  tags: TagDefinition[];
  source: 'sheets' | 'fallback';
}

export async function loadSiteCms(options?: { force?: boolean }): Promise<SiteCmsData> {
  const remote = await loadCmsData(options);

  if (remote.works.length > 0) {
    return {
      works: remote.works,
      tags: mergeTagDefinitions(remote.tags, remote.works),
      source: 'sheets',
    };
  }

  return {
    works: fallbackWorks,
    tags: mergeTagDefinitions([], fallbackWorks),
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
