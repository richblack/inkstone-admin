// EditorRelations.tsx — 右側關係面板 CRUD + 版本歷史（≤100行）
import { useState } from 'react';
import EditorRelSection, { buildUpstream, buildDownstream, buildOthers } from './EditorRelSection';
import EditorHistory from './EditorHistory';
import type { ArtifactFull } from './usePolarisEditor';
import type { SpecArtifact } from './EditorTree';
import type { Triplet } from '../api';

const PREDICATES = ['derives_from', 'blocks', 'relates_to', 'implements', 'due_by', 'refs'];

interface Props {
  artifact: ArtifactFull | null;
  arts: SpecArtifact[];
  triplets: Triplet[];
  selBlockId: string | null; // Bug 2：選中行的真實 block_id
  onTripletsChange: (t: Triplet[]) => void;
  onNavigate: (id: string) => void;
}

export default function EditorRelations({ artifact, arts, triplets, selBlockId, onTripletsChange, onNavigate }: Props) {
  const [pred, setPred] = useState('relates_to');
  const [obj, setObj] = useState('');
  const [adding, setAdding] = useState(false);

  if (!artifact) return <div className="flex-shrink-0 w-72 bg-zinc-900 border-l border-zinc-800 flex items-center justify-center"><span className="text-zinc-600 text-xs">選擇文件查看關係</span></div>;

  // Bug 2 fix：subject 優先用 selBlockId（選中行的 block_id），未選中時用 artifact.id
  const subjectId = selBlockId ?? artifact.id;

  const handleAdd = async () => {
    if (!obj.trim()) return;
    setAdding(true);
    const res = await fetch('/api/kbdb/triplets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: subjectId, predicate: pred, object: obj.trim(), user_id: 'ceo-claude' }),
    }).catch(() => null);
    if (res?.ok) { const t = await res.json() as Triplet; onTripletsChange([...triplets, t]); setObj(''); }
    setAdding(false);
  };

  const handleDelete = async (tripletId: string) => {
    await fetch(`/api/kbdb/triplets/${tripletId}`, { method: 'DELETE' }).catch(() => {});
    onTripletsChange(triplets.filter(t => t.id !== tripletId));
  };

  // Bug 1 fix：triplets 已由 usePolarisEditor 精確載入（subject + object 兩方向）
  // 直接用 artifact.id 過濾，不依賴已損壞的 raw_content 子行邏輯
  const upstream = buildUpstream(triplets, artifact.id, arts);
  const downstream = buildDownstream(triplets, artifact.id, arts);
  const others = buildOthers(triplets, artifact.id, arts);

  // Bug 4：combobox
  const selectedArt = arts.find(a => a.id === obj);
  const suggestions = !selectedArt && obj.length > 0 ? arts.filter(a => a.summary.toLowerCase().includes(obj.toLowerCase())).slice(0, 8) : [];

  return (
    <div className="flex-shrink-0 w-72 bg-zinc-900 border-l border-zinc-800 flex flex-col overflow-hidden text-xs">
      <div className="px-3 py-2 border-b border-zinc-800 text-zinc-400 font-medium flex-shrink-0">
        {selBlockId ? `Block 關係（選中行）` : '關係面板'}
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {upstream.length === 0 && downstream.length === 0 && others.length === 0 && (
          <div className="px-3 py-3 text-zinc-700">尚無關係</div>
        )}
        <EditorRelSection title="▲ 上游（derives_from）" items={upstream} arts={arts} onNavigate={onNavigate} onDelete={handleDelete} />
        <EditorRelSection title="▼ 下游（被 derives_from）" items={downstream} arts={arts} onNavigate={onNavigate} onDelete={handleDelete} />
        {others.length > 0 && <EditorRelSection title="◆ 其他關係" items={others} arts={arts} onNavigate={onNavigate} onDelete={handleDelete} />}
      </div>
      <div className="flex-shrink-0 border-t border-zinc-800 px-3 py-2 space-y-1.5">
        <div className="text-zinc-500 font-medium">新增關係</div>
        <select className="w-full bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-zinc-300 focus:outline-none"
          value={pred} onChange={e => setPred(e.target.value)}>
          {PREDICATES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="relative">
          <input className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-200 focus:outline-none placeholder-zinc-600"
            placeholder="搜尋文件名稱…" value={selectedArt?.summary.slice(0, 40) ?? obj}
            onChange={e => setObj(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void handleAdd(); }} />
          {suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 bg-zinc-800 border border-zinc-700 rounded mb-0.5 max-h-32 overflow-y-auto z-10">
              {suggestions.map(a => (
                <button key={a.id} className="w-full text-left px-2 py-1 text-zinc-300 hover:bg-zinc-700 truncate"
                  onClick={() => setObj(a.id)}>{a.summary.slice(0, 50)}</button>
              ))}
            </div>
          )}
        </div>
        <button className="w-full text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded px-2 py-1 transition-colors disabled:opacity-40"
          disabled={adding || !obj.trim()} onClick={() => void handleAdd()}>＋ 建立關係</button>
      </div>
      <EditorHistory artifactId={artifact.id} />
    </div>
  );
}
