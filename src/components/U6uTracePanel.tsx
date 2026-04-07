import { useState } from 'react';

interface TraceStep { nodeId: string; type: string; input: unknown; output: unknown; duration_ms: number; error?: string }
export interface TraceResult { success: boolean; trace?: TraceStep[]; error?: string }
interface Props { result: TraceResult | null; loading?: boolean }

const panelBase: React.CSSProperties = {
  width: 280, flexShrink: 0, borderLeft: '1px solid #27272a',
  background: '#09090b', padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column',
};

function StepItem({ step }: { step: TraceStep }) {
  const [expanded, setExpanded] = useState(false);
  const out = JSON.stringify(step.output ?? null);
  const preview = out.length > 200 ? out.slice(0, 200) + '…' : out;
  return (
    <div style={{ background: step.error ? '#450a0a' : '#27272a', border: `1px solid ${step.error ? '#7f1d1d' : '#3f3f46'}`, borderRadius: 6, padding: '8px 10px', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ fontWeight: 600, color: '#a1a1aa' }}>{step.nodeId}</span>
        <span style={{ color: '#52525b' }}>{step.duration_ms}ms</span>
      </div>
      <div style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>{step.type}</div>
      {step.error && <div style={{ fontSize: 11, color: '#f87171', marginBottom: 4 }}>{step.error}</div>}
      <div style={{ fontSize: 11, color: '#a1a1aa', cursor: 'pointer', wordBreak: 'break-all' }} onClick={() => setExpanded(e => !e)}>
        {expanded ? out : preview}
        {out.length > 200 && <span style={{ color: '#6366f1', marginLeft: 4 }}>{expanded ? '收起' : '展開'}</span>}
      </div>
    </div>
  );
}

export default function U6uTracePanel({ result, loading }: Props) {
  if (loading) return (
    <div style={panelBase}>
      <div style={{ color: '#6366f1', textAlign: 'center', marginTop: 40, fontSize: 14 }}>執行中…</div>
    </div>
  );
  if (!result) return (
    <div style={panelBase}>
      <div style={{ color: '#3f3f46', textAlign: 'center', marginTop: 40, fontSize: 13 }}>先預覽，再執行</div>
    </div>
  );
  return (
    <div style={{ ...panelBase, border: `1px solid ${result.success ? '#27272a' : '#7f1d1d'}` }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: result.success ? '#e4e4e7' : '#f87171' }}>
        {result.success ? '✅ 執行成功' : `❌ ${result.error ?? '執行失敗'}`}
      </div>
      {(result.trace ?? []).map((step, i) => <StepItem key={i} step={step} />)}
    </div>
  );
}
