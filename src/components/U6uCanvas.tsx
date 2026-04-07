import { useState, useCallback, useRef } from 'react';
import { ReactFlow, addEdge, useNodesState, useEdgesState, Background, Controls, type Connection, type ReactFlowInstance, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes, type FlowNodeData } from './U6uNodeTypes';
import U6uCanvasToolbar from './U6uCanvasToolbar';

const CYPHER = 'https://workflow.finally.click';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

interface TraceResult { success: boolean; trace?: unknown[]; error?: string }
interface Props { onTraceResult: (r: TraceResult) => void; onLoading: (v: boolean) => void }

export default function U6uCanvas({ onTraceResult, onLoading }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onConnect = useCallback((c: Connection) => {
    setEdges(eds => addEdge({ ...c, label: '完成後' }, eds));
  }, [setEdges]);

  // 雙擊邊 → 編輯語意 label
  const onEdgeDoubleClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    const newLabel = window.prompt('語意關係（完成後/失敗時/對每個/條件滿足時/無論如何）', String(edge.label ?? '完成後'));
    if (newLabel !== null) setEdges(eds => eds.map(e => e.id === edge.id ? { ...e, label: newLabel.trim() || '完成後' } : e));
  }, [setEdges]);

  const addNode = (label: string, xRatio = 0.2) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    const x = bounds ? bounds.width * xRatio : 100;
    setNodes(ns => [...ns, { id: `node-${Date.now()}`, type: 'customNode', data: { label, status: 'pending' } as FlowNodeData, position: { x, y: 80 + ns.length * 80 } }]);
  };

  // 語意 label，向後相容 PIPE → 完成後
  const buildTriplets = () => edges.map(e => {
    const src = nodes.find(n => n.id === e.source)?.data.label ?? e.source;
    const tgt = nodes.find(n => n.id === e.target)?.data.label ?? e.target;
    const rel = (typeof e.label === 'string' && e.label) ? e.label : '完成後';
    return `${src} >> ${rel} >> ${tgt}`;
  });

  const handlePreview = async () => {
    try {
      const res = await fetch(`${CYPHER}/cypher/search`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', ...authHeaders() }, 
        body: JSON.stringify({ triplets: buildTriplets() }) 
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { nodes: Record<string, { status: 'found' | 'missing'; componentId?: string }> } = await res.json();
      setNodes(ns => ns.map(n => {
        const r = data.nodes?.[n.data.label as string];
        if (!r) return n;
        return { ...n, data: { ...n.data, status: r.status, matchedId: r.componentId } };
      }));
    } catch (err) {
      console.error('[u6u] preview failed:', err);
    }
  };

  const allFound = nodes.length > 0 && nodes.every(n => (n.data as FlowNodeData).status === 'found');

  const handleExecute = async () => {
    onLoading(true);
    try {
      const res = await fetch(`${CYPHER}/cypher/execute`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', ...authHeaders() }, 
        body: JSON.stringify({ triplets: buildTriplets(), context: {} }) 
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onTraceResult(await res.json());
    } catch (err) {
      console.error('[u6u] execute failed:', err);
      onTraceResult({ success: false, error: String(err) });
    } finally {
      onLoading(false);
    }
  };

  const handleClear = () => { setNodes([]); setEdges([]); onTraceResult(null as unknown as TraceResult); };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const label = event.dataTransfer.getData('component-name');
    if (!label || !rfInstance) return;
    const pos = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setNodes(ns => [...ns, { id: `node-${Date.now()}`, type: 'customNode', data: { label, status: 'pending' } as FlowNodeData, position: pos }]);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <U6uCanvasToolbar
        allFound={allFound}
        onAddInput={() => addNode('INPUT', 0.15)}
        onAddOutput={() => addNode('OUTPUT', 0.75)}
        onPreview={() => void handlePreview()}
        onExecute={() => void handleExecute()}
        onClear={handleClear}
      />
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} onDrop={onDrop} onDragOver={e => e.preventDefault()}>
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange as Parameters<typeof ReactFlow>[0]['onNodesChange']} onEdgesChange={onEdgesChange} onConnect={onConnect} onInit={setRfInstance} onEdgeDoubleClick={onEdgeDoubleClick} nodeTypes={nodeTypes} fitView>
          <Background color="#27272a" />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
