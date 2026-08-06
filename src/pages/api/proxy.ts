import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const encoded = url.searchParams.get('url');
  if (!encoded) {
    return new Response('Missing proxied URL', { status: 400 });
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    return new Response('Invalid proxied URL', { status: 400 });
  }

  try {
    const targetUrl = new URL(decoded);
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
