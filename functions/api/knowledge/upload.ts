// Pages Function: POST /api/knowledge/upload
// 接受 multipart/form-data，欄位：file、ghost_ids（JSON 陣列）
// 1. 送到 CTO convert server 轉成 Markdown
// 2. POST /blocks 存 Markdown 內容（owner_id = ghost_ids[0]）
// 3. 為每個 ghost_id POST /triplets：subject="{ghost_id}", predicate="擁有知識", object="{filename}|{block_id}"
// 4. 回傳 { ok, block_id, filename, preview, triplet_count }

interface Env {
  API_KEY: string;
  CTO_API_TOKEN: string;
}

const KBDB_BASE = 'https://kbdb.finally.click';
const CTO_CONVERT_URL = 'https://cto.finally.click/convert';
const ACCEPT_EXTS = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.md', '.txt', '.html']);

function getExt(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx).toLowerCase() : '';
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const fileEntry = formData.get('file');
  const ghostIdsRaw = formData.get('ghost_ids');

  if (!fileEntry || !(fileEntry instanceof File)) {
    return Response.json({ error: 'Missing file' }, { status: 400 });
  }
  if (!ghostIdsRaw || typeof ghostIdsRaw !== 'string') {
    return Response.json({ error: 'Missing ghost_ids' }, { status: 400 });
  }

  let ghostIds: string[];
  try {
    ghostIds = JSON.parse(ghostIdsRaw) as string[];
    if (!Array.isArray(ghostIds) || ghostIds.length === 0) throw new Error();
  } catch {
    return Response.json({ error: 'ghost_ids must be a non-empty JSON array' }, { status: 400 });
  }

  const filename = fileEntry.name;
  const ext = getExt(filename);
  if (!ACCEPT_EXTS.has(ext)) {
    return Response.json({ error: `Unsupported file type: ${ext}` }, { status: 400 });
  }

  // Step 1: Convert to Markdown via CTO convert server
  let markdown: string;
  try {
    const convertForm = new FormData();
    convertForm.append('file', fileEntry);

    const convertRes = await fetch(CTO_CONVERT_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.CTO_API_TOKEN}` },
      body: convertForm,
    });

    if (!convertRes.ok) {
      const err = await convertRes.text();
      return Response.json({ error: `Convert server failed: ${err}` }, { status: 502 });
    }

    const convertJson = await convertRes.json() as { markdown?: string; ok?: boolean };
    if (!convertJson.ok || !convertJson.markdown) {
      return Response.json({ error: 'Convert server returned empty result' }, { status: 502 });
    }
    markdown = convertJson.markdown;
  } catch (e) {
    return Response.json({ error: `Convert error: ${String(e)}` }, { status: 502 });
  }

  const kbdbHeaders = {
    'Authorization': `Bearer ${env.API_KEY}`,
    'Content-Type': 'application/json',
  };

  // Step 2: Store Markdown block in KBDB (owner = first ghost)
  let blockId: string;
  try {
    const blockRes = await fetch(`${KBDB_BASE}/blocks`, {
      method: 'POST',
      headers: kbdbHeaders,
      body: JSON.stringify({
        owner_id: ghostIds[0],
        content: markdown,
        content_type: 'knowledge',
        source: filename,
      }),
    });
    if (!blockRes.ok) {
      const err = await blockRes.text();
      return Response.json({ error: `KBDB /blocks failed: ${err}` }, { status: 502 });
    }
    const blockJson = await blockRes.json() as { id?: string };
    blockId = blockJson.id ?? crypto.randomUUID();
  } catch (e) {
    return Response.json({ error: `Block store error: ${String(e)}` }, { status: 502 });
  }

  // Step 3: Write one triplet per ghost — ghost_id --擁有知識--> filename|block_id
  const tripletResults = await Promise.allSettled(
    ghostIds.map(ghostId =>
      fetch(`${KBDB_BASE}/triplets`, {
        method: 'POST',
        headers: kbdbHeaders,
        body: JSON.stringify({
          subject: ghostId,
          predicate: '擁有知識',
          object: `${filename}|${blockId}`,
        }),
      })
    )
  );

  const succeeded = tripletResults.filter(r => r.status === 'fulfilled').length;

  return Response.json({
    ok: true,
    block_id: blockId,
    filename,
    preview: markdown.slice(0, 200),
    triplet_count: succeeded,
  });
};
