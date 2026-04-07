// EditorTreeToolbar.tsx — 編輯器左側樹狀工具列（≤100行）
import type { CategoryDef } from './editorCategories';

interface Props {
  search: string;
  filterCat: string;
  filterStatus: string;
  categories: CategoryDef[];
  onSearch: (v: string) => void;
  onFilterCat: (v: string) => void;
  onFilterStatus: (v: string) => void;
  onCreateClick: () => void;
  onUploadClick: () => void;
  onReload: () => void;
}

export default function EditorTreeToolbar({
  search, filterCat, filterStatus, categories,
  onSearch, onFilterCat, onFilterStatus,
  onCreateClick, onUploadClick, onReload,
}: Props) {
  return (
    <div className="px-2 py-2 border-b border-zinc-800 flex flex-col gap-1.5 flex-shrink-0">
      <input
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
        placeholder="搜尋文件…"
        value={search}
        onChange={e => onSearch(e.target.value)}
      />
      <div className="flex items-center gap-1">
        <select
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-300 focus:outline-none"
          value={filterCat}
          onChange={e => onFilterCat(e.target.value)}
        >
          <option value="all">所有類型</option>
          {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-300 focus:outline-none"
          value={filterStatus}
          onChange={e => onFilterStatus(e.target.value)}
        >
          <option value="all">所有狀態</option>
          <option value="active">active</option>
          <option value="suspect">suspect</option>
          <option value="superseded">superseded</option>
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button
          className="flex-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded px-2 py-1 transition-colors"
          onClick={onCreateClick}
        >
          ＋ 新增
        </button>
        <button
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded px-2 py-1 transition-colors"
          onClick={onUploadClick}
          title="上傳 MD"
        >
          ↑ MD
        </button>
        <button
          className="text-xs text-zinc-500 hover:text-zinc-300 px-1"
          onClick={onReload}
          title="重新載入"
        >
          ↻
        </button>
      </div>
    </div>
  );
}
