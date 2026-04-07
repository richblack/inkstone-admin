import { useEffect, useState, useCallback } from 'react';
import { fetchTriplets, type Triplet } from '../api';

const PAGE_SIZE = 50;

interface Props {
  initialSubject?: string;
}

export default function Triplets({ initialSubject }: Props) {
  const [subjectInput, setSubjectInput] = useState(initialSubject ?? '');
  const [predicateInput, setPredicateInput] = useState('');
  const [subject, setSubject] = useState(initialSubject ?? '');
  const [predicate, setPredicate] = useState('');
  const [page, setPage] = useState(0);
  const [triplets, setTriplets] = useState<Triplet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (sub: string, pred: string, pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTriplets({ subject: sub || undefined, predicate: pred || undefined, limit: PAGE_SIZE, offset: pageNum * PAGE_SIZE });
      setTriplets(res.triplets ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(subject, predicate, page); }, [subject, predicate, page, load]);

  // 外部帶入 subject（從 Entities tab 點擊跳轉）
  useEffect(() => {
    if (initialSubject) {
      setSubjectInput(initialSubject);
      setSubject(initialSubject);
      setPage(0);
    }
  }, [initialSubject]);

  const handleFilter = () => {
    setSubject(subjectInput);
    setPredicate(predicateInput);
    setPage(0);
  };

  const handleClickCell = (value: string, type: 'subject' | 'object') => {
    if (type === 'subject') { setSubjectInput(value); setSubject(value); }
    setPage(0);
  };

  return (
    <div className="space-y-4">
      {/* 篩選 */}
      <div className="flex gap-2 flex-wrap">
        <input
          className="flex-1 min-w-40 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          placeholder="Subject 篩選…"
          value={subjectInput}
          onChange={e => setSubjectInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleFilter()}
        />
        <input
          className="flex-1 min-w-40 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          placeholder="Predicate 篩選…"
          value={predicateInput}
          onChange={e => setPredicateInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleFilter()}
        />
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          onClick={handleFilter}
        >
          篩選
        </button>
        <button
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors"
          onClick={() => { setSubjectInput(''); setPredicateInput(''); setSubject(''); setPredicate(''); setPage(0); }}
        >
          清除
        </button>
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      {/* 表格 */}
      <div className="bg-zinc-900 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
              <th className="text-left px-4 py-2">Subject</th>
              <th className="text-left px-4 py-2">Predicate</th>
              <th className="text-left px-4 py-2">Object</th>
              <th className="text-right px-4 py-2">Conf</th>
              <th className="text-right px-4 py-2">User</th>
              <th className="text-right px-4 py-2">建立時間</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center text-zinc-500 py-8">載入中…</td></tr>
            ) : triplets.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-zinc-600 py-8">無資料</td></tr>
            ) : triplets.map(t => (
              <tr key={t.id} className="border-b border-zinc-800 hover:bg-zinc-800 transition-colors">
                <td
                  className="px-4 py-2 text-blue-400 hover:underline cursor-pointer max-w-40 truncate"
                  onClick={() => handleClickCell(t.subject, 'subject')}
                >
                  {t.subject}
                </td>
                <td className="px-4 py-2 text-yellow-400 max-w-32 truncate">{t.predicate}</td>
                <td
                  className="px-4 py-2 text-green-400 hover:underline cursor-pointer max-w-40 truncate"
                  onClick={() => handleClickCell(t.object, 'subject')}
                >
                  {t.object}
                </td>
                <td className="px-4 py-2 text-right text-zinc-400 font-mono text-xs">
                  {t.confidence != null ? t.confidence.toFixed(2) : '—'}
                </td>
                <td className="px-4 py-2 text-right text-zinc-500 text-xs font-mono max-w-24 truncate">
                  {t.user_id ?? '—'}
                </td>
                <td className="px-4 py-2 text-right text-zinc-500 text-xs">
                  {t.created_at ? new Date(t.created_at * 1000).toLocaleString('zh-TW') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分頁 */}
      <div className="flex items-center gap-2 justify-center">
        <button
          className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded disabled:opacity-40"
          disabled={page === 0}
          onClick={() => setPage(p => p - 1)}
        >
          上一頁
        </button>
        <span className="text-zinc-400 text-sm">第 {page + 1} 頁</span>
        <button
          className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded disabled:opacity-40"
          disabled={triplets.length < PAGE_SIZE}
          onClick={() => setPage(p => p + 1)}
        >
          下一頁
        </button>
      </div>
    </div>
  );
}
