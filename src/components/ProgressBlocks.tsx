// ProgressBlocks.tsx — artifact 間 blocks 約束關係管理 (≤100行)
import { useState } from 'react';
import type { ArtifactBlock, Triplet } from './Progress';
import { ARTIFACT_BADGE } from './ProgressTree';

interface Props {
  artifact: ArtifactBlock; arts: ArtifactBlock[]; triplets: Triplet[];
  adding: boolean;
  onAdd: (targetId: string) => void; onRemove: (tripletId: string) => void; onNavigate: (id: string) => void;
}

function BlockItem({ targetId, tripletId, arts, onRemove, onNavigate }: { targetId: string; tripletId: string; arts: ArtifactBlock[]; onRemove: (tid: string) => void; onNavigate: (id: string) => void }) {
  const a = arts.find(x => x.id === targetId);
  return (
    <div className="flex items-center gap-2 bg-zinc-900 rounded px-3 py-2">
      <button className="flex items-center gap-2 flex-1 text-left min-w-0 hover:opacity-80 transition-opacity" onClick={() => onNavigate(targetId)}>
        <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${ARTIFACT_BADGE[a?.artifact_type ?? 'unknown'] ?? ARTIFACT_BADGE.unknown}`}>{a?.artifact_type ?? '?'}</span>
        <span className="text-xs text-zinc-300 truncate">{a?.summary.slice(0, 60) ?? targetId.slice(0, 20)}</span>
      </button>
      <button className="text-zinc-600 hover:text-red-400 text-sm flex-shrink-0 transition-colors leading-none" onClick={() => onRemove(tripletId)} title="移除 blocks 關係">×</button>
    </div>
  );
}

export default function ProgressBlocks({ artifact, arts, triplets, adding, onAdd, onRemove, onNavigate }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [q, setQ] = useState('');
  const blocked = triplets.filter(t => t.subject === artifact.id && t.predicate === 'blocks');
  const used = new Set(blocked.map(t => t.object));
  const available = arts.filter(a => a.id !== artifact.id && !used.has(a.id));
  const filtered = q.trim() ? available.filter(a => a.summary.toLowerCase().includes(q.toLowerCase())) : available;

  return (
    <div>
      <div className="text-xs text-zinc-400 font-medium mb-2 flex items-center justify-between">
        <span><span className="text-zinc-600">⊘</span> blocks（約束）</span>
        <button className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors" onClick={() => setShowAdd(v => !v)}>{showAdd ? '▲ 收起' : '+ 新增'}</button>
      </div>
      {showAdd && (
        <div className="mb-2 bg-zinc-800/80 border border-zinc-700 rounded overflow-hidden">
          <input className="w-full bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none border-b border-zinc-700" placeholder="搜尋 artifact…" value={q} onChange={e => setQ(e.target.value)} autoFocus />
          <div className="max-h-40 overflow-y-auto">
            {filtered.length === 0
              ? <div className="text-xs text-zinc-600 px-3 py-2">無可選擇的 artifact</div>
              : filtered.slice(0, 10).map(a => (
                <button key={a.id} disabled={adding} className="w-full text-left px-3 py-1.5 hover:bg-zinc-700 flex items-center gap-2 text-xs transition-colors disabled:opacity-40" onClick={() => { onAdd(a.id); setShowAdd(false); setQ(''); }}>
                  <span className={`px-1.5 py-0.5 rounded flex-shrink-0 ${ARTIFACT_BADGE[a.artifact_type] ?? ARTIFACT_BADGE.unknown}`}>{a.artifact_type}</span>
                  <span className="text-zinc-300 truncate">{a.summary.slice(0, 55)}</span>
                </button>
              ))}
          </div>
        </div>
      )}
      {blocked.length === 0
        ? <div className="text-zinc-600 text-xs px-2">無 blocks 關係</div>
        : <div className="space-y-1.5">{blocked.map(t => <BlockItem key={t.id} targetId={t.object} tripletId={t.id} arts={arts} onRemove={onRemove} onNavigate={onNavigate} />)}</div>}
    </div>
  );
}
