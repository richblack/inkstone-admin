import type { ArtifactBlock } from './Progress';

interface Props {
  checklists: ArtifactBlock[];
  loading: boolean;
  updating: string | null;
  onToggle: (id: string, idx: number, content: string) => void;
}

export default function ProgressChecklist({ checklists, loading, updating, onToggle }: Props) {
  if (loading) return <div className="text-zinc-600 text-xs px-2">載入中…</div>;
  if (!checklists.length) return <div className="text-zinc-600 text-xs px-2">無關聯驗收清單</div>;
  return (
    <div className="space-y-4">
      {checklists.map(cl => {
        const lines = cl.raw_content.split('\n');
        const busy = updating === cl.id;
        return (
          <div key={cl.id} className="bg-zinc-900 rounded-lg p-4">
            <div className="text-xs text-zinc-500 mb-3 font-medium">
              {lines[0]?.replace(/^#+\s*/, '') ?? cl.id.slice(0, 12)}
            </div>
            <div className="space-y-1.5">
              {lines.map((line, idx) => {
                const isChecked = /- \[x\]/i.test(line);
                const isUnchecked = /- \[ \]/.test(line);
                if (!isChecked && !isUnchecked) return null;
                return (
                  <label key={idx} className={`flex items-start gap-2 cursor-pointer ${busy ? 'opacity-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={busy}
                      className="mt-0.5 accent-teal-500 cursor-pointer"
                      onChange={() => onToggle(cl.id, idx, cl.raw_content)}
                    />
                    <span className={`text-xs leading-relaxed ${isChecked ? 'line-through text-zinc-500' : 'text-zinc-300'}`}>
                      {line.replace(/^\s*- \[[x ]\]\s*/i, '').trim()}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
