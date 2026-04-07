interface Props {
  allFound: boolean;
  onAddInput: () => void;
  onAddOutput: () => void;
  onPreview: () => void;
  onExecute: () => void;
  onClear: () => void;
}

const btn = (extra: React.CSSProperties): React.CSSProperties => ({
  padding: '4px 11px', borderRadius: 5, border: 'none', cursor: 'pointer',
  fontSize: 12, marginRight: 6, ...extra,
});

export default function U6uCanvasToolbar({ allFound, onAddInput, onAddOutput, onPreview, onExecute, onClear }: Props) {
  return (
    <div style={{ padding: '8px 12px', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center' }}>
      <button style={btn({ background: '#1e3a5f', color: '#93c5fd' })} onClick={onAddInput}>+ Input</button>
      <button style={btn({ background: '#14532d', color: '#86efac' })} onClick={onAddOutput}>+ Output</button>
      <button style={btn({ background: '#2d2d3a', color: '#c4b5fd' })} onClick={onPreview}>🔍 預覽</button>
      <button
        style={btn({ background: allFound ? '#4c1d95' : '#18181b', color: allFound ? '#e9d5ff' : '#3f3f46', cursor: allFound ? 'pointer' : 'not-allowed' })}
        disabled={!allFound}
        onClick={onExecute}
      >▶ 執行</button>
      <button style={btn({ background: '#27272a', color: '#71717a' })} onClick={onClear}>🗑 清除</button>
    </div>
  );
}
