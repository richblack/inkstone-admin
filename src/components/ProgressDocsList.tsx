// ProgressDocsList.tsx — 左側文件列表 + 上傳按鈕（≤100行）
import { useRef } from 'react';
import type { DocDef } from './ProgressDocUpload';
import { handleAddDoc } from './ProgressDocUpload';

interface Props {
  docs: DocDef[];
  docsLoading: boolean;
  selectedDocId: string | null;
  addDocStatus: string | null;
  onSelectDoc: (id: string) => void;
  onDeleteDoc: (id: string, label: string) => void;
  onDocAdded: (id: string, label: string) => void;
  onStatus: (s: string) => void;
}

export default function ProgressDocsList({ docs, docsLoading, selectedDocId, addDocStatus, onSelectDoc, onDeleteDoc, onDocAdded, onStatus }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex-shrink-0 w-48 bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-hidden">
      <div className="px-2 py-2 border-b border-zinc-800 flex items-center gap-1 flex-shrink-0">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex-1 truncate">文件</span>
        <input ref={fileRef} type="file" accept=".md,text/markdown" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) void handleAddDoc(f, onDocAdded, onStatus); e.target.value = ''; }} />
        <button
          className="text-zinc-500 hover:text-zinc-200 text-base leading-none flex-shrink-0"
          title="上傳 MD 建立新文件"
          onClick={() => fileRef.current?.click()}
        >+</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {docsLoading ? (
          <div className="text-zinc-600 text-xs px-3 py-3 animate-pulse">載入中…</div>
        ) : docs.length === 0 ? (
          <div className="text-zinc-600 text-xs px-3 py-3">點 + 上傳第一份文件</div>
        ) : docs.map(doc => (
          <div
            key={doc.id}
            className={`group flex items-center gap-1 px-2 py-2 text-sm transition-colors ${
              selectedDocId === doc.id ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <button className="flex items-center gap-1.5 flex-1 min-w-0 text-left" onClick={() => onSelectDoc(doc.id)}>
              <span>{doc.icon}</span>
              <span className="truncate">{doc.label}</span>
            </button>
            <button
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all text-xs px-0.5"
              title="刪除文件"
              onClick={() => onDeleteDoc(doc.id, doc.label)}
            >✕</button>
          </div>
        ))}
        {addDocStatus && (
          <div className="text-xs text-zinc-400 px-3 py-2 border-t border-zinc-800">{addDocStatus}</div>
        )}
      </div>
    </div>
  );
}
