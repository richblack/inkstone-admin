// ProgressDocDetail.tsx — block 列表 + triplet 面板
import type { Block, DocEntry, Triplet, DocDef } from './ProgressDocUpload';
import { parseArrowTriplet, fmtTs, PREDICATES } from './ProgressDocUpload';
import ProgressBlockRow from './ProgressBlockRow';
type CB = () => void;
interface Props {
  docs: DocDef[]; selectedDocId: string | null; docEntries: DocEntry[]; docLoading: boolean;
  selectedBlockId: string | null; blockTriplets: Triplet[]; tripletsLoading: boolean;
  editingBlockId: string | null; editValue: string; saving: boolean;
  processing: boolean; converting: boolean; processStatus: string | null; convertStatus: string | null;
  fullEditMode: boolean; fullEditText: string; fullEditSaving: boolean;
  visibleEntries: DocEntry[]; hasChildrenSet: Set<string>; collapsedBlocks: Set<string>; tripletsSet: Set<string>;
  searchQ: string; searchResults: Array<{ block: Block; docLabel: string }>; selectedTarget: Block | null;
  newPredicate: string; adding: boolean; historyBlock: Block | null; rightWidth: number;
  onSelectBlock: (id: string | null) => void; onEditStart: (b: Block) => void; onEditChange: (v: string) => void;
  onEditSave: CB; onEditCancel: CB; onToggleCollapse: (id: string) => void; onCreateArtifact: (id: string, c: string) => void;
  onHistoryClick: (b: Block) => void; onProcess: CB; onConvert: CB; onDownload: CB; onOpenFullEdit: CB;
  onFullEditChange: (v: string) => void; onFullEditSave: CB; onFullEditCancel: CB;
  onSearchQ: (v: string) => void; onSelectTarget: (b: Block) => void; onNewPredicate: (v: string) => void;
  onAddTriplet: CB; onDeleteTriplet: (id: string) => void; dragHandleProps: React.HTMLAttributes<HTMLDivElement>;
}

export default function ProgressDocDetail(p: Props) {
  const selBlock = p.docEntries.find(e => e.block.id === p.selectedBlockId)?.block;
  const arrowT = selBlock ? parseArrowTriplet(selBlock.content ?? '') : null;
  return (
    <>
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        {p.selectedDocId && (
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900 flex-wrap">
            <button disabled={!p.docEntries.length} className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded disabled:opacity-40" onClick={p.onDownload}>↓ MD</button>
            <button disabled={!p.docEntries.length} className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded disabled:opacity-40" onClick={p.onOpenFullEdit}>✏ 全文</button>
            <button disabled={p.processing || !p.docEntries.length} className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded disabled:opacity-40" onClick={p.onProcess}>{p.processing ? '⚙ 中…' : '⚙ 後處理'}</button>
            <button disabled={p.converting || !p.docEntries.length} className="text-xs px-2 py-1 bg-indigo-800 hover:bg-indigo-700 text-zinc-200 rounded disabled:opacity-40" onClick={p.onConvert}>{p.converting ? '🔗 中…' : '🔗 轉 >>'}</button>
            {p.processStatus && <span className="text-xs text-zinc-400">{p.processStatus}</span>}
            {p.convertStatus && <span className="text-xs text-zinc-400">{p.convertStatus}</span>}
          </div>
        )}
        {p.fullEditMode ? (
          <div className="flex-1 flex flex-col p-3 gap-2 overflow-hidden">
            <textarea className="flex-1 bg-zinc-800 border border-zinc-600 rounded p-3 text-sm text-zinc-100 font-mono resize-none focus:outline-none" value={p.fullEditText} onChange={e => p.onFullEditChange(e.target.value)} />
            <div className="flex gap-2 flex-shrink-0">
              <button disabled={p.fullEditSaving} className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded disabled:opacity-40" onClick={p.onFullEditSave}>{p.fullEditSaving ? '儲存中…' : '儲存'}</button>
              <button className="px-3 py-1.5 bg-zinc-700 text-zinc-300 text-xs rounded" onClick={p.onFullEditCancel}>取消</button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-4 px-2">
            {!p.selectedDocId ? <div className="flex items-center justify-center h-full text-zinc-600 text-sm">← 點選左側文件</div>
              : p.docLoading ? <div className="text-zinc-500 animate-pulse text-sm py-8 px-4">載入中…</div>
              : !p.docEntries.length ? <div className="text-zinc-500 text-sm py-8 px-4">（無內容）</div>
              : p.visibleEntries.map(e => (
                <ProgressBlockRow key={e.block.id} entry={e} isSelected={p.selectedBlockId === e.block.id}
                  hasTriplets={p.tripletsSet.has(e.block.id)} isEditing={p.editingBlockId === e.block.id}
                  editValue={p.editValue} hasChildren={p.hasChildrenSet.has(e.block.id)} isCollapsed={p.collapsedBlocks.has(e.block.id)}
                  onSelect={() => p.onSelectBlock(p.selectedBlockId === e.block.id ? null : e.block.id)}
                  onEdit={() => p.onEditStart(e.block)} onChange={p.onEditChange} onSave={p.onEditSave} onCancel={p.onEditCancel}
                  onHistory={(b, ev) => { ev.stopPropagation(); p.onHistoryClick(b); }}
                  onToggle={() => p.onToggleCollapse(e.block.id)}
                  onCreate={() => p.onCreateArtifact(e.block.id, e.block.content ?? '')} />
              ))}
            {p.saving && <div className="text-xs text-zinc-500 px-4 py-2">儲存中…</div>}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 w-1 bg-zinc-800 hover:bg-purple-600 cursor-col-resize transition-colors" {...p.dragHandleProps} />
      <div className="flex-shrink-0 bg-zinc-900 border-l border-zinc-800 overflow-y-auto flex flex-col" style={{ width: `${p.rightWidth}px` }}>
        <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase border-b border-zinc-800">關係</div>
        {!p.selectedBlockId ? <div className="p-4 text-zinc-600 text-xs">點擊任意行查看關係</div> : (
          <div className="p-3 space-y-3">
            <div className="text-xs text-zinc-400 bg-zinc-800 rounded px-2 py-1.5 break-words">{selBlock?.content?.slice(0, 80) ?? p.selectedBlockId.slice(0, 8)}</div>
            {p.historyBlock?.id === p.selectedBlockId && <div className="bg-zinc-800/60 border border-zinc-700 rounded px-2 py-2 space-y-1 text-xs">
              <div className="font-medium text-blue-400">修改記錄</div>
              <div className="text-zinc-400"><span className="text-zinc-500">建立：</span>{fmtTs(p.historyBlock.created_at)}</div>
              <div className="text-zinc-400"><span className="text-zinc-500">更新：</span>{fmtTs(p.historyBlock.updated_at)}</div>
            </div>}
            <div>
              <div className="text-xs text-zinc-400 font-medium mb-1 flex items-center gap-1">現有關係{p.tripletsLoading && <span className="animate-pulse text-zinc-600">載入…</span>}</div>
              {arrowT && <div className="flex items-start gap-1 bg-purple-900/20 border border-purple-800/40 rounded px-2 py-1.5 text-xs mb-1 flex-wrap"><span className="text-zinc-300">{arrowT.subject}</span><span className="mx-1 text-purple-400">{arrowT.predicate}</span><span className="text-zinc-300">{arrowT.object}</span><span className="ml-auto text-purple-500">↗</span></div>}
              {!p.blockTriplets.length && !arrowT ? <div className="text-zinc-600 text-xs">{p.tripletsLoading ? '' : '無'}</div>
                : <div className="space-y-1">{p.blockTriplets.map(t => { const isSelf = t.subject === p.selectedBlockId; const oid = isSelf ? t.object : t.subject; const ol = p.docEntries.find(e => e.block.id === oid)?.block?.content?.slice(0, 22) ?? oid.slice(0, 8); return <div key={t.id} className="flex items-center gap-1 bg-zinc-800 rounded px-2 py-1.5 text-xs"><span className="text-zinc-400 flex-1">{isSelf ? '此行' : ol}<span className="mx-1 text-purple-400">{t.predicate}</span>{isSelf ? ol : '此行'}</span><button className="text-zinc-600 hover:text-red-400" onClick={() => p.onDeleteTriplet(t.id)}>✕</button></div>; })}</div>}
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-medium mb-1">新增關係</div>
              <div className="space-y-2">
                <select className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-none" value={p.newPredicate} onChange={e => p.onNewPredicate(e.target.value)}>{PREDICATES.map(pred => <option key={pred} value={pred}>{pred}</option>)}</select>
                <div className="relative">
                  <input className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none" placeholder="搜尋 block…" value={p.searchQ} onChange={e => p.onSearchQ(e.target.value)} />
                  {p.searchResults.length > 0 && !p.selectedTarget && <div className="absolute top-full left-0 right-0 bg-zinc-700 border border-zinc-600 rounded mt-0.5 max-h-40 overflow-y-auto z-10">{p.searchResults.map(({ block: b, docLabel }) => <button key={b.id} className="w-full text-left px-2 py-1.5 text-xs text-zinc-200 hover:bg-zinc-600" onClick={() => p.onSelectTarget(b)}><span className="text-purple-400 mr-1">{docLabel}/</span>{b.content?.slice(0, 50)}</button>)}</div>}
                </div>
                <button disabled={!p.selectedTarget || p.adding} className="w-full py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded disabled:opacity-40" onClick={p.onAddTriplet}>{p.adding ? '新增中…' : '確認新增'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
