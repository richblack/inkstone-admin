// PartnerKeys — Partner API Key 管理（admin app）
// 透過 /api/kbdb proxy，呼叫 KBDB admin/partners 端點

import { useState, useEffect } from 'react';
import PartnerKeyCreateForm from './PartnerKeyCreateForm';
import PartnerKeyTable from './PartnerKeyTable';

// --- 型別（對應 KBDB partner record）---
export interface PartnerKey {
  id: string;           // e.g. "partner-acme"
  name: string;
  org_namespace: string;
  status: 'active' | 'revoked';
  created_at: string;
}

export interface PartnerKeyCreated {
  partner_id: string;
  org_namespace: string;
  api_key: string;      // 一次性，只在建立時回傳
}

// --- API helpers ---

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
      // KBDB GET /admin/partners 回傳陣列
      const data = await kbdbFetch<PartnerKey[]>('/admin/partners');
      setKeys(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleCreate = async (name: string, orgNamespace: string, expiresDays?: number): Promise<PartnerKeyCreated> => {
    return kbdbFetch<PartnerKeyCreated>('/admin/partners', {
      method: 'POST',
      body: JSON.stringify({ name, org_namespace: orgNamespace, ...(expiresDays ? { expires_days: expiresDays } : {}) }),
    });
  };

  const handleRevoke = async (id: string) => {
    if (!confirm(`確定廢止 ${id} 的 API Key？`)) return;
    setRevoking(id);
    try {
      await kbdbFetch(`/admin/partners/${encodeURIComponent(id)}`, { method: 'DELETE' });
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
        onRevoke={(id) => void handleRevoke(id)}
      />
    </div>
  );
}
