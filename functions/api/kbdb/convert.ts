// Pages Function — PDF 非同步轉換 (ADR-021)
// POST /api/kbdb/convert — await daemon 回應，取 daemon job_id 再回給前端

const CONVERT_URL = 'https://cto.finally.click/convert';
const CALLBACK_URL = 'https://admin.finally.click/api/kbdb/convert/callback';

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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function onRequest(context: any) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: 'invalid_form_data' }, 400);
  }

  const file = formData.get('file') as File | null;
  if (!file) return json({ error: 'missing file' }, 400);

  const filename = file.name;

  const fileBuffer = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(fileBuffer);

  // await daemon 立即回應（202 + job_id），取 daemon 的 job_id 回給前端
  let daemonRes: Response;
  try {
    daemonRes = await fetch(CONVERT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: base64,
        filename,
        callback_url: CALLBACK_URL,
      }),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[convert] daemon fetch error:', msg);
    return json({ error: 'daemon_unreachable', detail: msg }, 502);
  }

  if (!daemonRes.ok) {
    const text = await daemonRes.text().catch(() => '');
    console.error('[convert] daemon error:', daemonRes.status, text);
    return json({ error: 'daemon_error', status: daemonRes.status, detail: text }, 502);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await daemonRes.json();
  } catch {
    return json({ error: 'daemon_invalid_response' }, 502);
  }

  const jobId = body.job_id;
  if (!jobId) {
    return json({ error: 'daemon_missing_job_id', body }, 502);
  }

  return json({ job_id: jobId }, 202);
}
