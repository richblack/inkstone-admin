// EditorMeta.tsx — 文件 metadata 列（≤100行）
import { useState } from 'react';
import { CATEGORY_BADGE } from './editorCategories';
import { useCategoryDefs } from './useCategoryDefs';
import type { ArtifactFull } from './usePolarisEditor';

interface Props {
  artifact: ArtifactFull;
  onUpdate: (a: ArtifactFull) => void;
  onDelete: (id: string) => void;
}

export default function EditorMeta({ artifact, onUpdate, onDelete }: Props) {
  const { categories } = useCategoryDefs();
  const [saving, setSaving] = useState(false);
  const badge = CATEGORY_BADGE[artifact.artifact_type] ?? CATEGORY_BADGE.unknown;

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    const res = await fetch(`/api/spec-sync/spec/${artifact.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);
    setSaving(false);
    return res?.ok ?? false;
  };

  const handleCatChange = async (newType: string) => {
    if (await patch({ artifact_type: newType })) onUpdate({ ...artifact, artifact_type: newType });
  };

  const handleConfirm = async () => {
    setSaving(true);
    const res = await fetch(`/api/spec-sync/spec/confirm/${artifact.id}`, { method: 'PATCH' }).catch(() => null);
    if (res?.ok) onUpdate({ ...artifact, status: 'active' });
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(`刪除「${artifact.summary.slice(0, 40)}」？此操作不可恢復。`)) return;
    const res = await fetch(`/api/spec-sync/spec/${artifact.id}`, { method: 'DELETE' }).catch(() => null);
    if (!res) return;
    if (res.status === 403) { alert('ADR 不可刪除，請建新 ADR 並標記原 ADR 為 superseded'); return; }
    if (res.status === 409) {
      const data = await res.json() as { blocks?: Array<{ summary: string }> };
      alert(`無法刪除：此文件被以下文件引用：\n${(data.blocks ?? []).map(b => b.summary).join('\n')}`);
      return;
    }
    if (res.ok) onDelete(artifact.id);
  };

  return (
    <div className="flex-shrink-0 border-b border-zinc-800 px-4 py-2 space-y-1.5">
      {/* 第一列：category / status / 操作 */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          className={`text-xs px-2 py-0.5 rounded border font-medium focus:outline-none bg-transparent cursor-pointer ${badge}`}
          value={artifact.artifact_type}
          disabled={saving}
          onChange={e => void handleCatChange(e.target.value)}
        >
          {categories.map(c => <option key={c.slug} value={c.slug} className="bg-zinc-900 text-zinc-200">{c.name}</option>)}
        </select>
        <span className={`text-xs px-1.5 py-0.5 rounded border flex-shrink-0 ${
          artifact.status === 'suspect'
            ? 'bg-orange-900/40 text-orange-300 border-orange-700'
            : artifact.status === 'superseded'
            ? 'bg-zinc-800 text-zinc-500 border-zinc-700'
            : 'bg-green-900/40 text-green-300 border-green-700'
        }`}>{artifact.status}</span>
        {artifact.status === 'suspect' && (
          <button
            className="text-xs px-2 py-0.5 bg-orange-700/40 text-orange-300 rounded hover:bg-orange-700/60 transition-colors disabled:opacity-40"
            onClick={() => void handleConfirm()} disabled={saving}
          >確認無影響</button>
        )}
        <span className="flex-1" />
        <button
          className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
          onClick={() => void handleDelete()}
          title="刪除文件"
        >🗑</button>
      </div>
      {/* 第二列：derives_from */}
      {artifact.derives_from.length > 0 && (
        <div className="text-xs text-zinc-500 flex gap-1 flex-wrap">
          <span className="text-zinc-600">上游：</span>
          {artifact.derives_from.map(id => (
            <span key={id} className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">{id.slice(0, 12)}…</span>
          ))}
        </div>
      )}
    </div>
  );
}
