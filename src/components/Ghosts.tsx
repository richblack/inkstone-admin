// Ghosts — 虛擬人管理
// 列出、編輯、新增 @finally.click 虛擬人帳號

import { useState, useEffect, useCallback } from 'react';

interface Ghost {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  personality_prompt: string | null;
  participate_in_matching: number;
  is_active: number;
  created_at: string;
}

interface EditState {
  display_name: string;
  avatar_url: string;
  personality_prompt: string;
  participate_in_matching: boolean;
  is_active: boolean;
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

function ghostInitials(g: Ghost) {
  return (g.display_name ?? g.email).charAt(0).toUpperCase();
}

export default function Ghosts() {
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 編輯面板
  const [editing, setEditing] = useState<Ghost | null>(null);
  const [editForm, setEditForm] = useState<EditState>({
    display_name: '', avatar_url: '', personality_prompt: '',
    participate_in_matching: true, is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // 新增面板
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', display_name: '', personality_prompt: '', participate_in_matching: true,
  });
  const [creating, setCreating] = useState(false);

  const loadGhosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await mgFetch<{ ghosts: Ghost[] }>('/admin/ghosts');
      setGhosts(data.ghosts);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadGhosts(); }, [loadGhosts]);

  function openEdit(g: Ghost) {
    setEditing(g);
    setEditForm({
      display_name: g.display_name ?? '',
      avatar_url: g.avatar_url ?? '',
      personality_prompt: g.personality_prompt ?? '',
      participate_in_matching: g.participate_in_matching === 1,
      is_active: g.is_active === 1,
    });
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      await mgFetch(`/admin/ghosts/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          display_name: editForm.display_name || null,
          avatar_url: editForm.avatar_url || null,
          personality_prompt: editForm.personality_prompt || null,
          participate_in_matching: editForm.participate_in_matching,
          is_active: editForm.is_active,
        }),
      });
      setEditing(null);
      void loadGhosts();
    } catch (e) {
      alert(`儲存失敗：${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!createForm.name.trim()) { alert('name 為必填'); return; }
    setCreating(true);
    try {
      await mgFetch('/admin/ghosts', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name.trim(),
          display_name: createForm.display_name || undefined,
          personality_prompt: createForm.personality_prompt || undefined,
          participate_in_matching: createForm.participate_in_matching,
        }),
      });
      setShowCreate(false);
      setCreateForm({ name: '', display_name: '', personality_prompt: '', participate_in_matching: true });
      void loadGhosts();
    } catch (e) {
      alert(`新增失敗：${(e as Error).message}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleQuickToggle(g: Ghost, field: 'participate_in_matching' | 'is_active') {
    const newVal = g[field] === 1 ? 0 : 1;
    try {
      await mgFetch(`/admin/ghosts/${g.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: newVal === 1 }),
      });
      setGhosts(prev => prev.map(x => x.id === g.id ? { ...x, [field]: newVal } : x));
    } catch (e) {
      alert(`更新失敗：${(e as Error).message}`);
    }
  }

  return (
    <div className="space-y-4">
      {/* 標題列 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">虛擬人管理</h2>
          <p className="text-xs text-zinc-500 mt-0.5">所有 @finally.click 帳號</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
        >
          + 新增虛擬人
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* Ghost 列表 */}
      {loading ? (
        <div className="text-zinc-500 text-sm animate-pulse">載入中…</div>
      ) : ghosts.length === 0 ? (
        <div className="text-zinc-500 text-sm">尚無虛擬人</div>
      ) : (
        <div className="grid gap-3">
          {ghosts.map(g => (
            <div
              key={g.id}
              className={`bg-zinc-900 border rounded-xl p-4 flex items-start gap-4 transition-opacity ${
                g.is_active === 0 ? 'opacity-50 border-zinc-800' : 'border-zinc-700'
              }`}
            >
              {/* 頭像 */}
              <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-300 flex-shrink-0 overflow-hidden">
                {g.avatar_url
                  ? <img src={g.avatar_url} alt="" className="w-full h-full object-cover" />
                  : ghostInitials(g)
                }
              </div>

              {/* 資料 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-zinc-100">
                    {g.display_name ?? '（未設定名稱）'}
                  </span>
                  <span className="text-xs text-zinc-500">{g.email}</span>
                  {g.is_active === 0 && (
                    <span className="text-xs text-zinc-600 bg-zinc-800 rounded px-1.5 py-0.5">停用</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  {/* 配對開關 */}
                  <button
                    onClick={() => void handleQuickToggle(g, 'participate_in_matching')}
                    className={`flex items-center gap-1 text-xs rounded px-2 py-0.5 transition-colors ${
                      g.participate_in_matching
                        ? 'text-pink-400 bg-pink-900/30 hover:bg-pink-900/50'
                        : 'text-zinc-500 bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    ♥ {g.participate_in_matching ? '參與配對' : '不配對'}
                  </button>
                  {/* 啟用開關 */}
                  <button
                    onClick={() => void handleQuickToggle(g, 'is_active')}
                    className={`flex items-center gap-1 text-xs rounded px-2 py-0.5 transition-colors ${
                      g.is_active
                        ? 'text-green-400 bg-green-900/30 hover:bg-green-900/50'
                        : 'text-zinc-500 bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    {g.is_active ? '● 啟用' : '○ 停用'}
                  </button>
                </div>
                {g.personality_prompt && (
                  <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2">{g.personality_prompt}</p>
                )}
              </div>

              {/* 編輯按鈕 */}
              <button
                onClick={() => openEdit(g)}
                className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-2.5 py-1.5 transition-colors flex-shrink-0"
              >
                編輯
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ======= 編輯 Modal ======= */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-100">編輯虛擬人</h3>
              <button
                onClick={() => setEditing(null)}
                className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
              >×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Email（不可修改）</label>
                <div className="text-xs text-zinc-500 bg-zinc-800 rounded-lg px-3 py-2">{editing.email}</div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">顯示名稱</label>
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                  value={editForm.display_name}
                  onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
                  placeholder="例：Maya"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">頭像 URL（選填）</label>
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                  value={editForm.avatar_url}
                  onChange={e => setEditForm(f => ({ ...f, avatar_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">人設提示詞</label>
                <textarea
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 resize-none"
                  rows={5}
                  value={editForm.personality_prompt}
                  onChange={e => setEditForm(f => ({ ...f, personality_prompt: e.target.value }))}
                  placeholder="描述這個虛擬人的個性、背景、溝通風格…"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-pink-500"
                    checked={editForm.participate_in_matching}
                    onChange={e => setEditForm(f => ({ ...f, participate_in_matching: e.target.checked }))}
                  />
                  <span className="text-sm text-zinc-300">參與配對</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-green-500"
                    checked={editForm.is_active}
                    onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                  />
                  <span className="text-sm text-zinc-300">帳號啟用</span>
                </label>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {saving ? '儲存中…' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======= 新增 Modal ======= */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-100">新增虛擬人</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
              >×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">名稱識別碼 <span className="text-red-400">*</span></label>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                    value={createForm.name}
                    onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="例：nova"
                  />
                  <span className="text-xs text-zinc-500 flex-shrink-0">.ghost@finally.click</span>
                </div>
                {createForm.name && (
                  <p className="text-xs text-zinc-500 mt-1">
                    → 產生 email：{createForm.name.toLowerCase()}.ghost@finally.click
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">顯示名稱（選填，預設同識別碼）</label>
                <input
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                  value={createForm.display_name}
                  onChange={e => setCreateForm(f => ({ ...f, display_name: e.target.value }))}
                  placeholder="例：Nova"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">人設提示詞（選填）</label>
                <textarea
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 resize-none"
                  rows={4}
                  value={createForm.personality_prompt}
                  onChange={e => setCreateForm(f => ({ ...f, personality_prompt: e.target.value }))}
                  placeholder="描述這個虛擬人的個性、背景、溝通風格…"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-pink-500"
                  checked={createForm.participate_in_matching}
                  onChange={e => setCreateForm(f => ({ ...f, participate_in_matching: e.target.checked }))}
                />
                <span className="text-sm text-zinc-300">立即加入配對池</span>
              </label>
            </div>
            <div className="px-5 py-4 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => void handleCreate()}
                disabled={creating || !createForm.name.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {creating ? '建立中…' : '建立虛擬人'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
