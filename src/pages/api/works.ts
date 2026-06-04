import type { APIRoute } from 'astro';
import { clearMemoryCache, fetchFromGoogleSheets } from '../../lib/googleSheets/googleSheetsManager';
import { getWorksStats, loadSiteCms } from '../../lib/cms/loadWorks';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const force = url.searchParams.get('force') === '1';

  if (force) {
    clearMemoryCache();
    await fetchFromGoogleSheets();
  }

  const cms = await loadSiteCms({ force });
  const stats = getWorksStats(cms.works);

  return new Response(
    JSON.stringify({
      ok: true,
      source: cms.source,
      stats,
      works: cms.works,
      tags: cms.tags,
    }),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': force ? 'no-store' : 'public, max-age=60',
      },
    }
  );
};
