import { BUILD_STATUS, type BuildStatusEntry } from './build-status-config';

const STATUS_BADGE: Record<BuildStatusEntry['status'], { label: string; classes: string }> = {
  done:        { label: 'done',        classes: 'bg-green-900/30 text-green-400 border border-green-800/40' },
  'in-progress': { label: 'in-progress', classes: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/40' },
  todo:        { label: 'todo',        classes: 'bg-zinc-800 text-zinc-400 border border-zinc-700' },
  broken:      { label: 'broken',      classes: 'bg-red-900/30 text-red-400 border border-red-800/40' },
};

function StatusBadge({ status }: { status: BuildStatusEntry['status'] }) {
  const { label, classes } = STATUS_BADGE[status];
  return (
    <span className={`text-xs rounded px-2 py-0.5 font-mono font-medium ${classes}`}>
      {label}
    </span>
  );
}

export default function BuildStatus() {
  const total = BUILD_STATUS.length;
  const done = BUILD_STATUS.filter(e => e.status === 'done').length;
  const broken = BUILD_STATUS.filter(e => e.status === 'broken').length;
  const inProgress = BUILD_STATUS.filter(e => e.status === 'in-progress').length;
  const todo = BUILD_STATUS.filter(e => e.status === 'todo').length;

  return (
    <div className="space-y-6">
      {/* 摘要 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border-l-4 border-green-500 rounded-lg p-4">
          <div className="text-zinc-400 text-sm mb-1">Done</div>
          <div className="text-3xl font-bold text-green-400">{done}</div>
        </div>
        <div className="bg-zinc-900 border-l-4 border-yellow-500 rounded-lg p-4">
          <div className="text-zinc-400 text-sm mb-1">In Progress</div>
          <div className="text-3xl font-bold text-yellow-400">{inProgress}</div>
        </div>
        <div className="bg-zinc-900 border-l-4 border-zinc-600 rounded-lg p-4">
          <div className="text-zinc-400 text-sm mb-1">Todo</div>
          <div className="text-3xl font-bold text-zinc-400">{todo}</div>
        </div>
        <div className="bg-zinc-900 border-l-4 border-red-500 rounded-lg p-4">
          <div className="text-zinc-400 text-sm mb-1">Broken</div>
          <div className="text-3xl font-bold text-red-400">{broken}</div>
        </div>
      </div>

      {/* 進度條 */}
      <div className="bg-zinc-900 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-300 text-sm font-medium">整體完成度</span>
          <span className="text-zinc-400 text-sm">{done} / {total}</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${total === 0 ? 0 : Math.round((done / total) * 100)}%` }}
          />
        </div>
      </div>

      {/* 說明 */}
      <p className="text-zinc-500 text-xs">
        純靜態設定頁面，狀態由 CEO / CTO 直接修改{' '}
        <code className="bg-zinc-800 px-1 rounded">src/components/build-status-config.ts</code>
      </p>

      {/* 表格 */}
      <div className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3">模組</th>
              <th className="text-left px-4 py-3">位置</th>
              <th className="text-left px-4 py-3">狀態</th>
              <th className="text-left px-4 py-3">Commit</th>
              <th className="text-left px-4 py-3">說明</th>
              <th className="text-left px-4 py-3">待完成</th>
            </tr>
          </thead>
          <tbody>
            {BUILD_STATUS.map((entry, i) => (
              <tr
                key={i}
                className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/40 transition-colors"
              >
                <td className="px-4 py-3 text-zinc-200 font-medium whitespace-nowrap">
                  {entry.module}
                </td>
                <td className="px-4 py-3 text-zinc-400 font-mono text-xs whitespace-nowrap">
                  {entry.location}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={entry.status} />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500 whitespace-nowrap">
                  {entry.commit ? (
                    <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                      {entry.commit}
                    </span>
                  ) : (
                    <span className="text-zinc-700">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-400 max-w-xs">
                  {entry.description}
                </td>
                <td className="px-4 py-3 text-zinc-500 max-w-xs">
                  {entry.remaining || <span className="text-zinc-700">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
