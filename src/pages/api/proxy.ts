import type { APIRoute } from 'astro';
import { proxyBadRequest, proxyMedia, proxyPreflight } from '../../lib/mediaProxy';

export const prerender = false;

export const OPTIONS: APIRoute = () => proxyPreflight();

export const HEAD: APIRoute = async ({ request, url }) => {
  const decoded = decodeTarget(url);
  if (decoded === null) return proxyBadRequest('Missing or invalid proxied URL');
  return proxyMedia(decoded, request);
};

export const GET: APIRoute = async ({ request, url }) => {
  const decoded = decodeTarget(url);
  if (decoded === null) return proxyBadRequest('Missing or invalid proxied URL');
  return proxyMedia(decoded, request);
};

function decodeTarget(url: URL): string | null {
  const encoded = url.searchParams.get('url');
  if (!encoded) return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}
