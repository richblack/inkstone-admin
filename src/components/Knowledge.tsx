// Knowledge — Gmail 模型：左側文件列表 + 右側全文/擁有者/後處理
// 兼含 CeoKnowledgeTab（export 給其他頁面用）

import { useState, useEffect, useCallback } from 'react';

// ─── 型別 ────────────────────────────────────────────────────────

interface DocumentRecord {
  page_name: string;
  user_id: string;
  block_count: number;
  triplet_count: number;
  created_at: number;
}

interface BlockRecord {
  id: string;
  content: string;
  user_id: string;
  page_name: string;
  created_at: number;
}

// GhostRecord removed (unused)

interface IngestResult {
  blocks_injected: number;
  triplets_injected: number;
  total_triplets: number;
  warning?: string;
}

interface ProcessResult {
  processed: number;
  triplets: number;
  errors: number;
  remaining: number;
  done: boolean;
}

// ─── 6 階段上傳進度 ───────────────────────────────────────────────

const UPLOAD_STAGES = ['轉檔', '解析文字', '分塊處理', '寫入 Blocks', '建立向量索引', '萃取三元組', '完成'];
type StageStatus = 'pending' | 'active' | 'done' | 'error';

function StageProgress({ stages }: { stages: StageStatus[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {UPLOAD_STAGES.map((label, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
            stages[i] === 'done'   ? 'bg-emerald-500' :
            stages[i] === 'active' ? 'bg-blue-400 animate-pulse' :
            stages[i] === 'error'  ? 'bg-red-500' : 'bg-zinc-700'
          }`} />
          <span className={`text-[10px] ${
            stages[i] === 'done'   ? 'text-emerald-400' :
            stages[i] === 'active' ? 'text-blue-400' : 'text-zinc-600'
          }`}>{label}</span>
          {i < UPLOAD_STAGES.length - 1 && <span className="text-zinc-700 text-[10px]">→</span>}
        </div>
      ))}
    </div>
  );
}

// ─── PastePanel：貼上文字存入 KBDB ────────────────────────────────

function PastePanel({ onIngested, onClose }: { onIngested: () => void; onClose: () => void }) {
  const [userId, setUserId] = useState('');
  const [pageName, setPageName] = useState('');
  const [text, setText] = useState('');
  const [stages, setStages] = useState<StageStatus[]>(UPLOAD_STAGES.map(() => 'pending'));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const advance = (idx: number, status: StageStatus) =>
    setStages(prev => prev.map((s, i) => i === idx ? status : s));

  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  const handleSubmit = async () => {
    if (!userId.trim() || !text.trim()) return;
    setRunning(true);
    setResult(null);
    setStages(UPLOAD_STAGES.map(() => 'pending'));
    try {
      advance(0, 'active');
      await sleep(150);
      advance(0, 'done');

      advance(1, 'active');
      await sleep(200);
      advance(1, 'done');

      advance(2, 'active');
      const source = pageName.trim() || 'paste';
      const ingestRes = await kbdbFetch<IngestResult>('/blocks/ingest', {
        method: 'POST',
        body: JSON.stringify({ text: text.trim(), user_id: userId.trim(), source, page_name: source }),
      });
      advance(2, 'done');

      advance(3, 'active');
      advance(4, 'active');
      try {
        const rootId = `ingest-${userId.trim()}-${source}-0`;
        await kbdbFetch<ProcessResult>('/blocks/process-page', {
          method: 'POST',
          body: JSON.stringify({ root_id: rootId, user_id: userId.trim() }),
        });
      } catch { /* 後處理失敗不阻擋主流程 */ }
      advance(3, 'done');
      advance(4, 'done');
      advance(5, 'done');

      setResult({ ok: true, msg: `✅ 完成：寫入 ${ingestRes.blocks_injected} 個 block，萃取 ${ingestRes.triplets_injected} 條三元組` });
      setText('');
      onIngested();
    } catch (e) {
      setResult({ ok: false, msg: `❌ ${(e as Error).message}` });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">貼上知識文字</h3>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-sm leading-none">✕</button>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="User ID *"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
        />
        <input
          type="text"
          placeholder="文件名稱（選填）"
          value={pageName}
          onChange={e => setPageName(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
        />
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="貼入知識內容…"
        rows={4}
        disabled={running}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 resize-none disabled:opacity-60"
      />
      {running && <StageProgress stages={stages} />}
      {result && (
        <p className={`text-xs ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>{result.msg}</p>
      )}
      <button
        onClick={() => void handleSubmit()}
        disabled={!userId.trim() || !text.trim() || running}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors"
      >
        {running ? '上傳中…' : '存入 KBDB'}
      </button>
    </div>
  );
}

// ─── API helpers ─────────────────────────────────────────────────

async function kbdbFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`/api/kbdb${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

// 取得同一個 page_name 的所有不同 user_id（擁有者列表）
function getOwners(docs: DocumentRecord[], pageName: string): string[] {
  return docs.filter(d => d.page_name === pageName).map(d => d.user_id);
}

function avatarInitial(userId: string | null | undefined): string {
  return (userId || '?').charAt(0).toUpperCase();
}

// ─── 右側面板 ───────────────────────────────────────────────────

function DocumentDetailPanel({
  pageName,
  owners,
  allDocs,
  onClose,
}: {
  pageName: string;
  owners: string[];
  allDocs: DocumentRecord[];
  onClose: () => void;
}) {
  const [blocks, setBlocks] = useState<BlockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const loadBlocks = useCallback(async () => {
    setLoading(true);
    try {
      // 取得所有擁有者的 blocks（合併）
      const allBlocks: BlockRecord[] = [];
      await Promise.all(
        owners.map(async (uid) => {
          try {
            const res = await kbdbFetch<{ blocks: BlockRecord[] }>(
              `/blocks?page_name=${encodeURIComponent(pageName)}&user_id=${encodeURIComponent(uid)}&limit=200`
            );
            allBlocks.push(...(res.blocks ?? []));
          } catch { /* 靜默 */ }
        })
      );
      // 按 sort_order / id 排序
      allBlocks.sort((a, b) => a.id.localeCompare(b.id));
      setBlocks(allBlocks);
    } finally {
      setLoading(false);
    }
  }, [pageName, owners]);

  useEffect(() => { void loadBlocks(); }, [loadBlocks]);

  async function handleDeleteDocument() {
    if (blocks.length === 0) return;
    const confirmed = window.confirm(`確定要刪除「${pageName}」的所有 ${blocks.length} 個 blocks 嗎？此操作無法復原。`);
    if (!confirmed) return;
    setDeleting(true);
    setDeleteResult(null);
    let successCount = 0;
    let errorCount = 0;
    try {
      await Promise.allSettled(
        blocks.map(async (b) => {
          try {
            const res = await fetch(`/api/kbdb/blocks/${encodeURIComponent(b.id)}`, { method: 'DELETE' });
            if (res.ok) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch {
            errorCount++;
          }
        })
      );
      if (errorCount === 0) {
        setDeleteResult({ ok: true, msg: `已刪除 ${successCount} 個 blocks` });
        setBlocks([]);
        onClose();
      } else {
        setDeleteResult({ ok: false, msg: `刪除完成：成功 ${successCount}，失敗 ${errorCount}` });
        await loadBlocks();
      }
    } catch (e) {
      setDeleteResult({ ok: false, msg: `❌ 刪除失敗：${(e as Error).message}` });
    } finally {
      setDeleting(false);
    }
  }

  async function handleProcessPage() {
    if (blocks.length === 0) return;
    setProcessing(true);
    setProcessResult(null);
    try {
      // 取第一個 block 的 ID 作為 root_id
      const rootId = blocks[0].id;
      const userId = blocks[0].user_id;
      const res = await kbdbFetch<ProcessResult>('/blocks/process-page', {
        method: 'POST',
        body: JSON.stringify({ root_id: rootId, user_id: userId }),
      });
      setProcessResult({
        ok: true,
        msg: `✅ 後處理完成：處理 ${res.processed} 個 block，萃取 ${res.triplets} 條三元組${res.errors > 0 ? `，${res.errors} 個錯誤` : ''}`,
      });
    } catch (e) {
      setProcessResult({ ok: false, msg: `❌ 後處理失敗：${(e as Error).message}` });
    } finally {
      setProcessing(false);
    }
  }

  const totalBlocks = allDocs.filter(d => d.page_name === pageName).reduce((s, d) => s + d.block_count, 0);

  return (
    <div className="flex flex-col h-full">
      {/* 面板標題 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 truncate">{pageName}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{totalBlocks} blocks · {owners.length} 位擁有者</p>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 text-lg leading-none ml-3">×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* 擁有者列表 */}
        <section>
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">擁有者</h4>
          <div className="flex flex-wrap gap-2">
            {owners.map(uid => (
              <div key={uid} className="flex items-center gap-1.5 bg-zinc-800 rounded-full px-3 py-1">
                <div className="w-5 h-5 rounded-full bg-blue-700 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                  {avatarInitial(uid)}
                </div>
                <span className="text-xs text-zinc-300 truncate max-w-[120px]">{uid}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 後處理 */}
        <section>
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">後處理</h4>
          {processResult && (
            <p className={`text-xs mb-2 ${processResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>{processResult.msg}</p>
          )}
          <button
            onClick={() => void handleProcessPage()}
            disabled={processing || blocks.length === 0}
            className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-200 text-xs rounded-lg px-3 py-1.5 transition-colors"
          >
            {processing ? '處理中…' : '重新 Embed + 萃取三元組'}
          </button>
          <p className="text-[11px] text-zinc-600 mt-1">對本文件的第一個 block 執行 process-page（embedding + LLM 三元組萃取）</p>
        </section>

        {/* 刪除文件 */}
        <section>
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">刪除文件</h4>
          {deleteResult && (
            <p className={`text-xs mb-2 ${deleteResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>{deleteResult.msg}</p>
          )}
          <button
            onClick={() => void handleDeleteDocument()}
            disabled={deleting || blocks.length === 0}
            className="bg-red-900/60 hover:bg-red-800 disabled:opacity-50 text-red-200 text-xs rounded-lg px-3 py-1.5 transition-colors border border-red-800"
          >
            {deleting ? '刪除中…' : `刪除此文件所有 Blocks（${blocks.length} 個）`}
          </button>
          <p className="text-[11px] text-zinc-600 mt-1">刪除後無法復原，文件將從知識庫移除</p>
        </section>

        {/* 全文內容 */}
        <section>
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">全文</h4>
          {loading ? (
            <p className="text-zinc-600 text-xs animate-pulse">載入中…</p>
          ) : blocks.length === 0 ? (
            <p className="text-zinc-600 text-xs">無內容</p>
          ) : (
            <div className="space-y-2">
              {blocks.map(b => (
                <div key={b.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                  <p className="text-xs text-zinc-300 whitespace-pre-wrap">{b.content}</p>
                  <p className="text-[10px] text-zinc-700 mt-1">{b.user_id} · {formatDate(b.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── UploadPanel：拖拉上傳 PDF（非同步 webhook 模式）──────────────

const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.md', '.txt'];

function UploadPanel({ onIngested, onClose }: { onIngested: () => void; onClose: () => void }) {
  const [userId, setUserId] = useState('');
  const [pageName, setPageName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [stages, setStages] = useState<StageStatus[]>(UPLOAD_STAGES.map(() => 'pending'));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const advance = (idx: number, status: StageStatus) =>
    setStages(prev => prev.map((s, i) => i === idx ? status : s));

  const handleFile = (f: File) => {
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      setResult({ ok: false, msg: `❌ 不支援的格式：${ext}` });
      return;
    }
    setFile(f);
    setResult(null);
    if (!pageName) setPageName(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file || !userId.trim()) return;
    setRunning(true);
    setResult(null);
    setStages(UPLOAD_STAGES.map(() => 'pending'));

    try {
      // 階段 0：轉檔（發送到 Linode）
      advance(0, 'active');
      const form = new FormData();
      form.append('file', file);
      form.append('user_id', userId.trim());
      form.append('page_name', pageName.trim() || file.name.replace(/\.[^.]+$/, ''));

      const initRes = await fetch('/api/convert', { method: 'POST', body: form });
      if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({ error: `HTTP ${initRes.status}` })) as { error?: string };
        throw new Error(err.error ?? `HTTP ${initRes.status}`);
      }
      const { job_id } = await initRes.json() as { job_id: string };
      advance(0, 'done');

      // 階段 1-2：輪詢 Linode 處理中
      advance(1, 'active');
      const startTime = Date.now();
      const TIMEOUT = 5 * 60 * 1000; // 5 分鐘
      let done = false;

      while (!done) {
        if (Date.now() - startTime > TIMEOUT) throw new Error('轉換超時（5分鐘）');
        await new Promise<void>(r => setTimeout(r, 3000));

        const statusRes = await fetch(`/api/convert?job_id=${encodeURIComponent(job_id)}`);
        if (!statusRes.ok) continue;
        const status = await statusRes.json() as {
          status: string;
          error?: string;
          blocks_injected?: number;
          triplets_injected?: number;
        };

        if (status.status === 'error') {
          throw new Error(status.error ?? '轉換失敗');
        }

        if (status.status === 'done') {
          advance(1, 'done');
          advance(2, 'done');
          advance(3, 'done');
          advance(4, 'done');
          advance(5, 'done');
          setResult({
            ok: true,
            msg: `✅ 完成：寫入 ${status.blocks_injected ?? 0} 個 block，萃取 ${status.triplets_injected ?? 0} 條三元組`,
          });
          setFile(null);
          onIngested();
          done = true;
        }
        // pending：繼續輪詢
      }
    } catch (e) {
      const failIdx = stages.findIndex(s => s === 'active');
      if (failIdx >= 0) advance(failIdx, 'error');
      setResult({ ok: false, msg: `❌ ${(e as Error).message}` });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">上傳文件（PDF / DOCX 等）</h3>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-sm leading-none">✕</button>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="User ID *"
          value={userId}
          onChange={e => setUserId(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
        />
        <input
          type="text"
          placeholder="文件名稱（選填）"
          value={pageName}
          onChange={e => setPageName(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* 拖拉區 */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => { if (!running) document.getElementById('upload-file-input')?.click(); }}
        className={`border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-950/20' :
          file ? 'border-emerald-700 bg-emerald-950/10' : 'border-zinc-700 hover:border-zinc-500'
        }`}
      >
        <input
          id="upload-file-input"
          type="file"
          accept={ALLOWED_EXTS.join(',')}
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {file ? (
          <p className="text-xs text-emerald-400">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
        ) : (
          <p className="text-xs text-zinc-500">拖拉檔案到此，或點擊選擇<br /><span className="text-zinc-700">{ALLOWED_EXTS.join(' ')}</span></p>
        )}
      </div>

      {running && <StageProgress stages={stages} />}
      {running && <p className="text-xs text-zinc-500 animate-pulse">Linode 轉換中，每 3 秒輪詢狀態…</p>}
      {result && (
        <p className={`text-xs ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>{result.msg}</p>
      )}
      <button
        onClick={() => void handleSubmit()}
        disabled={!file || !userId.trim() || running}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors"
      >
        {running ? '處理中…' : '上傳並注入 KBDB'}
      </button>
    </div>
  );
}

// ─── 主元件：Gmail 模型 ───────────────────────────────────────────

function KnowledgeDocList() {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await kbdbFetch<{ documents: DocumentRecord[] }>('/blocks/documents?limit=200');
      setDocs(res.documents ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDocs(); }, [loadDocs]);

  // 按 page_name 聚合（合併不同 user_id 的同名文件）
  const pageGroups = new Map<string, DocumentRecord[]>();
  for (const d of docs) {
    const arr = pageGroups.get(d.page_name) ?? [];
    arr.push(d);
    pageGroups.set(d.page_name, arr);
  }

  const filteredPages = [...pageGroups.entries()].filter(([name]) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOwners = selectedPage ? getOwners(docs, selectedPage) : [];

  return (
    <div className="flex h-full gap-0 min-h-0">
      {/* ══ 左側文件列表 ══ */}
      <div className={`flex flex-col border-r border-zinc-800 flex-shrink-0 ${selectedPage ? 'w-80' : 'flex-1'} min-w-0`}>
        {/* 標題列 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">知識文件</h2>
            <p className="text-xs text-zinc-600">{filteredPages.length} 份文件</p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => { setShowPaste(v => !v); setShowUpload(false); }}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${showPaste ? 'bg-blue-700 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'}`}>
              貼上
            </button>
            <button
              onClick={() => { setShowUpload(v => !v); setShowPaste(false); }}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${showUpload ? 'bg-blue-700 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'}`}>
              上傳
            </button>
            <button onClick={() => void loadDocs()}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded-lg transition-colors">重整</button>
          </div>
        </div>

        {/* 貼上面板 */}
        {showPaste && (
          <PastePanel
            onIngested={() => { void loadDocs(); setShowPaste(false); }}
            onClose={() => setShowPaste(false)}
          />
        )}

        {/* 上傳面板 */}
        {showUpload && (
          <UploadPanel
            onIngested={() => { void loadDocs(); setShowUpload(false); }}
            onClose={() => setShowUpload(false)}
          />
        )}

        {/* 搜尋 */}
        <div className="px-3 py-2 border-b border-zinc-800 flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋文件名稱…"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="mx-3 mt-2 text-red-400 text-xs bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</div>
        )}

        {/* 文件列表 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-zinc-600 text-xs px-4 py-3 animate-pulse">載入中…</p>
          ) : filteredPages.length === 0 ? (
            <p className="text-zinc-600 text-xs px-4 py-3">尚無文件</p>
          ) : (
            <ul className="divide-y divide-zinc-800/50">
              {filteredPages.map(([pageName, group]) => {
                const totalBlocks = group.reduce((s, d) => s + d.block_count, 0);
                const owners = group.map(d => d.user_id);
                const latestTs = Math.max(...group.map(d => d.created_at));
                return (
                  <li key={pageName}>
                    <button
                      onClick={() => setSelectedPage(prev => prev === pageName ? null : pageName)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                        selectedPage === pageName
                          ? 'bg-blue-900/30 border-l-2 border-blue-500'
                          : 'hover:bg-zinc-900/40 border-l-2 border-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-200 truncate">{pageName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {/* 擁有者頭像列 */}
                          <div className="flex -space-x-1">
                            {owners.slice(0, 3).map(uid => (
                              <div key={uid} title={uid}
                                className="w-4 h-4 rounded-full bg-blue-700 flex items-center justify-center text-[8px] font-bold text-white border border-zinc-900">
                                {avatarInitial(uid)}
                              </div>
                            ))}
                            {owners.length > 3 && (
                              <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] text-zinc-300 border border-zinc-900">
                                +{owners.length - 3}
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-600">{totalBlocks} blocks</span>
                          <span className="text-[11px] text-zinc-700">{formatDate(latestTs)}</span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ══ 右側文件詳細面板 ══ */}
      {selectedPage && (
        <div className="flex-1 min-w-0 bg-zinc-950">
          <DocumentDetailPanel
            pageName={selectedPage}
            owners={selectedOwners}
            allDocs={docs}
            onClose={() => setSelectedPage(null)}
          />
        </div>
      )}
    </div>
  );
}

// ─── CEO 知識庫（保留給其他頁面用）────────────────────────────────

interface CeoTriplet {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  created_at?: number | string;
}

type CeoSection = 'triggers' | 'deploys' | 'lessons';

const SECTION_CONFIG = {
  triggers: { label: '感知規則',       predicate: '感知規則',      user_id: 'ceo-claude', limit: 30 },
  deploys:  { label: '最近部署記錄',   predicate: '部署完成',       user_id: 'ceo-claude', limit: 20 },
  lessons:  { label: 'Lesson Learned', predicate: 'lesson-learned', user_id: 'ceo-claude', limit: 30 },
} as const;

async function fetchCeoTriplets(predicate: string, limit: number, user_id?: string): Promise<CeoTriplet[]> {
  const params = new URLSearchParams({ predicate, limit: String(limit) });
  if (user_id) params.set('user_id', user_id);
  const res = await fetch(`/api/kbdb/triplets?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json() as unknown;
  if (data && typeof data === 'object' && 'triplets' in data) {
    return (data as { triplets: CeoTriplet[] }).triplets.filter(t => t.object?.trim());
  }
  return [];
}

function formatDateStr(ts: number | string) {
  if (!ts) return '';
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
  return d.toISOString().slice(0, 10);
}

function parseDeployCommit(object: string): string {
  const m = object.match(/commit:\s*([a-f0-9]{6,10})/i);
  return m ? m[1] : '—';
}

function parseDeployTarget(object: string, subject: string): string {
  const knownTargets = ['admin', 'kbdb', 'matchgpt', 'mini-me-pwa', 'mini-me', 'aiceo-bot', 'mcp-squad'];
  const haystack = `${subject} ${object}`.toLowerCase();
  for (const t of knownTargets) {
    if (haystack.includes(t)) return t;
  }
  return subject.split('-').slice(0, 2).join('-') || subject;
}

export function CeoKnowledgeTab() {
  const [section, setSection] = useState<CeoSection>('triggers');
  const [tripletData, setTripletData] = useState<Record<CeoSection, CeoTriplet[]>>({
    triggers: [], deploys: [], lessons: [],
  });
  const [loadingSection, setLoadingSection] = useState<Record<CeoSection, boolean>>({
    triggers: false, deploys: false, lessons: false,
  });
  const [errors, setErrors] = useState<Record<CeoSection, string>>({
    triggers: '', deploys: '', lessons: '',
  });
  const loaded = new Set<CeoSection>();

  const load = async (s: CeoSection) => {
    if (loaded.has(s)) return;
    setLoadingSection(prev => ({ ...prev, [s]: true }));
    try {
      const cfg = SECTION_CONFIG[s];
      const triplets = await fetchCeoTriplets(cfg.predicate, cfg.limit, cfg.user_id);
      setTripletData(prev => ({ ...prev, [s]: triplets }));
      loaded.add(s);
    } catch (e) {
      setErrors(prev => ({ ...prev, [s]: e instanceof Error ? e.message : '載入失敗' }));
    } finally {
      setLoadingSection(prev => ({ ...prev, [s]: false }));
    }
  };

  useEffect(() => { void load('triggers'); }, []);

  const handleSection = (s: CeoSection) => {
    setSection(s);
    void load(s);
  };

  const sections = Object.keys(SECTION_CONFIG) as CeoSection[];
  const currentTriplets = tripletData[section] ?? [];

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 w-fit">
        {sections.map(s => (
          <button key={s} onClick={() => handleSection(s)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              section === s ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}>
            {SECTION_CONFIG[s].label}
          </button>
        ))}
      </div>

      {loadingSection[section] && <p className="text-zinc-500 text-sm">載入中…</p>}
      {errors[section] && <p className="text-red-400 text-sm">{errors[section]}</p>}
      {!loadingSection[section] && !errors[section] && currentTriplets.length === 0 && (
        <p className="text-zinc-600 text-sm">無資料</p>
      )}

      {section === 'triggers' && currentTriplets.map((t, i) => (
        <div key={t.id ?? i} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 space-y-1">
          <code className="text-xs font-mono text-amber-400">{t.subject}</code>
          <p className="text-sm text-zinc-200">{t.object}</p>
        </div>
      ))}

      {section === 'deploys' && currentTriplets.length > 0 && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">Target</th>
              <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">Commit</th>
              <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wide">摘要</th>
              <th className="text-left py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">時間</th>
            </tr>
          </thead>
          <tbody>
            {currentTriplets.map((t, i) => (
              <tr key={t.id ?? i} className="border-b border-zinc-800/50 hover:bg-zinc-900/40">
                <td className="py-2 pr-4"><code className="text-xs text-blue-400">{parseDeployTarget(t.object, t.subject)}</code></td>
                <td className="py-2 pr-4"><code className="text-xs font-mono text-emerald-400">{parseDeployCommit(t.object)}</code></td>
                <td className="py-2 pr-4 text-xs text-zinc-400 max-w-xs truncate">
                  {t.object.replace(/commit:\s*[a-f0-9]+/i, '').replace(/time:\s*\S+/i, '').replace(/target:\s*\S+/i, '').trim().slice(0, 80)}
                </td>
                <td className="py-2 text-xs text-zinc-600 whitespace-nowrap">{t.created_at ? formatDateStr(t.created_at) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {section === 'lessons' && currentTriplets.map((t, i) => (
        <div key={t.id ?? i} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 space-y-1">
          {t.created_at && <span className="text-[11px] text-zinc-600">{formatDateStr(t.created_at)}</span>}
          <p className="text-sm text-zinc-200">{t.object}</p>
        </div>
      ))}
    </div>
  );
}

// ─── 主元件 ───────────────────────────────────────────────────────

export default function Knowledge() {
  return <KnowledgeDocList />;
}
