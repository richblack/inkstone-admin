import { useEffect, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

interface Triplet {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  confidence?: number;
  user_id?: string;
  created_at?: number;
}

interface Ghost {
  id: string;
  email: string;
  display_name: string | null;
}

type SubTab = 'notes' | 'upload';

// ── Constants ──────────────────────────────────────────────────────────────

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'notes', label: 'CEO 筆記' },
  { id: 'upload', label: '知識庫上傳' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const BADGE_PALETTE = [
  { bg: 'bg-red-900/50', text: 'text-red-400' },
  { bg: 'bg-blue-900/50', text: 'text-blue-400' },
  { bg: 'bg-green-900/50', text: 'text-green-400' },
  { bg: 'bg-purple-900/50', text: 'text-purple-400' },
  { bg: 'bg-yellow-900/50', text: 'text-yellow-400' },
  { bg: 'bg-pink-900/50', text: 'text-pink-400' },
  { bg: 'bg-cyan-900/50', text: 'text-cyan-400' },
  { bg: 'bg-orange-900/50', text: 'text-orange-400' },
];

function predicateBadge(predicate: string, predicateIndex: Map<string, number>): { bg: string; text: string } {
  const idx = predicateIndex.get(predicate) ?? 0;
  return BADGE_PALETTE[idx % BADGE_PALETTE.length];
}

// ── Upload Zone ────────────────────────────────────────────────────────────

function UploadZone({ onUpload, disabled }: { onUpload: (f: File) => void; disabled?: boolean }) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors
        ${dragging ? 'border-cyan-400 bg-cyan-500/10' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'}
        ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onUpload(file);
      }}
    >
      <div className="text-2xl mb-2">{disabled ? '⏳' : '📄'}</div>
      <p className="text-sm text-zinc-400">{disabled ? '上傳中…' : '拖曳或點擊上傳'}</p>
      <p className="text-xs text-zinc-600 mt-1">PDF、Word、PPT、MD、TXT 均可</p>
      <input
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.md,.txt"
        disabled={disabled}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = '';
        }}
      />
    </label>
  );
}

// ── CEO 筆記 ───────────────────────────────────────────────────────────────

function CeoNotes() {
  const [triplets, setTriplets] = useState<Triplet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/kbdb/triplets?subject=CEO&limit=200')
      .then(r => r.json())
      .then((d: unknown) => {
        const raw = d as Record<string, unknown>;
        const list = (raw['triplets'] ?? []) as Array<Record<string, unknown>>;
        return list.map(t => ({
          id: String(t['id'] ?? `${t['subject']}||${t['predicate']}||${t['object']}`),
          subject: String(t['subject'] ?? ''),
          predicate: String(t['predicate'] ?? ''),
          object: String(t['object'] ?? ''),
        } as Triplet));
      })
      .then(list => setTriplets(list))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // 從實際資料去重產生 predicate 清單（依出現次數排序）
  const predicateCounts = triplets.reduce<Map<string, number>>((acc, t) => {
    acc.set(t.predicate, (acc.get(t.predicate) ?? 0) + 1);
    return acc;
  }, new Map());
  const sortedPredicates = Array.from(predicateCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([p]) => p);

  // predicateIndex 用來對應顏色（依排序位置）
  const predicateIndex = new Map(sortedPredicates.map((p, i) => [p, i]));

  const filtered = triplets.filter(t => {
    if (activeFilter !== 'all' && t.predicate !== activeFilter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return (
        t.subject.toLowerCase().includes(s) ||
        t.predicate.toLowerCase().includes(s) ||
        t.object.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500 animate-pulse text-sm">載入知識庫…</div>
      </div>
    );
  }
  if (error) {
    return <div className="text-red-400 p-8 text-sm">Error: {error}</div>;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap flex-shrink-0">
        <div className="flex gap-2 flex-wrap">
          {/* 全部 chip */}
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            }`}
          >
            全部
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeFilter === 'all' ? 'bg-blue-500/50 text-blue-200' : 'bg-zinc-700 text-zinc-500'
            }`}>
              {triplets.length}
            </span>
          </button>
          {/* 動態 predicate chips */}
          {sortedPredicates.map(p => {
            const count = predicateCounts.get(p) ?? 0;
            const isActive = activeFilter === p;
            return (
              <button
                key={p}
                onClick={() => setActiveFilter(p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {p}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-blue-500/50 text-blue-200' : 'bg-zinc-700 text-zinc-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜尋關鍵字…"
          className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-2.5 pb-4">
          {filtered.map(t => {
            const badge = predicateBadge(t.predicate, predicateIndex);
            const isLong = t.object.length > 100;
            const isExpanded = expanded.has(t.id);
            return (
              <div
                key={t.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-blue-400 truncate mb-1.5">{t.subject}</div>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full mb-2 ${badge.bg} ${badge.text}`}>
                      {t.predicate}
                    </span>
                    <div className="text-sm text-zinc-300 leading-relaxed">
                      {isLong && !isExpanded ? (
                        <>
                          {t.object.slice(0, 100)}
                          <span className="text-zinc-600">…</span>
                          <button
                            onClick={() => toggleExpanded(t.id)}
                            className="ml-2 text-xs text-blue-500 hover:text-blue-400 transition-colors"
                          >
                            展開
                          </button>
                        </>
                      ) : (
                        <>
                          {t.object}
                          {isLong && isExpanded && (
                            <button
                              onClick={() => toggleExpanded(t.id)}
                              className="ml-2 text-xs text-blue-500 hover:text-blue-400 transition-colors"
                            >
                              收起
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-zinc-600 text-sm py-12 text-center">無符合條件的紀錄</div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 pt-3 border-t border-zinc-800 text-xs text-zinc-500">
        共 {filtered.length} 筆{activeFilter !== 'all' && `（全部 ${triplets.length} 筆）`}
      </div>
    </div>
  );
}

// ── Knowledge Upload (Ghost-centric) ───────────────────────────────────────

function KnowledgeUpload() {
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [loadingGhosts, setLoadingGhosts] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    fetch('/api/auth/matchgpt-token')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: unknown) => {
        const token = (d as Record<string, unknown>)['token'] as string;
        return fetch('https://matchgpt.finally.click/admin/ghosts', {
          headers: { Authorization: 'Bearer ' + token },
        });
      })
      .then(r => r.json())
      .then((d: unknown) => {
        const list = (d as Record<string, unknown>)['ghosts'] ?? [];
        return Array.isArray(list) ? list as Ghost[] : [];
      })
      .catch(() => { setAuthError(true); return [] as Ghost[]; })
      .then(list => { setGhosts(list); setLoadingGhosts(false); });
  }, []);

  const toggleGhost = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const handleUpload = async (file: File) => {
    if (selectedIds.size === 0) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('ghost_ids', JSON.stringify(Array.from(selectedIds)));
      const res = await fetch('/api/knowledge/upload', { method: 'POST', body: fd });
      const json = await res.json() as { ok?: boolean; error?: string; filename?: string; triplet_count?: number };
      if (json.ok) {
        setUploadMsg(`✓ ${json.filename ?? file.name} 上傳成功，已關聯 ${json.triplet_count ?? selectedIds.size} 個虛擬人`);
      } else {
        setUploadMsg('✗ ' + (json.error ?? '上傳失敗'));
      }
    } catch (e) {
      setUploadMsg('✗ ' + String(e));
    } finally {
      setUploading(false);
    }
  };

  if (authError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-zinc-500">
          <div className="text-4xl mb-3 opacity-40">🔐</div>
          <p className="text-sm">授權失敗，請重新登入</p>
        </div>
      </div>
    );
  }

  if (loadingGhosts) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500 animate-pulse text-sm">載入虛擬人列表…</div>
      </div>
    );
  }

  const canUpload = selectedIds.size > 0 && !uploading;

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      {/* Left: Ghost multi-select */}
      <div className="w-64 flex-shrink-0 flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-3 border-b border-zinc-800 flex-shrink-0">
          <p className="text-sm font-medium text-zinc-300 mb-2">關聯虛擬人 <span className="text-red-400">*</span></p>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds(new Set(ghosts.map(g => g.id)))}
              className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-purple-900/40 text-purple-300 hover:bg-purple-900/60 transition-colors"
            >
              所有虛擬人
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs px-2 py-1.5 rounded-lg bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                清除
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {ghosts.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 text-sm">尚無虛擬人</div>
          ) : (
            ghosts.map(ghost => {
              const checked = selectedIds.has(ghost.id);
              const name = ghost.display_name ?? ghost.email;
              return (
                <button
                  key={ghost.id}
                  onClick={() => toggleGhost(ghost.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-800 transition-colors ${
                    checked ? 'bg-zinc-800/80 border-l-2 border-l-purple-500' : ''
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    checked ? 'bg-purple-600 border-purple-500' : 'border-zinc-600'
                  }`}>
                    {checked && <span className="text-white text-xs leading-none">✓</span>}
                  </div>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-100 truncate">{name}</p>
                    <p className="text-xs text-zinc-600 truncate">{ghost.email}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-3 py-2 border-t border-zinc-800 text-xs text-zinc-600 flex-shrink-0">
          已選 <span className={selectedIds.size > 0 ? 'text-purple-400 font-medium' : ''}>{selectedIds.size}</span> / {ghosts.length} 個虛擬人
        </div>
      </div>

      {/* Right: Upload area */}
      <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <p className="text-sm font-medium text-zinc-300 mb-3">上傳知識文件</p>

        {!canUpload && !uploading && (
          <div className="mb-3 text-sm px-3 py-2 rounded-lg bg-amber-900/20 text-amber-400 border border-amber-900/30">
            請先在左側選擇至少一個虛擬人
          </div>
        )}

        <UploadZone onUpload={f => void handleUpload(f)} disabled={!canUpload} />

        {uploadMsg && (
          <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${
            uploadMsg.startsWith('✓') ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'
          }`}>
            {uploadMsg}
          </div>
        )}

        <div className="mt-auto pt-4 text-xs text-zinc-600 border-t border-zinc-800">
          上傳後將在 KBDB 建立三元組：ghost_id ──擁有知識──▶ block_id
        </div>
      </div>
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────

export default function Knowledge() {
  const [subTab, setSubTab] = useState<SubTab>('notes');

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-4 bg-zinc-800/60 rounded-lg p-1 w-fit flex-shrink-0">
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
              subTab === tab.id
                ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'notes' ? <CeoNotes /> : <KnowledgeUpload />}
    </div>
  );
}
