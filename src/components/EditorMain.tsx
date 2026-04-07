// EditorMain.tsx — 中間 outliner 主區域（含匯出 MD）（≤100行）
import { useEditorBlocks } from './useEditorBlocks';
import EditorMeta from './EditorMeta';
import EditorBlock from './EditorBlock';
import type { ArtifactFull } from './usePolarisEditor';
import type { Triplet } from '../api';

interface Props {
  artifact: ArtifactFull | null;
  triplets: Triplet[];
  selBlock: number | null;
  onSelBlock: (idx: number | null) => void;
  onSelBlockId: (id: string | null) => void; // Bug 2：通知 parent 選中行的真實 block_id
  onUpdate: (a: ArtifactFull) => void;
  onDelete: (id: string) => void;
  onNavigate: (id: string) => void;
}

function exportMd(artifact: ArtifactFull) {
  const blob = new Blob([artifact.raw_content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${artifact.id}.md`; a.click();
  URL.revokeObjectURL(url);
}

export default function EditorMain({ artifact, triplets: _triplets, selBlock, onSelBlock, onSelBlockId, onUpdate, onDelete, onNavigate }: Props) {
  const { blocks, loading, refresh } = useEditorBlocks(artifact?.id ?? null);

  if (!artifact) return <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">從左側選擇文件開始編輯</div>;

  const rootLine = artifact.raw_content.split('\n')[0] ?? '';
  // Bug 3 fix：行內儲存也走 spec-sync 確保持久化（直接 KBDB PUT 有 D1 eventual-consistency 風險）
  const saveLines = async (childLines: string[]) => {
    const newContent = [rootLine, ...childLines].join('\n');
    const res = await fetch('/api/spec-sync/spec/update', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ block_id: artifact.id, new_content: newContent, confirmed_suspects: [] }),
    }).catch(() => null);
    if (res?.ok) { onUpdate({ ...artifact, raw_content: newContent }); refresh(); }
  };

  const handleAddBelow = (idx: number) => { const ls = blocks.map(b => b.content); ls.splice(idx + 1, 0, '新增行'); void saveLines(ls); };
  const handleDelBlock = (idx: number) => { if (!confirm('刪除此 block？')) return; const ls = blocks.map(b => b.content); ls.splice(idx, 1); void saveLines(ls); };
  const handleMoveUp = (idx: number) => { if (idx <= 0) return; const ls = blocks.map(b => b.content); [ls[idx - 1], ls[idx]] = [ls[idx], ls[idx - 1]]; void saveLines(ls); };
  const handleMoveDown = (idx: number) => { if (idx >= blocks.length - 1) return; const ls = blocks.map(b => b.content); [ls[idx], ls[idx + 1]] = [ls[idx + 1], ls[idx]]; void saveLines(ls); };
  const hasArrow = (c: string) => /\s>>\s/.test(c) || c.trimStart().startsWith('>> ');

  // Bug 4 fix：空文件新增第一行
  const handleAddFirst = () => void saveLines(['新增第一行']);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <EditorMeta artifact={artifact} onUpdate={onUpdate} onDelete={onDelete} />
      <div className="flex-shrink-0 border-b border-zinc-800/50 px-4 py-1 flex justify-end gap-2">
        <button className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors flex items-center gap-1"
          onClick={() => exportMd(artifact)} title="匯出為 Markdown 檔案">⬇ 匯出 MD</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-400 mb-3 truncate">{artifact.summary}</h2>
        {loading && <p className="text-zinc-600 text-sm italic">載入 blocks 中…</p>}
        {/* Bug 4 fix：空文件顯示可點擊的新增入口 */}
        {!loading && blocks.length === 0 && (
          <button
            className="text-sm text-zinc-500 hover:text-zinc-200 border border-dashed border-zinc-700 hover:border-zinc-500 rounded px-4 py-2 transition-colors"
            onClick={handleAddFirst}
          >＋ 新增第一行</button>
        )}
        {blocks.map(({ id, content }, idx) => (
          <EditorBlock
            key={id}
            content={content}
            lineIdx={idx}
            selected={selBlock === idx}
            hasTriplets={hasArrow(content)}
            onSelect={() => {
              const newIdx = selBlock === idx ? null : idx;
              onSelBlock(newIdx);
              onSelBlockId(newIdx !== null ? id : null); // Bug 2 fix
            }}
            onSave={(nc) => {
              // Bug 3 fix：走 spec-sync 而非直接 KBDB PUT
              const updatedLines = blocks.map((b, i) => i === idx ? nc : b.content);
              void saveLines(updatedLines);
            }}
            onAddBelow={handleAddBelow}
            onDelete={handleDelBlock}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onNavigate={onNavigate}
          />
        ))}
        {!loading && blocks.length > 0 && <p className="text-zinc-700 text-xs mt-4">雙擊任意行內編輯；點選行 → 右側顯示關係</p>}
      </div>
    </div>
  );
}
