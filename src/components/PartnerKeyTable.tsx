// PartnerKeyTable — API Key 列表（admin app）

import { useState } from 'react';

interface PartnerKey {
  id: string;
  name: string;
  org_namespace: string;
  status: string;
  created_at: string;
  api_key?: string;
}

interface Props {
  keys: PartnerKey[];
  loading: boolean;
  revoking: string | null;
  onRefresh: () => void;
  onRevoke: (id: string) => void;
}

function KeyRow({ k, revoking, onRevoke }: { k: PartnerKey; revoking: string | null; onRevoke: (id: string) => void }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const isActive = k.status === 'active';

  const handleCopy = () => {
    if (!k.api_key) return;
    void navigator.clipboard.writeText(k.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-zinc-600'}`} />

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-zinc-200">{k.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              isActive ? 'bg-green-500/15 text-green-400' : 'bg-zinc-700 text-zinc-500'
            }`}>
              {isActive ? '使用中' : k.status}
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono">{k.id}</p>
          <p className="text-xs text-zinc-600">namespace: {k.org_namespace}</p>
          {k.created_at && (
            <p className="text-xs text-zinc-600">{new Date(k.created_at).toLocaleString('zh-TW')}</p>
          )}
          {/* API Key 顯示區 */}
          {k.api_key ? (
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs text-zinc-400 font-mono bg-zinc-800 rounded px-2 py-1 flex-1 min-w-0 truncate">
                {revealed ? k.api_key : k.api_key.slice(0, 12) + '••••••••••••••••••••'}
              </code>
              <button
                onClick={() => setRevealed(v => !v)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 flex-shrink-0"
              >
                {revealed ? '隱藏' : '顯示'}
              </button>
              <button
                onClick={handleCopy}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 flex-shrink-0"
              >
                {copied ? '已複製 ✓' : '複製'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-zinc-700 mt-1 italic">（舊資料，無法查詢 key）</p>
          )}
        </div>

        <button
          onClick={() => onRevoke(k.id)}
          disabled={revoking === k.id}
          className="flex-shrink-0 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 disabled:opacity-40 transition-colors px-3 py-1.5 rounded-lg mt-0.5"
        >
          {revoking === k.id ? '刪除中…' : '刪除'}
        </button>
      </div>
    </div>
  );
}

export default function PartnerKeyTable({ keys, loading, revoking, onRefresh, onRevoke }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-300">所有 API Keys</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {loading ? '載入中…' : '重新整理'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-zinc-600 text-sm">載入中…</div>
      ) : keys.length === 0 ? (
        <div className="text-center py-10 text-zinc-600 text-sm">尚無 API Key</div>
      ) : (
        <div className="divide-y divide-zinc-800">
          {keys.map(k => (
            <KeyRow key={k.id} k={k} revoking={revoking} onRevoke={onRevoke} />
          ))}
        </div>
      )}
    </div>
  );
}
