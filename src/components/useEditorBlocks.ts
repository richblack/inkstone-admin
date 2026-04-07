// useEditorBlocks.ts — 從 KBDB 讀取真實子 blocks（≤100行）
import { useState, useEffect, useCallback } from 'react';

export interface ChildBlock {
  id: string;
  content: string;
}

interface RawEntry {
  block: { id: string; content: string; parent_id: string | null };
  level: number;
}

export function useEditorBlocks(artifactId: string | null) {
  const [blocks, setBlocks] = useState<ChildBlock[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kbdb/blocks/${id}/children?depth=1`);
      if (!res.ok) throw new Error('children fetch failed');
      const data = await res.json() as { blocks: RawEntry[] };
      // level=0 是根 block 本身，level=1 是直接子 blocks（每一行內容）
      const children = data.blocks
        .filter(b => b.level === 1 && b.block.content.trim() !== '')
        .map(b => ({ id: b.block.id, content: b.block.content }));
      setBlocks(children);
    } catch {
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (artifactId) { void reload(artifactId); }
    else { setBlocks([]); }
  }, [artifactId, reload]);

  // 單一 block 行內儲存：直接 PUT /blocks/:id，不重建所有子 blocks
  const saveBlock = useCallback(async (blockId: string, content: string) => {
    const res = await fetch(`/api/kbdb/blocks/${blockId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, content } : b));
    }
  }, []);

  // 結構操作（新增/刪除/移動）後呼叫，重新從 KBDB 讀取最新子 blocks
  const refresh = useCallback(() => {
    if (artifactId) { void reload(artifactId); }
  }, [artifactId, reload]);

  return { blocks, loading, saveBlock, refresh };
}
