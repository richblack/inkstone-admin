// Cloudflare Pages Function — KBDB API Proxy
// token 存在 Pages 環境變數 KBDB_INTERNAL_TOKEN，不暴露前端

interface Env {
  KBDB_INTERNAL_TOKEN: string;
}

const KBDB_BASE = 'https://kbdb.finally.click';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  // 取出 /api/kbdb/ 之後的路徑
  const routeParts = params['route'] as string[] | undefined;
  const routePath = routeParts ? routeParts.join('/') : '';

  const originalUrl = new URL(request.url);
  const targetUrl = `${KBDB_BASE}/${routePath}${originalUrl.search}`;

  const upstream = new Request(targetUrl, {
    method: request.method,
    headers: {
      'Authorization': `Bearer ${env.KBDB_INTERNAL_TOKEN}`,
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
