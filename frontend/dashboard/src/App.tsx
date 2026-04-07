import { useState } from 'react';
import Overview from './components/Overview';
import Entities from './components/Entities';
import Triplets from './components/Triplets';
import Search from './components/Search';

type Tab = 'overview' | 'entities' | 'triplets' | 'search';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'entities', label: 'Entities' },
  { id: 'triplets', label: 'Triplets' },
  { id: 'search', label: 'Search' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [navigateSubject, setNavigateSubject] = useState<string | undefined>();

  const handleNavigate = (subject: string) => {
    setNavigateSubject(subject);
    setTab('triplets');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">InkStone Triplet Dashboard</h1>
          <p className="text-xs text-zinc-500">KBDB 知識圖譜瀏覽器</p>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-zinc-800 px-6">
        <div className="flex gap-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="px-6 py-6 max-w-7xl mx-auto">
        {tab === 'overview' && <Overview />}
        {tab === 'entities' && <Entities onNavigate={handleNavigate} />}
        {tab === 'triplets' && <Triplets initialSubject={navigateSubject} />}
        {tab === 'search' && <Search />}
      </main>
    </div>
  );
}
