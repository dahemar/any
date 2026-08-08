/**
 * Shared media proxy handler.
 *
 * Streams audio/video from upstream hosts (R2, S3, GitHub release assets)
 * through our own origin so the <audio>/<video> elements and the Web Audio
 * analyser can read them without CORS issues.
 *
 * Key features for playback performance:
 *  - Forwards HTTP Range requests and returns proper 206 responses so the
 *    browser can stream progressively and start playing immediately instead
 *    of downloading the whole file (critical for large .wav files).
 *  - Forwards content metadata (type, length, etag, last-modified).
 *  - Adds long-lived cache headers so repeated plays are served from the
 *    browser/CDN cache instead of re-fetching upstream.
 *  - Handles HEAD and OPTIONS (CORS preflight).
 */

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Range, Content-Type',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Cross-Origin-Embedder-Policy': 'unsafe-none',
};

const FORWARDED_HEADERS = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'etag',
  'last-modified',
];

export function proxyPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function proxyBadRequest(message: string): Response {
  return new Response(message, { status: 400, headers: CORS_HEADERS });
}

export async function proxyMedia(decodedUrl: string, request: Request): Promise<Response> {
  let targetUrl: URL;
  try {
    targetUrl = new URL(decodedUrl);
  } catch {
    return proxyBadRequest('Invalid proxied URL');
  }

  if (targetUrl.protocol !== 'https:' && targetUrl.protocol !== 'http:') {
    return proxyBadRequest('Invalid proxied URL protocol');
  }

  const upstreamHeaders: Record<string, string> = {
    accept: 'audio/*, video/*, */*',
  };
  const range = request.headers.get('range');
  if (range) {
    upstreamHeaders.range = range;
  }

  const isHead = request.method === 'HEAD';

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl.toString(), {
      method: isHead ? 'HEAD' : 'GET',
      headers: upstreamHeaders,
      redirect: 'follow',
    });
  } catch (error) {
    return new Response(`Proxy error: ${error}`, { status: 502, headers: CORS_HEADERS });
  }

  const headers = new Headers(CORS_HEADERS);
  for (const name of FORWARDED_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has('accept-ranges')) {
    headers.set('accept-ranges', 'bytes');
  }
  // Media assets are immutable-ish; let the browser and CDN cache them.
  headers.set('cache-control', 'public, max-age=86400, stale-while-revalidate=604800');

  const status = upstream.status === 206 ? 206 : upstream.status;
  return new Response(isHead ? null : upstream.body, {
    status,
    statusText: upstream.statusText,
    headers,
  });
}
