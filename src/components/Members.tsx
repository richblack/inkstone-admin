// Members — 統一成員管理（Outlook 雙軸：左側列表 + 右側詳細面板）
// 右側面板含：基本資料、知識清單、知識上傳

import { useState, useEffect, useCallback, useRef } from 'react';

interface RealUser {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  gender: string | null;
  seeking_gender: string | null;
  line_uid: string | null;
  event_count: number;
  created_at: string;
}

interface MatchRecord {
  match_id: string;
  status: string;
  score: number | null;
  matched_at: string;
  event_id: string;
  event_name: string;
  event_slug: string;
  event_type: string;
  ghost_id: string;
  ghost_name: string | null;
  ghost_email: string;
  msg_count: number;
  last_msg_at: string | null;
}

interface MemberInteractions {
  user: {
    id: string; email: string; display_name: string | null;
    role: string; gender: string | null; seeking_gender: string | null;
    line_uid: string | null; created_at: string;
  };
  matches: MatchRecord[];
  last_interaction_at: string | null;
  total_analytics_events: number;
}

interface Ghost {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  personality_prompt: string | null;
  participate_in_matching: number;
  is_active: number;
  created_at: string;
}

interface EventInfo {
  id: string;
  slug: string;
  name: string;
  type: string;
}

interface EventMember {
  id: string;
  display_name: string | null;
  role: string;
  is_bot: boolean | number;
}

type MemberType = 'real' | 'ghost';

interface Member {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  gender?: string | null;
  seeking_gender?: string | null;
  event_count?: number;
  created_at: string;
  memberType: MemberType;
  avatar_url?: string | null;
  personality_prompt?: string | null;
  participate_in_matching?: number;
  is_active?: number;
  events?: string[];
}

interface DocumentRecord {
  page_name: string;
  user_id: string;
  block_count: number;
  triplet_count: number;
  created_at: number;
}

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

type StageStatus = 'pending' | 'active' | 'done' | 'error';
const UPLOAD_STAGES = ['轉檔', '解析文字', '分塊處理', '寫入 Blocks', '建立向量索引', '萃取三元組', '完成'];

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

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

interface EditState {
  display_name: string;
  personality_prompt: string;
  participate_in_matching: boolean;
  is_active: boolean;
}

async function mgFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`/api/matchgpt${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

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

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const ts = /^\d+$/.test(dateStr) ? Number(dateStr) * 1000 : new Date(dateStr).getTime();
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 60) return '剛剛';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} 天前`;
  if (diff < 86400 * 365) return `${Math.floor(diff / 86400 / 30)} 個月前`;
  return `${Math.floor(diff / 86400 / 365)} 年前`;
}

function initials(m: Member) {
  return (m.display_name ?? m.email).charAt(0).toUpperCase();
}

// ─── 右側面板：知識上傳區塊 ──────────────────────────────────────

function MemberKnowledgeUpload({ memberId, onUploaded }: { memberId: string; onUploaded: () => void }) {
  const [text, setText] = useState('');
  const [pageName, setPageName] = useState('');
  const [running, setRunning] = useState(false);
  const [stages, setStages] = useState<StageStatus[]>(UPLOAD_STAGES.map(() => 'pending'));
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const advance = (idx: number, status: StageStatus) =>
    setStages(prev => prev.map((s, i) => i === idx ? status : s));
  const reset = () => setStages(UPLOAD_STAGES.map(() => 'pending'));

  const runIngest = async (content: string, pName: string) => {
    advance(1, 'active'); await sleep(100); advance(1, 'done');
    advance(2, 'active'); await sleep(150); advance(2, 'done');

    advance(3, 'active');
    const res = await kbdbFetch<IngestResult>('/blocks/ingest', {
      method: 'POST',
      body: JSON.stringify({ text: content, user_id: memberId, source: pName, page_name: pName }),
    });
    advance(3, 'done');

    advance(4, 'active'); advance(5, 'active');
    try {
      await kbdbFetch<ProcessResult>('/blocks/process-page', {
        method: 'POST',
        body: JSON.stringify({ root_id: `ingest-${memberId}-${pName}-0`, user_id: memberId }),
      });
    } catch { /* 後處理失敗不阻擋主流程 */ }
    advance(4, 'done'); advance(5, 'done'); advance(6, 'done');
    return res;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const isBinary = /\.(pdf|docx|pptx|xlsx|doc|ppt|xls)$/i.test(file.name);
      const isText = /\.(txt|md)$/i.test(file.name);
      if (!isBinary && !isText) {
        setResult({ ok: false, msg: `❌ 不支援的檔案類型：${file.name}` });
        continue;
      }
      setRunning(true);
      setResult(null);
      reset();
      try {
        let content: string;
        if (isBinary) {
          advance(0, 'active');
          const formData = new FormData();
          formData.append('file', file, file.name);
          let submitRes: Response;
          try {
            submitRes = await fetch('/api/kbdb/convert', { method: 'POST', body: formData });
          } catch {
            throw new Error('PDF 轉換服務暫時無法連線，請改用 TXT 或 MD 格式');
          }
          if (!submitRes.ok) throw new Error(`轉換提交失敗 HTTP ${submitRes.status}`);
          const submitData = await submitRes.json() as { job_id?: string; success?: boolean; markdown?: string; error?: string };

          // 同步回傳（舊 API）
          if (submitData.success !== undefined && !submitData.job_id) {
            if (!submitData.success) throw new Error(submitData.error ?? '轉換失敗');
            content = submitData.markdown ?? '';
            advance(0, 'done');
          } else {
            // 非同步回傳（新 API）：輪詢 status
            const jobId = submitData.job_id;
            if (!jobId) throw new Error('轉換服務回傳格式異常');
            const MAX_POLLS = 60; // 最多 120 秒
            let markdown = '';
            for (let i = 0; i < MAX_POLLS; i++) {
              await sleep(2000);
              const statusRes = await fetch(`/api/kbdb/convert/status?job_id=${encodeURIComponent(jobId)}`);
              if (!statusRes.ok) throw new Error(`查詢轉換狀態失敗 HTTP ${statusRes.status}`);
              const statusData = await statusRes.json() as { status: string; markdown?: string; error?: string };
              if (statusData.status === 'done') {
                markdown = statusData.markdown ?? '';
                break;
              }
              if (statusData.status === 'error') {
                throw new Error(statusData.error ?? '轉換失敗');
              }
              // status === 'pending' | 'processing'：繼續等待
            }
            if (!markdown) throw new Error('轉換超時，請稍後再試');
            content = markdown;
            advance(0, 'done');
          }
        } else {
          advance(0, 'done');
          content = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as string);
            reader.onerror = () => rej(new Error('讀取失敗'));
            reader.readAsText(file, 'utf-8');
          });
        }
        if (content.trim()) {
          const pName = pageName || file.name.replace(/\.[^.]+$/, '');
          const res = await runIngest(content.trim(), pName);
          if (res.blocks_injected === 0) throw new Error('blocks_injected = 0，請確認 token 設定');
          setResult({ ok: true, msg: `✅ 完成：寫入 ${res.blocks_injected} blocks，${res.triplets_injected} 條三元組` });
          setPageName('');
          onUploaded();
        }
      } catch (e) {
        setStages(prev => prev.map(s => s === 'active' ? 'error' : s));
        setResult({ ok: false, msg: `❌ ${file.name}：${(e as Error).message}` });
      } finally {
        setRunning(false);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTextSubmit = async () => {
    if (!text.trim()) return;
    setRunning(true);
    setResult(null);
    reset();
    advance(0, 'done'); // 文字不需要轉檔
    try {
      const pName = pageName || 'admin-upload';
      const res = await runIngest(text.trim(), pName);
      if (res.blocks_injected === 0) throw new Error('blocks_injected = 0，請確認 token 設定');
      setResult({ ok: true, msg: `✅ 完成：寫入 ${res.blocks_injected} blocks，${res.triplets_injected} 條三元組` });
      setText('');
      setPageName('');
      onUploaded();
    } catch (e) {
      setStages(prev => prev.map(s => s === 'active' ? 'error' : s));
      setResult({ ok: false, msg: `❌ ${(e as Error).message}` });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="文件名稱（選填）"
        value={pageName}
        onChange={e => setPageName(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
      />
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="貼入知識內容…"
        rows={3}
        disabled={running}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 resize-none disabled:opacity-60"
      />
      {running && <StageProgress stages={stages} />}
      {result && (
        <p className={`text-xs ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>{result.msg}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => void handleTextSubmit()}
          disabled={!text.trim() || running}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors whitespace-nowrap"
        >
          {running ? '上傳中…' : '存入 KBDB'}
        </button>
        <div
          onDrop={e => { e.preventDefault(); void handleFiles(e.dataTransfer.files); }}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 border border-dashed border-zinc-700 rounded-lg px-2 py-1.5 text-center cursor-pointer hover:border-zinc-500 transition-colors"
        >
          <span className="text-zinc-600 text-xs">拖放或點擊上傳 PDF / DOCX / TXT / MD</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.docx,.pptx,.xlsx"
            multiple
            className="hidden"
            onChange={e => void handleFiles(e.target.files)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── 右側面板：成員詳細資訊 ────────────────────────────────────────

function MemberDetailPanel({
  member,
  events,
  ghosts,
  onClose,
  onReload,
}: {
  member: Member;
  events: EventInfo[];
  ghosts: Member[];
  onClose: () => void;
  onReload: () => void;
}) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditState>({
    display_name: member.display_name ?? '',
    personality_prompt: member.personality_prompt ?? '',
    participate_in_matching: member.participate_in_matching === 1,
    is_active: member.is_active !== 0,
  });
  const [saving, setSaving] = useState(false);
  const [addingToEvent, setAddingToEvent] = useState(false);
  const [addEventSlug, setAddEventSlug] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  // M1–M4 互動狀態
  const [interactions, setInteractions] = useState<MemberInteractions | null>(null);
  const [interactionsLoading, setInteractionsLoading] = useState(false);

  // M5 Assign Ghost
  const [showAssign, setShowAssign] = useState(false);
  const [assignGhostId, setAssignGhostId] = useState('');
  const [assignEventId, setAssignEventId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const loadInteractions = useCallback(async () => {
    if (member.memberType !== 'real') return;
    setInteractionsLoading(true);
    try {
      const res = await mgFetch<MemberInteractions>(`/users/admin/members/${member.id}/interactions`);
      setInteractions(res);
    } catch { /* 靜默 */ }
    finally { setInteractionsLoading(false); }
  }, [member.id, member.memberType]);

  useEffect(() => { void loadInteractions(); }, [loadInteractions]);

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await kbdbFetch<{ documents: DocumentRecord[] }>(`/blocks/documents?user_id=${encodeURIComponent(member.id)}`);
      setDocuments(res.documents ?? []);
    } catch { /* 靜默 */ } finally {
      setDocsLoading(false);
    }
  }, [member.id]);

  useEffect(() => { void loadDocs(); }, [loadDocs]);

  async function handleSave() {
    setSaving(true);
    try {
      await mgFetch(`/admin/ghosts/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          display_name: editForm.display_name || null,
          personality_prompt: editForm.personality_prompt || null,
          participate_in_matching: editForm.participate_in_matching,
          is_active: editForm.is_active,
        }),
      });
      setEditing(false);
      onReload();
    } catch (e) { alert(`儲存失敗：${(e as Error).message}`); }
    finally { setSaving(false); }
  }

  async function handleAddToEvent() {
    if (!addEventSlug) return;
    try {
      await mgFetch(`/events/${addEventSlug}/members/add`, {
        method: 'POST',
        body: JSON.stringify({ user_id: member.id }),
      });
      setAddingToEvent(false);
      setAddEventSlug('');
      onReload();
    } catch (e) { alert(`加入失敗：${(e as Error).message}`); }
  }

  async function handleAssignGhost() {
    if (!assignGhostId || !assignEventId) return;
    setAssigning(true);
    try {
      const res = await mgFetch<{ message: string }>(`/users/admin/members/${member.id}/assign-ghost`, {
        method: 'POST',
        body: JSON.stringify({ ghost_id: assignGhostId, event_id: assignEventId }),
      });
      alert(res.message);
      setShowAssign(false);
      setAssignGhostId('');
      setAssignEventId('');
      void loadInteractions();
    } catch (e) { alert(`指派失敗：${(e as Error).message}`); }
    finally { setAssigning(false); }
  }

  const name = member.display_name ?? member.email.split('@')[0];

  return (
    <div className="flex flex-col h-full">
      {/* 面板標題 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-300 flex-shrink-0 overflow-hidden">
            {member.memberType === 'ghost' && member.avatar_url
              ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
              : initials(member)
            }
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100">{name}</div>
            <div className="text-xs text-zinc-500">{member.email}</div>
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 text-lg leading-none">×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* 基本資料 */}
        <section>
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">基本資料</h4>
          <div className="space-y-1">
            <div className="flex gap-2 flex-wrap">
              {member.memberType === 'real' ? (
                <span className="text-xs text-green-400 bg-green-900/30 rounded px-1.5 py-0.5">真人</span>
              ) : (
                <span className="text-xs text-purple-400 bg-purple-900/30 rounded px-1.5 py-0.5">Ghost</span>
              )}
              {member.role === 'admin' && (
                <span className="text-xs text-red-400 bg-red-900/30 rounded px-1.5 py-0.5">Admin</span>
              )}
              {member.memberType === 'ghost' && member.is_active === 0 && (
                <span className="text-xs text-zinc-600 bg-zinc-800 rounded px-1.5 py-0.5">停用</span>
              )}
            </div>
            {member.gender && <p className="text-xs text-zinc-400">性別：{member.gender}</p>}
            {member.seeking_gender && <p className="text-xs text-zinc-400">尋找：{member.seeking_gender}</p>}
            <p className="text-xs text-zinc-500">{relativeTime(member.created_at)} 註冊</p>
            {/* M1: LINE ID */}
            {interactions?.user?.line_uid && (
              <p className="text-xs text-zinc-400">LINE：<span className="text-green-400 font-mono">{interactions.user.line_uid}</span></p>
            )}
            {/* M1: 最後互動時間 */}
            {interactions?.last_interaction_at && (
              <p className="text-xs text-zinc-400">最後互動：{relativeTime(interactions.last_interaction_at)}</p>
            )}
            {member.memberType === 'ghost' && member.personality_prompt && (
              <p className="text-xs text-zinc-400 bg-zinc-800/60 rounded-lg px-3 py-2 mt-1">{member.personality_prompt}</p>
            )}
            {(member.events ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {(member.events ?? []).map(slug => (
                  <span key={slug} className="text-xs text-zinc-400 bg-zinc-800 rounded px-1.5 py-0.5">{slug}</span>
                ))}
              </div>
            )}
          </div>

          {/* Ghost 快速操作 */}
          {member.memberType === 'ghost' && !editing && (
            <div className="flex gap-2 mt-2 flex-wrap">
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-2.5 py-1.5 transition-colors"
              >編輯人設</button>
              {addingToEvent ? (
                <div className="flex gap-1 items-center">
                  <select
                    className="bg-zinc-800 border border-zinc-600 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                    value={addEventSlug}
                    onChange={e => setAddEventSlug(e.target.value)}
                  >
                    <option value="">選擇活動…</option>
                    {events.filter(ev => !(member.events ?? []).includes(ev.slug)).map(ev => (
                      <option key={ev.slug} value={ev.slug}>{ev.name}</option>
                    ))}
                  </select>
                  <button onClick={() => void handleAddToEvent()} disabled={!addEventSlug}
                    className="text-xs text-green-400 bg-green-900/30 hover:bg-green-900/50 disabled:opacity-50 rounded-lg px-2 py-1 transition-colors">確認</button>
                  <button onClick={() => { setAddingToEvent(false); setAddEventSlug(''); }}
                    className="text-xs text-zinc-500 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-2 py-1 transition-colors">取消</button>
                </div>
              ) : (
                <button onClick={() => setAddingToEvent(true)}
                  className="text-xs text-blue-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-2.5 py-1.5 transition-colors">+活動</button>
              )}
            </div>
          )}

          {/* Ghost 編輯表單 */}
          {editing && (
            <div className="mt-3 space-y-3 bg-zinc-800/50 rounded-xl p-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">顯示名稱</label>
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                  value={editForm.display_name}
                  onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">人設提示詞</label>
                <textarea
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 resize-none"
                  rows={3}
                  value={editForm.personality_prompt}
                  onChange={e => setEditForm(f => ({ ...f, personality_prompt: e.target.value }))}
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-pink-500" checked={editForm.participate_in_matching}
                    onChange={e => setEditForm(f => ({ ...f, participate_in_matching: e.target.checked }))} />
                  <span className="text-xs text-zinc-300">參與配對</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-green-500" checked={editForm.is_active}
                    onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))} />
                  <span className="text-xs text-zinc-300">帳號啟用</span>
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(false)} className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 transition-colors">取消</button>
                <button onClick={() => void handleSave()} disabled={saving}
                  className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 transition-colors">
                  {saving ? '儲存中…' : '儲存'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* M2–M4 互動狀態（真人專屬） */}
        {member.memberType === 'real' && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">配對狀態</h4>
              <div className="flex gap-1.5">
                <button onClick={() => void loadInteractions()}
                  className="text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-2 py-1 transition-colors">↺</button>
                {/* M5 指派 Ghost 按鈕 */}
                <button onClick={() => setShowAssign(v => !v)}
                  className="text-xs text-blue-400 hover:text-blue-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-2.5 py-1 transition-colors">
                  {showAssign ? '收起' : '指派 Ghost'}
                </button>
              </div>
            </div>

            {/* M5 指派 Ghost 表單 */}
            {showAssign && (
              <div className="mb-3 bg-zinc-800/50 rounded-xl p-3 space-y-2">
                <p className="text-xs text-zinc-400">為此用戶指定活動中的 Ghost（會移除舊配對）</p>
                <select
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none"
                  value={assignEventId}
                  onChange={e => setAssignEventId(e.target.value)}
                >
                  <option value="">選擇活動…</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>
                <select
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none"
                  value={assignGhostId}
                  onChange={e => setAssignGhostId(e.target.value)}
                >
                  <option value="">選擇 Ghost…</option>
                  {ghosts.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.display_name ?? g.email.split('@')[0]}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setShowAssign(false); setAssignGhostId(''); setAssignEventId(''); }}
                    className="text-xs text-zinc-500 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-2 py-1 transition-colors">取消</button>
                  <button onClick={() => void handleAssignGhost()} disabled={assigning || !assignGhostId || !assignEventId}
                    className="text-xs bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-lg px-2.5 py-1 transition-colors">
                    {assigning ? '指派中…' : '確認指派'}
                  </button>
                </div>
              </div>
            )}

            {interactionsLoading ? (
              <p className="text-zinc-600 text-xs animate-pulse">載入配對資訊…</p>
            ) : !interactions || interactions.matches.length === 0 ? (
              <p className="text-zinc-600 text-xs">尚無配對紀錄</p>
            ) : (
              <ul className="space-y-2">
                {interactions.matches.map(m => (
                  <li key={m.match_id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 space-y-1">
                    {/* M4: 活動 + Ghost 名稱 */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-blue-400 bg-blue-900/30 rounded px-1.5 py-0.5 flex-shrink-0">{m.event_slug}</span>
                        {/* M2: Ghost 名稱 */}
                        <span className="text-xs text-purple-300 font-medium truncate">
                          {m.ghost_name ?? m.ghost_email.split('@')[0]}
                        </span>
                      </div>
                      <span className={`text-[10px] flex-shrink-0 rounded px-1 py-0.5 ${
                        m.status === 'accepted' ? 'text-green-400 bg-green-900/30' :
                        m.status === 'rejected' ? 'text-red-400 bg-red-900/30' :
                        'text-zinc-500 bg-zinc-800'
                      }`}>{m.status}</span>
                    </div>
                    {/* M3: 對話輪數 + 最後互動 */}
                    <div className="flex gap-3 text-[11px] text-zinc-500">
                      <span>對話 {m.msg_count} 輪</span>
                      {m.last_msg_at
                        ? <span>最後 {relativeTime(m.last_msg_at)}</span>
                        : <span>尚無對話記錄</span>
                      }
                      {m.score != null && <span>分數 {(m.score * 100).toFixed(0)}</span>}
                    </div>
                    <div className="text-[11px] text-zinc-600">活動：{m.event_name} · 配對 {relativeTime(m.matched_at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* 知識清單 */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">知識庫</h4>
            <button
              onClick={() => setShowUpload(v => !v)}
              className="text-xs text-blue-400 hover:text-blue-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-2.5 py-1 transition-colors"
            >
              {showUpload ? '收起' : '+ 上傳知識'}
            </button>
          </div>

          {showUpload && (
            <div className="mb-3 bg-zinc-800/50 rounded-xl p-3">
              <MemberKnowledgeUpload memberId={member.id} onUploaded={() => { void loadDocs(); }} />
            </div>
          )}

          {docsLoading ? (
            <p className="text-zinc-600 text-xs">載入中…</p>
          ) : documents.length === 0 ? (
            <p className="text-zinc-600 text-xs">尚無知識文件</p>
          ) : (
            <ul className="space-y-1">
              {documents.map(doc => (
                <li key={`${doc.page_name}-${doc.user_id}`}
                  className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                  <span className="text-xs text-zinc-300 truncate flex-1">{doc.page_name}</span>
                  <span className="text-xs text-zinc-600 ml-2 flex-shrink-0">{doc.block_count} blocks</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── 主元件 ─────────────────────────────────────────────────────

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'real' | 'ghost'>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 新增 Ghost 面板
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', display_name: '', personality_prompt: '', participate_in_matching: true });
  const [creating, setCreating] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersData, ghostsData, eventsData] = await Promise.all([
        mgFetch<{ users: RealUser[] }>('/users/admin/users'),
        mgFetch<{ ghosts: Ghost[] }>('/admin/ghosts'),
        mgFetch<{ events: EventInfo[] }>('/events/admin/all'),
      ]);
      setEvents(eventsData.events ?? []);

      const memberEventMap: Record<string, string[]> = {};
      await Promise.all(
        (eventsData.events ?? []).map(async (ev) => {
          try {
            const d = await mgFetch<{ members: EventMember[] }>(`/events/${ev.slug}/members?include_admin=true`);
            (d.members ?? []).forEach((m) => {
              if (!memberEventMap[m.id]) memberEventMap[m.id] = [];
              memberEventMap[m.id].push(ev.slug);
            });
          } catch { /* 忽略 */ }
        })
      );

      const realMembers: Member[] = (usersData.users ?? [])
        .filter(u => !(u.email ?? '').includes('@finally.click'))
        .map(u => ({
          id: u.id, email: u.email, display_name: u.display_name, role: u.role,
          gender: u.gender, seeking_gender: u.seeking_gender, event_count: u.event_count,
          created_at: u.created_at, memberType: 'real' as const, events: memberEventMap[u.id] ?? [],
        }));

      const ghostMembers: Member[] = (ghostsData.ghosts ?? []).map(g => ({
        id: g.id, email: g.email, display_name: g.display_name, role: 'ghost',
        created_at: g.created_at, memberType: 'ghost' as const,
        avatar_url: g.avatar_url, personality_prompt: g.personality_prompt,
        participate_in_matching: g.participate_in_matching, is_active: g.is_active,
        events: memberEventMap[g.id] ?? [],
      }));

      setMembers([...realMembers, ...ghostMembers]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  async function handleCreate() {
    if (!createForm.name.trim()) { alert('name 為必填'); return; }
    setCreating(true);
    try {
      await mgFetch('/admin/ghosts', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name.trim(),
          display_name: createForm.display_name || undefined,
          personality_prompt: createForm.personality_prompt || undefined,
          participate_in_matching: createForm.participate_in_matching,
        }),
      });
      setShowCreate(false);
      setCreateForm({ name: '', display_name: '', personality_prompt: '', participate_in_matching: true });
      void loadAll();
    } catch (e) { alert(`新增失敗：${(e as Error).message}`); }
    finally { setCreating(false); }
  }

  const filtered = members.filter(m => {
    if (typeFilter === 'real' && m.memberType !== 'real') return false;
    if (typeFilter === 'ghost' && m.memberType !== 'ghost') return false;
    if (eventFilter !== 'all' && !(m.events ?? []).includes(eventFilter)) return false;
    if (query) {
      const q = query.toLowerCase();
      return (m.display_name?.toLowerCase().includes(q) ?? false) || (m.email ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  const selectedMember = members.find(m => m.id === selectedId) ?? null;
  const realCount = members.filter(m => m.memberType === 'real').length;
  const ghostCount = members.filter(m => m.memberType === 'ghost').length;

  return (
    <div className="flex h-full gap-0 min-h-0">
      {/* ══════════ 左側列表 ══════════ */}
      <div className={`flex flex-col border-r border-zinc-800 flex-shrink-0 ${selectedMember ? 'w-72' : 'flex-1'} min-w-0`}>
        {/* 標題列 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">成員管理</h2>
            <p className="text-xs text-zinc-600">真人 {realCount} · Ghost {ghostCount}</p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => void loadAll()}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded-lg transition-colors">重整</button>
            <button onClick={() => setShowCreate(true)}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors">+ 新增</button>
          </div>
        </div>

        {/* 篩選 */}
        <div className="px-3 py-2 space-y-2 flex-shrink-0 border-b border-zinc-800">
          <input
            type="text"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
            placeholder="搜尋…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="flex gap-1.5">
            <select className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none"
              value={typeFilter} onChange={e => setTypeFilter(e.target.value as 'all' | 'real' | 'ghost')}>
              <option value="all">全部</option>
              <option value="real">真人</option>
              <option value="ghost">Ghost</option>
            </select>
            <select className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none"
              value={eventFilter} onChange={e => setEventFilter(e.target.value)}>
              <option value="all">所有活動</option>
              {events.map(ev => <option key={ev.slug} value={ev.slug}>{ev.name}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="mx-3 mt-2 text-red-400 text-xs bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</div>
        )}

        {/* 成員列表 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-zinc-600 text-xs px-4 py-3 animate-pulse">載入中…</p>
          ) : filtered.length === 0 ? (
            <p className="text-zinc-600 text-xs px-4 py-3">無符合成員</p>
          ) : (
            <ul className="divide-y divide-zinc-800/50">
              {filtered.map(m => (
                <li key={m.id}>
                  <button
                    onClick={() => setSelectedId(prev => prev === m.id ? null : m.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selectedId === m.id
                        ? 'bg-blue-900/30 border-l-2 border-blue-500'
                        : 'hover:bg-zinc-900/40 border-l-2 border-transparent'
                    } ${m.memberType === 'ghost' && m.is_active === 0 ? 'opacity-50' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300 flex-shrink-0 overflow-hidden">
                      {m.memberType === 'ghost' && m.avatar_url
                        ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                        : initials(m)
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-zinc-200 truncate">
                          {m.display_name ?? m.email.split('@')[0]}
                        </span>
                        {m.memberType === 'real'
                          ? <span className="text-[10px] text-green-500 bg-green-900/30 rounded px-1 py-0.5 flex-shrink-0">真人</span>
                          : <span className="text-[10px] text-purple-400 bg-purple-900/30 rounded px-1 py-0.5 flex-shrink-0">Ghost</span>
                        }
                        {m.memberType === 'ghost' && (
                          <span style={{fontSize:'11px', color:'#888', marginLeft:'4px'}}>{m.id?.slice(0,8)}…</span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-600 truncate">{m.email}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ══════════ 右側詳細面板 ══════════ */}
      {selectedMember && (
        <div className="flex-1 min-w-0 bg-zinc-950">
          <MemberDetailPanel
            member={selectedMember}
            events={events}
            ghosts={members.filter(m => m.memberType === 'ghost' && m.is_active !== 0)}
            onClose={() => setSelectedId(null)}
            onReload={() => void loadAll()}
          />
        </div>
      )}

      {/* ══════════ 新增 Ghost Modal ══════════ */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-100">新增虛擬人</h3>
              <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">名稱識別碼 <span className="text-red-400">*</span></label>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                    value={createForm.name}
                    onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="例：nova"
                  />
                  <span className="text-xs text-zinc-500 flex-shrink-0">.ghost@finally.click</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">顯示名稱（選填）</label>
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                  value={createForm.display_name}
                  onChange={e => setCreateForm(f => ({ ...f, display_name: e.target.value }))}
                  placeholder="例：Nova"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">人設提示詞（選填）</label>
                <textarea
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 resize-none"
                  rows={4}
                  value={createForm.personality_prompt}
                  onChange={e => setCreateForm(f => ({ ...f, personality_prompt: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-pink-500" checked={createForm.participate_in_matching}
                  onChange={e => setCreateForm(f => ({ ...f, participate_in_matching: e.target.checked }))} />
                <span className="text-sm text-zinc-300">立即加入配對池</span>
              </label>
            </div>
            <div className="px-5 py-4 border-t border-zinc-800 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">取消</button>
              <button onClick={() => void handleCreate()} disabled={creating || !createForm.name.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
                {creating ? '建立中…' : '建立虛擬人'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
