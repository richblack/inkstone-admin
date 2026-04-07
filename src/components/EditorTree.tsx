// EditorTree.tsx — 左側文件樹（≤100行）
import { useState } from 'react';
import { useCategoryDefs } from './useCategoryDefs';
import EditorTreeToolbar from './EditorTreeToolbar';
import EditorTreeList from './EditorTreeList';

export interface SpecArtifact {
  id: string;
  artifact_type: string;
  status: string;
  summary: string;
  content: string;
  derives_from?: string[];
}

interface Props {
  arts: SpecArtifact[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (a: SpecArtifact) => void;
  onCreateClick: () => void;
  onReload: () => void;
  onShowCategoryMap: () => void;
  onShowChecklist: () => void;
  onUploadClick: () => void;
}

export default function EditorTree({
  arts, loading, selectedId, onSelect, onCreateClick, onReload,
  onShowCategoryMap, onShowChecklist, onUploadClick,
}: Props) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const { categories } = useCategoryDefs();

  const filtered = arts.filter(a => {
    if (filterCat !== 'all' && a.artifact_type !== filterCat) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (search.trim() && !a.summary.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const catsByGroup = categories.reduce<Record<string, string[]>>((acc, c) => {
    (acc[c.group] ??= []).push(c.slug);
    return acc;
  }, {});
  const groups = Object.keys(catsByGroup);

  return (
    <div className="flex-shrink-0 w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-hidden">
      <EditorTreeToolbar
        search={search} filterCat={filterCat} filterStatus={filterStatus} categories={categories}
        onSearch={setSearch} onFilterCat={setFilterCat} onFilterStatus={setFilterStatus}
        onCreateClick={onCreateClick} onUploadClick={onUploadClick} onReload={onReload}
      />
      <div className="flex-shrink-0 border-b border-zinc-800">
        <button className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors" onClick={onShowCategoryMap}>
          ⊞ Category 目錄
        </button>
        <button className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors" onClick={onShowChecklist}>
          ☑ 所有待辦
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <EditorTreeList
          filtered={filtered} loading={loading} selectedId={selectedId}
          catsByGroup={catsByGroup} groups={groups} onSelect={onSelect}
        />
      </div>
    </div>
  );
}
