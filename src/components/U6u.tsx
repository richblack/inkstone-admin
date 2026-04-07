import { useState } from 'react';
import U6uComponentLib from './U6uComponentLib';
import U6uCanvas from './U6uCanvas';
import U6uTracePanel, { type TraceResult } from './U6uTracePanel';

export default function U6u() {
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <U6uComponentLib />
      <U6uCanvas onTraceResult={(r) => setTraceResult(r as TraceResult | null)} onLoading={setLoading} />
      <U6uTracePanel result={traceResult} loading={loading} />
    </div>
  );
}
