// useCategoryDefs.ts — 動態讀取 KBDB category-def triplets（≤100行）
import { useState, useEffect, useCallback } from 'react';
import { fetchTriplets } from '../api';
import type { CategoryDef } from './editorCategories';

export interface UseCategoryDefsResult {
  categories: CategoryDef[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// 從 KBDB 動態讀取所有 category 定義
// 查詢條件：predicate = 'category-def'，subject = 'category:{slug}'
// object 欄位為 JSON 序列化的 CategoryDef
export function useCategoryDefs(): UseCategoryDefsResult {
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchTriplets({ predicate: 'category-def', limit: 100 })
      .then(result => {
        if (cancelled) return;
        const cats: CategoryDef[] = [];
        for (const t of result.triplets ?? []) {
          try {
            const def = JSON.parse(t.object) as CategoryDef;
            if (def?.slug) cats.push(def);
          } catch {
            // 忽略無法解析的 triplet
          }
        }
        setCategories(cats);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(String(err));
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tick]);

  return { categories, loading, error, reload };
}
