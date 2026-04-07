// editorCategories.ts — Category 系統型別與初始資料（≤100行）

export interface CategoryDef {
  slug: string;
  name: string;
  prefix: string;
  group: 'project' | 'armor';
  color: string;
  root: boolean;
  valid_parents: string[];
  description: string;
}

export const CATEGORY_BADGE: Record<string, string> = {
  polaris: 'bg-blue-900/60 text-blue-300 border border-blue-700',
  sdd: 'bg-sky-900/60 text-sky-300 border border-sky-700',
  adr: 'bg-amber-900/60 text-amber-300 border border-amber-700',
  'lesson-learned': 'bg-green-900/60 text-green-300 border border-green-700',
  formula: 'bg-purple-900/60 text-purple-300 border border-purple-700',
  unknown: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
};

export const BUILTIN_CATEGORIES: CategoryDef[] = [
  {
    slug: 'polaris', name: 'Polaris', prefix: 'POL', group: 'project',
    color: 'blue', root: true, valid_parents: [],
    description: '唯一根文件，描述終極目標方向',
  },
  {
    slug: 'sdd', name: 'SDD', prefix: 'SDD', group: 'project',
    color: 'sky', root: false, valid_parents: ['polaris'],
    description: '完整規格文件（living document），包含所有 Epic/Story/Checklist',
  },
  {
    slug: 'adr', name: 'ADR', prefix: 'ADR', group: 'project',
    color: 'amber', root: false, valid_parents: [],
    description: '設計決策記錄，derives_from 指向被影響的文件',
  },
  {
    slug: 'lesson-learned', name: 'Lesson Learned', prefix: 'LL', group: 'armor',
    color: 'green', root: false, valid_parents: [],
    description: '機甲知識，記錄歷史教訓',
  },
  {
    slug: 'formula', name: 'Formula', prefix: 'FML', group: 'armor',
    color: 'purple', root: false, valid_parents: [],
    description: '感知規則與演算法',
  },
];

export const GROUP_LABELS: Record<string, string> = {
  project: '專案',
  armor: '機甲知識',
};

// 初始化：將 BUILTIN_CATEGORIES 寫入 KBDB（只在尚未存在時寫入）
export async function initCategories(): Promise<void> {
  for (const cat of BUILTIN_CATEGORIES) {
    const subject = `category:${cat.slug}`;
    // 先查是否已存在
    const existing = await fetch(`/api/kbdb/triplets?subject=${encodeURIComponent(subject)}&predicate=category-def&limit=1`)
      .then(r => r.json() as Promise<{ triplets?: unknown[] }>)
      .catch(() => ({ triplets: [] }));
    if ((existing.triplets ?? []).length > 0) continue;
    // 不存在則寫入
    await fetch('/api/kbdb/triplets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        predicate: 'category-def',
        object: JSON.stringify(cat),
        user_id: 'ceo-claude',
      }),
    }).catch(() => null);
  }
}

// 注意：此函式僅查靜態 BUILTIN_CATEGORIES，不反映 KBDB 即時狀態。
// 動態讀取請使用 useCategoryDefs() hook。
export function getCategoryDef(slug: string): CategoryDef | undefined {
  return BUILTIN_CATEGORIES.find(c => c.slug === slug);
}
