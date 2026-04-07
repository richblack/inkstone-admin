// ProgressDocs.tsx — docs tab 容器：管理所有 docs state + 協調子元件（≤100行）
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { DocEntry, DocDef, Block, Triplet } from './ProgressDocUpload';
import { docCache, processPage, convertArrowTriplets, saveFullEdit, entriesToMd } from './ProgressDocUpload';
import ProgressDocsList from './ProgressDocsList';
import ProgressDocDetail from './ProgressDocDetail';
const R = { DEF: 260, MIN: 200, MAX: 500 };
export default function ProgressDocs() {
  const [docs, setDocs] = useState<DocDef[]>([]); const [docsLoading, setDocsLoading] = useState(true);
  const [addDocStatus, setAddDocStatus] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docEntries, setDocEntries] = useState<DocEntry[]>([]); const [docLoading, setDocLoading] = useState(false);
  const [triplets, setTriplets] = useState<Triplet[]>([]); const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [blockTriplets, setBlockTriplets] = useState<Triplet[]>([]); const [tripletsLoading, setTripletsLoading] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null); const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false); const [processing, setProcessing] = useState(false); const [converting, setConverting] = useState(false);
  const [processStatus, setProcessStatus] = useState<string | null>(null); const [convertStatus, setConvertStatus] = useState<string | null>(null);
  const [fullEditMode, setFullEditMode] = useState(false); const [fullEditText, setFullEditText] = useState(''); const [fullEditSaving, setFullEditSaving] = useState(false);
  const [rightWidth, setRightWidth] = useState(R.DEF); const [newPredicate, setNewPredicate] = useState('derives_from');
  const [searchQ, setSearchQ] = useState(''); const [searchResults, setSearchResults] = useState<Array<{ block: Block; docLabel: string }>>([]);
  const [selectedTarget, setSelectedTarget] = useState<Block | null>(null); const [adding, setAdding] = useState(false);
  const [historyBlock, setHistoryBlock] = useState<Block | null>(null); const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());
  const prevDocRef = useRef<string | null>(null); const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  useEffect(() => {
    fetch('/api/kbdb/blocks?user_id=admin&type=page&limit=100').then(r => r.json() as Promise<{ blocks?: Block[] }>)
      .then(d => setDocs((d.blocks ?? []).map(b => ({ id: b.id, label: b.page_name || b.content.slice(0, 40), icon: '📄' })))).catch(console.error).finally(() => setDocsLoading(false));
    fetch('/api/kbdb/triplets?limit=500').then(r => r.json() as Promise<{ triplets?: Triplet[] }>).then(d => setTriplets(d.triplets ?? [])).catch(console.error);
  }, []);
  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (dragRef.current) setRightWidth(Math.min(R.MAX, Math.max(R.MIN, dragRef.current.startW + dragRef.current.startX - e.clientX))); };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);
  const reloadDoc = useCallback(async (id: string) => {
    setDocLoading(true); setDocEntries([]);
    try { const d = await fetch(`/api/kbdb/blocks/${id}/children?depth=5`).then(r => r.json()) as { blocks?: Array<{ block: Block; level: number }> }; const entries = (d.blocks ?? []).map(x => ({ block: x.block, depth: x.level ?? 0 })); docCache.set(id, entries); setDocEntries(entries); } catch { /**/ } finally { setDocLoading(false); }
  }, []);
  const selectDoc = useCallback(async (id: string) => {
    setSelectedDocId(id); setSelectedBlockId(null); setEditingBlockId(null); setFullEditMode(false); setAddDocStatus(null);
    if (docCache.has(id)) { setDocEntries(docCache.get(id)!); return; } await reloadDoc(id);
  }, [reloadDoc]);
  useEffect(() => {
    if (!selectedBlockId) { setBlockTriplets([]); return; } setTripletsLoading(true);
    Promise.all([fetch(`/api/kbdb/triplets?subject=${encodeURIComponent(selectedBlockId)}&limit=100`).then(r => r.json() as Promise<{ triplets?: Triplet[] }>), fetch(`/api/kbdb/triplets?object=${encodeURIComponent(selectedBlockId)}&limit=100`).then(r => r.json() as Promise<{ triplets?: Triplet[] }>)])
      .then(rs => { const all = rs.flatMap(r => r.triplets ?? []); setBlockTriplets(all.filter((t, i, a) => a.findIndex(x => x.id === t.id) === i)); }).catch(() => setBlockTriplets([])).finally(() => setTripletsLoading(false));
  }, [selectedBlockId]);
  useEffect(() => { if (!searchQ.trim()) { setSearchResults([]); return; } const q = searchQ.toLowerCase(); const results: typeof searchResults = []; if (selectedDocId) { const lbl = docs.find(d => d.id === selectedDocId)?.label ?? ''; docEntries.filter(e => e.block.content?.toLowerCase().includes(q)).slice(0, 8).forEach(e => results.push({ block: e.block, docLabel: lbl })); } for (const [id, ents] of docCache.entries()) { if (id === selectedDocId) continue; const lbl = docs.find(d => d.id === id)?.label ?? id.slice(0, 8); ents.filter(e => e.block.content?.toLowerCase().includes(q)).slice(0, 4).forEach(e => { if (results.length < 15) results.push({ block: e.block, docLabel: lbl }); }); } setSearchResults(results.slice(0, 15)); }, [searchQ, docEntries, docs, selectedDocId]);
  const hasChildrenSet = useMemo(() => { const s = new Set<string>(); for (let i = 0; i < docEntries.length - 1; i++) { if (docEntries[i + 1].depth > docEntries[i].depth) s.add(docEntries[i].block.id); } return s; }, [docEntries]);
  const tripletsSet = useMemo(() => new Set<string>(triplets.flatMap(t => [t.subject, t.object])), [triplets]);
  const visibleEntries = useMemo(() => { const res: DocEntry[] = []; const stack: number[] = []; for (const e of docEntries) { while (stack.length && stack[stack.length - 1] >= e.depth) stack.pop(); if (stack.length) continue; res.push(e); if (collapsedBlocks.has(e.block.id)) stack.push(e.depth); } return res; }, [docEntries, collapsedBlocks]);
  useEffect(() => { if (docEntries.length > 0 && selectedDocId !== prevDocRef.current) { prevDocRef.current = selectedDocId; setCollapsedBlocks(new Set(docEntries.filter(e => e.depth > 0 && hasChildrenSet.has(e.block.id)).map(e => e.block.id))); } }, [docEntries, selectedDocId, hasChildrenSet]);
  const saveBlockEdit = async () => { if (!editingBlockId) return; setSaving(true); try { const res = await fetch(`/api/kbdb/blocks/${editingBlockId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: editValue }) }); if (res.ok) { const upd = docEntries.map(e => e.block.id === editingBlockId ? { ...e, block: { ...e.block, content: editValue } } : e); setDocEntries(upd); docCache.set(selectedDocId!, upd); } } catch { /**/ } finally { setSaving(false); setEditingBlockId(null); setEditValue(''); } };
  const addTriplet = async () => { if (!selectedBlockId || !selectedTarget) return; setAdding(true); try { const res = await fetch('/api/kbdb/triplets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: selectedBlockId, predicate: newPredicate, object: selectedTarget.id, user_id: 'ceo-claude' }) }); if (res.ok) { const t = await res.json() as Triplet; setTriplets(p => [...p, t]); setBlockTriplets(p => [...p, t]); setSelectedTarget(null); setSearchQ(''); setSearchResults([]); } } catch { /**/ } finally { setAdding(false); } };
  const deleteTriplet = async (id: string) => { await fetch(`/api/kbdb/triplets/${id}`, { method: 'DELETE' }).catch(() => {}); setTriplets(p => p.filter(t => t.id !== id)); setBlockTriplets(p => p.filter(t => t.id !== id)); };
  const deleteDoc = useCallback(async (id: string, lbl: string) => { if (!confirm(`刪除「${lbl}」？`)) return; await fetch(`/api/kbdb/blocks/${id}`, { method: 'DELETE' }); docCache.delete(id); setDocs(p => p.filter(d => d.id !== id)); if (selectedDocId === id) { setSelectedDocId(null); setDocEntries([]); } }, [selectedDocId]);
  const docLabel = docs.find(d => d.id === selectedDocId)?.label ?? '';
  const refreshTriplets = () => fetch('/api/kbdb/triplets?limit=500').then(r => r.json() as Promise<{ triplets?: Triplet[] }>).then(d => setTriplets(d.triplets ?? [])).catch(console.error);
  return (
    <div className="flex flex-1 overflow-hidden">
      <ProgressDocsList docs={docs} docsLoading={docsLoading} selectedDocId={selectedDocId} addDocStatus={addDocStatus}
        onSelectDoc={id => void selectDoc(id)} onDeleteDoc={(id, lbl) => void deleteDoc(id, lbl)}
        onDocAdded={(id, lbl) => { setDocs(p => [...p, { id, label: lbl, icon: '📄' }]); docCache.delete(id); void selectDoc(id); }}
        onStatus={setAddDocStatus} />
      <ProgressDocDetail docs={docs} selectedDocId={selectedDocId} docEntries={docEntries} docLoading={docLoading}
        selectedBlockId={selectedBlockId} blockTriplets={blockTriplets} tripletsLoading={tripletsLoading}
        editingBlockId={editingBlockId} editValue={editValue} saving={saving} processing={processing} converting={converting}
        processStatus={processStatus} convertStatus={convertStatus} fullEditMode={fullEditMode} fullEditText={fullEditText}
        fullEditSaving={fullEditSaving} visibleEntries={visibleEntries} hasChildrenSet={hasChildrenSet}
        collapsedBlocks={collapsedBlocks} tripletsSet={tripletsSet} searchQ={searchQ} searchResults={searchResults}
        selectedTarget={selectedTarget} newPredicate={newPredicate} adding={adding} historyBlock={historyBlock} rightWidth={rightWidth}
        onSelectBlock={setSelectedBlockId} onEditStart={b => { setEditingBlockId(b.id); setEditValue(b.content ?? ''); }}
        onEditChange={setEditValue} onEditSave={() => void saveBlockEdit()} onEditCancel={() => { setEditingBlockId(null); setEditValue(''); }}
        onToggleCollapse={id => setCollapsedBlocks(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; })}
        onCreateArtifact={() => { /**/ }} onHistoryClick={b => setHistoryBlock(p => p?.id === b.id ? null : b)}
        onProcess={() => selectedDocId && void processPage(selectedDocId, setProcessStatus, setProcessing)}
        onConvert={() => selectedDocId && void convertArrowTriplets(selectedDocId, docLabel, setConvertStatus, setConverting, () => void refreshTriplets())}
        onDownload={() => { if (!selectedDocId || !docEntries.length) return; const blob = new Blob([entriesToMd(docEntries)], { type: 'text/markdown' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${docLabel}.md`; a.click(); }}
        onOpenFullEdit={() => { setFullEditText(entriesToMd(docEntries)); setFullEditMode(true); }}
        onFullEditChange={setFullEditText}
        onFullEditSave={() => selectedDocId && void saveFullEdit(selectedDocId, fullEditText, reloadDoc, setFullEditSaving, setFullEditMode, docLabel)}
        onFullEditCancel={() => setFullEditMode(false)}
        onSearchQ={v => { setSearchQ(v); setSelectedTarget(null); }}
        onSelectTarget={b => { setSelectedTarget(b); setSearchQ(b.content?.slice(0, 50) ?? b.id); setSearchResults([]); }}
        onNewPredicate={setNewPredicate} onAddTriplet={() => void addTriplet()} onDeleteTriplet={id => void deleteTriplet(id)}
        dragHandleProps={{ onMouseDown: e => { dragRef.current = { startX: e.clientX, startW: rightWidth }; e.preventDefault(); } }} />
    </div>
  );
}
