// ProgressBlockRow.tsx — block 行元件（≤100行）
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Block, DocEntry } from './ProgressDocUpload';
import { parseArrowTriplet, fmtTs } from './ProgressDocUpload';

interface Props {
  entry: DocEntry; isSelected: boolean; hasTriplets: boolean;
  isEditing: boolean; editValue: string;
  hasChildren: boolean; isCollapsed: boolean;
  onSelect: () => void; onEdit: () => void;
  onChange: (v: string) => void; onSave: () => void; onCancel: () => void;
  onHistory: (b: Block, e: React.MouseEvent) => void;
  onToggle: () => void; onCreate: () => void;
}

export default function ProgressBlockRow({ entry, isSelected, hasTriplets, isEditing, editValue, hasChildren, isCollapsed, onSelect, onEdit, onChange, onSave, onCancel, onHistory, onToggle, onCreate }: Props) {
  const { block, depth } = entry; if (depth === 0) return null;
  const c = block.content ?? ''; if (!c.trim()) return null;
  const indent = Math.max(0, depth - 1) * 20;
  const disp = c.replace(/^[-*]\s+/, '');
  const isArrow = !!parseArrowTriplet(c);
  const isHeading = /^#{1,6}\s/.test(disp);

  return (
    <div
      className={`group flex items-start gap-1 rounded px-1 py-0.5 cursor-pointer transition-colors ${isArrow
        ? (isSelected ? 'bg-purple-900/50 border border-purple-700/60' : 'bg-purple-950/40 border border-purple-900/30 hover:bg-purple-900/40')
        : (isSelected ? 'bg-purple-900/40' : 'hover:bg-zinc-800/60')}`}
      style={{ paddingLeft: `${indent + 4}px` }}
      onClick={onSelect}
    >
      {hasChildren
        ? <button className="flex-shrink-0 text-zinc-400 hover:text-zinc-200 text-xs w-4 flex items-center justify-center select-none mt-0.5" onClick={e => { e.stopPropagation(); onToggle(); }}>{isCollapsed ? '▶' : '▼'}</button>
        : !isHeading ? <span className="flex-shrink-0 text-zinc-500 select-none mt-0.5 w-4 text-center" style={{ fontSize: '10px', lineHeight: '1.6' }}>•</span>
        : null}

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex gap-1 items-center" onClick={e => e.stopPropagation()}>
            <input autoFocus className="flex-1 bg-zinc-700 border border-zinc-500 rounded px-2 py-0.5 text-sm text-zinc-100 focus:outline-none focus:border-purple-500"
              value={editValue} onChange={e => onChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }} />
            <button className="text-xs text-green-400 px-1" onClick={onSave}>✓</button>
            <button className="text-xs text-zinc-500 px-1" onClick={onCancel}>✕</button>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none [&>*]:my-0 [&_p]:my-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{disp}</ReactMarkdown>
          </div>
        )}
      </div>

      {!isEditing && (
        <div className={`flex items-center gap-1 flex-shrink-0 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {(hasTriplets || isArrow) && <span className="text-purple-400 text-xs">🔗</span>}
          {block.updated_at && <button className="text-zinc-600 hover:text-blue-400 text-xs px-0.5" title={`更新：${fmtTs(block.updated_at)}`} onClick={e => { e.stopPropagation(); onHistory(block, e); }}>🕐</button>}
          <button className="text-zinc-500 hover:text-zinc-200 text-xs px-0.5" title="編輯" onClick={e => { e.stopPropagation(); onEdit(); }}>✎</button>
          <button className="text-zinc-500 hover:text-purple-300 text-xs px-0.5" title="新增關聯" onClick={e => { e.stopPropagation(); onSelect(); }}>+</button>
          <button className="text-zinc-500 hover:text-blue-300 text-xs px-0.5" title="新增 Artifact" onClick={e => { e.stopPropagation(); onCreate(); }}>⊕</button>
        </div>
      )}
    </div>
  );
}
