import { useState, useEffect } from 'react';
import Overview from './components/Overview';
import Entities from './components/Entities';
import Triplets from './components/Triplets';
import Search from './components/Search';
import Graph from './components/Graph';
import Knowledge from './components/Knowledge';
import { CeoKnowledgeTab } from './components/Knowledge';
import Activities from './components/Activities';
import Members from './components/Members';
import LoginPage from './components/LoginPage';
import BuildStatus from './components/BuildStatus';
import PolarisEditor from './components/PolarisEditor';
import AVMMesh from './components/AVMMesh';
// Progress 已廢除（step10），功能移入 PolarisEditor
import PartnerKeys from './components/PartnerKeys';
import ErrorLog from './components/ErrorLog';
import U6u from './components/U6u';
import ErrorBoundary from './components/ErrorBoundary';
import { initCategories } from './components/editorCategories';

type Page = 'overview' | 'members' | 'entities' | 'triplets' | 'search' | 'graph' | 'activities' | 'knowledge' | 'ceo-knowledge' | 'progress' | 'partner-keys' | 'error-log' | 'u6u' | 'avm-mesh';

interface User {
  lineUserId: string;
  displayName?: string;
  pictureUrl?: string;
}

interface NavItem {
  id: Page;
  label: string;
  icon: string;
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview',    label: 'Overview',    icon: '📊' },
  { id: 'avm-mesh',    label: 'AVM Mesh',    icon: '🌐' },
  { id: 'members',     label: 'Members',     icon: '👥' },
  { id: 'entities',    label: 'Entities',    icon: '🔷' },
  { id: 'triplets',    label: 'Triplets',    icon: '🔗' },
  { id: 'search',      label: 'Search',      icon: '🔍' },
  { id: 'graph',       label: 'Graph',       icon: '🕸️' },
  { id: 'activities',  label: 'Activities',  icon: '🎯' },
  { id: 'knowledge',     label: 'Knowledge',    icon: '📚' },
  { id: 'ceo-knowledge', label: 'CEO 知識庫',  icon: '🧠' },
  { id: 'progress',      label: 'Polaris',     icon: '🌟' },
  { id: 'partner-keys', label: 'API Keys', icon: '🔑' },
  { id: 'error-log',    label: '錯誤記錄',   icon: '🚨' },
  { id: 'u6u',          label: 'u6u',        icon: '🔮' },
];

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = loading
  const [page, setPage] = useState<Page>('overview');
  const [navigateSubject, setNavigateSubject] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 驗證登入狀態
  useEffect(() => {
    // 偵錯模式：?debug=1 時自動注入 mock token
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === '1') {
      localStorage.setItem('admin_token', 'mock_debug_token');
      window.history.replaceState(null, '', '/');
    }

    // 從 URL hash 取 token（LINE callback 回來時帶入）
    const hash = window.location.hash;
    if (hash.startsWith('#token=')) {
      const token = hash.slice(7);
      if (token) localStorage.setItem('admin_token', token);
      window.history.replaceState(null, '', '/');
    }

    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/auth/me', { headers })
      .then(res => {
        if (res.status === 401) { setUser(null); return null; }
        return res.json() as Promise<User>;
      })
      .then(data => {
        if (data) {
          setUser(data);
          // 登入成功後 seed category-def 到 KBDB（冪等，已存在則跳過）
          void initCategories();
        }
      })
      .catch(() => setUser(null));
  }, []);

  const handleNavigate = (subject: string) => {
    setNavigateSubject(subject);
    setPage('triplets');
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  // Loading
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 animate-pulse">載入中…</div>
      </div>
    );
  }

  // 未登入
  if (user === null) {
    return <LoginPage />;
  }

  // 已登入 — 主介面
  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden">
      {/* 左側 Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-14'} flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-200`}>
        {/* Logo 區 */}
        <div className="h-14 flex items-center px-3 border-b border-zinc-800 gap-3">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm flex-shrink-0"
          >
            IS
          </button>
          {sidebarOpen && (
            <span className="text-sm font-semibold text-zinc-100 truncate">InkStone Admin</span>
          )}
        </div>

        {/* Nav 項目 */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => !item.comingSoon && setPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                page === item.id && !item.comingSoon
                  ? 'bg-zinc-800 text-zinc-100'
                  : item.comingSoon
                    ? 'text-zinc-600 cursor-not-allowed'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {sidebarOpen && (
                <span className="flex-1 text-left truncate">{item.label}</span>
              )}
              {sidebarOpen && item.comingSoon && (
                <span className="text-xs text-zinc-600 bg-zinc-800 rounded px-1.5 py-0.5 flex-shrink-0">soon</span>
              )}
            </button>
          ))}
        </nav>

        {/* 用戶資訊 */}
        <div className="border-t border-zinc-800 p-3">
          <div className={`flex items-center gap-2 ${sidebarOpen ? '' : 'justify-center'}`}>
            {user.pictureUrl ? (
              <img src={user.pictureUrl} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400 flex-shrink-0">
                {(user.displayName ?? user.lineUserId ?? 'A').charAt(0).toUpperCase()}
              </div>
            )}
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <div className="text-xs text-zinc-300 truncate">{user.displayName ?? user.lineUserId}</div>
                <button
                  onClick={() => void handleLogout()}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  登出
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 主內容區 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 頂部標題列 */}
        <header className="h-14 border-b border-zinc-800 flex items-center px-6">
          <h1 className="text-sm font-semibold text-zinc-300">
            {NAV_ITEMS.find(n => n.id === page)?.label ?? ''}
          </h1>
        </header>

        {/* 內容 */}
        <main className={`flex-1 w-full ${page === 'progress' || page === 'error-log' || page === 'u6u' ? 'overflow-hidden flex flex-col' : 'overflow-auto px-6 py-6 max-w-7xl'}`}>
          {page === 'overview'   && <Overview />}
          {page === 'avm-mesh'   && <AVMMesh />}
          {page === 'members'    && <Members />}
          {page === 'entities'   && <Entities onNavigate={handleNavigate} />}
          {page === 'triplets'   && <Triplets initialSubject={navigateSubject} />}
          {page === 'search'     && <Search />}
          {page === 'graph'      && <Graph />}
          {page === 'activities' && <Activities />}
          {page === 'knowledge'      && <Knowledge />}
          {page === 'progress'      && <PolarisEditor />}
          {page === 'partner-keys' && <PartnerKeys />}
          {page === 'error-log'    && <ErrorLog />}
          {page === 'u6u'          && <ErrorBoundary><U6u /></ErrorBoundary>}
          {page === 'ceo-knowledge' && (
            <div className="space-y-8">
              <CeoKnowledgeTab />
              <hr className="border-zinc-800" />
              <BuildStatus />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
