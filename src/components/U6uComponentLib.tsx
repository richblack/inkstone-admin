import { useState, useEffect } from 'react';

interface Component {
  id: string;
  name: string;
  description?: string;
  version?: string;
  tags?: string[];
  author?: string;
  input_schema?: unknown;
  output_schema?: unknown;
}

const BASE = 'https://workflow.finally.click';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export default function U6uComponentLib() {
  const [components, setComponents] = useState<Component[]>([]);
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<Component | null>(null);

  useEffect(() => {
    fetch(`${BASE}/components`, { headers: authHeaders() })
      .then(r => r.json())
      .then((d: { components: Component[] }) => setComponents(d.components ?? []))
      .catch(() => {});
  }, []);

  const filtered = components.filter(c => {
    const q = query.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q);
  });

  const openDetail = async (c: Component) => {
    try {
      const res = await fetch(`${BASE}/components/${c.id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Component = await res.json();
      setDetail(data);
    } catch (err) {
      console.error('[u6u] openDetail failed:', err);
    }
  };

  return (
    <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid #27272a', background: '#09090b', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid #27272a' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#71717a', marginBottom: 6 }}>零件庫</div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜尋零件…"
          style={{ width: '100%', background: '#18181b', border: '1px solid #3f3f46', borderRadius: 5, padding: '4px 8px', fontSize: 12, color: '#e4e4e7', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {filtered.map(c => (
          <div
            key={c.id}
            draggable
            onDragStart={e => e.dataTransfer.setData('component-name', c.name)}
            onClick={() => void openDetail(c)}
            style={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 6, padding: '7px 9px', marginBottom: 6, cursor: 'grab', fontSize: 12 }}
          >
            <div style={{ fontWeight: 600, color: '#e4e4e7', marginBottom: 2 }}>{c.name}</div>
            <div style={{ color: '#71717a', fontSize: 11, marginBottom: 4 }}>
              {(c.description ?? '').slice(0, 60)}{(c.description ?? '').length > 60 ? '…' : ''}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {(c.tags ?? []).map(t => (
                <span key={t} style={{ background: '#27272a', color: '#a1a1aa', fontSize: 10, padding: '1px 5px', borderRadius: 3 }}>{t}</span>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ color: '#3f3f46', fontSize: 12, textAlign: 'center', marginTop: 20 }}>無零件</div>
        )}
      </div>
      {detail && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setDetail(null)}
        >
          <div
            style={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 10, padding: 20, maxWidth: 480, width: '90%', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{detail.name}</div>
            <div style={{ color: '#71717a', fontSize: 13, marginBottom: 12 }}>{detail.description}</div>
            <div style={{ fontSize: 12, marginBottom: 8 }}><b>Input Schema</b><pre style={{ background: '#09090b', padding: 8, borderRadius: 5, marginTop: 4, overflow: 'auto', fontSize: 11 }}>{JSON.stringify(detail.input_schema, null, 2)}</pre></div>
            <div style={{ fontSize: 12 }}><b>Output Schema</b><pre style={{ background: '#09090b', padding: 8, borderRadius: 5, marginTop: 4, overflow: 'auto', fontSize: 11 }}>{JSON.stringify(detail.output_schema, null, 2)}</pre></div>
            <button onClick={() => setDetail(null)} style={{ marginTop: 12, padding: '5px 14px', background: '#3f3f46', color: '#e4e4e7', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>關閉</button>
          </div>
        </div>
      )}
    </div>
  );
}
