// EditorChecklist.tsx — 全域待辦彙整（≤100行）
import { useState, useEffect, useCallback } from 'react';

interface TodoItem { lineIdx: number; content: string; done: boolean; artId: string; artSummary: string; artType: string; }
interface RawArt { id: string; artifact_type: string; summary: string; status: string; content: string; }
interface Props { onNavigate?: (id: string) => void; }

function parseTodos(art: RawArt): TodoItem[] {
  return (art.content ?? '').split('\n')
    .map((line, i) => ({ line, i }))
    .filter(({ line }) => /^-\s*\[[ xX]\]/.test(line.trim()))
    .map(({ line, i }) => ({
      lineIdx: i, content: line.replace(/^-\s*\[[ xX]\]\s*/, '').trim(),
      done: /^-\s*\[[xX]\]/.test(line.trim()),
      artId: art.id, artSummary: art.summary, artType: art.artifact_type,
    }));
}

export default function EditorChecklist({ onNavigate }: Props) {
  const [arts, setArts] = useState<RawArt[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try { const d = await fetch('/api/spec-sync/spec/list').then(r => r.json()) as { artifacts?: RawArt[] }; setArts(d.artifacts ?? []); }
    catch { /**/ } finally { setLoading(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const todos = arts.flatMap(a => parseTodos(a));
  const pending = todos.filter(t => !t.done);
  const byArt = pending.reduce<Record<string, TodoItem[]>>((acc, t) => { (acc[t.artId] ??= []).push(t); return acc; }, {});

  const handleToggle = async (todo: TodoItem) => {
    const key = `${todo.artId}:${todo.lineIdx}`; setToggling(key);
    const art = arts.find(a => a.id === todo.artId);
    if (!art) { setToggling(null); return; }
    const lines = (art.content ?? '').split('\n');
    lines[todo.lineIdx] = todo.done
      ? (lines[todo.lineIdx] ?? '').replace(/- \[[xX]\]/, '- [ ]')
      : (lines[todo.lineIdx] ?? '').replace(/- \[ \]/, '- [x]');
    const newContent = lines.join('\n');
    const res = await fetch('/api/spec-sync/spec/update', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ block_id: todo.artId, new_content: newContent, confirmed_suspects: [] }),
    }).catch(() => null);
    if (res?.ok) setArts(prev => prev.map(a => a.id === todo.artId ? { ...a, content: newContent } : a));
    setToggling(null);
  };

  if (loading) return <div className="text-zinc-600 text-xs animate-pulse py-4">載入待辦中…</div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300">☑ 所有待辦（{pending.length} 筆未完成）</h2>
        <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors" onClick={() => void reload()}>↻ 重整</button>
      </div>
      {pending.length === 0 && <p className="text-zinc-600 text-sm py-4">所有待辦均已完成 🎉</p>}
      {Object.entries(byArt).map(([artId, items]) => (
        <div key={artId} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-600 uppercase tracking-wider">{items[0].artType}</span>
            <button className="text-xs text-zinc-400 hover:text-blue-400 transition-colors truncate text-left" onClick={() => onNavigate?.(artId)}>
              {items[0].artSummary.slice(0, 60) || artId}
            </button>
          </div>
          {items.map(todo => {
            const key = `${todo.artId}:${todo.lineIdx}`;
            return (
              <div key={key} className="flex items-start gap-2 pl-4">
                <button
                  className="flex-shrink-0 mt-0.5 text-zinc-400 hover:text-blue-400 disabled:opacity-40 transition-colors"
                  onClick={() => void handleToggle(todo)} disabled={toggling === key}
                >
                  {todo.done ? '☑' : '☐'}
                </button>
                <span className="text-xs text-zinc-300 leading-relaxed">{todo.content}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
