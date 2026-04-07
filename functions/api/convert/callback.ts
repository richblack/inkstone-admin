// Pages Function — PDF 轉換 Callback (ADR-021)
// POST /api/convert/callback?job_id=xxx
// Linode cc-daemon 完成後呼叫此端點，注入 markdown 到 KBDB

const KBDB_BASE = 'https://kbdb.finally.click';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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

async function updateJobStatus(jobId: string, meta: Record<string, unknown>) {
  await fetch(`${KBDB_BASE}/blocks/ingest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KBDB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: JSON.stringify(meta),
      user_id: 'system',
      source: `convert-job-${jobId}`,
      page_name: 'convert-jobs',
    }),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function onRequestPost(context: any) {
  const { request, env } = context;
  const KBDB_TOKEN = env.API_KEY;
  const url = new URL(request.url);
  const jobId = url.searchParams.get('job_id');

  if (!jobId) return json({ error: 'missing job_id' }, 400);

  // 讀取 Linode 回傳的 JSON
  let body: { status: string; markdown?: string; filename?: string; error?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  // 讀取原始 job meta（取得 user_id, page_name）
  const blockId = await jobBlockId(jobId);
  const blockRes = await fetch(`${KBDB_BASE}/blocks/${encodeURIComponent(blockId)}`, {
    headers: { Authorization: `Bearer ${KBDB_TOKEN}` },
  });

  if (!blockRes.ok) {
    return json({ error: 'job_not_found' }, 404);
  }

  const block = await blockRes.json() as { content?: string };
  let jobMeta: { user_id?: string; page_name?: string; filename?: string; status?: string } = {};
  try {
    jobMeta = JSON.parse(block.content ?? '{}');
  } catch { /* 繼續處理 */ }

  // 失敗時更新狀態
  if (body.status !== 'done') {
    await updateJobStatus(jobId, {
      ...jobMeta,
      status: 'error',
      error: body.error ?? body.status ?? 'conversion failed',
    });
    return json({ ok: false, error: body.error });
  }

  const userId = jobMeta.user_id ?? 'unknown';
  const pageName = jobMeta.page_name ?? (body.filename ?? 'upload').replace(/\.[^.]+$/, '');
  const markdown = body.markdown ?? '';

  // 注入 markdown 到 KBDB
  let ingestResult: { blocks_injected?: number; triplets_injected?: number } = {};
  try {
    const ingestRes = await fetch(`${KBDB_BASE}/blocks/ingest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KBDB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: markdown,
        user_id: userId,
        source: pageName,
        page_name: pageName,
      }),
    });
    if (ingestRes.ok) {
      ingestResult = await ingestRes.json() as typeof ingestResult;
    }
  } catch (e) {
    await updateJobStatus(jobId, {
      ...jobMeta,
      status: 'error',
      error: `ingest failed: ${(e as Error).message}`,
    });
    return json({ ok: false, error: 'ingest failed' }, 500);
  }

  // 更新 job 狀態為 done
  await updateJobStatus(jobId, {
    ...jobMeta,
    status: 'done',
    blocks_injected: ingestResult.blocks_injected ?? 0,
    triplets_injected: ingestResult.triplets_injected ?? 0,
  });

  return json({
    ok: true,
    job_id: jobId,
    blocks_injected: ingestResult.blocks_injected ?? 0,
    triplets_injected: ingestResult.triplets_injected ?? 0,
  });
}
