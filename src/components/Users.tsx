// Users — 真人用戶管理
// 封測期間列出所有註冊用戶，區分真人與 Ghost，支援搜尋與刪除

import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  gender: string | null;
  seeking_gender: string | null;
  event_count: number;
  created_at: string;
}

async function mgFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`/api/matchgpt${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function isGhost(email: string) {
  return email.includes('@finally.click');
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  // created_at may be Unix timestamp (number) or ISO string
  const ts = /^\d+$/.test(dateStr) ? Number(dateStr) * 1000 : new Date(dateStr).getTime();
  const diff = Math.floor((now - ts) / 1000);
  if (diff < 60) return '剛剛';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} 天前`;
  if (diff < 86400 * 365) return `${Math.floor(diff / 86400 / 30)} 個月前`;
  return `${Math.floor(diff / 86400 / 365)} 年前`;
}

function userInitials(u: User) {
  return (u.display_name ?? u.email).charAt(0).toUpperCase();
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await mgFetch<{ users: User[] }>('/users/admin/users');
      setUsers(data.users);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  async function handleDelete(u: User) {
    const label = u.display_name ?? u.email;
    if (!window.confirm(`確定要刪除「${label}」？此操作無法復原。`)) return;
    setDeleting(u.id);
    try {
      await mgFetch(`/users/admin/users/${u.id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(x => x.id !== u.id));
    } catch (e) {
      alert(`刪除失敗：${(e as Error).message}`);
    } finally {
      setDeleting(null);
    }
  }

  const filtered = users.filter(u => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (u.display_name?.toLowerCase().includes(q) ?? false) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const realCount = users.filter(u => !isGhost(u.email)).length;
  const ghostCount = users.filter(u => isGhost(u.email)).length;

  return (
    <div className="space-y-4">
      {/* 標題列 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">用戶管理</h2>
          <p className="text-xs text-zinc-500 mt-0.5">封測期間所有已註冊帳號</p>
        </div>
        <button
          onClick={() => void loadUsers()}
          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
        >
          重新整理
        </button>
      </div>

      {/* 統計列 */}
      <div className="flex gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex-1 text-center">
          <div className="text-xl font-bold text-zinc-100">{users.length}</div>
          <div className="text-xs text-zinc-500 mt-0.5">總用戶</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex-1 text-center">
          <div className="text-xl font-bold text-green-400">{realCount}</div>
          <div className="text-xs text-zinc-500 mt-0.5">真人</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex-1 text-center">
          <div className="text-xl font-bold text-zinc-500">{ghostCount}</div>
          <div className="text-xs text-zinc-500 mt-0.5">Ghost</div>
        </div>
      </div>

      {/* 搜尋框 */}
      <input
        type="text"
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
        placeholder="搜尋 display_name 或 email…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* 用戶列表 */}
      {loading ? (
        <div className="text-zinc-500 text-sm animate-pulse">載入中…</div>
      ) : filtered.length === 0 ? (
        <div className="text-zinc-500 text-sm">{query ? '無符合結果' : '尚無用戶'}</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(u => {
            const ghost = isGhost(u.email);
            return (
              <div
                key={u.id}
                className={`bg-zinc-900 border rounded-xl p-4 flex items-start gap-4 ${
                  ghost ? 'border-zinc-800 opacity-70' : 'border-zinc-700'
                }`}
              >
                {/* 頭像 */}
                <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-300 flex-shrink-0">
                  {userInitials(u)}
                </div>

                {/* 資料 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-zinc-100">
                      {u.display_name ?? '（未設定名稱）'}
                    </span>
                    <span className="text-xs text-zinc-500">{u.email}</span>
                    {ghost ? (
                      <span className="text-xs text-zinc-400 bg-zinc-800 rounded px-1.5 py-0.5">Ghost</span>
                    ) : (
                      <span className="text-xs text-green-400 bg-green-900/30 rounded px-1.5 py-0.5">真人</span>
                    )}
                    {u.role === 'admin' && (
                      <span className="text-xs text-blue-400 bg-blue-900/30 rounded px-1.5 py-0.5">admin</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {u.gender && (
                      <span className="text-xs text-zinc-500">性別：{u.gender}</span>
                    )}
                    {u.seeking_gender && (
                      <span className="text-xs text-zinc-500">尋找：{u.seeking_gender}</span>
                    )}
                    <span className="text-xs text-zinc-500">參加活動：{u.event_count}</span>
                    <span className="text-xs text-zinc-600">
                      {relativeTime(u.created_at)} 註冊
                    </span>
                  </div>
                </div>

                {/* 刪除按鈕 */}
                <button
                  onClick={() => void handleDelete(u)}
                  disabled={deleting === u.id}
                  className="text-xs text-red-500 hover:text-red-400 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-lg px-2.5 py-1.5 transition-colors flex-shrink-0"
                >
                  {deleting === u.id ? '刪除中…' : '刪除'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
