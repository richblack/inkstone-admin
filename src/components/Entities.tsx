import { useEffect, useState, useCallback } from 'react';
import { fetchEntities, fetchTripletsBySubject, type EntityStat, type Triplet } from '../api';

const PAGE_SIZE = 50;

export default function Entities({ onNavigate }: { onNavigate?: (subject: string) => void }) {
  const [entities, setEntities] = useState<EntityStat[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedTriplets, setExpandedTriplets] = useState<Triplet[]>([]);
  const [expandLoading, setExpandLoading] = useState(false);

  const load = useCallback(async (pageNum: number, query: string) => {
    setLoading(true);
    try {
      const res = await fetchEntities(PAGE_SIZE, pageNum * PAGE_SIZE, query || undefined);
      setEntities(res.entities);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(page, q); }, [page, q, load]);

  const handleSearch = () => {
    setQ(inputVal);
    setPage(0);
    setExpanded(null);
  };

  const handleExpand = async (name: string) => {
    if (expanded === name) { setExpanded(null); return; }
    setExpanded(name);
    setExpandLoading(true);
    try {
      const res = await fetchTripletsBySubject(name, 30);
      setExpandedTriplets(res.triplets ?? []);
    } finally {
      setExpandLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* 搜尋欄 */}
      <div className="flex gap-2">
        <input
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          placeholder="搜尋 entity 名稱…"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          onClick={handleSearch}
        >
          搜尋
        </button>
      </div>

      {/* 計數 */}
      <div className="text-zinc-500 text-sm">共 {(total ?? 0).toLocaleString()} 個實體</div>

      {/* 列表 */}
      <div className="bg-zinc-900 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
              <th className="text-left px-4 py-2">Entity</th>
              <th className="text-right px-4 py-2">as_subject</th>
              <th className="text-right px-4 py-2">as_object</th>
              <th className="text-right px-4 py-2">total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center text-zinc-500 py-8">載入中…</td></tr>
            ) : entities.map(e => (
              <>
                <tr
                  key={e.name}
                  className="border-b border-zinc-800 hover:bg-zinc-800 cursor-pointer transition-colors"
                  onClick={() => void handleExpand(e.name)}
                >
                  <td className="px-4 py-2 text-zinc-100">
                    <span className="flex items-center gap-2">
                      <span className="text-zinc-600">{expanded === e.name ? '▼' : '▶'}</span>
                      {e.name}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-blue-400">{e.as_subject}</td>
                  <td className="px-4 py-2 text-right text-purple-400">{e.as_object}</td>
                  <td className="px-4 py-2 text-right text-zinc-300 font-medium">{e.total}</td>
                </tr>
                {expanded === e.name && (
                  <tr key={`${e.name}-expand`} className="bg-zinc-950">
                    <td colSpan={4} className="px-6 py-3">
                      {expandLoading ? (
                        <div className="text-zinc-500 text-xs">載入三元組…</div>
                      ) : expandedTriplets.length === 0 ? (
                        <div className="text-zinc-600 text-xs">無三元組（作為 subject）</div>
                      ) : (
                        <div className="space-y-1">
                          {expandedTriplets.map(t => (
                            <div key={t.id} className="flex items-center gap-2 text-xs font-mono">
                              <span className="text-blue-400">{t.subject}</span>
                              <span className="text-zinc-500">→</span>
                              <span className="text-yellow-400">{t.predicate}</span>
                              <span className="text-zinc-500">→</span>
                              <span
                                className="text-green-400 hover:underline cursor-pointer"
                                onClick={ev => { ev.stopPropagation(); onNavigate?.(t.object); }}
                              >
                                {t.object}
                              </span>
                              {t.confidence != null && (
                                <span className="text-zinc-600 ml-2">conf={t.confidence.toFixed(2)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          <button
            className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded disabled:opacity-40"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            上一頁
          </button>
          <span className="text-zinc-400 text-sm">{page + 1} / {totalPages}</span>
          <button
            className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded disabled:opacity-40"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            下一頁
          </button>
        </div>
      )}
    </div>
  );
}
