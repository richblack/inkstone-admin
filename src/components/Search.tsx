import { useState } from 'react';
import { fetchSearch, type SearchMatch } from '../api';

export default function Search() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetchSearch(q.trim());
      setResults(res.matches ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 搜尋欄 */}
      <div className="flex gap-2">
        <input
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 text-lg placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          placeholder="輸入關鍵字進行語意搜尋…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void handleSearch()}
        />
        <button
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg transition-colors disabled:opacity-50"
          onClick={() => void handleSearch()}
          disabled={loading}
        >
          {loading ? '搜尋中…' : '搜尋'}
        </button>
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      {/* 結果 */}
      {searched && !loading && results.length === 0 && !error && (
        <div className="text-zinc-500 text-center py-12">無結果</div>
      )}

      <div className="space-y-3">
        {results.map((m, i) => (
          <div key={m.id ?? i} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 font-mono">{m.type ?? 'triplet'}</span>
              <ScoreBadge score={m.score} />
            </div>
            {m.subject && m.predicate && m.object ? (
              <div className="font-mono text-sm flex items-center gap-2 flex-wrap">
                <span className="text-blue-400">{m.subject}</span>
                <span className="text-zinc-500">→</span>
                <span className="text-yellow-400">{m.predicate}</span>
                <span className="text-zinc-500">→</span>
                <span className="text-green-400">{m.object}</span>
              </div>
            ) : (
              <div className="text-zinc-300 text-sm">{m.content ?? m.id}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-zinc-500';
  return <span className={`text-xs font-mono font-semibold ${color}`}>score {pct}%</span>;
}
