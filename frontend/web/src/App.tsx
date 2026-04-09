import { useState, useEffect } from 'react';
import Overview from './components/Overview';
import Entities from './components/Entities';
import Triplets from './components/Triplets';
import Search from './components/Search';
import Activities from './components/Activities';
import Graph from './components/Graph';
import Knowledge from './components/Knowledge';
import Members from './components/Members';
import PartnerKeys from './components/PartnerKeys';
import LoginPage from './components/LoginPage';

type Page = 'overview' | 'entities' | 'triplets' | 'search' | 'graph' | 'activities' | 'knowledge' | 'members' | 'partner-keys';

interface User {
  lineUserId: string;
  displayName: string;
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
  { id: 'entities',    label: 'Entities',    icon: '🔷' },
  { id: 'triplets',    label: 'Triplets',    icon: '🔗' },
  { id: 'search',      label: 'Search',      icon: '🔍' },
  { id: 'graph',       label: 'Graph',       icon: '🕸️' },
  { id: 'activities',  label: 'Activities',  icon: '🎯' },
  { id: 'members',      label: 'Members',      icon: '👥' },
  { id: 'knowledge',   label: 'Knowledge',   icon: '📚' },
  { id: 'partner-keys', label: 'Partner Keys', icon: '🔑' },
];

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = loading
  const [page, setPage] = useState<Page>('overview');
  const [navigateSubject, setNavigateSubject] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // 驗證登入狀態
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.status === 401) { setUser(null); return null; }
        return res.json() as Promise<User>;
      })
      .then(data => { if (data) setUser(data); })
      .catch(() => setUser(null));
  }, []);

  const handleNavigate = (subject: string) => {
    setNavigateSubject(subject);
    setPage('triplets');
    setMobileOpen(false);
  };

  const handleNavClick = (id: Page) => {
    setPage(id);
    setMobileOpen(false);
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

  // Sidebar 內容（桌面 + 手機共用）
  const SidebarContent = ({ collapsed }: { collapsed: boolean }) => (
    <>
      {/* Logo 區 */}
      <div className="h-14 flex items-center px-3 border-b border-zinc-800 gap-3 flex-shrink-0">
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm flex-shrink-0"
        >
          IS
        </button>
        {!collapsed && (
          <span className="text-sm font-semibold text-zinc-100 truncate">InkStone Admin</span>
        )}
      </div>

      {/* Nav 項目 */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => !item.comingSoon && handleNavClick(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
              page === item.id && !item.comingSoon
                ? 'bg-zinc-800 text-zinc-100'
                : item.comingSoon
                  ? 'text-zinc-600 cursor-not-allowed'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
            title={collapsed ? item.label : undefined}
          >
            <span className="text-base flex-shrink-0">{item.icon}</span>
            {!collapsed && (
              <span className="flex-1 text-left truncate">{item.label}</span>
            )}
            {!collapsed && item.comingSoon && (
              <span className="text-xs text-zinc-600 bg-zinc-800 rounded px-1.5 py-0.5 flex-shrink-0">soon</span>
            )}
          </button>
        ))}
      </nav>

      {/* 用戶資訊 */}
      <div className="border-t border-zinc-800 p-3 flex-shrink-0">
        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
          {user.pictureUrl ? (
            <img src={user.pictureUrl} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400 flex-shrink-0">
              {user.displayName.charAt(0)}
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs text-zinc-300 truncate">{user.displayName}</div>
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
    </>
  );

  // 已登入 — 主介面
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* 桌面 Sidebar（md 以上永遠顯示） */}
      <aside className={`hidden md:flex ${sidebarOpen ? 'w-56' : 'w-14'} flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex-col transition-all duration-200`}>
        <SidebarContent collapsed={!sidebarOpen} />
      </aside>

      {/* 手機 Sidebar overlay（md 以下） */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col transition-transform duration-200 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent collapsed={false} />
      </aside>

      {/* 主內容區 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 頂部標題列 */}
        <header className="h-14 border-b border-zinc-800 flex items-center px-4 md:px-6 gap-3">
          {/* 手機 hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex-shrink-0"
            aria-label="開啟選單"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-zinc-300">
            {NAV_ITEMS.find(n => n.id === page)?.label ?? ''}
          </h1>
        </header>

        {/* 內容 */}
        <main className="flex-1 overflow-auto px-6 py-6 max-w-7xl w-full">
          {page === 'overview'   && <Overview />}
          {page === 'entities'   && <Entities onNavigate={handleNavigate} />}
          {page === 'triplets'   && <Triplets initialSubject={navigateSubject} />}
          {page === 'search'     && <Search />}
          {page === 'graph'      && <Graph />}
          {page === 'activities' && <Activities />}
          {page === 'members'    && <Members />}
          {page === 'knowledge'  && <Knowledge />}
          {page === 'partner-keys' && <PartnerKeys />}
        </main>
      </div>
    </div>
  );
}
