import { useState } from 'react';
import type { ArtifactBlock } from './Progress';
import { ARTIFACT_BADGE } from './ProgressTree';

const TYPES = ['architecture', 'polaris', 'vm-sdd', 'epic', 'story', 'adr', 'checklist'];
const EXEMPT = new Set(['polaris', 'checklist', 'architecture']);

interface Props {
  arts: ArtifactBlock[];
  creating: boolean;
  onClose: () => void;
  onCreate: (type: string, content: string, df: string[]) => void;
}

export default function ProgressCreate({ arts, creating, onClose, onCreate }: Props) {
  const [type, setType] = useState('story');
  const [content, setContent] = useState('');
  const [df, setDf] = useState<string[]>([]);

  const toggleDf = (id: string) => setDf(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const needsDf = !EXEMPT.has(type);
  const canSubmit = content.trim() !== '' && (!needsDf || df.length > 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-[600px] max-h-[80vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-zinc-200">新增 Spec Artifact</h2>
          <button className="text-zinc-500 hover:text-zinc-300 text-lg leading-none" onClick={onClose}>×</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">類型</label>
            <select className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none" value={type} onChange={e => { setType(e.target.value); setDf([]); }}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">內容 <span className="text-zinc-600">（Markdown，第一行為顯示標題）</span></label>
            <textarea className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 font-mono resize-none h-32 focus:outline-none focus:border-purple-500" placeholder={`# ${type.toUpperCase()} 標題\n\n描述內容...`} value={content} onChange={e => setContent(e.target.value)} />
          </div>
          {needsDf && (
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5">上游 derives_from <span className="text-red-400">（必選）</span></label>
              <div className="bg-zinc-800 border border-zinc-700 rounded max-h-44 overflow-y-auto p-2 space-y-0.5">
                {arts.map(a => (
                  <label key={a.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-700/50 rounded cursor-pointer">
                    <input type="checkbox" className="accent-purple-500 flex-shrink-0" checked={df.includes(a.id)} onChange={() => toggleDf(a.id)} />
                    <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${ARTIFACT_BADGE[a.artifact_type] ?? ARTIFACT_BADGE.unknown}`}>{a.artifact_type}</span>
                    <span className="text-xs text-zinc-300 truncate">{a.summary.slice(0, 55)}</span>
                  </label>
                ))}
              </div>
              {df.length > 0 && <div className="text-xs text-zinc-500 mt-1">已選 {df.length} 個上游</div>}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors" onClick={onClose}>取消</button>
          <button disabled={!canSubmit || creating} className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white text-sm rounded disabled:opacity-40 transition-colors" onClick={() => canSubmit && onCreate(type, content, df)}>
            {creating ? '建立中…' : '建立'}
          </button>
        </div>
      </div>
    </div>
  );
}
