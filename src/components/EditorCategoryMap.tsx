// EditorCategoryMap.tsx — Category 目錄頁 + CRUD 入口（≤100行）
import { useState } from 'react';
import { CATEGORY_BADGE, GROUP_LABELS } from './editorCategories';
import type { CategoryDef } from './editorCategories';
import { useCategoryDefs } from './useCategoryDefs';
import EditorCategoryModal from './EditorCategoryModal';

interface Props {
  onSelectCategory?: (slug: string) => void;
}

export default function EditorCategoryMap({ onSelectCategory }: Props) {
  const { categories, loading, error, reload } = useCategoryDefs();
  const [showCrud, setShowCrud] = useState(false);
  const groups = Array.from(new Set(categories.map(c => c.group)));

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
      {showCrud && (
        <EditorCategoryModal
          categories={categories}
          onClose={() => setShowCrud(false)}
          onReload={() => { reload(); }}
        />
      )}
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-1">⊞ Category 目錄</h2>
          <p className="text-xs text-zinc-500">
            Admin Polaris 編輯器支援的文件類型。依 ADR-064，廢除 epic/story/checklist/architecture。
          </p>
        </div>

        {loading && <div className="text-zinc-600 text-xs animate-pulse">載入 category 定義中…</div>}
        {error && <div className="text-red-500 text-xs">讀取失敗：{error}</div>}

        {groups.map(group => {
          const cats = categories.filter(c => c.group === group);
          return (
            <div key={group} className="space-y-2">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                ▼ {GROUP_LABELS[group] ?? group}（{group}）
              </div>
              <div className="space-y-2 pl-3">
                {cats.map(cat => (
                  <CategoryRow
                    key={cat.slug}
                    cat={cat}
                    onClick={() => onSelectCategory?.(cat.slug)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        <div className="pt-4 border-t border-zinc-800 flex items-start justify-between gap-4">
          <p className="text-xs text-zinc-600">
            ℹ️ Category 定義儲存於 KBDB（predicate: category-def）。<br />
            未來擴充只需在此新增定義，不需改 code。
          </p>
          <button
            className="flex-shrink-0 text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors border border-zinc-700"
            onClick={() => setShowCrud(true)}
          >
            ⚙ 管理 Category
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ cat, onClick }: { cat: CategoryDef; onClick: () => void }) {
  const badge = CATEGORY_BADGE[cat.slug] ?? CATEGORY_BADGE.unknown;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors text-left"
    >
      <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 mt-0.5 ${badge}`}>
        {cat.prefix}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-zinc-200">{cat.name}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{cat.description}</div>
        {cat.valid_parents.length > 0 && (
          <div className="text-xs text-zinc-600 mt-1">上層：{cat.valid_parents.join(', ')}</div>
        )}
        {cat.root && <span className="text-xs text-blue-400 mt-1 block">✅ 根文件（免 derives_from）</span>}
      </div>
    </button>
  );
}
