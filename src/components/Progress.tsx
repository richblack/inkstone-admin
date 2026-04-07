// Progress.tsx — tab 協調：文件 tab / Spec tab（≤200行）
import { useState, useEffect, useCallback, useMemo } from 'react';
import ProgressTree from './ProgressTree';
import ProgressDetail from './ProgressDetail';
import ProgressCreate from './ProgressCreate';
import ProgressDocs from './ProgressDocs';
import type { Triplet as DocTriplet } from './ProgressDocUpload';

export interface ArtifactBlock { id: string; raw_content: string; artifact_type: string; summary: string; status: string; page_name?: string | null; derives_from: string[]; }
export type Triplet = DocTriplet;
interface SpecArtifact { id: string; artifact_type: string; status: string; summary: string; content: string; derives_from?: string[]; }

export default function Progress() {
  const [activeTab, setActiveTab] = useState<'docs' | 'spec'>('docs');

  // ── Spec state ─────────────────────────────────────────────────────────────
  const [arts, setArts] = useState<ArtifactBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<ArtifactBlock | null>(null);
  const [triplets, setTriplets] = useState<Triplet[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [checklists, setChecklists] = useState<ArtifactBlock[]>([]);
  const [clLoading, setClLoading] = useState(false);
  const [clUpdating, setClUpdating] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [cs, setCs] = useState<'idle' | 'open' | 'saving'>('idle');
  const [artConverting, setArtConverting] = useState(false);
  const [artConvertStatus, setArtConvertStatus] = useState<string | null>(null);
  const [blocksAdding, setBlocksAdding] = useState(false);

  // ── Spec handlers ──────────────────────────────────────────────────────────
  const loadArts = useCallback(async () => {
    setLoading(true);
    try { const d = await fetch('/api/spec-sync/spec/list').then(r => r.json()) as { artifacts?: SpecArtifact[] }; setArts((d.artifacts ?? []).map(a => ({ id: a.id, raw_content: a.content ?? '', artifact_type: a.artifact_type ?? 'unknown', summary: a.summary ?? '', status: a.status ?? 'active', derives_from: a.derives_from ?? [] }))); } catch { /**/ } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (activeTab === 'spec' && arts.length === 0 && !loading) void loadArts(); }, [activeTab, arts.length, loading, loadArts]);
  useEffect(() => { setArtConvertStatus(null); }, [sel?.id]);
  useEffect(() => {
    if (!sel) { setChecklists([]); return; }
    setClLoading(true); const id = sel.id;
    fetch('/api/spec-sync/spec/list?artifact_type=checklist').then(r => r.json() as Promise<{ artifacts?: SpecArtifact[] }>)
      .then(d => setChecklists((d.artifacts ?? []).filter(cl => triplets.some(t => t.subject === cl.id && t.predicate === 'derives_from' && t.object === id)).map(a => ({ id: a.id, raw_content: a.content ?? '', artifact_type: 'checklist', summary: a.summary ?? '', status: a.status ?? 'active', derives_from: [] }))))
      .catch(() => setChecklists([])).finally(() => setClLoading(false));
  }, [sel?.id, triplets]);

  useEffect(() => {
    fetch('/api/kbdb/triplets?limit=500').then(r => r.json() as Promise<{ triplets?: Triplet[] }>).then(d => setTriplets(d.triplets ?? [])).catch(console.error);
  }, []);

  const confirmArt = useCallback(async (id: string) => { setConfirming(true); const res = await fetch(`/api/spec-sync/spec/confirm/${id}`, { method: 'PATCH' }).catch(() => null); if (res?.ok) { setArts(p => p.map(a => a.id === id ? { ...a, status: 'active' } : a)); setSel(p => p?.id === id ? { ...p, status: 'active' } : p); } setConfirming(false); }, []);
  const specUpdate = (id: string, c: string) => fetch('/api/spec-sync/spec/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ block_id: id, new_content: c, confirmed_suspects: [] }) }).catch(() => null);
  const toggleCl = useCallback(async (clId: string, idx: number, content: string) => { setClUpdating(clId); const lines = content.split('\n'); const l = lines[idx] ?? ''; lines[idx] = /- \[ \]/i.test(l) ? l.replace(/- \[ \]/, '- [x]') : l.replace(/- \[x\]/i, '- [ ]'); const nc = lines.join('\n'); const res = await specUpdate(clId, nc); if (res?.ok) setChecklists(p => p.map(cl => cl.id === clId ? { ...cl, raw_content: nc } : cl)); setClUpdating(null); }, []);
  const saveEdit = useCallback(async () => { if (!editId) return; setEditSaving(true); const res = await specUpdate(editId, editVal); if (res?.ok) { setArts(p => p.map(a => a.id === editId ? { ...a, raw_content: editVal } : a)); setSel(p => p?.id === editId ? { ...p, raw_content: editVal } : p); setEditId(null); } setEditSaving(false); }, [editId, editVal]);
  const createArt = useCallback(async (t: string, c: string, df: string[]) => { setCs('saving'); const r = await fetch('/api/spec-sync/spec/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ artifact_type: t, content: c, derives_from: df }) }).catch(() => null); if (r?.ok) { setCs('idle'); void loadArts(); } else { alert(((await r?.json().catch(() => ({}))) as { error?: string }).error ?? '建立失敗'); setCs('open'); } }, [loadArts]);
  const convertSpecArrows = useCallback(async () => {
    if (!sel) return; setArtConverting(true); setArtConvertStatus('轉換中…'); let conv = 0, skip = 0;
    for (const line of sel.raw_content.split('\n').map(l => l.trim()).filter(l => l.startsWith('>>'))) {
      const parts = line.split('>>').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) { const res = await fetch('/api/kbdb/triplets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: sel.id, predicate: parts[0], object: parts.slice(1).join(' >> '), user_id: 'ceo-claude' }) }).catch(() => null); if (res?.ok) { const t = await res.json() as Triplet; setTriplets(p => [...p, t]); conv++; } else skip++; }
    }
    setArtConvertStatus(`✅ ${conv} 條，跳 ${skip}`); setArtConverting(false);
  }, [sel]);
  const addBlocksTriplet = useCallback(async (targetId: string) => {
    if (!sel) return; setBlocksAdding(true);
    const res = await fetch('/api/kbdb/triplets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: sel.id, predicate: 'blocks', object: targetId, user_id: 'ceo-claude' }) }).catch(() => null);
    if (res?.ok) { const t = await res.json() as Triplet; setTriplets(p => [...p, t]); } setBlocksAdding(false);
  }, [sel]);
  const removeBlocksTriplet = useCallback(async (tripletId: string) => { await fetch(`/api/kbdb/triplets/${tripletId}`, { method: 'DELETE' }).catch(() => {}); setTriplets(p => p.filter(t => t.id !== tripletId)); }, []);
  const patchSpec = useCallback(async (id: string, patch: { summary?: string; derives_from?: string[] }) => { const r = await fetch(`/api/spec-sync/spec/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }).catch(() => null); if (r?.ok) { if (patch.summary !== undefined) { setArts(a => a.map(x => x.id === id ? { ...x, raw_content: patch.summary!, summary: patch.summary!.slice(0, 80) } : x)); setSel(x => x?.id === id ? { ...x, raw_content: patch.summary!, summary: patch.summary!.slice(0, 80) } : x); } if (patch.derives_from !== undefined) { setArts(a => a.map(x => x.id === id ? { ...x, derives_from: patch.derives_from! } : x)); setSel(x => x?.id === id ? { ...x, derives_from: patch.derives_from! } : x); } } return r?.ok ?? false; }, []);
  const filtered = useMemo(() => { let r = [...arts]; if (filterType !== 'all') r = r.filter(a => a.artifact_type === filterType); if (filterStatus !== 'all') r = r.filter(a => a.status === filterStatus); if (search.trim()) { const q = search.toLowerCase(); r = r.filter(a => a.summary.toLowerCase().includes(q)); } return r; }, [arts, filterType, filterStatus, search]);
  const navigate = useCallback((id: string) => { const t = arts.find(a => a.id === id); if (!t) return; if (!filtered.some(a => a.id === id)) { setFilterType('all'); setFilterStatus('all'); setSearch(''); } setSel(t); setActiveTab('spec'); }, [arts, filtered]);
  const suspectCount = arts.filter(a => a.status === 'suspect').length;

  const treeProps = {
    arts: filtered, allArts: arts, allCount: arts.length, loading, triplets, selectedId: sel?.id ?? null,
    filterType, filterStatus, search, onFilterType: setFilterType, onFilterStatus: setFilterStatus, onSearch: setSearch,
    onSelect: (a: ArtifactBlock) => setSel(p => p?.id === a.id ? null : a),
    onReload: () => { setArts([]); void loadArts(); }, onCreateClick: () => setCs('open'),
  };
  const detailProps = { artifact: sel, arts, triplets, checklists, clLoading, clUpdating, confirming, editId, editVal, editSaving, artConverting, artConvertStatus, blocksAdding, onConfirm: confirmArt, onToggleCl: toggleCl, onEditStart: (id: string, c: string) => { setEditId(id); setEditVal(c); }, onEditChange: setEditVal, onEditSave: () => void saveEdit(), onEditCancel: () => setEditId(null), onNavigate: navigate, onPatch: patchSpec, onConvert: () => void convertSpecArrows(), onAddBlock: addBlocksTriplet, onRemoveBlock: removeBlocksTriplet };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex-shrink-0 flex border-b border-zinc-800 bg-zinc-900 px-3 gap-1">
        <button
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === 'docs' ? 'border-blue-500 text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          onClick={() => setActiveTab('docs')}
        >文件</button>
        <button
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 ${activeTab === 'spec' ? 'border-blue-500 text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          onClick={() => setActiveTab('spec')}
        >
          Spec
          {suspectCount > 0 && <span className="bg-orange-500/20 text-orange-400 text-xs rounded-full px-1.5 py-0.5 leading-none">{suspectCount}</span>}
        </button>
      </div>

      {/* Docs tab */}
      {activeTab === 'docs' && <ProgressDocs />}

      {/* Spec tab */}
      {activeTab === 'spec' && (
        <div className="flex flex-1 overflow-hidden">
          <ProgressTree {...treeProps} />
          <ProgressDetail {...detailProps} />
          {cs !== 'idle' && <ProgressCreate arts={arts} creating={cs === 'saving'} onClose={() => setCs('idle')} onCreate={createArt} />}
        </div>
      )}
    </div>
  );
}
