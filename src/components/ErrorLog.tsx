import { useState, useEffect, useMemo } from 'react';
import ErrorLogList from './ErrorLogList';
import ErrorLogDetail from './ErrorLogDetail';
import ErrorLogCreate, { type ErrorObject } from './ErrorLogCreate';

// ── 型別 ──────────────────────────────────────────────────────────────────────
interface ErrorTriplet { id: string; subject: string; predicate: string; object: string; }
export interface ParsedError extends ErrorObject { id: string; subject: string; }

// ── helpers ───────────────────────────────────────────────────────────────────
function parseError(t: ErrorTriplet): ParsedError | null {
  try { return { ...(JSON.parse(t.object) as ErrorObject), id: t.id, subject: t.subject }; }
  catch { return null; }
}
const authHdr = () => ({ Authorization: `Bearer ${localStorage.getItem('admin_token') ?? ''}` });

// ── 主元件 ────────────────────────────────────────────────────────────────────
export default function ErrorLog() {
  const [errors, setErrors] = useState<ParsedError[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<ParsedError | null>(null);
  const [filterWho, setFilterWho] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [filterNote, setFilterNote] = useState('all');
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/kbdb/triplets?predicate=error-log&limit=500', { headers: authHdr() });
      const d = await r.json() as { triplets?: ErrorTriplet[] };
      const parsed = (d.triplets ?? []).map(parseError).filter(Boolean) as ParsedError[];
      parsed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setErrors(parsed);
    } catch { /* noop */ } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const catCount = useMemo(() => {
    const m: Record<string, number> = {};
    errors.forEach(e => { m[e.category] = (m[e.category] ?? 0) + 1; });
    return m;
  }, [errors]);

  const categories = useMemo(() => [...new Set(errors.map(e => e.category))].sort(), [errors]);

  const filtered = useMemo(() => {
    let r = [...errors];
    if (filterWho !== 'all') r = r.filter(e => e.who === filterWho);
    if (filterCat !== 'all') r = r.filter(e => e.category === filterCat);
    if (filterNote === 'has') r = r.filter(e => e.note?.trim());
    if (filterNote === 'no')  r = r.filter(e => !e.note?.trim());
    return r;
  }, [errors, filterWho, filterCat, filterNote]);

  const createError = async (e: ErrorObject) => {
    const subject = `error-${Date.now()}`;
    await fetch('/api/kbdb/triplets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHdr() },
      body: JSON.stringify({ subject, predicate: 'error-log', object: JSON.stringify(e), user_id: 'ceo-claude' }),
    });
    setShowCreate(false);
    await load();
  };

  const handleUpdated = (updated: ParsedError) => {
    setErrors(p => p.map(e => e.id === updated.id ? updated : e));
    setSel(updated);
  };

  const deleteError = async (id: string) => {
    if (!window.confirm('確定刪除此筆錯誤記錄？此操作無法復原。')) return;
    await fetch(`/api/kbdb/triplets/${id}`, { method: 'DELETE', headers: authHdr() });
    setErrors(p => p.filter(e => e.id !== id));
    if (sel?.id === id) setSel(null);
  };

  if (loading) return <div className="text-zinc-500 animate-pulse p-6 text-sm">載入中…</div>;

  return (
    <div className="flex h-full overflow-hidden">
      <ErrorLogList
        filtered={filtered} catCount={catCount} categories={categories}
        selId={sel?.id ?? null} filterWho={filterWho} filterCat={filterCat} filterNote={filterNote}
        onFilterWho={setFilterWho} onFilterCat={setFilterCat} onFilterNote={setFilterNote}
        onSelect={e => setSel(e)} onCreate={() => setShowCreate(true)} onDelete={deleteError}
      />
      <div className="flex-1 overflow-y-auto p-6">
        {!sel
          ? <div className="flex items-center justify-center h-full text-zinc-600 text-sm">← 點選記錄查看詳情</div>
          : <ErrorLogDetail sel={sel} catCount={catCount} onUpdated={handleUpdated} />
        }
      </div>
      {showCreate && <ErrorLogCreate onClose={() => setShowCreate(false)} onCreate={createError} />}
    </div>
  );
}
