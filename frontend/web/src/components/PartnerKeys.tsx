// PartnerKeys — API Key 管理（KBDB Partners）
// 列表、建立、撤銷 partner API keys

import { useState, useEffect, useCallback } from 'react';

// --- 型別 ---

interface Partner {
  id: string;
  name: string;
  org_namespace: string;
  status: string; // "active" | "revoked"
  created_at: string;
}

interface CreatePartnerResponse {
  partner_id: string;
  api_key: string;
}

interface CreateForm {
  name: string;
  org_namespace: string;
  expires_days: string;
}

// --- 主元件 ---

export default function PartnerKeys() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 建立表單
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateForm>({ name: '', org_namespace: '', expires_days: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // 一次性 API key 顯示
  const [newApiKey, setNewApiKey] = useState<{ partner_id: string; api_key: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // 撤銷狀態
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadPartners = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/kbdb/admin/partners');
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { partners: Partner[] };
      setPartners(data.partners ?? []);
    } catch (e) {
      setError((e as Error).message ?? '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPartners(); }, [loadPartners]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    // 驗證 org_namespace
    if (!/^[a-z][a-z0-9_]*$/.test(form.org_namespace)) {
      setCreateError('org_namespace 格式錯誤（需以小寫字母開頭，只允許小寫字母、數字、底線）');
      return;
    }

    setCreating(true);
    try {
      const body: { name: string; org_namespace: string; expires_days?: number } = {
        name: form.name,
        org_namespace: form.org_namespace,
      };
      if (form.expires_days !== '') {
        body.expires_days = parseInt(form.expires_days, 10);
      }

      const res = await fetch('/api/kbdb/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as CreatePartnerResponse;
      setNewApiKey({ partner_id: data.partner_id, api_key: data.api_key });
      setForm({ name: '', org_namespace: '', expires_days: '' });
      setShowForm(false);
      await loadPartners();
    } catch (e) {
      setCreateError((e as Error).message ?? '建立失敗');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (partner: Partner) => {
    if (!window.confirm(`確定要撤銷 "${partner.name}" (${partner.id}) 的 API Key 嗎？此操作無法復原。`)) return;

    setRevoking(partner.id);
    try {
      const res = await fetch(`/api/kbdb/admin/partners/${encodeURIComponent(partner.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      await loadPartners();
    } catch (e) {
      setError((e as Error).message ?? '撤銷失敗');
    } finally {
      setRevoking(null);
    }
  };

  const handleCopy = async () => {
    if (!newApiKey) return;
    try {
      await navigator.clipboard.writeText(newApiKey.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {/* 頂部工具列 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setShowForm(f => !f); setCreateError(''); }}
          className="text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 transition-colors"
        >
          {showForm ? '取消' : '+ 新增 Partner'}
        </button>
        <button
          onClick={() => void loadPartners()}
          className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors ml-auto"
          title="重新整理"
        >
          ↺
        </button>
      </div>

      {/* 一次性 API Key 顯示 */}
      {newApiKey && (
        <div className="bg-amber-950/40 border border-amber-700/60 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-amber-300">API Key 已建立</div>
              <div className="text-xs text-amber-500 mt-0.5">此 Key 只會顯示一次，請立即複製並妥善保存</div>
            </div>
            <button
              onClick={() => { setNewApiKey(null); setCopied(false); }}
              className="text-zinc-500 hover:text-zinc-300 text-lg leading-none flex-shrink-0"
              aria-label="關閉"
            >
              ×
            </button>
          </div>
          <div className="text-xs text-zinc-400">Partner ID: <span className="text-zinc-200 font-mono">{newApiKey.partner_id}</span></div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono text-amber-200 break-all">
              {newApiKey.api_key}
            </code>
            <button
              onClick={() => void handleCopy()}
              className={`flex-shrink-0 text-xs px-3 py-2 rounded-lg border transition-colors ${
                copied
                  ? 'bg-green-900/40 border-green-700 text-green-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {copied ? '已複製' : '複製'}
            </button>
          </div>
        </div>
      )}

      {/* 建立表單 */}
      {showForm && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3"
        >
          <div className="text-sm font-medium text-zinc-200">新增 Partner</div>

          <div className="space-y-2">
            <label className="block">
              <span className="text-xs text-zinc-400">名稱 <span className="text-red-400">*</span></span>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Acme Corp"
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-xs text-zinc-400">Org Namespace <span className="text-red-400">*</span></span>
              <input
                type="text"
                required
                value={form.org_namespace}
                onChange={e => setForm(f => ({ ...f, org_namespace: e.target.value }))}
                placeholder="e.g. acme_corp"
                pattern="^[a-z][a-z0-9_]*$"
                title="需以小寫字母開頭，只允許小寫字母、數字、底線"
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-zinc-600 mt-0.5 block">格式：小寫字母開頭，允許小寫字母、數字、底線</span>
            </label>

            <label className="block">
              <span className="text-xs text-zinc-400">有效天數（選填）</span>
              <input
                type="number"
                min="1"
                value={form.expires_days}
                onChange={e => setForm(f => ({ ...f, expires_days: e.target.value }))}
                placeholder="留空表示永不過期"
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </label>
          </div>

          {createError && (
            <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {createError}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors"
            >
              {creating ? '建立中…' : '建立'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setCreateError(''); }}
              className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-4 py-2 transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* 載入中 */}
      {loading ? (
        <div className="text-zinc-500 animate-pulse text-sm py-8 text-center">載入 Partner 列表…</div>
      ) : partners.length === 0 ? (
        <div className="text-zinc-600 text-sm text-center py-12">尚無 Partner</div>
      ) : (
        <div className="space-y-2">
          {partners.map(p => (
            <PartnerRow
              key={p.id}
              partner={p}
              revoking={revoking === p.id}
              onRevoke={() => void handleRevoke(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- 單一 Partner 列 ---

function PartnerRow({
  partner: p,
  revoking,
  onRevoke,
}: {
  partner: Partner;
  revoking: boolean;
  onRevoke: () => void;
}) {
  const isActive = p.status === 'active';

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
      isActive
        ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800/60'
        : 'bg-zinc-900/40 border-zinc-800/40'
    }`}>
      {/* 狀態指示燈 */}
      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-zinc-600'}`} />

      {/* 資訊 */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-zinc-200 truncate">{p.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border whitespace-nowrap ${
            isActive
              ? 'bg-green-900/30 border-green-700/50 text-green-400'
              : 'bg-zinc-800 border-zinc-700 text-zinc-500'
          }`}>
            {p.status}
          </span>
        </div>
        <div className="text-xs text-zinc-500 font-mono">{p.id}</div>
        <div className="text-xs text-zinc-600">
          <span className="text-zinc-500">namespace:</span> {p.org_namespace}
        </div>
        <div className="text-[10px] text-zinc-600">
          建立於 {new Date(p.created_at).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })}
        </div>
      </div>

      {/* 撤銷按鈕 */}
      {isActive && (
        <button
          onClick={onRevoke}
          disabled={revoking}
          className="flex-shrink-0 text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 border border-red-800/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-1.5 transition-colors"
        >
          {revoking ? '撤銷中…' : '撤銷'}
        </button>
      )}
    </div>
  );
}
