// Activities — MatchGPT 活動管理
// 透過 /api/matchgpt/* proxy，由 Pages Function 持 admin token，不需額外登入

import { useState, useEffect, useRef } from 'react';

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
  enable_matching: number;
  member_count?: number;
  download_url?: string | null;
}

interface EventMember {
  id: string;
  display_name: string;
  role: string | null;
  joined_at: string;
  is_bot: number;
  participate_in_matching: number;
}

interface WhitelistEntry {
  email: string;
  name: string | null;
  status: 'pending' | 'joined';
}

interface Stats {
  users: number;
  active_events: number;
  total_memberships: number;
  total_matches: number;
}

// 課程型別
interface Course {
  id: string;
  course_name: string;
  parent_event_id: string;
  material_url: string | null;
  is_active: number;
  created_by: string | null;
}

interface CourseWhitelistEntry {
  email: string;
  name: string | null;
  status: 'pending' | 'joined';
}

interface CourseMember {
  id: string;
  display_name: string;
  email: string;
  role: string;
  joined_at: string;
}

// --- MatchGPT API helpers（透過 /api/matchgpt proxy） ---

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

// --- 主元件 ---

export default function Activities() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<MgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, EventMember[]>>({});
  const [membersLoading, setMembersLoading] = useState<string | null>(null);

  // 白名單 state
  const [whitelist, setWhitelist] = useState<Record<string, WhitelistEntry[]>>({});
  const [whitelistLoading, setWhitelistLoading] = useState<string | null>(null);
  const [whitelistTab, setWhitelistTab] = useState<Record<string, 'members' | 'whitelist' | 'courses'>>({});
  const [wlEmail, setWlEmail] = useState('');
  const [wlName, setWlName] = useState('');
  const [wlAdding, setWlAdding] = useState(false);
  const [wlMsg, setWlMsg] = useState('');
  const [wlActiveSlug, setWlActiveSlug] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // 建立表單
  const [name, setName] = useState('');
  const [type, setType] = useState('love');
  const [description, setDescription] = useState('');
  const [roles, setRoles] = useState('');
  const [color, setColor] = useState('#ec4899');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [created, setCreated] = useState<MgEvent | null>(null);
  const [copied, setCopied] = useState(false);

  const loadAll = () => {
    setLoading(true);
    setError('');
    Promise.all([
      mgFetch<Stats>('/users/admin/stats'),
      mgFetch<{ events: MgEvent[] }>('/events/admin/all').then(r => r.events),
    ])
      .then(([s, evs]) => { setStats(s); setEvents(evs); })
      .catch(e => { setError(e instanceof Error ? e.message : '載入失敗'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  // 活動展開 tab：members | whitelist | courses（Leo 活動專用）
  const LEO_SLUG_PREFIX = 'leo-';

  const toggleMembers = async (ev: MgEvent) => {
    if (expandedSlug === ev.slug) { setExpandedSlug(null); return; }
    setExpandedSlug(ev.slug);
    // 若是 Leo 活動，預設切到 courses tab
    if (ev.slug.startsWith(LEO_SLUG_PREFIX)) {
      setWhitelistTab(prev => ({ ...prev, [ev.slug]: prev[ev.slug] ?? 'courses' as 'members' | 'whitelist' }));
      void loadCourses();
    }
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
          download_url: downloadUrl || undefined,
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

  const handleToggleMatching = async (ev: MgEvent) => {
    try {
      await mgFetch(`/events/${encodeURIComponent(ev.slug)}`, {
        method: 'PUT',
        body: JSON.stringify({ enable_matching: !ev.enable_matching }),
      });
      loadAll();
    } catch { /* ignore */ }
  };

  const handleToggleParticipate = async (ev: MgEvent, member: EventMember) => {
    try {
      await mgFetch(`/admin/users/${encodeURIComponent(member.id)}`, {
        method: 'PUT',
        body: JSON.stringify({ participate_in_matching: !member.participate_in_matching }),
      });
      setMembers(prev => ({
        ...prev,
        [ev.slug]: (prev[ev.slug] ?? []).map(m =>
          m.id === member.id ? { ...m, participate_in_matching: member.participate_in_matching ? 0 : 1 } : m
        ),
      }));
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

  // 白名單函式
  const loadWhitelist = async (ev: MgEvent) => {
    setWhitelistLoading(ev.slug);
    try {
      const res = await mgFetch<{ whitelist: WhitelistEntry[] }>(`/events/${encodeURIComponent(ev.slug)}/whitelist`);
      setWhitelist(prev => ({ ...prev, [ev.slug]: res.whitelist }));
    } catch { /* ignore */ }
    setWhitelistLoading(null);
  };

  const switchTab = (ev: MgEvent, tab: 'members' | 'whitelist' | 'courses') => {
    setWhitelistTab(prev => ({ ...prev, [ev.slug]: tab }));
    setWlActiveSlug(ev.slug);
    setWlMsg('');
    if (tab === 'whitelist' && !whitelist[ev.slug]) {
      void loadWhitelist(ev);
    }
    if (tab === 'courses') {
      void loadCourses();
    }
  };

  const handleAddWhitelist = async (ev: MgEvent) => {
    if (!wlEmail.trim()) return;
    setWlAdding(true);
    setWlMsg('');
    try {
      await mgFetch(`/events/${encodeURIComponent(ev.slug)}/whitelist`, {
        method: 'POST',
        body: JSON.stringify({ email: wlEmail.trim(), name: wlName.trim() || undefined }),
      });
      setWlMsg('已新增');
      setWlEmail('');
      setWlName('');
      await loadWhitelist(ev);
    } catch (e) {
      setWlMsg(e instanceof Error ? e.message : '新增失敗');
    } finally {
      setWlAdding(false);
    }
  };

  const handleDeleteWhitelist = async (ev: MgEvent, email: string) => {
    if (!confirm(`刪除 ${email}？`)) return;
    try {
      await mgFetch(`/events/${encodeURIComponent(ev.slug)}/whitelist/${encodeURIComponent(email)}`, { method: 'DELETE' });
      setWhitelist(prev => ({ ...prev, [ev.slug]: (prev[ev.slug] ?? []).filter(e => e.email !== email) }));
    } catch { /* ignore */ }
  };

  const handleCsvUpload = async (ev: MgEvent, file: File) => {
    const text = await file.text();
    const lines = text.trim().split(/\r?\n/);
    const emails: Array<{ email: string; name?: string }> = [];
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      const email = parts[0];
      const name = parts[1];
      if (email && email.includes('@')) {
        emails.push({ email, name: name || undefined });
      }
    }
    if (emails.length === 0) { setWlMsg('CSV 中找不到有效 email'); return; }
    setWlAdding(true);
    setWlMsg('');
    try {
      const res = await mgFetch<{ added: number; skipped: number }>(`/events/${encodeURIComponent(ev.slug)}/whitelist/batch`, {
        method: 'POST',
        body: JSON.stringify({ emails }),
      });
      setWlMsg(`${res.added} 筆匯入成功，${res.skipped} 筆重複跳過`);
      await loadWhitelist(ev);
    } catch (e) {
      setWlMsg(e instanceof Error ? e.message : '批次上傳失敗');
    } finally {
      setWlAdding(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  // ===== 課程管理 state（Leo 活動固定 event ID）=====
  const LEO_EVENT_ID = '97f5eb79-1f76-4794-9c33-a1bb1d597056';
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseMaterial, setNewCourseMaterial] = useState('');
  const [courseCreating, setCourseCreating] = useState(false);
  const [courseMsg, setCourseMsg] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [courseWhitelist, setCourseWhitelist] = useState<Record<string, CourseWhitelistEntry[]>>({});
  const [courseWlLoading, setCourseWlLoading] = useState<string | null>(null);
  const [courseWlEmail, setCourseWlEmail] = useState('');
  const [courseWlName, setCourseWlName] = useState('');
  const [courseWlAdding, setCourseWlAdding] = useState(false);
  const [courseWlMsg, setCourseWlMsg] = useState('');
  const [courseWlActiveId, setCourseWlActiveId] = useState<string | null>(null);
  const courseCsvRef = useRef<HTMLInputElement>(null);
  const coursePdfRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [courseUploadMsg, setCourseUploadMsg] = useState<Record<string, string>>({});
  const [courseUploading, setCourseUploading] = useState<Record<string, boolean>>({});
  const [courseMembers, setCourseMembers] = useState<Record<string, CourseMember[]>>({});
  const [courseMembersLoading, setCourseMembersLoading] = useState<string | null>(null);
  const [courseExpandedTab, setCourseExpandedTab] = useState<Record<string, 'members' | 'whitelist'>>({});

  const loadCourses = async () => {
    setCoursesLoading(true);
    try {
      const res = await mgFetch<{ courses: Course[] }>(`/courses/by-event/${encodeURIComponent(LEO_EVENT_ID)}`);
      setCourses(res.courses);
      // 預載每個課程的學員數
      await Promise.all(res.courses.map(async (course) => {
        try {
          const mr = await mgFetch<{ members: CourseMember[]; total: number }>(`/courses/${encodeURIComponent(course.id)}/members`);
          setCourseMembers(prev => ({ ...prev, [course.id]: mr.members }));
        } catch { /* ignore */ }
      }));
    } catch { /* ignore */ }
    setCoursesLoading(false);
  };

  const handleCreateCourse = async () => {
    if (!newCourseName) return;
    setCourseCreating(true);
    setCourseMsg('');
    try {
      await mgFetch<Course>('/courses', {
        method: 'POST',
        body: JSON.stringify({ course_name: newCourseName, parent_event_id: LEO_EVENT_ID, material_url: newCourseMaterial || undefined }),
      });
      setCourseMsg(`課程「${newCourseName}」已建立`);
      setNewCourseName('');
      setNewCourseMaterial('');
      setShowCreateCourse(false);
      await loadCourses();
    } catch (e) {
      setCourseMsg(e instanceof Error ? e.message : '建立失敗');
    } finally {
      setCourseCreating(false);
    }
  };

  const handleDeleteCourse = async (course: Course) => {
    if (!confirm(`刪除課程「${course.course_name}」？`)) return;
    try {
      await mgFetch(`/courses/${encodeURIComponent(course.id)}`, { method: 'DELETE' });
      await loadCourses();
    } catch { /* ignore */ }
  };

  const loadCourseWhitelist = async (course: Course) => {
    setCourseWlLoading(course.id);
    try {
      const res = await mgFetch<{ whitelist: CourseWhitelistEntry[] }>(`/courses/${encodeURIComponent(course.id)}/whitelist`);
      setCourseWhitelist(prev => ({ ...prev, [course.id]: res.whitelist }));
    } catch { /* ignore */ }
    setCourseWlLoading(null);
  };

  const loadCourseMembers = async (course: Course) => {
    setCourseMembersLoading(course.id);
    try {
      const res = await mgFetch<{ members: CourseMember[]; total: number }>(`/courses/${encodeURIComponent(course.id)}/members`);
      setCourseMembers(prev => ({ ...prev, [course.id]: res.members }));
    } catch { /* ignore */ }
    setCourseMembersLoading(null);
  };

  const toggleCourse = async (course: Course) => {
    if (expandedCourseId === course.id) { setExpandedCourseId(null); return; }
    setExpandedCourseId(course.id);
    // 預設展開 members tab
    if (!courseExpandedTab[course.id]) {
      setCourseExpandedTab(prev => ({ ...prev, [course.id]: 'members' }));
    }
    if (!courseMembers[course.id]) {
      await loadCourseMembers(course);
    }
    if (!courseWhitelist[course.id]) {
      await loadCourseWhitelist(course);
    }
  };

  const handleAddCourseWhitelist = async (course: Course) => {
    if (!courseWlEmail.trim()) return;
    setCourseWlAdding(true);
    setCourseWlMsg('');
    try {
      await mgFetch(`/courses/${encodeURIComponent(course.id)}/whitelist`, {
        method: 'POST',
        body: JSON.stringify({ email: courseWlEmail.trim(), name: courseWlName.trim() || undefined }),
      });
      setCourseWlMsg('已新增');
      setCourseWlEmail('');
      setCourseWlName('');
      await loadCourseWhitelist(course);
    } catch (e) {
      setCourseWlMsg(e instanceof Error ? e.message : '新增失敗');
    } finally {
      setCourseWlAdding(false);
    }
  };

  const handleDeleteCourseWhitelist = async (course: Course, email: string) => {
    if (!confirm(`刪除 ${email}？`)) return;
    try {
      await mgFetch(`/courses/${encodeURIComponent(course.id)}/whitelist/${encodeURIComponent(email)}`, { method: 'DELETE' });
      setCourseWhitelist(prev => ({ ...prev, [course.id]: (prev[course.id] ?? []).filter(e => e.email !== email) }));
    } catch { /* ignore */ }
  };

  const handleCourseCsvUpload = async (course: Course, file: File) => {
    const text = await file.text();
    const lines = text.trim().split(/\r?\n/);
    const emails: Array<{ email: string; name?: string }> = [];
    for (const line of lines) {
      const parts = line.split(',').map((p: string) => p.trim().replace(/^"|"$/g, ''));
      const email = parts[0];
      const name = parts[1];
      if (email && email.includes('@')) emails.push({ email, name: name || undefined });
    }
    if (emails.length === 0) { setCourseWlMsg('CSV 中找不到有效 email'); return; }
    setCourseWlAdding(true);
    setCourseWlMsg('');
    try {
      const res = await mgFetch<{ added: number; skipped: number }>(`/courses/${encodeURIComponent(course.id)}/whitelist/batch`, {
        method: 'POST',
        body: JSON.stringify({ emails }),
      });
      setCourseWlMsg(`${res.added} 筆匯入成功，${res.skipped} 筆重複跳過`);
      await loadCourseWhitelist(course);
    } catch (e) {
      setCourseWlMsg(e instanceof Error ? e.message : '批次上傳失敗');
    } finally {
      setCourseWlAdding(false);
      if (courseCsvRef.current) courseCsvRef.current.value = '';
    }
  };

  const handleCoursePdfUpload = async (course: Course, file: File) => {
    setCourseUploading(prev => ({ ...prev, [course.id]: true }));
    setCourseUploadMsg(prev => ({ ...prev, [course.id]: '' }));
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/matchgpt/courses/${encodeURIComponent(course.id)}/upload-material`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { filename: string };
      setCourseUploadMsg(prev => ({ ...prev, [course.id]: `${data.filename} 上傳成功` }));
      await loadCourses();
    } catch (e) {
      setCourseUploadMsg(prev => ({ ...prev, [course.id]: e instanceof Error ? e.message : '上傳失敗' }));
    } finally {
      setCourseUploading(prev => ({ ...prev, [course.id]: false }));
      const ref = coursePdfRefs.current[course.id];
      if (ref) ref.value = '';
    }
  };

  const courseJoinUrl = (courseId: string) => `https://finally.click/join?course=${courseId}`;

  const joinUrl = (slug: string) => `https://finally.click/join?slug=${slug}`;

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(joinUrl(slug));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && events.length === 0) {
    return <div className="text-zinc-500 animate-pulse text-sm py-8 text-center">載入中…</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-red-400 text-sm">{error}</p>
        <button onClick={loadAll} className="text-xs text-zinc-500 hover:text-zinc-300 underline">重試</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 頂部：統計 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          {stats && [
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
      </div>

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
          <div className="grid grid-cols-4 gap-2">
            {(['love', 'hack', 'career', 'custom'] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`py-1.5 rounded-lg text-xs border transition-colors ${type === t ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}
              >
                {{ love: '交友', hack: '黑客松', career: '徵才', custom: '其他' }[t]}
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
          <div>
            <input
              type="url"
              value={downloadUrl}
              onChange={e => setDownloadUrl(e.target.value)}
              placeholder="下載連結（選填，例：https://slides.example.com/...）"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-zinc-600 mt-1">學員可在聊天頁下載簡報或資料</p>
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
              {joinUrl(created.slug)}
            </code>
            <button onClick={() => copyLink(created.slug)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0">
              {copied ? '✓ 已複製' : '複製'}
            </button>
          </div>
          <button
            onClick={() => { setCreated(null); setShowCreate(false); setName(''); setDescription(''); setRoles(''); setDownloadUrl(''); }}
            className="text-sm text-blue-400 hover:underline"
          >
            建立另一個活動
          </button>
        </div>
      )}

      {/* 活動列表 */}
      {events.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-400">活動列表（{events.length} 個）<span className="text-zinc-600 font-normal text-xs ml-2">點進 Leo 老師課後助教查看課程</span></h3>
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
                  <p className="text-xs text-zinc-600 mt-0.5 flex items-center gap-1.5">
                    {ev.member_count ?? 0} 人 · {ev.slug}
                    {!ev.enable_matching && <span className="px-1 py-0.5 rounded bg-yellow-900/40 text-yellow-500 text-[10px]">配對關閉</span>}
                  </p>
                  {!ev.slug.startsWith(LEO_SLUG_PREFIX) && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-600 truncate max-w-[200px]">{joinUrl(ev.slug)}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyLink(ev.slug); }}
                        className="text-[10px] px-1.5 py-0.5 bg-blue-950 text-blue-400 rounded hover:bg-blue-900 shrink-0 transition-colors"
                      >
                        複製連結
                      </button>
                    </div>
                  )}
                  {ev.slug.startsWith(LEO_SLUG_PREFIX) && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-yellow-600">學員透過課程專屬 URL 加入，不開放活動直接加入</span>
                    </div>
                  )}
                </button>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => void toggleMembers(ev)}
                    title="展開成員"
                    className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors text-sm"
                  >
                    {expandedSlug === ev.slug ? '▲' : '▼'}
                  </button>
                  {!ev.slug.startsWith(LEO_SLUG_PREFIX) && (
                    <>
                      <button
                        onClick={() => copyLink(ev.slug)}
                        title="複製加入連結"
                        className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors text-sm"
                      >
                        🔗
                      </button>
                      <button
                        onClick={() => window.open(joinUrl(ev.slug), '_blank')}
                        title="預覽加入頁"
                        className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors text-sm"
                      >
                        ↗
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => void handleToggleMatching(ev)}
                    title={ev.enable_matching ? '關閉配對' : '開啟配對'}
                    className={`p-1.5 transition-colors text-sm ${ev.enable_matching ? 'text-pink-500 hover:text-zinc-500' : 'text-zinc-700 hover:text-pink-400'}`}
                  >
                    ♥
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

              {/* 展開區：Members + Whitelist tabs（Leo 活動加 Courses tab）*/}
              {expandedSlug === ev.slug && (
                <div className="border-t border-zinc-800">
                  {/* Tab 切換 */}
                  <div className="flex border-b border-zinc-800 px-3">
                    {(ev.slug.startsWith(LEO_SLUG_PREFIX)
                      ? (['courses', 'whitelist'] as const)
                      : (['members', 'whitelist'] as const)
                    ).map(tab => (
                      <button
                        key={tab}
                        onClick={() => switchTab(ev, tab)}
                        className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                          (whitelistTab[ev.slug] ?? (ev.slug.startsWith(LEO_SLUG_PREFIX) ? 'courses' : 'members')) === tab
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {tab === 'members' ? `成員 (${(members[ev.slug] ?? []).length})`
                          : tab === 'whitelist' ? `白名單 (${(whitelist[ev.slug] ?? []).length})`
                          : `課程 (${courses.length})`}
                      </button>
                    ))}
                  </div>

                  {/* Courses tab（Leo 活動專用）*/}
                  {(whitelistTab[ev.slug] ?? (ev.slug.startsWith(LEO_SLUG_PREFIX) ? 'courses' : 'members')) === 'courses' && (
                    <div className="px-3 py-3 space-y-3">
                      {courseMsg && (
                        <p className={`text-xs px-2 py-1 rounded ${courseMsg.includes('失敗') ? 'text-red-400 bg-red-400/10' : 'text-green-400 bg-green-400/10'}`}>
                          {courseMsg}
                        </p>
                      )}
                      {/* 新增課程按鈕 */}
                      {!showCreateCourse ? (
                        <button
                          onClick={() => setShowCreateCourse(true)}
                          className="w-full border border-dashed border-blue-900 rounded-lg p-3 text-blue-500 hover:text-blue-300 hover:border-blue-700 transition-colors text-xs"
                        >
                          + 新增課程
                        </button>
                      ) : (
                        <div className="bg-zinc-950 border border-blue-900/50 rounded-lg p-3 space-y-2">
                          <input
                            value={newCourseName}
                            onChange={e => setNewCourseName(e.target.value)}
                            placeholder="課程名稱（例：Python 入門班 2026）"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                          />
                          <input
                            type="url"
                            value={newCourseMaterial}
                            onChange={e => setNewCourseMaterial(e.target.value)}
                            placeholder="教材連結（選填）"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setShowCreateCourse(false)} className="flex-1 border border-zinc-700 rounded py-1.5 text-xs text-zinc-400 hover:text-zinc-200">取消</button>
                            <button
                              onClick={() => void handleCreateCourse()}
                              disabled={!newCourseName || courseCreating}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded py-1.5 text-xs font-medium"
                            >
                              {courseCreating ? '建立中…' : '建立'}
                            </button>
                          </div>
                        </div>
                      )}
                      {/* 課程列表 */}
                      {coursesLoading ? (
                        <p className="text-xs text-zinc-500 text-center py-2 animate-pulse">載入中…</p>
                      ) : courses.length === 0 ? (
                        <p className="text-xs text-zinc-600 text-center py-2">尚無課程</p>
                      ) : (
                        <div className="space-y-2">
                          {courses.map(course => (
                            <div key={course.id} className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                              <div className="flex items-center gap-2 p-2.5">
                                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                                <button onClick={() => void toggleCourse(course)} className="flex-1 text-left min-w-0">
                                  <span className="text-xs font-medium text-zinc-200 block truncate">{course.course_name}</span>
                                  <span className="text-[10px] text-zinc-300 font-medium">
                                    {courseMembers[course.id] !== undefined
                                      ? `${courseMembers[course.id].length} 位學員`
                                      : '載入中…'}
                                  </span>
                                  {course.material_url
                                    ? <span className="text-[10px] text-green-500 ml-2">有教材</span>
                                    : <span className="text-[10px] text-zinc-600 ml-2">無教材</span>
                                  }
                                </button>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {/* PDF 上傳按鈕 */}
                                  <input
                                    ref={el => { coursePdfRefs.current[course.id] = el; }}
                                    type="file"
                                    accept=".pdf,.pptx,.docx,.xlsx,.zip"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) void handleCoursePdfUpload(course, f); }}
                                    className="hidden"
                                    id={`pdf-${course.id}`}
                                  />
                                  <label
                                    htmlFor={`pdf-${course.id}`}
                                    title="上傳教材 PDF"
                                    className={`p-1 cursor-pointer transition-colors text-xs ${courseUploading[course.id] ? 'text-yellow-500 animate-pulse' : 'text-zinc-600 hover:text-green-400'}`}
                                  >
                                    {courseUploading[course.id] ? '⏳' : '📎'}
                                  </label>
                                  <button
                                    onClick={() => { navigator.clipboard.writeText(courseJoinUrl(course.id)); setCourseMsg('連結已複製'); }}
                                    title="複製邀請連結"
                                    className="p-1 text-zinc-600 hover:text-blue-400 transition-colors text-xs"
                                  >
                                    🔗
                                  </button>
                                  <button
                                    onClick={() => void toggleCourse(course)}
                                    className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors text-xs"
                                  >
                                    {expandedCourseId === course.id ? '▲' : '▼'}
                                  </button>
                                  <button
                                    onClick={() => void handleDeleteCourse(course)}
                                    title="刪除課程"
                                    className="p-1 text-zinc-700 hover:text-red-400 transition-colors text-xs"
                                  >
                                    🗑
                                  </button>
                                </div>
                              </div>
                              {/* 上傳狀態訊息 */}
                              {courseUploadMsg[course.id] && (
                                <div className={`px-3 pb-1 text-[10px] ${courseUploadMsg[course.id].includes('失敗') || courseUploadMsg[course.id].includes('超過') ? 'text-red-400' : 'text-green-400'}`}>
                                  {courseUploadMsg[course.id]}
                                </div>
                              )}
                              {/* 課程展開：學員清單 + 白名單管理 */}
                              {expandedCourseId === course.id && (
                                <div className="border-t border-zinc-800">
                                  {/* 邀請連結 */}
                                  <div className="px-3 pt-2 flex items-center gap-2">
                                    <code className="text-[10px] text-blue-400 truncate flex-1">{courseJoinUrl(course.id)}</code>
                                  </div>
                                  {/* Tab 切換 */}
                                  <div className="flex border-b border-zinc-800 px-3 mt-2">
                                    {(['members', 'whitelist'] as const).map(tab => (
                                      <button
                                        key={tab}
                                        onClick={() => setCourseExpandedTab(prev => ({ ...prev, [course.id]: tab }))}
                                        className={`px-3 py-1.5 text-[11px] font-medium border-b-2 transition-colors ${
                                          (courseExpandedTab[course.id] ?? 'members') === tab
                                            ? 'border-blue-500 text-blue-400'
                                            : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                        }`}
                                      >
                                        {tab === 'members'
                                          ? `已加入學員 (${(courseMembers[course.id] ?? []).length})`
                                          : `白名單 (${(courseWhitelist[course.id] ?? []).length})`}
                                      </button>
                                    ))}
                                  </div>

                                  {/* 學員清單 tab */}
                                  {(courseExpandedTab[course.id] ?? 'members') === 'members' && (
                                    <div className="px-3 py-2">
                                      {courseMembersLoading === course.id ? (
                                        <p className="text-[11px] text-zinc-600 text-center animate-pulse py-2">載入中…</p>
                                      ) : (courseMembers[course.id] ?? []).length === 0 ? (
                                        <p className="text-[11px] text-zinc-600 text-center py-2">尚無學員加入</p>
                                      ) : (
                                        <div className="space-y-1 max-h-48 overflow-y-auto">
                                          {(courseMembers[course.id] ?? []).map(m => (
                                            <div key={m.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-zinc-800">
                                              <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] text-zinc-400 flex-shrink-0">
                                                {m.display_name?.[0]?.toUpperCase() ?? '?'}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <span className="text-[11px] text-zinc-300 truncate block">{m.display_name}</span>
                                                <span className="text-[10px] text-zinc-500 truncate block">{m.email}</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* 白名單 tab */}
                                  {(courseExpandedTab[course.id] ?? 'members') === 'whitelist' && (
                                    <div className="px-3 py-2 space-y-2">
                                      <div className="flex gap-1">
                                        <input
                                          value={courseWlActiveId === course.id ? courseWlEmail : ''}
                                          onChange={e => { setCourseWlActiveId(course.id); setCourseWlEmail(e.target.value); }}
                                          placeholder="email@example.com"
                                          className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                                        />
                                        <input
                                          value={courseWlActiveId === course.id ? courseWlName : ''}
                                          onChange={e => { setCourseWlActiveId(course.id); setCourseWlName(e.target.value); }}
                                          placeholder="姓名（選填）"
                                          className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                                        />
                                        <button
                                          onClick={() => void handleAddCourseWhitelist(course)}
                                          disabled={courseWlAdding || !(courseWlActiveId === course.id ? courseWlEmail : '').trim()}
                                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-[11px] font-medium"
                                        >
                                          新增
                                        </button>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <input
                                          ref={courseCsvRef}
                                          type="file"
                                          accept=".csv,.txt"
                                          onChange={e => { const f = e.target.files?.[0]; if (f) void handleCourseCsvUpload(course, f); }}
                                          className="hidden"
                                          id={`course-csv-${course.id}`}
                                        />
                                        <label
                                          htmlFor={`course-csv-${course.id}`}
                                          className="cursor-pointer px-2 py-1 border border-zinc-700 rounded text-[11px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
                                        >
                                          批次 CSV
                                        </label>
                                        <span className="text-[10px] text-zinc-600">email,姓名（每行）</span>
                                      </div>
                                      {courseWlActiveId === course.id && courseWlMsg && (
                                        <p className={`text-[11px] px-2 py-1 rounded ${courseWlMsg.includes('失敗') || courseWlMsg.includes('重複') ? 'text-red-400 bg-red-400/10' : 'text-green-400 bg-green-400/10'}`}>
                                          {courseWlMsg}
                                        </p>
                                      )}
                                      {courseWlLoading === course.id ? (
                                        <p className="text-[11px] text-zinc-600 text-center animate-pulse">載入中…</p>
                                      ) : (courseWhitelist[course.id] ?? []).length === 0 ? (
                                        <p className="text-[11px] text-zinc-600 text-center">白名單空白</p>
                                      ) : (
                                        <div className="space-y-1 max-h-40 overflow-y-auto">
                                          {(courseWhitelist[course.id] ?? []).map(e => (
                                            <div key={e.email} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-zinc-800">
                                              <div className="flex-1 min-w-0">
                                                <span className="text-[11px] text-zinc-300 truncate block">{e.email}</span>
                                                {e.name && <span className="text-[10px] text-zinc-500">{e.name}</span>}
                                              </div>
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${e.status === 'joined' ? 'bg-green-900/40 text-green-400' : 'bg-yellow-900/40 text-yellow-400'}`}>
                                                {e.status === 'joined' ? '已加入' : '待加入'}
                                              </span>
                                              <button
                                                onClick={() => void handleDeleteCourseWhitelist(course, e.email)}
                                                className="p-1 text-zinc-700 hover:text-red-400 transition-colors text-xs"
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
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Members tab */}
                  {(whitelistTab[ev.slug] ?? (ev.slug.startsWith(LEO_SLUG_PREFIX) ? 'courses' : 'members')) === 'members' && (
                    <div className="px-3 py-2">
                      {membersLoading === ev.slug ? (
                        <p className="text-xs text-zinc-600 py-2 text-center animate-pulse">載入中…</p>
                      ) : (members[ev.slug] ?? []).length === 0 ? (
                        <p className="text-xs text-zinc-600 py-2 text-center">尚無成員</p>
                      ) : (
                        <div className="space-y-1">
                          {(members[ev.slug] ?? []).map(m => (
                            <div key={m.id} className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-zinc-800">
                              <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 flex-shrink-0">
                                {m.is_bot ? '🤖' : (m.display_name?.[0]?.toUpperCase() ?? '?')}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs text-zinc-300 truncate block">{m.display_name}</span>
                                {m.role && <span className="text-[10px] text-zinc-600">{m.role}</span>}
                              </div>
                              {m.is_bot ? (
                                <button
                                  onClick={() => void handleToggleParticipate(ev, m)}
                                  title={m.participate_in_matching ? '關閉配對參與' : '開啟配對參與'}
                                  className={`p-1 transition-colors text-sm ${m.participate_in_matching ? 'text-pink-500 hover:text-zinc-500' : 'text-zinc-700 hover:text-pink-400'}`}
                                >
                                  ♥
                                </button>
                              ) : null}
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

                  {/* Whitelist tab */}
                  {(whitelistTab[ev.slug] ?? (ev.slug.startsWith(LEO_SLUG_PREFIX) ? 'courses' : 'members')) === 'whitelist' && (
                    <div className="px-3 py-2 space-y-3">
                      {/* 新增單筆 */}
                      <div className="flex gap-2">
                        <input
                          value={wlActiveSlug === ev.slug ? wlEmail : ''}
                          onChange={e => { setWlActiveSlug(ev.slug); setWlEmail(e.target.value); }}
                          placeholder="email@example.com"
                          className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                        />
                        <input
                          value={wlActiveSlug === ev.slug ? wlName : ''}
                          onChange={e => { setWlActiveSlug(ev.slug); setWlName(e.target.value); }}
                          placeholder="姓名（選填）"
                          className="w-24 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={() => void handleAddWhitelist(ev)}
                          disabled={wlAdding || !(wlActiveSlug === ev.slug ? wlEmail : '').trim()}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-xs font-medium transition-colors"
                        >
                          新增
                        </button>
                      </div>

                      {/* CSV 上傳 */}
                      <div className="flex items-center gap-2">
                        <input
                          ref={csvInputRef}
                          type="file"
                          accept=".csv,.txt"
                          onChange={e => { const f = e.target.files?.[0]; if (f) void handleCsvUpload(ev, f); }}
                          className="hidden"
                          id={`csv-${ev.slug}`}
                        />
                        <label
                          htmlFor={`csv-${ev.slug}`}
                          className="cursor-pointer px-2 py-1 border border-zinc-700 rounded text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
                        >
                          批次上傳 CSV
                        </label>
                        <span className="text-[10px] text-zinc-600">格式：email,姓名（每行一筆）</span>
                      </div>

                      {/* 訊息 */}
                      {wlActiveSlug === ev.slug && wlMsg && (
                        <p className={`text-xs px-2 py-1 rounded ${wlMsg.includes('失敗') || wlMsg.includes('重複') ? 'text-red-400 bg-red-400/10' : 'text-green-400 bg-green-400/10'}`}>
                          {wlMsg}
                        </p>
                      )}

                      {/* 白名單列表 */}
                      {whitelistLoading === ev.slug ? (
                        <p className="text-xs text-zinc-600 py-2 text-center animate-pulse">載入中…</p>
                      ) : (whitelist[ev.slug] ?? []).length === 0 ? (
                        <p className="text-xs text-zinc-600 py-2 text-center">白名單空白</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {(whitelist[ev.slug] ?? []).map(e => (
                            <div key={e.email} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-zinc-800">
                              <div className="flex-1 min-w-0">
                                <span className="text-xs text-zinc-300 truncate block">{e.email}</span>
                                {e.name && <span className="text-[10px] text-zinc-500">{e.name}</span>}
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${e.status === 'joined' ? 'bg-green-900/40 text-green-400' : 'bg-yellow-900/40 text-yellow-400'}`}>
                                {e.status === 'joined' ? '已加入' : '待加入'}
                              </span>
                              <button
                                onClick={() => void handleDeleteWhitelist(ev, e.email)}
                                title="刪除"
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
