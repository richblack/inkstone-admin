// EditorHistory.tsx — 版本歷史展開區塊（≤100行）
import { useState, useEffect } from 'react';

interface ChangeEntry {
  triplet_id: string;
  before_summary: string;
  after_summary: string;
  timestamp: string;
  by: string;
}

interface Props {
  artifactId: string | null;
}

function fmtTs(iso: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return iso; }
}

export default function EditorHistory({ artifactId }: Props) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ChangeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !artifactId) return;
    setLoading(true);
    fetch(`/api/spec-sync/spec/${artifactId}/changelog`)
      .then(r => r.json() as Promise<{ changelog?: ChangeEntry[]; count?: number }>)
      .then(d => setEntries(d.changelog ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [open, artifactId]);

  // 重置：切換文件時收合
  useEffect(() => { setOpen(false); setEntries([]); setExpanded(null); }, [artifactId]);

  if (!artifactId) return null;

  return (
    <div className="flex-shrink-0 border-t border-zinc-800">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span>📋 版本歷史{entries.length > 0 ? `（${entries.length} 筆）` : ''}</span>
        <span className="text-zinc-600">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-800 max-h-64 overflow-y-auto">
          {loading && <div className="px-3 py-2 text-xs text-zinc-600 animate-pulse">讀取中…</div>}
          {!loading && entries.length === 0 && (
            <div className="px-3 py-3 text-xs text-zinc-600">尚無修改記錄</div>
          )}
          {entries.map(e => (
            <div key={e.triplet_id} className="border-b border-zinc-800/60 last:border-0">
              <button
                className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-800/40 transition-colors"
                onClick={() => setExpanded(x => x === e.triplet_id ? null : e.triplet_id)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">{fmtTs(e.timestamp)}</span>
                  <span className="text-zinc-600">{e.by ?? 'system'}</span>
                </div>
              </button>
              {expanded === e.triplet_id && (
                <div className="px-3 pb-2 space-y-1.5">
                  <div className="space-y-0.5">
                    <div className="text-zinc-600 text-xs">修改前：</div>
                    <pre className="text-zinc-500 text-xs bg-zinc-800/50 rounded px-2 py-1 whitespace-pre-wrap break-all max-h-20 overflow-y-auto">
                      {e.before_summary || '（空）'}
                    </pre>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-zinc-600 text-xs">修改後：</div>
                    <pre className="text-zinc-300 text-xs bg-zinc-800/50 rounded px-2 py-1 whitespace-pre-wrap break-all max-h-20 overflow-y-auto">
                      {e.after_summary || '（空）'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
