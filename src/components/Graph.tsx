import { useCallback, useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide } from 'd3-force';

// ── Types ──────────────────────────────────────────────────────────────────

interface EntityStat {
  name: string;
  as_subject: number;
  as_object: number;
  total: number;
}

interface Triplet {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  confidence?: number;
  user_id?: string;
}

interface GraphNode {
  id: string;
  name: string;
  degree: number;
  userId?: string;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  predicate: string;
  count: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function nodeRadius(degree: number): number {
  return Math.min(20, Math.max(4, Math.sqrt(degree) * 3 + 4));
}

function nodeColor(userId?: string): string {
  if (!userId) return '#e4e4e7';
  const u = userId.toLowerCase();
  if (u.includes('ceo') || u.includes('claude')) return '#f59e0b';
  if (u.includes('richblack')) return '#3b82f6';
  if (u.includes('kb')) return '#6b7280';
  return '#e4e4e7';
}

function linkHexColor(predicate: string): string {
  const p = predicate.toLowerCase();
  if (p.includes('invariant')) return '#ef4444';
  if (p.includes('lesson') || p.includes('learned')) return '#3b82f6';
  if (p.includes('adr') || p.includes('架構')) return '#22c55e';
  return '#6b7280';
}

const LEGEND = [
  { color: '#ef4444', label: 'invariant' },
  { color: '#3b82f6', label: 'lesson-learned' },
  { color: '#22c55e', label: '架構決策' },
  { color: '#6b7280', label: '其他' },
];

// ── Main Component ─────────────────────────────────────────────────────────

const PAGE_SIZE = 500;

export default function Graph() {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const [allTriplets, setAllTriplets] = useState<Triplet[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [entityNameSet, setEntityNameSet] = useState<Set<string>>(new Set());
  const [entityOnlyMode, setEntityOnlyMode] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedTriplets, setSelectedTriplets] = useState<Triplet[]>([]);

  // Use refs for mutable values accessed in canvas callbacks (avoids stale closures)
  const highlightSetRef = useRef<Set<string> | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);
  const selectedNodeRef = useRef<string | null>(null);

  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  // Track container size
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const rect = entries[0].contentRect;
      setDims({ w: Math.max(100, rect.width), h: Math.max(100, rect.height) });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Initial load — first PAGE_SIZE triplets + stats + entities
  useEffect(() => {
    async function loadInitial() {
      const [statsData, entData, firstPage] = await Promise.all([
        fetch('/api/kbdb/triplets/stats').then(r => r.json()),
        fetch('/api/kbdb/entities?limit=500').then(r => r.json()),
        fetch(`/api/kbdb/triplets?limit=${PAGE_SIZE}&offset=0`).then(r => r.json()),
      ]);

      const total: number = statsData.total ?? 0;
      const entities: EntityStat[] = Array.isArray(entData) ? entData : (entData.entities ?? []);
      const triplets: Triplet[] = Array.isArray(firstPage) ? firstPage : (firstPage.triplets ?? []);

      setTotalCount(total);
      setAllTriplets(triplets);
      setEntityNameSet(new Set(entities.map((e: EntityStat) => e.name)));
      setLoading(false);
    }
    loadInitial().catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  // Load next PAGE_SIZE triplets
  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const offset = allTriplets.length;
      const data = await fetch(`/api/kbdb/triplets?limit=${PAGE_SIZE}&offset=${offset}`).then(r => r.json());
      const newTriplets: Triplet[] = Array.isArray(data) ? data : (data.triplets ?? []);
      setAllTriplets(prev => [...prev, ...newTriplets]);
    } catch (e) {
      console.error('載入更多失敗:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [allTriplets.length, loadingMore]);

  // Rebuild graph whenever raw data or toggle changes
  useEffect(() => {
    if (allTriplets.length === 0 && entityNameSet.size === 0) return;

    const filtered = entityOnlyMode
      ? allTriplets.filter(t => entityNameSet.has(t.subject) || entityNameSet.has(t.object))
      : allTriplets;

    // Build userId map from filtered triplets
    const userMap = new Map<string, string>();
    filtered.forEach(t => {
      if (t.user_id) {
        if (!userMap.has(t.subject)) userMap.set(t.subject, t.user_id);
        if (!userMap.has(t.object)) userMap.set(t.object, t.user_id);
      }
    });

    // Links aggregated by subject+object pair (multi-edges → thicker)
    const linkMap = new Map<string, GraphLink>();
    filtered.forEach(t => {
      const key = `${t.subject}||${t.object}`;
      const existing = linkMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        linkMap.set(key, { source: t.subject, target: t.object, predicate: t.predicate, count: 1 });
      }
    });

    // Build nodes ONLY from filtered triplets (guaranteed to have edges)
    const nodeMap = new Map<string, GraphNode>();
    filtered.forEach(t => {
      for (const name of [t.subject, t.object]) {
        if (!nodeMap.has(name)) {
          nodeMap.set(name, {
            id: name,
            name,
            degree: filtered.filter(x => x.subject === name || x.object === name).length,
            userId: userMap.get(name),
          });
        }
      }
    });

    setGraphData({ nodes: Array.from(nodeMap.values()), links: Array.from(linkMap.values()) });
  }, [allTriplets, entityNameSet, entityOnlyMode]);

  // Configure d3 forces after data loads
  useEffect(() => {
    if (!fgRef.current || graphData.nodes.length === 0) return;
    fgRef.current.d3Force('charge')?.strength(-120);
    fgRef.current.d3Force('link')?.distance(60);
    fgRef.current.d3Force('collision', forceCollide(20));
    fgRef.current.d3ReheatSimulation();
  }, [graphData.nodes.length]);

  // Keep refs in sync with current state (read by canvas callbacks each frame)
  const searchLower = search.toLowerCase().trim();
  highlightSetRef.current = searchLower
    ? new Set(graphData.nodes.filter(n => n.name.toLowerCase().includes(searchLower)).map(n => n.id))
    : null;
  selectedNodeRef.current = selectedNode;

  // Stable canvas object — reads from refs every animation frame
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as GraphNode;
    const r = nodeRadius(n.degree ?? 1);
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const highlight = highlightSetRef.current;
    const isHighlighted = !highlight || highlight.has(n.id);
    const isHovered = hoveredNodeRef.current === n.id;
    const isSelected = selectedNodeRef.current === n.id;
    const color = nodeColor(n.userId);

    ctx.save();
    ctx.globalAlpha = isHighlighted ? 1 : 0.12;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    if (isSelected || isHovered) {
      ctx.strokeStyle = isSelected ? '#fbbf24' : 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
    }

    // Show labels only at high zoom or when hovered/selected
    if (globalScale > 1.5 || isHovered || isSelected) {
      const label = n.name.length > 16 ? n.name.slice(0, 16) + '…' : n.name;
      const fontSize = Math.max(8, 11 / globalScale);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.globalAlpha = isHighlighted ? 0.9 : 0.12;
      ctx.fillStyle = isSelected ? '#fbbf24' : '#d4d4d8';
      ctx.fillText(label, x, y + r + 2 / globalScale);
    }

    ctx.restore();
  }, []);

  const nodePointerAreaPaint = useCallback((node: any, color: string, ctx: CanvasRenderingContext2D) => {
    const r = nodeRadius((node as GraphNode).degree ?? 1);
    ctx.beginPath();
    ctx.arc(node.x ?? 0, node.y ?? 0, r + 5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }, []);

  const getLinkColor = useCallback((link: any) => {
    const l = link as GraphLink;
    const srcId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
    const tgtId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
    const highlight = highlightSetRef.current;
    const isRelevant = !highlight || highlight.has(srcId) || highlight.has(tgtId);
    const base = linkHexColor(l.predicate);
    return isRelevant ? base + 'aa' : base + '1a';
  }, []);

  const getLinkWidth = useCallback((link: any) => {
    return Math.min(4, (link as GraphLink).count * 1.5 + 0.5);
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    const id = (node as GraphNode).id;
    setSelectedNode(prev => {
      const next = prev === id ? null : id;
      selectedNodeRef.current = next;
      return next;
    });
    setSelectedTriplets(allTriplets.filter(t => t.subject === id || t.object === id));
  }, [allTriplets]);

  const handleNodeHover = useCallback((node: any) => {
    hoveredNodeRef.current = node ? (node as GraphNode).id : null;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500 animate-pulse text-sm">載入圖譜資料中…</div>
      </div>
    );
  }
  if (error) {
    return <div className="text-red-400 p-8 text-sm">Error: {error}</div>;
  }

  return (
    <div className="flex gap-4" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Graph area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-xs text-zinc-500">
              {graphData.nodes.length} 節點 · {entityOnlyMode
                ? `篩選後 ${graphData.links.length} 邊 / 已載入 ${allTriplets.length} 筆`
                : `${graphData.links.length} 邊`}
              {totalCount > 0 && (
                <span className="ml-1 text-zinc-600">（共 {totalCount} 筆）</span>
              )}
            </div>
            <button
              onClick={() => setEntityOnlyMode(v => !v)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                entityOnlyMode
                  ? 'bg-blue-900/40 border-blue-600 text-blue-300'
                  : 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${entityOnlyMode ? 'bg-blue-400' : 'bg-zinc-500'}`} />
              僅顯示 entity 連結
            </button>
            {allTriplets.length < totalCount && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-zinc-400 hover:text-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <span className="animate-pulse">載入中…</span>
                ) : (
                  <>載入更多 +{Math.min(PAGE_SIZE, totalCount - allTriplets.length)} 筆</>
                )}
              </button>
            )}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋節點…"
            className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Canvas container */}
        <div ref={containerRef} className="flex-1 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden relative">
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData as any}
            width={dims.w}
            height={dims.h}
            backgroundColor="#18181b"
            nodeCanvasObject={nodeCanvasObject}
            nodeCanvasObjectMode={() => 'replace'}
            nodePointerAreaPaint={nodePointerAreaPaint}
            linkColor={getLinkColor}
            linkWidth={getLinkWidth}
            linkLabel={(link: any) => (link as GraphLink).predicate}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
          />

          {/* Node color legend */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-zinc-950/80 rounded-lg p-2.5 pointer-events-none">
            {[
              { color: '#f59e0b', label: 'ceo-claude' },
              { color: '#3b82f6', label: 'richblack' },
              { color: '#6b7280', label: 'KB' },
              { color: '#e4e4e7', label: '其他' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-zinc-400">{label}</span>
              </div>
            ))}
          </div>

          {/* Edge color legend */}
          <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 bg-zinc-950/80 rounded-lg p-2.5 pointer-events-none">
            {LEGEND.map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-4 h-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-zinc-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Side panel — selected node triplets */}
      {selectedNode && (
        <div className="w-72 flex-shrink-0 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-100 truncate">{selectedNode}</h3>
            <button
              onClick={() => { setSelectedNode(null); selectedNodeRef.current = null; }}
              className="text-zinc-500 hover:text-zinc-300 text-sm ml-2 flex-shrink-0"
            >
              ✕
            </button>
          </div>
          <div className="px-4 py-2 text-xs text-zinc-500 border-b border-zinc-800">
            {selectedTriplets.length} 筆三元組
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {selectedTriplets.map((t, i) => (
              <div key={i} className="bg-zinc-800 rounded-lg p-2.5 text-xs">
                <div className="text-blue-400 truncate mb-0.5">{t.subject}</div>
                <div className="text-zinc-500 text-center my-0.5">↓ {t.predicate}</div>
                <div className="text-zinc-300 break-words">{t.object}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
