import { useState } from 'react';
import type { ArtifactBlock } from './Progress';

interface Props {
  artifact: ArtifactBlock;
  onPatch: (id: string, patch: { summary?: string; derives_from?: string[] }) => Promise<boolean>;
}

export default function ProgressSummaryEdit({ artifact, onPatch }: Props) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  const [saving, setSaving] = useState(false);

  const start = () => { setVal(artifact.summary); setEditing(true); };
  const save = async () => {
    setSaving(true);
    const ok = await onPatch(artifact.id, { summary: val });
    if (ok) setEditing(false);
    setSaving(false);
  };

  if (!editing) return (
    <div>
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center justify-between">
        <span>標題</span>
        <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors" title="行內編輯標題" onClick={start}>✎</button>
      </div>
      <div className="bg-zinc-900 rounded px-3 py-2 cursor-pointer hover:bg-zinc-800 transition-colors" onClick={start} title="點擊編輯標題">
        <span className="text-sm text-zinc-200 leading-relaxed">{artifact.summary || '(無標題)'}</span>
      </div>
    </div>
  );

  return (
    <div>
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">標題（編輯中）</div>
      <div className="space-y-2">
        <input
          autoFocus
          className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void save(); } if (e.key === 'Escape') setEditing(false); }}
        />
        <div className="flex gap-2">
          <button disabled={saving} className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded disabled:opacity-40 transition-colors" onClick={() => void save()}>
            {saving ? '儲存中…' : '儲存'}
          </button>
          <button className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors" onClick={() => setEditing(false)}>取消</button>
        </div>
      </div>
    </div>
  );
}
