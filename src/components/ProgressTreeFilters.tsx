// ProgressTreeFilters.tsx — spec 篩選列（搜尋 + 類型/狀態 + 計數，≤100行）
interface Props {
  filterType: string; filterStatus: string; search: string;
  types: string[]; allCount: number; filteredCount: number;
  onFilterType: (v: string) => void; onFilterStatus: (v: string) => void; onSearch: (v: string) => void;
}

export default function ProgressTreeFilters({ filterType, filterStatus, search, types, allCount, filteredCount, onFilterType, onFilterStatus, onSearch }: Props) {
  return (
    <div className="px-3 py-2 border-b border-zinc-800 flex flex-col gap-1.5 flex-shrink-0">
      <input
        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
        placeholder="搜尋…" value={search} onChange={e => onSearch(e.target.value)}
      />
      <div className="flex gap-1">
        <select className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-xs text-zinc-300 focus:outline-none" value={filterType} onChange={e => onFilterType(e.target.value)}>
          <option value="all">全部類型</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-xs text-zinc-300 focus:outline-none" value={filterStatus} onChange={e => onFilterStatus(e.target.value)}>
          <option value="all">全部狀態</option>
          <option value="active">active</option>
          <option value="suspect">suspect</option>
          <option value="superseded">superseded</option>
        </select>
      </div>
      <div className="text-xs text-zinc-600">{filteredCount} / {allCount} 個</div>
    </div>
  );
}
