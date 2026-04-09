// Cloudflare Pages Function — Component Registry API Proxy
// 注入 API_KEY 並轉發到 registry.finally.click

interface Env {
  API_KEY: string;
}

const REGISTRY_BASE = 'https://registry.finally.click';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  const routeParts = params['route'] as string[] | undefined;
  const routePath = routeParts ? routeParts.join('/') : '';

  const originalUrl = new URL(request.url);
  const targetUrl = `${REGISTRY_BASE}/${routePath}${originalUrl.search}`;

  const upstream = new Request(targetUrl, {
    method: request.method,
    headers: {
      'Authorization': `Bearer ${env.API_KEY ?? ''}`,
      'Content-Type': request.headers.get('Content-Type') ?? 'application/json',
    },
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  });

  const res = await fetch(upstream);

  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
