// PartnerKeys — Partner Key 管理（admin app）
// 透過 /api/matchgpt/* proxy，由 Pages Function 持 admin token，不需額外登入

import { useState, useEffect } from 'react';
import PartnerKeyCreateForm from './PartnerKeyCreateForm';
import PartnerKeyTable from './PartnerKeyTable';

// --- 型別 ---
export interface PartnerKey { triplet_id: string; org_id: string; key: string; key_prefix: string; status: 'active' | 'revoked'; created_at: string | null; }
export interface PartnerKeyCreated { triplet_id: string; org_id: string; key: string; key_prefix: string; status: string; created_at: string; }

// --- API helpers ---

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

// --- 主元件 ---

export default function PartnerKeys() {
  const [keys, setKeys] = useState<PartnerKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await mgFetch<{ keys: PartnerKey[] }>('/admin/partner-keys');
      setKeys(data.keys ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleCreate = async (orgId: string): Promise<PartnerKeyCreated> => {
    return mgFetch<PartnerKeyCreated>('/admin/partner-keys', {
      method: 'POST',
      body: JSON.stringify({ org_id: orgId }),
    });
  };

  const handleRevoke = async (id: string, org: string) => {
    if (!confirm(`確定廢止 ${org} 的 API Key？`)) return;
    setRevoking(id);
    try {
      await mgFetch(`/admin/partner-keys/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '廢止失敗');
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="space-y-6">
      <PartnerKeyCreateForm
        onCreate={handleCreate}
        onCreated={() => void load()}
        onError={setError}
      />
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
          {error}
        </div>
      )}
      <PartnerKeyTable
        keys={keys}
        loading={loading}
        revoking={revoking}
        onRefresh={() => void load()}
        onRevoke={(id, org) => void handleRevoke(id, org)}
      />
    </div>
  );
}
