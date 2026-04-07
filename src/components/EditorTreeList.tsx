// EditorTreeList.tsx — 編輯器左側文件列表渲染（≤100行）
import { CATEGORY_BADGE, GROUP_LABELS } from './editorCategories';
import type { SpecArtifact } from './EditorTree';

interface Props {
  filtered: SpecArtifact[];
  loading: boolean;
  selectedId: string | null;
  catsByGroup: Record<string, string[]>;
  groups: string[];
  onSelect: (a: SpecArtifact) => void;
}

export default function EditorTreeList({
  filtered, loading, selectedId, catsByGroup, groups, onSelect,
}: Props) {
  if (loading) {
    return <div className="text-zinc-600 text-xs px-3 py-3 animate-pulse">載入中…</div>;
  }
  if (filtered.length === 0) {
    return <div className="text-zinc-600 text-xs px-3 py-4">無符合的文件</div>;
  }
  return (
    <>
      {groups.map(group => {
        const groupCats = catsByGroup[group];
        const groupItems = filtered.filter(a => groupCats.includes(a.artifact_type));
        if (!groupItems.length) return null;
        return (
          <div key={group}>
            <div className="px-3 py-1 bg-zinc-800/40 text-xs text-zinc-500 font-medium sticky top-0">
              {GROUP_LABELS[group]}
            </div>
            {groupCats.map(cat => {
              const items = groupItems.filter(a => a.artifact_type === cat);
              if (!items.length) return null;
              const badge = CATEGORY_BADGE[cat] ?? CATEGORY_BADGE.unknown;
              return (
                <div key={cat}>
                  <div className="px-3 py-1 flex items-center gap-2 bg-zinc-800/20">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${badge}`}>{cat}</span>
                    <span className="text-zinc-600 text-xs ml-auto">{items.length}</span>
                  </div>
                  {items.map(a => (
                    <button key={a.id}
                      className={`w-full text-left px-3 py-2 border-b border-zinc-800/30 transition-colors ${selectedId === a.id ? 'bg-zinc-800 ring-1 ring-inset ring-zinc-600' : 'hover:bg-zinc-800/60'}`}
                      onClick={() => onSelect(a)}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {a.status === 'suspect' && (
                          <span className="text-orange-400 text-xs flex-shrink-0">●</span>
                        )}
                        <span className={`text-xs truncate flex-1 ${a.status === 'superseded' ? 'line-through text-zinc-500' : 'text-zinc-300'}`}>
                          {a.summary.slice(0, 50)}{a.summary.length > 50 ? '…' : ''}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
