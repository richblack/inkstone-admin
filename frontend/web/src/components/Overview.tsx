import { useEffect, useState } from 'react';
import { fetchStats, type TripletStats } from '../api';

export default function Overview() {
  const [stats, setStats] = useState<TripletStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) return <div className="text-red-400 p-4">載入失敗：{error}</div>;
  if (!stats) return <div className="text-zinc-400 p-4 animate-pulse">載入中…</div>;

  const totalUsers = Object.values(stats.by_user_id).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      {/* 大數字卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="總三元組" value={stats.total.toLocaleString()} accent="blue" />
        <StatCard label="唯一實體" value="—" accent="purple" note="見 Entities tab" />
        <StatCard label="今日新增" value={stats.recent.today.toLocaleString()} accent="green" />
        <StatCard label="本週新增" value={stats.recent.this_week.toLocaleString()} accent="yellow" />
      </div>

      {/* User 分布 */}
      <Section title="User 分布">
        <div className="space-y-2">
          {Object.entries(stats.by_user_id)
            .sort(([, a], [, b]) => b - a)
            .map(([uid, count]) => {
              const pct = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
              return (
                <div key={uid} className="flex items-center gap-3">
                  <span className="text-zinc-400 text-sm w-40 truncate font-mono">{uid || 'unknown'}</span>
                  <div className="flex-1 bg-zinc-800 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-zinc-300 text-sm w-16 text-right">{count.toLocaleString()}</span>
                  <span className="text-zinc-500 text-xs w-10 text-right">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
        </div>
      </Section>

      {/* Top Subjects / Predicates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Top 10 Subjects">
          <RankList items={stats.top_subjects.map(r => ({ label: r.subject, count: r.count }))} color="bg-indigo-500" />
        </Section>
        <Section title="Top 10 Predicates">
          <RankList items={stats.top_predicates.map(r => ({ label: r.predicate, count: r.count }))} color="bg-teal-500" />
        </Section>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, note }: { label: string; value: string; accent: string; note?: string }) {
  const colors: Record<string, string> = {
    blue: 'border-blue-500 text-blue-400',
    purple: 'border-purple-500 text-purple-400',
    green: 'border-green-500 text-green-400',
    yellow: 'border-yellow-500 text-yellow-400',
  };
  return (
    <div className={`bg-zinc-900 border-l-4 ${colors[accent] ?? ''} rounded-lg p-4`}>
      <div className="text-zinc-400 text-sm mb-1">{label}</div>
      <div className={`text-3xl font-bold ${colors[accent] ?? ''}`}>{value}</div>
      {note && <div className="text-zinc-500 text-xs mt-1">{note}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-zinc-300 font-semibold mb-3 text-sm uppercase tracking-wide">{title}</h2>
      <div className="bg-zinc-900 rounded-lg p-4">{children}</div>
    </div>
  );
}

function RankList({ items, color }: { items: { label: string; count: number }[]; color: string }) {
  const max = items[0]?.count ?? 1;
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-zinc-600 text-xs w-5 text-right">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-zinc-200 text-sm truncate">{item.label}</span>
            </div>
            <div className="bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div className={`h-full ${color} rounded-full`} style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </div>
          <span className="text-zinc-400 text-sm w-12 text-right">{item.count}</span>
        </div>
      ))}
    </div>
  );
}
