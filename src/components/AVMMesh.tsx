import { useState, useEffect } from 'react';

const SERVICES = [
  { id: 'polaris', name: 'Polaris Brain (Layer 1)', url: 'http://localhost:8000', docs: '/docs', type: 'Brain' },
  { id: 'kbdb', name: 'KBDB Memory (Layer 2)', url: '/api/kbdb', docs: '/ui', type: 'Matrix' },
  { id: 'u6u', name: 'u6u Cypher (Layer 2)', url: '/api/u6u', docs: '/docs', type: 'Matrix' },
];

export default function AVMMesh() {
  const [statuses, setStatuses] = useState<Record<string, 'online' | 'offline' | 'checking'>>({
    polaris: 'checking',
    kbdb: 'checking',
    u6u: 'checking',
  });

  const checkStatus = async (id: string, url: string) => {
    setStatuses(prev => ({ ...prev, [id]: 'checking' }));
    try {
      // 僅測試連通性，不讀取 response
      // 走代理的路徑不需要 no-cors
      const options: RequestInit = url.startsWith('/') ? {} : { mode: 'no-cors' };
      await fetch(url, options);
      setStatuses(prev => ({ ...prev, [id]: 'online' }));
    } catch {
      setStatuses(prev => ({ ...prev, [id]: 'offline' }));
    }
  };

  useEffect(() => {
    SERVICES.forEach(svc => {
      void checkStatus(svc.id, svc.url);
    });
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-blue-400 font-mono tracking-tighter">AVM SERVICE MESH</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SERVICES.map(svc => (
          <div key={svc.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-bold bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full uppercase tracking-widest">{svc.type}</span>
                <h2 className="text-xl font-bold text-white mt-2">{svc.name}</h2>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  statuses[svc.id] === 'online' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 
                  statuses[svc.id] === 'offline' ? 'bg-red-500' : 'bg-zinc-600 animate-pulse'
                }`}></div>
                <span className="text-xs font-mono text-zinc-500 uppercase">{statuses[svc.id]}</span>
              </div>
            </div>
            
            <p className="text-zinc-500 text-xs mb-6 font-mono bg-black/30 p-2 rounded border border-zinc-800/50 break-all">{svc.url}</p>
            
            <div className="flex space-x-3">
              <a 
                href={`${svc.url}${svc.docs}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex-1 bg-white hover:bg-zinc-200 text-black text-xs font-bold text-center py-2.5 rounded-xl transition-all"
              >
                OPEN SWAGGER
              </a>
              <button 
                onClick={() => void checkStatus(svc.id, svc.url)}
                className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-700 transition-all"
              >
                RETRY
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-blue-500/5 border border-blue-500/20 p-6 rounded-2xl">
        <h3 className="text-blue-400 font-bold mb-2 flex items-center text-sm">
          <span className="mr-2">⚡</span> SYSTEM ADVISORY
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          The Service Mesh monitors the synchronization between Polaris Brain and Matrix Infrastructure. 
          Ensure 401 Unauthorized errors are resolved by checking the <strong>KBDB_INTERNAL_TOKEN</strong> in Matrix Workers.
        </p>
      </div>
    </div>
  );
}
