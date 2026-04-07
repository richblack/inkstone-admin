// Members — 成員管理（真人 + Ghost 虛擬人）
// 顯示所有 finally.click 用戶，支援活動篩選 + 類型篩選

import { useState, useEffect, useCallback } from 'react';

const FINALLY_URL = 'https://matchgpt.finally.click';

// --- 型別 ---

interface RealUser {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  gender: string | null;
  seeking_gender: string | null;
  event_count: number;
  created_at: string;
}

interface MgEvent {
  id: string;
  slug: string;
  name: string;
  type: string;
  color: string;
  is_active: number;
  member_count?: number;
}

interface EventMemberRaw {
  id: string;
  display_name: string | null;
  gender: string | null;
  is_bot: number;
  role: string | null;
  joined_at: string;
}

interface Member {
  id: string;
  email?: string;
  display_name: string | null;
  gender: string | null;
  is_bot: number; // 1 = ghost, 0 = 真人
  role: string | null;
  created_at?: string;
  joined_at?: string;
  events: { slug: string; name: string; color: string }[];
}

type TypeFilter = 'all' | 'human' | 'ghost';

// --- finally.click API helpers（共用 session token）---

let _sessionToken: string | null = null;

async function mgFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${FINALLY_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(_sessionToken ? { Authorization: `Bearer ${_sessionToken}` } : {}),
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

// --- 主元件（auth wrapper）---

export default function Members() {
  const [authState, setAuthState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    fetch('/api/auth/matchgpt-token')
      .then(res => res.ok ? res.json() as Promise<{ token: string }> : Promise.reject())
      .then(data => { _sessionToken = data.token; setAuthState('ok'); })
      .catch(() => setAuthState('error'));
  }, []);

  if (authState === 'loading') return <div className="text-zinc-500 animate-pulse text-sm py-8 text-center">載入中…</div>;
  if (authState === 'error') return <div className="text-red-400 text-sm py-8 text-center">無法取得授權，請重新登入</div>;
  return <MembersDashboard />;
}

// --- 主儀表板 ---

function MembersDashboard() {
  const [events, setEvents] = useState<MgEvent[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // userEventMap: userId → { slug, name, color }[]
  const [userEventMap, setUserEventMap] = useState<Record<string, { slug: string; name: string; color: string }[]>>({});
  // memberMap: slug → raw event member rows
  const [memberMap, setMemberMap] = useState<Record<string, EventMemberRaw[]>>({});
  // allRealUsers: 所有真人用戶（來自 /users/admin/users）
  const [allRealUsers, setAllRealUsers] = useState<Member[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 並行取用戶列表 + 活動列表
      const [{ users: rawUsers }, { events: evList }] = await Promise.all([
        mgFetch<{ users: RealUser[] }>('/users/admin/users'),
        mgFetch<{ events: MgEvent[] }>('/events/admin/all'),
      ]);
      setEvents(evList);

      // 並行取所有活動成員
      const results = await Promise.all(
        evList.map(ev =>
          mgFetch<{ members: EventMemberRaw[] }>(`/events/${encodeURIComponent(ev.slug)}/members`)
            .then(r => ({ ev, members: r.members }))
            .catch(() => ({ ev, members: [] as EventMemberRaw[] }))
        )
      );

      // 建立 memberMap（slug → members）
      const newMemberMap: Record<string, EventMemberRaw[]> = {};
      for (const { ev, members } of results) {
        newMemberMap[ev.slug] = members;
      }
      setMemberMap(newMemberMap);

      // 建立 userEventMap（userId → events[]）
      const newUserEventMap: Record<string, { slug: string; name: string; color: string }[]> = {};
      for (const { ev, members } of results) {
        for (const m of members) {
          if (!newUserEventMap[m.id]) newUserEventMap[m.id] = [];
          newUserEventMap[m.id].push({ slug: ev.slug, name: ev.name, color: ev.color });
        }
      }
      setUserEventMap(newUserEventMap);

      // 將真人用戶轉為 Member 格式（過濾掉 ghost email）
      const realMembers: Member[] = (rawUsers ?? [])
        .filter(u => !u.email.includes('@finally.click'))
        .map(u => ({
          id: u.id,
          email: u.email,
          display_name: u.display_name,
          gender: u.gender,
          is_bot: 0,
          role: u.role,
          created_at: u.created_at,
          events: newUserEventMap[u.id] ?? [],
        }));
      setAllRealUsers(realMembers);
    } catch (e) {
      if (e instanceof Error && e.message === '401') {
        setAuthError(true);
      } else {
        setError((e as Error).message ?? '載入失敗');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  if (authError) return <div className="text-red-400 text-sm py-8 text-center">無法取得授權，請重新登入</div>;

  if (loading) return <div className="text-zinc-500 animate-pulse text-sm py-8 text-center">載入成員資料…</div>;

  if (error) return (
    <div className="space-y-3">
      <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
        {error}
      </div>
      <button
        onClick={() => void loadAll()}
        className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-1.5 transition-colors"
      >
        重試
      </button>
    </div>
  );

  // 取得目前要顯示的成員列表
  let displayMembers: Member[];
  if (selectedSlug === 'all') {
    // 全部：真人用戶 + 事件中的 ghost（去重）
    const ghostsById: Record<string, Member> = {};
    for (const members of Object.values(memberMap)) {
      for (const m of members) {
        if (m.is_bot === 1 && !ghostsById[m.id]) {
          ghostsById[m.id] = {
            ...m,
            events: userEventMap[m.id] ?? [],
          };
        }
      }
    }
    displayMembers = [...allRealUsers, ...Object.values(ghostsById)];
  } else {
    // 特定活動：直接用 memberMap
    displayMembers = (memberMap[selectedSlug] ?? []).map(m => ({
      ...m,
      events: userEventMap[m.id] ?? [],
    }));
  }

  // 類型篩選
  const filtered = displayMembers.filter(m => {
    if (typeFilter === 'human') return m.is_bot === 0;
    if (typeFilter === 'ghost') return m.is_bot === 1;
    return true;
  });

  const humanCount = displayMembers.filter(m => m.is_bot === 0).length;
  const ghostCount = displayMembers.filter(m => m.is_bot === 1).length;

  return (
    <div className="space-y-4 max-w-3xl">
      {/* 頂部工具列 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 活動篩選下拉 */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500 whitespace-nowrap">活動</label>
          <select
            value={selectedSlug}
            onChange={e => setSelectedSlug(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">全部活動</option>
            {events.map(ev => (
              <option key={ev.slug} value={ev.slug}>
                {ev.name}{!ev.is_active ? ' (已停用)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 類型篩選 tabs */}
        <div className="flex rounded-lg overflow-hidden border border-zinc-700 text-xs">
          {(['all', 'human', 'ghost'] as TypeFilter[]).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 transition-colors ${typeFilter === t ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
            >
              {{ all: '全部', human: '真人', ghost: '虛擬人' }[t]}
            </button>
          ))}
        </div>

        {/* 統計 */}
        <div className="ml-auto flex gap-3 text-xs text-zinc-500">
          <span>真人 <span className="text-blue-400 font-medium">{humanCount}</span></span>
          <span>虛擬人 <span className="text-violet-400 font-medium">{ghostCount}</span></span>
        </div>

        {/* 重新整理 */}
        <button
          onClick={() => void loadAll()}
          className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
          title="重新整理"
        >
          ↺
        </button>
      </div>

      {/* 成員列表 */}
      {filtered.length === 0 ? (
        <div className="text-zinc-600 text-sm text-center py-12">
          {displayMembers.length === 0 ? '此活動目前沒有成員' : '沒有符合條件的成員'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => (
            <MemberRow key={`${m.id}-${selectedSlug}`} member={m} />
          ))}
        </div>
      )}
    </div>
  );
}

// --- 單一成員列 ---

function MemberRow({ member: m }: { member: Member }) {
  const isGhost = m.is_bot === 1;
  const initial = m.display_name?.[0]?.toUpperCase() ?? '?';

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
      isGhost
        ? 'bg-violet-950/20 border-violet-800/40 hover:bg-violet-950/30'
        : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800/60'
    }`}>
      {/* 頭像 */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
        isGhost ? 'bg-violet-800/60 text-violet-200' : 'bg-zinc-700 text-zinc-300'
      }`}>
        {initial}
      </div>

      {/* 名稱 + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-zinc-200 truncate">
            {m.display_name ?? '（未命名）'}
          </span>
          {m.email && (
            <span className="text-xs text-zinc-600 truncate">{m.email}</span>
          )}

          {/* 類型 badge */}
          {isGhost ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-800/50 text-violet-300 border border-violet-700/50 whitespace-nowrap">
              虛擬人
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-900/50 text-blue-300 border border-blue-800/50 whitespace-nowrap">
              真人
            </span>
          )}

          {/* 角色 */}
          {m.role && m.role !== 'user' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
              {m.role}
            </span>
          )}

          {/* 性別 */}
          {m.gender && (
            <span className="text-[10px] text-zinc-600">
              {m.gender}
            </span>
          )}
        </div>

        {/* 活動 badges */}
        {m.events.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {m.events.map(ev => (
              <span
                key={ev.slug}
                className="text-[10px] px-1.5 py-0.5 rounded-full border whitespace-nowrap"
                style={{
                  borderColor: `${ev.color}60`,
                  backgroundColor: `${ev.color}18`,
                  color: ev.color,
                }}
              >
                {ev.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 加入/註冊時間 */}
      <div className="text-[10px] text-zinc-600 flex-shrink-0 pt-0.5">
        {(m.joined_at ?? m.created_at)
          ? new Date(m.joined_at ?? m.created_at ?? '').toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
          : ''}
      </div>
    </div>
  );
}
