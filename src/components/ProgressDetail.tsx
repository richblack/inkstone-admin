import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ArtifactBlock, Triplet } from './Progress';
import ProgressChecklist from './ProgressChecklist';
import ProgressSummaryEdit from './ProgressSummaryEdit';
import ProgressDerives from './ProgressDerives';
import { ARTIFACT_BADGE } from './ProgressTree';
import ProgressBlocks from './ProgressBlocks';

const PERM: Record<string, string> = { architecture: '董事長限定', polaris: 'CEO+董事長', 'vm-sdd': 'CEO+董事長' };

interface Props {
  artifact: ArtifactBlock | null; arts: ArtifactBlock[]; triplets: Triplet[];
  checklists: ArtifactBlock[]; clLoading: boolean; clUpdating: string | null;
  confirming: boolean; editId: string | null; editVal: string; editSaving: boolean;
  onConfirm: (id: string) => void;
  onToggleCl: (id: string, idx: number, content: string) => void;
  onEditStart: (id: string, content: string) => void;
  onEditChange: (v: string) => void;
  onEditSave: () => void; onEditCancel: () => void; onNavigate: (id: string) => void;
  onPatch: (id: string, patch: { summary?: string; derives_from?: string[] }) => Promise<boolean>;
  artConverting: boolean; artConvertStatus: string | null; blocksAdding: boolean;
  onConvert: () => void; onAddBlock: (targetId: string) => void; onRemoveBlock: (tripletId: string) => void;
}

function RelItem({ id, arts, onNavigate }: { id: string; arts: ArtifactBlock[]; onNavigate: (id: string) => void }) {
  const t = arts.find(a => a.id === id);
  return (
    <button className="w-full flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 rounded px-3 py-2 text-left transition-colors" onClick={() => onNavigate(id)}>
      <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${ARTIFACT_BADGE[t?.artifact_type ?? 'unknown'] ?? ARTIFACT_BADGE.unknown}`}>{t?.artifact_type ?? '?'}</span>
      <span className="text-xs text-zinc-300 truncate flex-1">{t?.summary.slice(0, 60) ?? id.slice(0, 20)}</span>
    </button>
  );
}

export default function ProgressDetail({ artifact, arts, triplets, checklists, clLoading, clUpdating, confirming, editId, editVal, editSaving, artConverting, artConvertStatus, blocksAdding, onConfirm, onToggleCl, onEditStart, onEditChange, onEditSave, onEditCancel, onNavigate, onPatch, onConvert, onAddBlock, onRemoveBlock }: Props) {
  if (!artifact) return <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">← 點選 artifact 查看詳情</div>;
  const downstream = triplets.filter(t => t.object === artifact.id && t.predicate === 'derives_from');
  const isEditing = editId === artifact.id;
  const perm = PERM[artifact.artifact_type];
  const blocksTriplets = triplets.filter(t => t.subject === artifact.id && t.predicate === 'blocks');

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-6">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-sm px-2 py-1 rounded font-medium ${ARTIFACT_BADGE[artifact.artifact_type] ?? ARTIFACT_BADGE.unknown}`}>{artifact.artifact_type}</span>
          {perm && <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-600">{perm}</span>}
          {artifact.status === 'suspect' ? <><span className="text-sm text-orange-400 font-medium">⚠️ suspect</span><button disabled={confirming} className="text-xs px-2 py-1 bg-green-900/60 hover:bg-green-800/60 text-green-300 border border-green-700 rounded disabled:opacity-40 transition-colors" onClick={() => onConfirm(artifact.id)}>{confirming ? '確認中…' : '✅ 確認無影響'}</button></>
            : artifact.status === 'superseded' ? <span className="text-sm text-gray-400">superseded</span>
            : <span className="text-sm text-green-400">● active</span>}
        </div>

        {/* B2: 標題行內編輯 */}
        <ProgressSummaryEdit artifact={artifact} onPatch={onPatch} />

        {/* 全文內容 */}
        <div>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>內容</span>
            {!isEditing && <><button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors" onClick={() => onEditStart(artifact.id, artifact.raw_content)}>✎ 編輯</button><button disabled={artConverting} className="text-xs text-zinc-500 hover:text-indigo-400 disabled:opacity-40 transition-colors ml-2" onClick={onConvert}>{artConverting ? '🔗 中…' : artConvertStatus ?? '🔗 轉 >>'}</button></>}
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <textarea className="w-full bg-zinc-800 border border-zinc-600 rounded p-3 text-sm text-zinc-100 font-mono resize-none h-64 focus:outline-none focus:border-purple-500" value={editVal} onChange={e => onEditChange(e.target.value)} autoFocus />
              <div className="flex gap-2">
                <button disabled={editSaving} className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded disabled:opacity-40 transition-colors" onClick={onEditSave}>{editSaving ? '儲存中…' : '儲存'}</button>
                <button className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors" onClick={onEditCancel}>取消</button>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 rounded-lg p-4 prose prose-invert prose-sm max-w-none [&>*]:my-1 [&_p]:my-1 [&_h1]:my-2 [&_h2]:my-2 [&_ul]:my-1 [&_li]:my-0.5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{artifact.raw_content}</ReactMarkdown>
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">關係圖</div>
          {/* B3: derives_from 可視化 + 新增/移除 */}
          <div className="mb-4">
            <ProgressDerives artifact={artifact} arts={arts} onUpdate={df => void onPatch(artifact.id, { derives_from: df })} onNavigate={onNavigate} />
          </div>
          <div className="mb-4">
            <ProgressBlocks artifact={artifact} arts={arts} triplets={blocksTriplets} adding={blocksAdding} onAdd={onAddBlock} onRemove={onRemoveBlock} onNavigate={onNavigate} />
          </div>
          <div>
            <div className="text-xs text-zinc-400 font-medium mb-2"><span className="text-zinc-600">↓</span> 下游（被 derives_from）</div>
            {downstream.length === 0 ? <div className="text-zinc-600 text-xs px-2">無下游</div> : <div className="space-y-1.5">{downstream.map(t => <RelItem key={t.id} id={t.subject} arts={arts} onNavigate={onNavigate} />)}</div>}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">驗收清單 <span className="text-xs px-1.5 py-0.5 rounded bg-teal-900/60 text-teal-300 border border-teal-700">checklist</span></div>
          <ProgressChecklist checklists={checklists} loading={clLoading} updating={clUpdating} onToggle={onToggleCl} />
        </div>
      </div>
    </div>
  );
}
