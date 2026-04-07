// Pages Function — PDF 非同步轉換 (ADR-021)
// POST /api/convert — 收 PDF，轉發 Linode，立即回 202 + job_id
// GET  /api/convert?job_id=xxx — 輪詢轉換狀態（讀 KBDB block）

const KBDB_BASE = 'https://kbdb.finally.click';
const CONVERT_URL = 'https://cto.finally.click/convert';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function safeSlug(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function jobBlockId(jobId: string): Promise<string> {
  const slug = await safeSlug(`convert-job-${jobId}`);
  return `ingest-system-${slug}-0`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function onRequest(context: any) {
  const { request, env } = context;
  const KBDB_TOKEN = env.API_KEY;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  // ── GET：輪詢狀態 ───────────────────────────────────────────────
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('job_id');
    if (!jobId) return json({ error: 'missing job_id' }, 400);

    const blockId = await jobBlockId(jobId);
    const res = await fetch(`${KBDB_BASE}/blocks/${encodeURIComponent(blockId)}`, {
      headers: { Authorization: `Bearer ${KBDB_TOKEN}` },
    });
    if (res.status === 404) return json({ status: 'not_found' }, 404);
    if (!res.ok) return json({ error: 'kbdb_error', status_code: res.status }, 502);

    const block = await res.json() as { content?: string };
    try {
      const meta = JSON.parse(block.content ?? '{}');
      return json(meta);
    } catch {
      return json({ status: 'unknown' });
    }
  }

  // ── POST：接收 PDF，轉發 Linode ─────────────────────────────────
  if (request.method === 'POST') {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return json({ error: 'invalid_form_data' }, 400);
    }

    const file = formData.get('file') as File | null;
    const userId = (formData.get('user_id') as string | null)?.trim();
    const pageName = (formData.get('page_name') as string | null)?.trim();

    if (!file) return json({ error: 'missing file' }, 400);
    if (!userId) return json({ error: 'missing user_id' }, 400);

    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const origin = new URL(request.url).origin;
    const callbackUrl = `${origin}/api/convert/callback?job_id=${jobId}`;
    const filename = file.name;
    const source = pageName || filename.replace(/\.[^.]+$/, '');

    // 1. 寫入 KBDB 初始 job 狀態
    await fetch(`${KBDB_BASE}/blocks/ingest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KBDB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: JSON.stringify({ status: 'pending', user_id: userId, page_name: source, filename }),
        user_id: 'system',
        source: `convert-job-${jobId}`,
        page_name: 'convert-jobs',
      }),
    });

    // 2. 非同步轉發到 Linode（fire and forget）
    const upstream = new FormData();
    upstream.append('file', file);
    upstream.append('callback_url', callbackUrl);

    context.waitUntil(
      fetch(CONVERT_URL, {
        method: 'POST',
        body: upstream,
      }).catch((e: Error) => console.error('[convert] upstream error:', e.message))
    );

    return json({ job_id: jobId, status: 'pending', callback_url: callbackUrl }, 202);
  }

  return json({ error: 'method_not_allowed' }, 405);
}
