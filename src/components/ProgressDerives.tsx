import { useState } from 'react';
import type { ArtifactBlock } from './Progress';
import { ARTIFACT_BADGE } from './ProgressTree';

interface Props {
  artifact: ArtifactBlock;
  arts: ArtifactBlock[];
  onUpdate: (newDf: string[]) => void;
  onNavigate: (id: string) => void;
}

export default function ProgressDerives({ artifact, arts, onUpdate, onNavigate }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const df = artifact.derives_from;

  const remove = (pid: string) => onUpdate(df.filter(id => id !== pid));
  const add = (pid: string) => { if (!df.includes(pid)) onUpdate([...df, pid]); setShowAdd(false); };

  // 可選上游：排除自己和已在 derives_from 的
  const available = arts.filter(a => a.id !== artifact.id && !df.includes(a.id));

  return (
    <div>
      <div className="text-xs text-zinc-400 font-medium mb-2 flex items-center justify-between">
        <span><span className="text-zinc-600">↑</span> 上游（derives_from）</span>
        <button className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors" onClick={() => setShowAdd(v => !v)} title="新增上游連結">
          {showAdd ? '▲ 收起' : '+ 新增'}
        </button>
      </div>
      {showAdd && (
        <div className="mb-2 bg-zinc-800/80 border border-zinc-700 rounded overflow-hidden">
          <div className="px-3 py-1.5 text-xs text-zinc-500 border-b border-zinc-700">選擇上游 artifact</div>
          <div className="max-h-40 overflow-y-auto">
            {available.length === 0
              ? <div className="text-xs text-zinc-600 px-3 py-2">無可新增的上游</div>
              : available.map(a => (
                <button key={a.id} className="w-full text-left px-3 py-1.5 hover:bg-zinc-700 flex items-center gap-2 text-xs transition-colors" onClick={() => add(a.id)}>
                  <span className={`px-1.5 py-0.5 rounded flex-shrink-0 ${ARTIFACT_BADGE[a.artifact_type] ?? ARTIFACT_BADGE.unknown}`}>{a.artifact_type}</span>
                  <span className="text-zinc-300 truncate">{a.summary.slice(0, 55)}</span>
                </button>
              ))}
          </div>
        </div>
      )}
      {df.length === 0
        ? <div className="text-zinc-600 text-xs px-2">無上游</div>
        : (
          <div className="space-y-1.5">
            {df.map(pid => {
              const t = arts.find(a => a.id === pid);
              return (
                <div key={pid} className="flex items-center gap-2 bg-zinc-900 rounded px-3 py-2">
                  <button className="flex items-center gap-2 flex-1 text-left min-w-0 hover:opacity-80 transition-opacity" onClick={() => onNavigate(pid)}>
                    <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${ARTIFACT_BADGE[t?.artifact_type ?? 'unknown'] ?? ARTIFACT_BADGE.unknown}`}>{t?.artifact_type ?? '?'}</span>
                    <span className="text-xs text-zinc-300 truncate">{t?.summary.slice(0, 60) ?? pid.slice(0, 20)}</span>
                  </button>
                  <button className="text-zinc-600 hover:text-red-400 text-sm flex-shrink-0 transition-colors leading-none" onClick={() => remove(pid)} title="移除上游連結">×</button>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
