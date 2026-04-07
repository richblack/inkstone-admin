import { Handle, Position } from '@xyflow/react';

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  status?: 'found' | 'missing' | 'pending';
  matchedId?: string;
}

function borderColor(data: FlowNodeData): string {
  if (data.label === 'INPUT') return '#3b82f6';
  if (data.label === 'OUTPUT') return '#22c55e';
  if (data.status === 'found') return '#a855f7';
  if (data.status === 'missing') return '#ef4444';
  return '#71717a';
}

export function CustomNode({ data }: { data: FlowNodeData }) {
  const border = borderColor(data);
  return (
    <div
      style={{
        border: `2px solid ${border}`,
        borderRadius: 8,
        padding: '8px 14px',
        background: '#18181b',
        minWidth: 120,
        position: 'relative',
        fontSize: 13,
        color: '#e4e4e7',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#52525b' }} />
      <div style={{ fontWeight: 600 }}>{data.label}</div>
      {data.status === 'found' && data.matchedId && (
        <div style={{ fontSize: 10, color: '#a855f7', marginTop: 2 }}>{data.matchedId}</div>
      )}
      {data.status === 'missing' && (
        <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>⚠ 未找到</div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#52525b' }} />
    </div>
  );
}

export const nodeTypes = { customNode: CustomNode };
