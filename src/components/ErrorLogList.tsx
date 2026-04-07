import type { ParsedError } from './ErrorLog';
import { WHO_BADGE, SEV_BADGE } from './ErrorLogCreate';

interface Props {
  filtered: ParsedError[];
  catCount: Record<string, number>;
  categories: string[];
  selId: string | null;
  filterWho: string; filterCat: string; filterNote: string;
  onFilterWho: (v: string) => void;
  onFilterCat: (v: string) => void;
  onFilterNote: (v: string) => void;
  onSelect: (e: ParsedError) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export default function ErrorLogList({ filtered, catCount, categories, selId, filterWho, filterCat, filterNote, onFilterWho, onFilterCat, onFilterNote, onSelect, onCreate, onDelete }: Props) {
  return (
    <div className="w-96 flex-shrink-0 border-r border-zinc-800 flex flex-col">
      <div className="p-3 border-b border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400 font-semibold">錯誤記錄 <span className="text-zinc-600">({filtered.length})</span></span>
          <button onClick={onCreate} className="text-xs px-2 py-1 bg-red-900/60 hover:bg-red-800/60 text-red-300 border border-red-700 rounded transition-colors">+ 新增</button>
        </div>
        {/* who 篩選 */}
        <div className="flex gap-1 flex-wrap">
          {['all', 'Danni', 'Mira'].map(w => (
            <button key={w} onClick={() => onFilterWho(w)} className={`text-xs px-2 py-0.5 rounded border transition-colors ${filterWho === w ? (WHO_BADGE[w] ?? 'bg-zinc-700 text-zinc-200 border-zinc-600') : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-500'}`}>{w === 'all' ? '全部' : w}</button>
          ))}
        </div>
        {/* category 篩選 */}
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => onFilterCat('all')} className={`text-xs px-2 py-0.5 rounded border ${filterCat === 'all' ? 'bg-zinc-700 text-zinc-200 border-zinc-600' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>所有類別</button>
          {categories.map(c => (
            <button key={c} onClick={() => onFilterCat(c)} className={`text-xs px-2 py-0.5 rounded border ${filterCat === c ? 'bg-zinc-700 text-zinc-200 border-zinc-600' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
              {c}{(catCount[c] ?? 0) >= 3 && <span className="ml-1 text-orange-400">×{catCount[c]}⚠️</span>}
            </button>
          ))}
        </div>
        {/* note 篩選 */}
        <div className="flex gap-1">
          {([['all', '全部筆記'], ['has', '有 note'], ['no', '無 note']] as [string, string][]).map(([v, label]) => (
            <button key={v} onClick={() => onFilterNote(v)} className={`text-xs px-2 py-0.5 rounded border ${filterNote === v ? 'bg-zinc-700 text-zinc-200 border-zinc-600' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>{label}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && <div className="text-zinc-600 text-xs p-4">無記錄</div>}
        {filtered.map(e => {
          const isSel = e.id === selId;
          const warnCat = (catCount[e.category] ?? 0) >= 3;
          return (
            <div key={e.id} className={`border-b border-zinc-800/60 transition-colors ${isSel ? 'bg-zinc-800' : 'hover:bg-zinc-900'}`}>
              <button onClick={() => onSelect(e)} className="w-full text-left px-3 pt-2.5 pb-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${WHO_BADGE[e.who] ?? 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>{e.who}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${SEV_BADGE[e.severity] ?? SEV_BADGE.low}`}>{e.severity}</span>
                  {e.note?.trim() && <span className="text-xs text-teal-400">📝</span>}
                  {warnCat && <span className="text-xs text-orange-400">×{catCount[e.category]}⚠️</span>}
                </div>
                <div className="text-xs text-zinc-300 truncate">{e.what.slice(0, 60)}</div>
                <div className="text-xs text-zinc-600 mt-0.5 flex items-center justify-between">
                  <span>{e.category}</span>
                  <span>{new Date(e.created_at).toLocaleDateString('zh-TW')}</span>
                </div>
              </button>
              <div className="px-3 pb-2 flex justify-end">
                <button onClick={() => onDelete(e.id)} className="text-xs px-2 py-0.5 text-red-500 hover:text-red-300 hover:bg-red-900/30 rounded border border-transparent hover:border-red-800 transition-colors">刪除</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
