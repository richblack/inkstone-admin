// EditorUpload.tsx — 上傳 MD / 建立空白文件（≤100行）
import { useState, useRef } from 'react';
import { useCategoryDefs } from './useCategoryDefs';
import type { SpecArtifact } from './EditorTree';

interface Props { arts: SpecArtifact[]; onDone: (newId: string) => void; onClose: () => void; }

async function createSpec(catSlug: string, derivesFrom: string, content: string) {
  const derives = derivesFrom.trim() ? [derivesFrom.trim()] : [];
  const res = await fetch('/api/spec-sync/spec/create', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ artifact_type: catSlug, content, derives_from: derives }),
  });
  if (!res.ok) { const e = await res.json() as { error?: string }; throw new Error(e.error ?? '建立失敗'); }
  const { block_id } = await res.json() as { block_id: string };
  return block_id;
}

export default function EditorUpload({ arts, onDone, onClose }: Props) {
  const { categories } = useCategoryDefs();
  const [catSlug, setCatSlug] = useState('sdd');
  const [derivesFrom, setDerivesFrom] = useState('');
  const [mode, setMode] = useState<'upload' | 'blank'>('upload');
  const [blankTitle, setBlankTitle] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); setStatus('讀取檔案…');
    try {
      const mdText = await file.text();
      setStatus('建立文件（root + child blocks）…');
      // spec-sync /spec/create 內部處理：root block、child blocks、>> derives_from triplets（ADR-065 Sub-task B）
      const blockId = await createSpec(catSlug, derivesFrom, mdText);
      setStatus('✅ 完成'); onDone(blockId);
    } catch (err) { setStatus(`❌ ${String(err).slice(0, 80)}`); setBusy(false); }
  };

  const handleBlank = async () => {
    if (!blankTitle.trim()) { setStatus('請輸入標題'); return; }
    setBusy(true); setStatus('建立文件…');
    try { const blockId = await createSpec(catSlug, derivesFrom, `# ${blankTitle.trim()}\n`); setStatus('✅ 完成'); onDone(blockId); }
    catch (err) { setStatus(`❌ ${String(err).slice(0, 80)}`); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 w-96 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex gap-2 text-xs">
            {(['upload', 'blank'] as const).map(m => (
              <button key={m} className={`px-2 py-1 rounded transition-colors ${mode === m ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`} onClick={() => setMode(m)}>
                {m === 'upload' ? '↑ 上傳 MD' : '＋ 空白文件'}
              </button>
            ))}
          </div>
          <button className="text-zinc-600 hover:text-zinc-300 text-xs" onClick={onClose}>✕</button>
        </div>
        <div className="space-y-2 text-xs">
          <div>
            <label className="text-zinc-400 block mb-1">文件類型</label>
            <select className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 focus:outline-none" value={catSlug} onChange={e => setCatSlug(e.target.value)} disabled={busy}>
              {categories.map(c => <option key={c.slug} value={c.slug} className="bg-zinc-900">{c.name}（{c.prefix}）</option>)}
            </select>
          </div>
          <div>
            <label className="text-zinc-400 block mb-1">上游文件（derives_from，選填）</label>
            <select className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 focus:outline-none" value={derivesFrom} onChange={e => setDerivesFrom(e.target.value)} disabled={busy}>
              <option value="">— 無上游 —</option>
              {arts.filter(a => a.status === 'active').slice(0, 40).map(a => (
                <option key={a.id} value={a.id} className="bg-zinc-900">[{a.artifact_type}] {a.summary.slice(0, 40)}</option>
              ))}
            </select>
          </div>
          {mode === 'blank' && (
            <div>
              <label className="text-zinc-400 block mb-1">標題</label>
              <input className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 placeholder-zinc-600 focus:outline-none" placeholder="文件標題" value={blankTitle} onChange={e => setBlankTitle(e.target.value)} disabled={busy} onKeyDown={e => { if (e.key === 'Enter') void handleBlank(); }} />
            </div>
          )}
        </div>
        {status && <p className="text-xs text-zinc-400 bg-zinc-800 rounded px-2 py-1">{status}</p>}
        <input ref={inputRef} type="file" accept=".md,text/markdown" className="hidden" onChange={e => void handleFile(e)} />
        {mode === 'upload'
          ? <button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded transition-colors disabled:opacity-40" disabled={busy} onClick={() => inputRef.current?.click()}>選擇 .md 檔案上傳</button>
          : <button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-2 rounded transition-colors disabled:opacity-40" disabled={busy || !blankTitle.trim()} onClick={() => void handleBlank()}>建立空白文件</button>
        }
      </div>
    </div>
  );
}
