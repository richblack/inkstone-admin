import { useState } from 'react';

export interface ErrorObject {
  who: 'Danni' | 'Mira' | string;
  what: string;
  note: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | string;
  created_at: string;
}

export const WHO_BADGE: Record<string, string> = {
  Danni: 'bg-blue-900/60 text-blue-300 border border-blue-700',
  Mira:  'bg-purple-900/60 text-purple-300 border border-purple-700',
};
export const SEV_BADGE: Record<string, string> = {
  high:   'bg-red-900/60 text-red-300',
  medium: 'bg-yellow-900/60 text-yellow-300',
  low:    'bg-zinc-800 text-zinc-400',
};

interface Props { onClose: () => void; onCreate: (e: ErrorObject) => Promise<void>; }

export default function ErrorLogCreate({ onClose, onCreate }: Props) {
  const [who, setWho] = useState<'Danni' | 'Mira'>('Mira');
  const [what, setWhat] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!what.trim() || !category.trim()) return;
    setSaving(true);
    await onCreate({ who, what: what.trim(), note: '', category: category.trim(), severity, created_at: new Date().toISOString() });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-96 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-semibold text-zinc-200">🚨 新增錯誤記錄</div>
        <div className="space-y-3">
          <div className="flex gap-2">
            {(['Danni', 'Mira'] as const).map(w => (
              <button key={w} onClick={() => setWho(w)} className={`px-3 py-1 rounded text-xs border ${who === w ? WHO_BADGE[w] : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>{w}</button>
            ))}
          </div>
          <input className="w-full bg-zinc-800 border border-zinc-600 rounded p-2 text-sm text-zinc-100 focus:outline-none focus:border-red-500" placeholder="錯誤描述（what）" value={what} onChange={e => setWhat(e.target.value)} />
          <input className="w-full bg-zinc-800 border border-zinc-600 rounded p-2 text-sm text-zinc-100 focus:outline-none focus:border-red-500" placeholder="類別（category）" value={category} onChange={e => setCategory(e.target.value)} />
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map(s => (
              <button key={s} onClick={() => setSeverity(s)} className={`px-3 py-1 rounded text-xs ${severity === s ? SEV_BADGE[s] : 'bg-zinc-800 text-zinc-500'}`}>{s}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button disabled={saving || !what.trim() || !category.trim()} onClick={() => void submit()} className="px-4 py-1.5 bg-red-800 hover:bg-red-700 text-white text-xs rounded disabled:opacity-40 transition-colors">{saving ? '建立中…' : '建立'}</button>
          <button onClick={onClose} className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors">取消</button>
        </div>
      </div>
    </div>
  );
}
