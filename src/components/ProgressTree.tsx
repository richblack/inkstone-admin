// ProgressTree.tsx — 統一左側面板：spec artifact 樹 + 文件 section（≤100行）
import { useRef } from 'react';
import type { ArtifactBlock, Triplet } from './Progress';
import type { DocDef } from './ProgressDocUpload';
import { handleAddDoc } from './ProgressDocUpload';
import ProgressTreeFilters from './ProgressTreeFilters';

const TYPE_ORDER = ['architecture', 'polaris', 'vm-sdd', 'epic', 'story', 'adr', 'checklist'];
export const ARTIFACT_BADGE: Record<string, string> = {
  architecture: 'bg-red-900/60 text-red-300 border border-red-700', polaris: 'bg-blue-900/60 text-blue-300 border border-blue-700',
  'vm-sdd': 'bg-sky-900/60 text-sky-300 border border-sky-700', epic: 'bg-purple-900/60 text-purple-300 border border-purple-700',
  story: 'bg-green-900/60 text-green-300 border border-green-700', adr: 'bg-amber-900/60 text-amber-300 border border-amber-700',
  checklist: 'bg-teal-900/60 text-teal-300 border border-teal-700', unknown: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
};
const PERM: Record<string, string> = { architecture: '董事長限定', polaris: 'CEO+董事長', 'vm-sdd': 'CEO+董事長' };
export const isOrphan = (a: ArtifactBlock, triplets: Triplet[]) =>
  !['architecture', 'polaris', 'checklist'].includes(a.artifact_type) &&
  !triplets.some(t => t.subject === a.id && t.predicate === 'derives_from');

interface Props {
  arts: ArtifactBlock[]; allArts: ArtifactBlock[]; allCount: number;
  loading: boolean; triplets: Triplet[]; selectedId: string | null;
  filterType: string; filterStatus: string; search: string;
  onFilterType: (v: string) => void; onFilterStatus: (v: string) => void;
  onSearch: (v: string) => void; onSelect: (a: ArtifactBlock) => void; onReload: () => void;
  onCreateClick: () => void;
  // 文件 section（可選，整合後的統一視圖使用）
  docs?: DocDef[]; docsLoading?: boolean; selectedDocId?: string | null;
  onSelectDoc?: (id: string) => void; onDeleteDoc?: (id: string, lbl: string) => void;
  onDocAdded?: (id: string, lbl: string) => void; onDocStatus?: (s: string) => void;
}

export default function ProgressTree({ arts, allArts, allCount, loading, triplets, selectedId, filterType, filterStatus, search, onFilterType, onFilterStatus, onSearch, onSelect, onReload, onCreateClick, docs, docsLoading, selectedDocId, onSelectDoc, onDeleteDoc, onDocAdded, onDocStatus }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const suspectCount = arts.filter(a => a.status === 'suspect').length;
  const types = Array.from(new Set(allArts.map(a => a.artifact_type))).sort();
  const orderedTypes = [...TYPE_ORDER.filter(t => arts.some(a => a.artifact_type === t)), ...Array.from(new Set(arts.map(a => a.artifact_type).filter(t => !TYPE_ORDER.includes(t))))];
  const groups = orderedTypes.map(t => ({ type: t, items: arts.filter(a => a.artifact_type === t) }));

  return (
    <div className="flex-shrink-0 w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-hidden">
      {suspectCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-950/50 border-b border-orange-800/50 flex-shrink-0">
          <span className="text-orange-400 text-sm">⚠️</span>
          <span className="text-xs text-orange-300">{suspectCount} 個 artifact 需要 review</span>
        </div>
      )}
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Spec 樹</span>
        <div className="flex items-center gap-2">
          <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors" onClick={onCreateClick} title="新增 Artifact">+ 新增</button>
          <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors" onClick={onReload} title="重新載入">↻</button>
        </div>
      </div>
      <ProgressTreeFilters filterType={filterType} filterStatus={filterStatus} search={search} types={types} allCount={allCount} filteredCount={arts.length} onFilterType={onFilterType} onFilterStatus={onFilterStatus} onSearch={onSearch} />
      <div className="flex-1 overflow-y-auto">
        {loading ? <div className="text-zinc-600 text-xs px-3 py-3 animate-pulse">載入中…</div>
          : arts.length === 0 && !docs?.length ? <div className="text-zinc-600 text-xs px-3 py-4">無符合條件的 artifact</div>
          : groups.map(({ type, items }) => (
            <div key={type} className="border-b border-zinc-800/50">
              <div className="px-3 py-1.5 flex items-center gap-2 bg-zinc-800/50 sticky top-0 z-10">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ARTIFACT_BADGE[type] ?? ARTIFACT_BADGE.unknown}`}>{type}</span>
                {PERM[type] && <span className="text-zinc-600 text-xs">{PERM[type]}</span>}
                <span className="text-zinc-600 text-xs ml-auto">{items.length}</span>
              </div>
              {items.map(a => (
                <button key={a.id} className={`w-full text-left px-3 py-2 border-b border-zinc-800/30 transition-colors ${selectedId === a.id ? 'bg-zinc-800 ring-1 ring-inset ring-zinc-600' : 'hover:bg-zinc-800/60'}`} onClick={() => onSelect(a)}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isOrphan(a, triplets) && <span title="孤兒 artifact（無 derives_from）" className="flex-shrink-0 text-orange-400 text-xs">⚠️</span>}
                    {a.status === 'suspect' && <span className="flex-shrink-0 text-orange-400 text-xs" title="需要 review">●</span>}
                    <span className={`text-xs truncate flex-1 ${a.status === 'superseded' ? 'line-through text-zinc-500' : 'text-zinc-300'}`}>{a.summary.slice(0, 60)}{a.summary.length > 60 ? '…' : ''}</span>
                  </div>
                </button>
              ))}
            </div>
          ))}
        {docs !== undefined && (
          <div className="border-t border-zinc-800 mt-1">
            <div className="px-3 py-1.5 flex items-center gap-2 bg-zinc-800/30 sticky top-0 z-10">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex-1">文件</span>
              <input ref={fileRef} type="file" accept=".md,text/markdown" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void handleAddDoc(f, onDocAdded!, onDocStatus!); e.target.value = ''; }} />
              <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors" title="上傳 MD" onClick={() => fileRef.current?.click()}>+ 上傳</button>
            </div>
            {docsLoading ? <div className="text-zinc-600 text-xs px-3 py-2 animate-pulse">載入中…</div>
              : !docs.length ? <div className="text-zinc-600 text-xs px-3 py-2">點 + 上傳文件</div>
              : docs.map(d => (
              <button key={d.id} className={`group w-full text-left px-3 py-2 text-xs border-b border-zinc-800/30 flex items-center gap-1.5 transition-colors ${selectedDocId === d.id ? 'bg-zinc-800 ring-1 ring-inset ring-zinc-600' : 'hover:bg-zinc-800/60'}`} onClick={() => onSelectDoc?.(d.id)}>
                <span>{d.icon}</span><span className="text-zinc-300 truncate flex-1">{d.label}</span>
                <span className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 text-xs px-0.5" onClick={ev => { ev.stopPropagation(); onDeleteDoc?.(d.id, d.label); }}>✕</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
