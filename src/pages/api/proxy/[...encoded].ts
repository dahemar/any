import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const encodedValue = params.encoded;
  if (!encodedValue) {
    return new Response('Missing proxied URL', { status: 400 });
  }

  const encoded = Array.isArray(encodedValue) ? encodedValue.join('/') : encodedValue;
  let decoded: string;

  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    return new Response('Invalid proxied URL', { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(decoded);
  } catch {
    return new Response('Invalid proxied URL', { status: 400 });
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        accept: 'audio/*, video/*, */*',
      },
    });

    if (!response.ok) {
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
      });
    }

    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Headers', 'Range,Content-Type');
    headers.set('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    return new Response(`Proxy error: ${error}`, { status: 500 });
  }
};
