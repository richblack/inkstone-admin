import { useState, useEffect } from 'react';
import U6u from './components/U6u';
import ErrorBoundary from './components/ErrorBoundary';
import U6uLoginPage from './components/U6uLoginPage';

interface User {
  lineUserId: string;
  displayName?: string;
  pictureUrl?: string;
}

export default function U6uApp() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#token=')) {
      const token = hash.slice(7);
      if (token) localStorage.setItem('u6u_token', token);
      window.history.replaceState(null, '', '/u6u');
    }

    const token = localStorage.getItem('u6u_token') ?? localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/auth/me', { headers })
      .then(res => {
        if (res.status === 401) { setUser(null); return null; }
        return res.json() as Promise<User>;
      })
      .then(data => { if (data) setUser(data); })
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('u6u_token');
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  if (user === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#71717a', fontSize: 14 }}>載入中…</div>
      </div>
    );
  }

  if (user === null) return <U6uLoginPage />;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#09090b', overflow: 'hidden' }}>
      <header style={{ height: 48, borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0, gap: 12 }}>
        <div style={{ width: 28, height: 28, background: '#6d28d9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          u6
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#e4e4e7', flex: 1 }}>u6u Flow</span>
        {user.pictureUrl && <img src={user.pictureUrl} alt="" style={{ width: 26, height: 26, borderRadius: '50%' }} />}
        <span style={{ fontSize: 12, color: '#71717a' }}>{user.displayName ?? user.lineUserId}</span>
        <button
          onClick={() => void handleLogout()}
          style={{ fontSize: 12, color: '#52525b', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px' }}
        >
          登出
        </button>
      </header>
      <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ErrorBoundary>
          <U6u />
        </ErrorBoundary>
      </main>
    </div>
  );
}
