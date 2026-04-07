// EditorRelSection.tsx — 關係面板單一區塊（upstream/downstream/other）(≤100行)
import type { SpecArtifact } from './EditorTree';
import type { Triplet } from '../api';
import { CATEGORY_BADGE } from './editorCategories';

interface RelItem { id: string; label: string; type: string; targetId: string }

interface Props {
  title: string;
  items: RelItem[];
  arts: SpecArtifact[];
  onNavigate: (id: string) => void;
  onDelete: (tripletId: string) => void;
}

export function buildUpstream(triplets: Triplet[], artId: string, arts: SpecArtifact[]): RelItem[] {
  return triplets
    .filter(t => t.subject === artId && t.predicate === 'derives_from')
    .map(t => {
      const a = arts.find(x => x.id === t.object);
      return { id: t.id, label: a?.summary?.slice(0, 40) ?? t.object.slice(0, 16), type: a?.artifact_type ?? '', targetId: t.object };
    });
}

export function buildDownstream(triplets: Triplet[], artId: string, arts: SpecArtifact[]): RelItem[] {
  return triplets
    .filter(t => t.object === artId && t.predicate === 'derives_from')
    .map(t => {
      const a = arts.find(x => x.id === t.subject);
      return { id: t.id, label: a?.summary?.slice(0, 40) ?? t.subject.slice(0, 16), type: a?.artifact_type ?? '', targetId: t.subject };
    });
}

export function buildOthers(triplets: Triplet[], artId: string, arts: SpecArtifact[]): RelItem[] {
  return triplets
    .filter(t => (t.subject === artId || t.object === artId) && t.predicate !== 'derives_from' && t.predicate !== 'category-def')
    .map(t => {
      const targetId = t.subject === artId ? t.object : t.subject;
      const a = arts.find(x => x.id === targetId);
      const dir = t.subject === artId ? `→ ${t.predicate}` : `← ${t.predicate}`;
      return { id: t.id, label: `${dir}: ${a?.summary?.slice(0, 30) ?? targetId.slice(0, 16)}`, type: a?.artifact_type ?? '', targetId };
    });
}

export default function EditorRelSection({ title, items, arts: _arts, onNavigate, onDelete }: Props) {
  if (items.length === 0) return null;
  return (
    <div className="mb-2">
      <div className="px-3 py-1 text-zinc-500 text-xs font-medium">{title}</div>
      {items.map(item => {
        const badge = CATEGORY_BADGE[item.type] ?? CATEGORY_BADGE.unknown;
        return (
          <div key={item.id} className="px-3 py-1 flex items-center gap-1.5 group">
            {item.type && (
              <span className={`text-xs px-1 rounded flex-shrink-0 ${badge}`}>{item.type}</span>
            )}
            <button
              className="flex-1 text-left text-zinc-300 hover:text-blue-400 text-xs truncate transition-colors"
              onClick={() => onNavigate(item.targetId)}
              title={item.label}
            >{item.label}</button>
            <button
              className="flex-shrink-0 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
              onClick={() => onDelete(item.id)}
              title="移除關係"
            >✕</button>
          </div>
        );
      })}
    </div>
  );
}
