// PartnerKeyCreateForm — 建立新 Partner Key 表單（admin app）

import { useState } from 'react';

interface PartnerKeyCreated {
  partner_id: string;
  org_namespace: string;
  api_key: string;
}

interface Props {
  onCreate: (name: string, orgNamespace: string, expiresDays?: number) => Promise<PartnerKeyCreated>;
  onCreated: () => void;
  onError: (msg: string) => void;
}

export default function PartnerKeyCreateForm({ onCreate, onCreated, onError }: Props) {
  const [name, setName] = useState('');
  const [orgNamespace, setOrgNamespace] = useState('');
  const [expiresDays, setExpiresDays] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<PartnerKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !orgNamespace.trim()) return;
    if (!/^[a-z][a-z0-9_]*$/.test(orgNamespace.trim())) {
      onError('org_namespace 格式錯誤（需以小寫字母開頭，只允許小寫字母、數字、底線）');
      return;
    }
    setCreating(true);
    setNewKey(null);
    try {
      const days = expiresDays.trim() ? parseInt(expiresDays.trim(), 10) : undefined;
      const created = await onCreate(name.trim(), orgNamespace.trim(), days);
      setNewKey(created);
      setName('');
      setOrgNamespace('');
      setExpiresDays('');
      setCopied(false);
      onCreated();
    } catch (e) {
      onError(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    if (!newKey?.api_key) return;
    void navigator.clipboard.writeText(newKey.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <h2 className="text-sm font-semibold text-zinc-300">建立新 API Key</h2>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="名稱（例：Acme Corp）"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
        />
        <input
          value={orgNamespace}
          onChange={e => setOrgNamespace(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void handleCreate()}
          placeholder="org_namespace（例：acme_corp）"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
        />
        <input
          value={expiresDays}
          onChange={e => setExpiresDays(e.target.value)}
          placeholder="有效天數（選填）"
          type="number"
          min="1"
          className="w-36 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
        />
        <button
          onClick={() => void handleCreate()}
          disabled={creating || !name.trim() || !orgNamespace.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg text-sm text-white transition-colors"
        >
          {creating ? '建立中…' : '建立'}
        </button>
      </div>

      {newKey && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <p className="text-xs text-amber-400 font-medium mb-1">
            ⚠️ API Key 只顯示一次，請立即複製並妥善保存
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-amber-300 font-mono break-all bg-zinc-900 rounded px-2 py-1">
              {newKey.api_key}
            </code>
            <button onClick={handleCopy} className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors px-2 py-1 border border-amber-500/30 rounded">
              {copied ? '已複製 ✓' : '複製'}
            </button>
          </div>
          <p className="text-xs text-amber-400/50 mt-1">Partner ID: {newKey.partner_id} · namespace: {newKey.org_namespace}</p>
        </div>
      )}
    </div>
  );
}
