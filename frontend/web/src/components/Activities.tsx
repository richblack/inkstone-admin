// Activities — 活動平台管理
// 直接打活動平台 Worker，mount 時自動換取 token（admin session）

import { useState, useEffect } from 'react';

const MATCHGPT_URL = 'https://matchgpt.finally.click';

// --- 型別 ---

interface MgEvent {
  id: string;
  slug: string;
  name: string;
  type: 'love' | 'hack' | 'career' | 'custom';
  description: string | null;
  roles: string | null;
  color: string;
  is_active: number;
  member_count?: number;
}

interface EventMember {
  id: string;
  display_name: string;
  role: string | null;
  joined_at: string;
}

interface Stats {
  users: number;
  active_events: number;
  total_memberships: number;
  total_matches: number;
}

// --- 活動平台 API helpers ---

let _sessionToken: string | null = null;

function getToken() { return _sessionToken; }

async function mgFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${MATCHGPT_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
  if (res.status === 401) throw new Error('401');
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// --- 主元件 ---

export default function Activities() {
  const [authState, setAuthState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    fetch('/api/auth/matchgpt-token')
      .then(res => res.ok ? res.json() as Promise<{ token: string }> : Promise.reject())
      .then(data => { _sessionToken = data.token; setAuthState('ok'); })
      .catch(() => setAuthState('error'));
  }, []);

  if (authState === 'loading') return <div className="text-zinc-500 animate-pulse text-sm py-8 text-center">載入中…</div>;
  if (authState === 'error') return <div className="text-red-400 text-sm py-8 text-center">無法取得授權，請重新登入</div>;
  return <MgDashboard />;
}

// --- 主儀表板 ---

function MgDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<MgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, EventMember[]>>({});
  const [membersLoading, setMembersLoading] = useState<string | null>(null);

  // 建立表單
  const [name, setName] = useState('');
  const [type, setType] = useState('hack');
  const [description, setDescription] = useState('');
  const [roles, setRoles] = useState('');
  const [color, setColor] = useState('#ec4899');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [created, setCreated] = useState<MgEvent | null>(null);
  const [copied, setCopied] = useState(false);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      mgFetch<Stats>('/users/admin/stats'),
      mgFetch<{ events: MgEvent[] }>('/events/admin/all').then(r => r.events),
    ])
      .then(([s, evs]) => { setStats(s); setEvents(evs); })
      .catch(e => { if (e instanceof Error && e.message === '401') setAuthError(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const toggleMembers = async (ev: MgEvent) => {
    if (expandedSlug === ev.slug) { setExpandedSlug(null); return; }
    setExpandedSlug(ev.slug);
    if (!members[ev.slug]) {
      setMembersLoading(ev.slug);
      try {
        const res = await mgFetch<{ members: EventMember[] }>(`/events/${encodeURIComponent(ev.slug)}/members`);
        setMembers(prev => ({ ...prev, [ev.slug]: res.members }));
      } catch { /* ignore */ }
      setMembersLoading(null);
    }
  };

  const handleCreate = async () => {
    if (!name) return;
    setCreating(true);
    setCreateError('');
    try {
      const ev = await mgFetch<MgEvent>('/events', {
        method: 'POST',
        body: JSON.stringify({
          name,
          type,
          description: description || undefined,
          roles: roles ? roles.split(',').map(r => r.trim()).filter(Boolean) : undefined,
          color,
        }),
      });
      setCreated(ev);
      loadAll();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (ev: MgEvent) => {
    try {
      if (ev.is_active) {
        await mgFetch(`/events/${encodeURIComponent(ev.slug)}`, { method: 'DELETE' });
      } else {
        await mgFetch(`/events/${encodeURIComponent(ev.slug)}`, {
          method: 'PUT',
          body: JSON.stringify({ is_active: true }),
        });
      }
      loadAll();
    } catch { /* ignore */ }
  };

  const handleHardDelete = async (ev: MgEvent) => {
    if (!confirm(`永久刪除「${ev.name}」？此操作無法復原。`)) return;
    try {
      await mgFetch(`/events/${encodeURIComponent(ev.slug)}?hard=true`, { method: 'DELETE' });
      loadAll();
    } catch { /* ignore */ }
  };

  const handleRemoveMember = async (ev: MgEvent, userId: string) => {
    if (!confirm('確定要移除此成員？')) return;
    try {
      await mgFetch(`/events/${encodeURIComponent(ev.slug)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      setMembers(prev => ({ ...prev, [ev.slug]: (prev[ev.slug] ?? []).filter(m => m.id !== userId) }));
      loadAll();
    } catch { /* ignore */ }
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`https://finally.click/join?slug=${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authError) return <div className="text-red-400 text-sm py-8 text-center">無法取得授權，請重新登入</div>;

  if (loading && events.length === 0) {
    return <div className="text-zinc-500 animate-pulse text-sm py-8 text-center">載入中…</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 頂部：統計 */}
      {stats && (
        <div className="flex gap-4">
          {[
            { label: '用戶', value: stats.users },
            { label: '活動', value: stats.active_events },
            { label: '參與', value: stats.total_memberships },
            { label: '配對', value: stats.total_matches },
          ].map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-center">
              <p className="text-xs text-zinc-500">{s.label}</p>
              <p className="text-xl font-bold text-zinc-100">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 建立活動 */}
      {!showCreate && !created && (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full border border-dashed border-zinc-700 rounded-xl p-5 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors text-sm"
        >
          + 建立新活動
        </button>
      )}

      {showCreate && !created && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-zinc-200">建立活動</h3>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="活動名稱"
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
          />
          <div className="grid grid-cols-3 gap-2">
            {(['hack', 'career', 'custom'] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`py-1.5 rounded-lg text-xs border transition-colors ${type === t ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}
              >
                {{ hack: '黑客松', career: '徵才', custom: '其他' }[t]}
              </button>
            ))}
          </div>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="活動描述（選填）"
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
          />
          <input
            value={roles}
            onChange={e => setRoles(e.target.value)}
            placeholder="角色（逗號分隔，例：Frontend, Backend）"
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
          />
          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-500">顏色</label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
            <span className="text-xs text-zinc-600 font-mono">{color}</span>
          </div>
          {createError && <p className="text-red-400 text-sm">{createError}</p>}
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 border border-zinc-700 rounded-lg py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              取消
            </button>
            <button
              onClick={() => void handleCreate()}
              disabled={!name || creating}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg py-2 text-sm font-medium transition-colors"
            >
              {creating ? '建立中…' : '建立'}
            </button>
          </div>
        </div>
      )}

      {/* 建立成功 */}
      {created && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 text-center space-y-3">
          <div className="text-3xl">✅</div>
          <p className="font-semibold text-zinc-200">「{created.name}」已建立</p>
          <div className="flex items-center gap-2 bg-zinc-950 rounded-lg p-3 text-left">
            <code className="flex-1 text-xs text-blue-400 truncate">
              https://finally.click/join?slug={created.slug}
            </code>
            <button onClick={() => copyLink(created.slug)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0">
              {copied ? '✓ 已複製' : '複製'}
            </button>
          </div>
          <button
            onClick={() => { setCreated(null); setShowCreate(false); setName(''); setDescription(''); setRoles(''); }}
            className="text-sm text-blue-400 hover:underline"
          >
            建立另一個活動
          </button>
        </div>
      )}

      {/* 活動列表 */}
      {events.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-400">活動列表（{events.length} 個）</h3>
          {events.map(ev => (
            <div key={ev.id} className={`bg-zinc-900 border rounded-xl overflow-hidden transition-opacity ${ev.is_active ? 'border-zinc-700' : 'border-zinc-800 opacity-60'}`}>
              <div className="flex items-center gap-3 p-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color || '#ec4899' }} />
                <button onClick={() => void toggleMembers(ev)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200 truncate">{ev.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">{ev.type}</span>
                    {!ev.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-400">已停用</span>}
                  </div>
                  <p className="text-xs text-zinc-600 mt-0.5">{ev.member_count ?? 0} 人 · {ev.slug}</p>
                </button>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => void toggleMembers(ev)}
                    title="展開成員"
                    className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors text-sm"
                  >
                    {expandedSlug === ev.slug ? '▲' : '▼'}
                  </button>
                  <button
                    onClick={() => copyLink(ev.slug)}
                    title="複製加入連結"
                    className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors text-sm"
                  >
                    🔗
                  </button>
                  <button
                    onClick={() => window.open(`https://finally.click/join?slug=${ev.slug}`, '_blank')}
                    title="預覽加入頁"
                    className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors text-sm"
                  >
                    ↗
                  </button>
                  <button
                    onClick={() => void handleToggleActive(ev)}
                    title={ev.is_active ? '停用' : '啟用'}
                    className={`p-1.5 transition-colors text-sm ${ev.is_active ? 'text-zinc-600 hover:text-red-400' : 'text-zinc-600 hover:text-green-400'}`}
                  >
                    {ev.is_active ? '⏸' : '▶'}
                  </button>
                  {!ev.is_active && (
                    <button
                      onClick={() => void handleHardDelete(ev)}
                      title="永久刪除"
                      className="p-1.5 text-zinc-600 hover:text-red-500 transition-colors text-sm"
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>

              {/* 成員列表 */}
              {expandedSlug === ev.slug && (
                <div className="border-t border-zinc-800 px-3 py-2">
                  {membersLoading === ev.slug ? (
                    <p className="text-xs text-zinc-600 py-2 text-center animate-pulse">載入中…</p>
                  ) : (members[ev.slug] ?? []).length === 0 ? (
                    <p className="text-xs text-zinc-600 py-2 text-center">尚無成員</p>
                  ) : (
                    <div className="space-y-1">
                      {(members[ev.slug] ?? []).map(m => (
                        <div key={m.id} className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-zinc-800">
                          <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 flex-shrink-0">
                            {m.display_name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-zinc-300 truncate block">{m.display_name}</span>
                            {m.role && <span className="text-[10px] text-zinc-600">{m.role}</span>}
                          </div>
                          <button
                            onClick={() => void handleRemoveMember(ev, m.id)}
                            title="移除成員"
                            className="p-1 text-zinc-700 hover:text-red-400 transition-colors text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
