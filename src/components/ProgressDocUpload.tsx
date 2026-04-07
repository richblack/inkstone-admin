// ProgressDocUpload.tsx — 共用型別、helpers、上傳/後處理/arrow 轉換邏輯（≤100行）

export interface Block { id: string; content: string; parent_id: string | null; page_name?: string | null; type?: string; created_at?: string; updated_at?: string; user_id?: string; }
export interface DocEntry { block: Block; depth: number; }
export interface DocDef { id: string; label: string; icon: string; }
export interface Triplet { id: string; subject: string; predicate: string; object: string; user_id?: string; }

export const PREDICATES = ['derives_from', 'relates_to', 'blocks', 'implements', 'refs'];
export const docCache = new Map<string, DocEntry[]>();

const KBDB_TOKEN = '6a1192da3be0f3a4b97148e730c8061cf6ee6c974f85dc35072ce97f3958fd3a';
const kbdbWrite = (b: unknown) => fetch('https://kbdb.finally.click/blocks/upsert', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KBDB_TOKEN}` }, body: JSON.stringify(b) });

export const parseArrowTriplet = (c: string) => { const p = c.split('>>').map(s => s.trim()); return (p.length >= 3 && p[0] && p[1] && p[2]) ? { subject: p[0], predicate: p[1], object: p[2] } : null; };
export const fmtTs = (iso?: string) => { if (!iso) return '—'; try { return new Date(iso).toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' }); } catch { return iso; } };
export const entriesToMd = (entries: DocEntry[]) => entries.filter(e => e.depth > 0 && (e.block.content ?? '').trim()).map(e => `${'  '.repeat(Math.max(0, e.depth - 1))}${e.block.content ?? ''}`).join('\n');

function parseMdLines(md: string) {
  return md.split('\n').reduce<Array<{ content: string; depth: number }>>((acc, raw) => {
    const t = raw.trimEnd(); if (!t) return acc;
    const depth = Math.round((raw.match(/^(\t|  )*/)?.[0] ?? '').split('').reduce((a, c) => a + (c === '\t' ? 1 : 0.5), 0));
    const content = t.replace(/^\s+/, '').replace(/^[-*]\s+/, '');
    if (content) acc.push({ content, depth }); return acc;
  }, []);
}

function buildPayload(lines: Array<{ content: string; depth: number }>, docId: string, label: string) {
  const stack: Array<{ depth: number; id: string }> = [{ depth: -1, id: docId }];
  const counts = new Map<string, number>();
  return lines.map((line, i) => {
    while (stack.length > 1 && stack[stack.length - 1].depth >= line.depth) stack.pop();
    const par = stack[stack.length - 1];
    const id = `admin-doc-${docId}-${i}`; const sort = counts.get(par.id) ?? 0; counts.set(par.id, sort + 1); stack.push({ depth: line.depth, id });
    return { content: line.content, logseq_uuid: id, parent_id: par.id, page_name: label, user_id: 'admin', sort_order: sort };
  });
}

async function batchUpsert(payload: ReturnType<typeof buildPayload>) {
  const CHUNK = 20;
  for (let i = 0; i < payload.length; i += CHUNK) {
    const chunk = payload.slice(i, i + CHUNK); let res = await kbdbWrite({ blocks: chunk });
    if (res.status === 503 || res.status === 524) { await new Promise(r => setTimeout(r, 2000)); res = await kbdbWrite({ blocks: chunk }); }
    if (!res.ok) throw new Error(await res.text()); await new Promise(r => setTimeout(r, 200));
  }
}

export async function handleAddDoc(file: File, onDone: (id: string, label: string) => void, onStatus: (s: string) => void) {
  const label = file.name.replace(/\.md$/i, ''); onStatus('上傳中…');
  try {
    const res = await fetch('/api/kbdb/blocks/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markdown: await file.text(), page_name: label, user_id: 'admin' }) });
    if (!res.ok) throw new Error(await res.text());
    const { root_id, count } = await res.json() as { root_id: string; count: number };
    onStatus(`✅ 完成（${count} 個 block），背景處理中…`); onDone(root_id, label);
    void (async () => { while (true) { try { const r = await fetch('/api/kbdb/blocks/process-page', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ root_id, user_id: 'admin', limit: 30 }) }); if ((await r.json() as { done: boolean }).done) break; } catch { break; } } })();
  } catch (err) { onStatus(`❌ ${String(err).slice(0, 80)}`); }
}

export async function processPage(docId: string, onStatus: (s: string) => void, setProcessing: (v: boolean) => void) {
  setProcessing(true); onStatus('準備中…'); let p = 0, t = 0;
  try {
    while (true) {
      const res = await fetch('/api/kbdb/blocks/process-page', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ root_id: docId, user_id: 'admin', limit: 20 }) });
      if (!res.ok) throw new Error(await res.text());
      const d = await res.json() as { done: boolean; processed: number; triplets: number; remaining: number };
      p += d.processed; t += d.triplets; onStatus(`embed: ${p}，三元組: ${t}，剩餘: ${d.remaining}…`); if (d.done) break;
    }
    onStatus(`✅ 完成：embed ${p}，三元組 ${t}`);
  } catch (err) { onStatus(`❌ ${String(err).slice(0, 60)}`); } finally { setProcessing(false); }
}

export async function convertArrowTriplets(docId: string, docLabel: string, onStatus: (s: string) => void, setConverting: (v: boolean) => void, onRefresh: () => void) {
  setConverting(true); onStatus('轉換中…'); let conv = 0, skip = 0, offset = 0;
  try {
    while (true) {
      const res = await fetch('/api/spec-sync/spec/convert-arrow-triplets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ root_id: docId, page_name: docLabel, offset, limit: 8 }) });
      const d = await res.json() as { converted: number; skipped: number; has_more?: boolean; error?: string };
      if (!res.ok) { onStatus(`❌ ${d.error ?? '失敗'}`); return; }
      conv += d.converted; skip += d.skipped;
      if (d.has_more) { offset += 50; onStatus(`轉換中… ${conv + skip}`); } else break;
    }
    onStatus(`✅ 轉換 ${conv}，跳過 ${skip}`); onRefresh();
  } catch (err) { onStatus(`❌ ${String(err).slice(0, 60)}`); } finally { setConverting(false); }
}

export async function saveFullEdit(docId: string, text: string, reloadDoc: (id: string) => Promise<void>, setS: (v: boolean) => void, setM: (v: boolean) => void, label: string) {
  setS(true);
  try {
    const lines = parseMdLines(text); if (!lines.length) { setM(false); return; }
    await batchUpsert(buildPayload(lines, docId, label)); docCache.delete(docId); await reloadDoc(docId); setM(false);
  } catch (err) { console.error(err); } finally { setS(false); }
}
