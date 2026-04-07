// EditorBlock.tsx — 單一 block 渲染 + 行內編輯（≤100行）
import { useState, useRef, useEffect } from 'react';
import EditorBlockActions from './EditorBlockActions';

interface Props {
  content: string; lineIdx: number; selected: boolean; hasTriplets: boolean;
  onSelect: () => void; onSave: (newContent: string) => void;
  onAddBelow: (lineIdx: number) => void; onDelete: (lineIdx: number) => void;
  onMoveUp: (lineIdx: number) => void; onMoveDown: (lineIdx: number) => void;
  onNavigate: (target: string) => void;
  onIndentLeft?: (i: number) => void; onIndentRight?: (i: number) => void;
}

type BlockType = 'h1' | 'h2' | 'h3' | 'todo' | 'list' | 'arrow' | 'text';

function detectType(s: string): BlockType {
  if (s.startsWith('# ')) return 'h1';
  if (s.startsWith('## ')) return 'h2';
  if (s.startsWith('### ')) return 'h3';
  if (/^- \[[ x]\]/i.test(s)) return 'todo';
  if (s.startsWith('- ') || s.startsWith('* ')) return 'list';
  if (s.trimStart().startsWith('>> ') || /\s>>\s/.test(s)) return 'arrow';
  return 'text';
}

const TYPE_CLASS: Record<BlockType, string> = {
  h1: 'text-base font-bold text-zinc-100', h2: 'text-sm font-semibold text-zinc-200 pl-3',
  h3: 'text-sm font-medium text-zinc-300 pl-6', todo: 'text-sm text-zinc-300 pl-4',
  list: 'text-sm text-zinc-300 pl-4', arrow: 'text-sm text-indigo-300 pl-4', text: 'text-sm text-zinc-300 pl-2',
};

export default function EditorBlock({ content, lineIdx, selected, hasTriplets, onSelect, onSave, onAddBelow, onDelete, onMoveUp, onMoveDown, onNavigate, onIndentLeft, onIndentRight }: Props) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(content);
  const ref = useRef<HTMLTextAreaElement>(null);
  const type = detectType(content);

  useEffect(() => { setVal(content); }, [content]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = () => {
    if (val.trim() !== content.trim()) onSave(val);
    setEditing(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { setVal(content); setEditing(false); }
  };

  // Bug 6：解析 >> 語法目標，供點擊 🔗 跳轉
  const arrowTarget = type === 'arrow' ? (() => {
    const parts = content.split('>>').map(s => s.trim());
    return parts.length >= 3 ? parts[parts.length - 1] : null;
  })() : null;

  const bulletContent = hasTriplets ? (
    arrowTarget
      ? <button className="text-indigo-400 hover:text-indigo-200 leading-none" title="跳轉到目標文件"
          onClick={e => { e.stopPropagation(); onNavigate(arrowTarget); }}>🔗</button>
      : <span>🔗</span>
  ) : type === 'todo' ? '☐' : type === 'list' ? '·' : '•';

  return (
    <div
      className={`group flex items-start gap-1.5 py-0.5 rounded px-1 cursor-pointer
        ${selected ? 'bg-zinc-800/70 ring-1 ring-inset ring-zinc-600' : 'hover:bg-zinc-800/30'}`}
      onClick={editing ? undefined : onSelect}
      onDoubleClick={e => { e.stopPropagation(); if (!editing) setEditing(true); }}
    >
      <span className="flex-shrink-0 text-zinc-600 text-xs mt-0.5 select-none w-3 text-center group-hover:text-zinc-400">
        {bulletContent}
      </span>
      {editing ? (
        <textarea
          ref={ref}
          className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-zinc-200 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={Math.max(1, val.split('\n').length)}
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKey}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span className={`flex-1 min-w-0 leading-relaxed select-text ${TYPE_CLASS[type]}`}>{content}</span>
      )}
      <EditorBlockActions lineIdx={lineIdx} onAddBelow={onAddBelow} onDelete={onDelete} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onIndentLeft={onIndentLeft} onIndentRight={onIndentRight} />
    </div>
  );
}
