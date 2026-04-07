// EditorCategoryModal.tsx — Category CRUD modal（≤100行）
import { useState } from 'react';
import type { CategoryDef } from './editorCategories';

interface Props { categories: CategoryDef[]; onClose: () => void; onReload: () => void; }

const GROUPS = ['project', 'armor', 'meta'] as const;

async function writeCategoryDef(cat: CategoryDef) {
  await fetch('/api/kbdb/triplets', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject: `category:${cat.slug}`, predicate: 'category-def', object: JSON.stringify(cat), user_id: 'ceo-claude' }),
  });
}

export default function EditorCategoryModal({ categories, onClose, onReload }: Props) {
  const [tab, setTab] = useState<'list' | 'add'>('list');
  const [form, setForm] = useState<Partial<CategoryDef>>({ group: 'project', root: false, valid_parents: [], color: 'zinc' });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const setF = (k: keyof CategoryDef, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    const { slug, name, prefix } = form;
    if (!slug?.trim() || !name?.trim() || !prefix?.trim()) { setStatus('slug / name / prefix 必填'); return; }
    setSaving(true); setStatus('');
    try {
      const cat: CategoryDef = {
        slug: slug.trim(), name: name.trim(), prefix: prefix.trim().toUpperCase(),
        group: (form.group ?? 'project') as CategoryDef['group'],
        color: form.color ?? 'zinc', root: form.root ?? false,
        valid_parents: form.valid_parents ?? [], description: form.description ?? '',
      };
      await writeCategoryDef(cat);
      setStatus('✅ 已新增'); setForm({ group: 'project', root: false, valid_parents: [], color: 'zinc' }); onReload();
    } catch (err) { setStatus(`❌ ${String(err).slice(0, 60)}`); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 w-[460px] max-h-[80vh] overflow-y-auto space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">管理 Category</h3>
          <button className="text-zinc-600 hover:text-zinc-300 text-xs" onClick={onClose}>✕</button>
        </div>
        <div className="flex gap-2 text-xs">
          {(['list', 'add'] as const).map(t => (
            <button key={t} className={`px-3 py-1 rounded transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`} onClick={() => setTab(t)}>
              {t === 'list' ? '現有 Category' : '＋ 新增'}
            </button>
          ))}
        </div>
        {tab === 'list' && (
          <div className="space-y-1.5">
            {categories.length === 0 && <div className="text-zinc-600 text-xs py-2">尚無 category 定義</div>}
            {categories.map(c => (
              <div key={c.slug} className="flex items-center justify-between bg-zinc-800 rounded px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-zinc-300 w-14 text-right">[{c.prefix}]</span>
                  <span className="text-zinc-200">{c.name}</span>
                  <span className="text-zinc-600">{c.group}</span>
                </div>
                {c.root && <span className="text-blue-400">根</span>}
              </div>
            ))}
          </div>
        )}
        {tab === 'add' && (
          <div className="space-y-2 text-xs">
            {([['slug', '識別碼（英數-）'], ['name', '顯示名稱'], ['prefix', '編號前綴'], ['description', '描述']] as [keyof CategoryDef, string][]).map(([k, label]) => (
              <div key={k as string}>
                <label className="text-zinc-400 block mb-1">{label}</label>
                <input className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 focus:outline-none" value={(form[k] as string) ?? ''} onChange={e => setF(k, e.target.value)} disabled={saving} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-zinc-400 block mb-1">Group</label>
                <select className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 focus:outline-none" value={form.group ?? 'project'} onChange={e => setF('group', e.target.value)} disabled={saving}>
                  {GROUPS.map(g => <option key={g} value={g} className="bg-zinc-900">{g}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-400">
                  <input type="checkbox" checked={form.root ?? false} onChange={e => setF('root', e.target.checked)} disabled={saving} />
                  根文件
                </label>
              </div>
            </div>
            {status && <p className="text-xs bg-zinc-800 rounded px-2 py-1 text-zinc-400">{status}</p>}
            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded transition-colors disabled:opacity-40" disabled={saving} onClick={() => void handleAdd()}>新增 Category</button>
          </div>
        )}
      </div>
    </div>
  );
}
