// PartnerKeyTable — API Key 列表與廢止操作（admin app）

interface PartnerKey {
  id: string;
  name: string;
  org_namespace: string;
  status: 'active' | 'revoked';
  created_at: string;
}

interface Props {
  keys: PartnerKey[];
  loading: boolean;
  revoking: string | null;
  onRefresh: () => void;
  onRevoke: (id: string) => void;
}

function KeyRow({ k, revoking, onRevoke }: { k: PartnerKey; revoking: string | null; onRevoke: (id: string) => void }) {
  const isActive = k.status === 'active';

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        {/* 狀態指示燈 */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-zinc-600'}`} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">{k.name}</p>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">{k.id}</p>
          <p className="text-xs text-zinc-600 mt-0.5">namespace: {k.org_namespace}</p>
          {k.created_at && (
            <p className="text-xs text-zinc-600 mt-0.5">
              {new Date(k.created_at).toLocaleString('zh-TW')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isActive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
            }`}
          >
            {isActive ? '使用中' : '已廢止'}
          </span>
          {isActive && (
            <button
              onClick={() => onRevoke(k.id)}
              disabled={revoking === k.id}
              className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 disabled:opacity-40 transition-colors px-3 py-1 rounded-lg"
            >
              {revoking === k.id ? '廢止中…' : '廢止'}
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
            <KeyRow key={k.id} k={k} revoking={revoking} onRevoke={onRevoke} />
          ))}
        </div>
      )}
    </div>
  );
}
