// Cloudflare Pages Function — u6u (Cypher Executor) API Proxy
// token 存在 Pages 環境變數 API_KEY，不暴露前端

interface Env {
  API_KEY: string;
}

const U6U_BASE = 'https://workflow.finally.click';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  // 取出 /api/u6u/ 之後的路徑
  const routeParts = params['route'] as string[] | undefined;
  const routePath = routeParts ? routeParts.join('/') : '';

  const originalUrl = new URL(request.url);
  const targetUrl = `${U6U_BASE}/${routePath}${originalUrl.search}`;

  const upstream = new Request(targetUrl, {
    method: request.method,
    headers: {
      'Authorization': `Bearer ${env.API_KEY ||  + fallbackToken + }`,
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
