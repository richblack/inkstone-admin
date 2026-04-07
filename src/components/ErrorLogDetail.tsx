import { useState, useEffect } from 'react';
import type { ParsedError } from './ErrorLog';
import { WHO_BADGE, SEV_BADGE } from './ErrorLogCreate';

interface Props {
  sel: ParsedError;
  catCount: Record<string, number>;
  onUpdated: (updated: ParsedError) => void;
}

const authHdr = () => ({ Authorization: `Bearer ${localStorage.getItem('admin_token') ?? ''}` });

export default function ErrorLogDetail({ sel, catCount, onUpdated }: Props) {
  const [noteEdit, setNoteEdit] = useState(sel.note ?? '');
  const [catEdit, setCatEdit] = useState(sel.category ?? '');
  const [saving, setSaving] = useState(false);
  const [hasFormula, setHasFormula] = useState(false);

  // sel 切換時同步編輯欄位
  const [lastId, setLastId] = useState(sel.id);
  if (lastId !== sel.id) { setNoteEdit(sel.note ?? ''); setCatEdit(sel.category ?? ''); setLastId(sel.id); }

  useEffect(() => {
    setHasFormula(false);
    fetch(`/api/kbdb/triplets?predicate=formula-candidate&limit=100`, { headers: authHdr() })
      .then(r => r.json() as Promise<{ triplets?: Array<{ subject: string; object: string }> }>)
      .then(d => setHasFormula((d.triplets ?? []).some(t => t.subject.includes(sel.subject) || t.object.includes(sel.subject))))
      .catch(() => {});
  }, [sel.subject]);

  const saveField = async (field: 'note' | 'category', value: string) => {
    setSaving(true);
    const headers = { 'Content-Type': 'application/json', ...authHdr() };
    const newObj = { who: sel.who, what: sel.what, severity: sel.severity, created_at: sel.created_at,
      note: field === 'note' ? value : (sel.note ?? ''), category: field === 'category' ? value : sel.category };
    const res = await fetch(`/api/kbdb/triplets/${sel.id}`, {
      method: 'PUT', headers, body: JSON.stringify({ subject: sel.subject, predicate: 'error-log', object: JSON.stringify(newObj), user_id: 'ceo-claude' }),
    }).catch(() => null);
    if (field === 'note') fetch('/api/kbdb/triplets', {
      method: 'POST', headers, body: JSON.stringify({ subject: `${sel.subject}-note`, predicate: 'error-note', object: value, user_id: 'ceo-claude' }),
    }).catch(() => {});
    if (res?.ok) onUpdated({ ...sel, [field]: value });
    setSaving(false);
  };

  const cnt = catCount[sel.category] ?? 0;
  const btnCls = 'px-3 py-1.5 text-white text-xs rounded disabled:opacity-40 transition-colors bg-teal-800 hover:bg-teal-700';
  const revertCls = 'px-3 py-1.5 text-zinc-300 text-xs rounded transition-colors bg-zinc-700 hover:bg-zinc-600';

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-sm px-2 py-1 rounded ${WHO_BADGE[sel.who] ?? 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>{sel.who}</span>
        <span className={`text-sm px-2 py-1 rounded ${SEV_BADGE[sel.severity] ?? SEV_BADGE.low}`}>{sel.severity}</span>
        <span className="text-xs text-zinc-500">{new Date(sel.created_at).toLocaleString('zh-TW')}</span>
        {hasFormula
          ? <span className="text-xs text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-700">✅ 已有 Formula Candidate</span>
          : <span className="text-xs text-zinc-600">尚無 Formula Candidate</span>}
      </div>
      <div>
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
          Category {cnt >= 3 && <span className="text-orange-400 normal-case">×{cnt} ⚠️ 同類錯誤頻繁</span>}
        </div>
        <input className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-teal-500 transition-colors"
          value={catEdit} onChange={e => setCatEdit(e.target.value)} />
        <div className="flex gap-2 mt-2">
          <button disabled={saving} onClick={() => void saveField('category', catEdit)} className={btnCls}>{saving ? '儲存中…' : '儲存 Category'}</button>
          <button onClick={() => setCatEdit(sel.category ?? '')} className={revertCls}>還原</button>
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">錯誤描述</div>
        <div className="bg-zinc-900 rounded p-3 text-sm text-zinc-200">{sel.what}</div>
      </div>
      <div>
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Note（董事長思考）</div>
        <textarea className="w-full bg-zinc-800 border border-zinc-700 rounded p-3 text-sm text-zinc-100 resize-none h-28 focus:outline-none focus:border-teal-500 transition-colors"
          placeholder="記錄思考、根因分析、改善方向…" value={noteEdit} onChange={e => setNoteEdit(e.target.value)} />
        <div className="flex gap-2 mt-2">
          <button disabled={saving} onClick={() => void saveField('note', noteEdit)} className={btnCls}>{saving ? '儲存中…' : '儲存 Note'}</button>
          <button onClick={() => setNoteEdit(sel.note ?? '')} className={revertCls}>還原</button>
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Block ID</div>
        <div className="text-xs text-zinc-600 font-mono">{sel.id}</div>
      </div>
    </div>
  );
}
