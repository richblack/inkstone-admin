// usePolarisEditor.ts — PolarisEditor 狀態管理 hook（≤100行）
// artifact_type 正規化對照表（舊格式 → 新格式 slug）
const TYPE_NORMALIZE: Record<string, string> = {
  'vm-sdd': 'sdd',
  'architecture': 'sdd', // ADR-064 廢除，顯示為 sdd
};
function normalizeType(t: string): string { return TYPE_NORMALIZE[t] ?? t; }

import { useState, useEffect, useCallback } from 'react';
import type { SpecArtifact } from './EditorTree';
import type { Triplet } from '../api';
import { fetchTriplets } from '../api';

export interface ArtifactFull {
  id: string; artifact_type: string; status: string; summary: string; raw_content: string; derives_from: string[];
}
interface RawArtifact {
  id: string; artifact_type: string; status: string; summary: string; content: string; derives_from?: string[];
}

export type EditorPanel = 'editor' | 'category-map' | 'checklist';

export function usePolarisEditor() {
  const [arts, setArts] = useState<ArtifactFull[]>([]);
  const [triplets, setTriplets] = useState<Triplet[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<ArtifactFull | null>(null);
  const [selBlock, setSelBlock] = useState<number | null>(null);
  const [selBlockId, setSelBlockId] = useState<string | null>(null); // Bug 2 fix
  const [panel, setPanel] = useState<EditorPanel>('editor');

  const reloadArts = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch('/api/spec-sync/spec/list').then(r => r.json()) as { artifacts?: RawArtifact[] };
      setArts((d.artifacts ?? []).map(a => ({
        id: a.id, raw_content: a.content ?? '', artifact_type: normalizeType(a.artifact_type ?? 'unknown'),
        summary: a.summary ?? '', status: a.status ?? 'active', derives_from: a.derives_from ?? [],
      })));
    } catch { /**/ } finally { setLoading(false); }
  }, []);

  // Bug 1 fix：依 artifactId 精確載入 subject + object 兩方向的 triplets
  const reloadTriplets = useCallback(async (artifactId?: string) => {
    if (artifactId) {
      const enc = encodeURIComponent(artifactId);
      const [r1, r2] = await Promise.all([
        fetchTriplets({ subject: artifactId, limit: 200 }).catch(() => ({ triplets: [] as Triplet[] })),
        fetch(`/api/kbdb/triplets?object=${enc}&limit=200`)
          .then(r => r.json() as Promise<{ triplets: Triplet[] }>)
          .catch(() => ({ triplets: [] as Triplet[] })),
      ]);
      const all = [...(r1.triplets ?? []), ...(r2.triplets ?? [])];
      const seen = new Set<string>();
      setTriplets(all.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; }));
    } else {
      const r = await fetchTriplets({ limit: 500 }).catch(() => ({ triplets: [] as Triplet[] }));
      setTriplets(r.triplets ?? []);
    }
  }, []);

  useEffect(() => { void reloadArts(); void reloadTriplets(); }, [reloadArts, reloadTriplets]);

  // Bug 1 + Bug 2 fix：選擇 artifact 時重新載入該 artifact 的 triplets，並重置 selBlockId
  const handleSelect = useCallback((a: SpecArtifact) => {
    const full = arts.find(x => x.id === a.id) ?? null;
    setSel(full); setSelBlock(null); setSelBlockId(null); setPanel('editor');
    if (full) void reloadTriplets(full.id);
  }, [arts, reloadTriplets]);

  const handleUpdate = useCallback((updated: ArtifactFull) => {
    setArts(prev => prev.map(a => a.id === updated.id ? updated : a));
    setSel(prev => prev?.id === updated.id ? updated : prev);
  }, []);

  const handleNavigate = useCallback((idOrLabel: string) => {
    const art = arts.find(a => a.id === idOrLabel || a.summary.toLowerCase().startsWith(idOrLabel.toLowerCase()));
    if (art) { setSel(art); setSelBlock(null); setSelBlockId(null); setPanel('editor'); void reloadTriplets(art.id); }
  }, [arts, reloadTriplets]);

  const handleDelete = useCallback((id: string) => {
    setArts(prev => prev.filter(a => a.id !== id));
    setSel(prev => prev?.id === id ? null : prev);
    setSelBlock(null); setSelBlockId(null);
  }, []);

  const treeArts: SpecArtifact[] = arts.map(a => ({
    id: a.id, artifact_type: a.artifact_type, status: a.status,
    summary: a.summary, content: a.raw_content, derives_from: a.derives_from,
  }));

  return {
    arts, treeArts, triplets, loading, sel, selBlock, selBlockId, panel,
    setTriplets, setSelBlock, setSelBlockId, setPanel,
    reloadArts: () => { setArts([]); void reloadArts(); },
    handleSelect, handleUpdate, handleNavigate, handleDelete,
  };
}
