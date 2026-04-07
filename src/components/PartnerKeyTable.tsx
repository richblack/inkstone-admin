// PartnerKeyTable — API Key 列表與廢止操作（admin app）

import { useState } from 'react';

interface PartnerKey {
  triplet_id: string;
  org_id: string;
  key: string;
  key_prefix: string;
  status: 'active' | 'revoked';
  created_at: string | null;
}

interface Props {
  keys: PartnerKey[];
  loading: boolean;
  revoking: string | null;
  onRefresh: () => void;
  onRevoke: (id: string, org: string) => void;
}

function KeyRow({ k, revoking, onRevoke }: { k: PartnerKey; revoking: string | null; onRevoke: (id: string, org: string) => void }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  // 複製必須用完整 key（資料層），不可用截斷的 key_prefix
  const fullKey = k.key;

  const handleCopy = () => {
    if (!fullKey) return;
    void navigator.clipboard.writeText(fullKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div key={k.triplet_id} className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">{k.org_id}</p>
          <p className="text-xs text-zinc-500 font-mono mt-0.5 break-all">
            {k.key ? (revealed ? k.key : k.key.slice(0, 20) + '…') : k.key_prefix}
          </p>
          {k.created_at && (
            <p className="text-xs text-zinc-600 mt-0.5">
              {new Date(k.created_at).toLocaleString('zh-TW')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {k.key && (
            <button
              onClick={() => setRevealed(v => !v)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1"
            >
              {revealed ? '隱藏' : '顯示'}
            </button>
          )}
          <button
            onClick={handleCopy}
            disabled={!fullKey}
            className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors px-2 py-1"
          >
            {copied ? '已複製' : '複製'}
          </button>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              k.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
            }`}
          >
            {k.status === 'active' ? '使用中' : '已廢止'}
          </span>
          {k.status === 'active' && (
            <button
              onClick={() => onRevoke(k.triplet_id, k.org_id)}
              disabled={revoking === k.triplet_id}
              className="text-xs text-zinc-600 hover:text-red-400 transition-colors px-2 py-1"
            >
              {revoking === k.triplet_id ? '廢止中…' : '廢止'}
            </button>
          )}
        </div>
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
            <KeyRow key={k.triplet_id} k={k} revoking={revoking} onRevoke={onRevoke} />
          ))}
        </div>
      )}
    </div>
  );
}
