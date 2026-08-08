import type { APIRoute } from 'astro';
import { proxyBadRequest, proxyMedia, proxyPreflight } from '../../../lib/mediaProxy';

export const prerender = false;

export const OPTIONS: APIRoute = () => proxyPreflight();

export const HEAD: APIRoute = async ({ request, params }) => {
  const decoded = decodeTarget(params.encoded);
  if (decoded === null) return proxyBadRequest('Missing or invalid proxied URL');
  return proxyMedia(decoded, request);
};

export const GET: APIRoute = async ({ request, params }) => {
  const decoded = decodeTarget(params.encoded);
  if (decoded === null) return proxyBadRequest('Missing or invalid proxied URL');
  return proxyMedia(decoded, request);
};

function decodeTarget(encodedValue: string | string[] | undefined): string | null {
  if (!encodedValue) return null;
  const encoded = Array.isArray(encodedValue) ? encodedValue.join('/') : encodedValue;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}
