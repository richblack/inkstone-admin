// PartnerKeyCreateForm — 建立新 Partner Key 表單（admin app）

import { useState } from 'react';

interface PartnerKeyCreated {
  triplet_id: string;
  org_id: string;
  key: string;
  key_prefix: string;
  status: string;
  created_at: string;
}

interface Props {
  onCreate: (orgId: string) => Promise<PartnerKeyCreated>;
  onCreated: () => void;
  onError: (msg: string) => void;
}

export default function PartnerKeyCreateForm({ onCreate, onCreated, onError }: Props) {
  const [orgId, setOrgId] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<PartnerKeyCreated | null>(null);
  const [showFull, setShowFull] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!orgId.trim()) return;
    setCreating(true);
    setNewKey(null);
    try {
      const created = await onCreate(orgId.trim());
      setNewKey(created);
      setOrgId('');
      setShowFull(true);
      setCopied(false);
      onCreated();
    } catch (e) {
      onError(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    if (!newKey?.key) return;
    navigator.clipboard.writeText(newKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-zinc-300 mb-3">建立新 API Key</h2>
      <div className="flex gap-2">
        <input
          value={orgId}
          onChange={e => setOrgId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void handleCreate()}
          placeholder="org_id（例：org_oscar）"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
        />
        <button
          onClick={() => void handleCreate()}
          disabled={creating || !orgId.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg text-sm text-white transition-colors"
        >
          {creating ? '建立中…' : '建立'}
        </button>
      </div>

      {newKey && (
        <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <p className="text-xs text-green-400 font-medium mb-1">
            API Key 已建立，可隨時在列表中查看或複製
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-green-300 font-mono break-all">
              {showFull ? newKey.key : newKey.key.slice(0, 20) + '…'}
            </code>
            <button onClick={() => setShowFull(v => !v)} className="text-xs text-green-400/60 hover:text-green-400 transition-colors px-2">
              {showFull ? '隱藏' : '顯示'}
            </button>
            <button onClick={handleCopy} className="text-xs text-green-400/60 hover:text-green-400 transition-colors px-2">
              {copied ? '已複製' : '複製'}
            </button>
          </div>
          <p className="text-xs text-green-400/50 mt-1">org_id: {newKey.org_id}</p>
        </div>
      )}
    </div>
  );
}
