// PolarisEditor.tsx — 三欄統一文件編輯器佈局（≤100行）
import { useState } from 'react';
import { usePolarisEditor } from './usePolarisEditor';
import EditorTree from './EditorTree';
import EditorMain from './EditorMain';
import EditorRelations from './EditorRelations';
import EditorCategoryMap from './EditorCategoryMap';
import EditorUpload from './EditorUpload';
import EditorChecklist from './EditorChecklist';

export type { ArtifactFull } from './usePolarisEditor';

export default function PolarisEditor() {
  const {
    treeArts, triplets, loading, sel, selBlock, selBlockId, panel,
    setTriplets, setSelBlock, setSelBlockId, setPanel,
    reloadArts, handleSelect, handleUpdate, handleNavigate, handleDelete,
  } = usePolarisEditor();

  const [showUpload, setShowUpload] = useState(false);

  const handleUploadDone = (newId: string) => {
    setShowUpload(false);
    reloadArts();
    void (async () => {
      await new Promise(r => setTimeout(r, 800));
      handleNavigate(newId);
    })();
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {showUpload && (
        <EditorUpload arts={treeArts} onDone={handleUploadDone} onClose={() => setShowUpload(false)} />
      )}
      <EditorTree
        arts={treeArts} loading={loading} selectedId={sel?.id ?? null}
        onSelect={handleSelect} onReload={reloadArts}
        onCreateClick={() => setShowUpload(true)} onUploadClick={() => setShowUpload(true)}
        onShowCategoryMap={() => setPanel('category-map')} onShowChecklist={() => setPanel('checklist')}
      />
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 min-w-0">
        {panel === 'category-map' && (
          <div className="flex-1 overflow-auto p-4">
            <button className="text-xs text-zinc-500 mb-3 hover:text-zinc-300 transition-colors"
              onClick={() => setPanel('editor')}>← 返回編輯器</button>
            <EditorCategoryMap />
          </div>
        )}
        {panel === 'checklist' && (
          <div className="flex-1 overflow-auto p-4">
            <button className="text-xs text-zinc-500 mb-3 hover:text-zinc-300 transition-colors"
              onClick={() => setPanel('editor')}>← 返回編輯器</button>
            <EditorChecklist onNavigate={(id) => { handleNavigate(id); setPanel('editor'); }} />
          </div>
        )}
        {panel === 'editor' && (
          <EditorMain
            artifact={sel} triplets={triplets} selBlock={selBlock}
            onSelBlock={setSelBlock}
            onSelBlockId={setSelBlockId}
            onUpdate={handleUpdate} onDelete={handleDelete} onNavigate={handleNavigate}
          />
        )}
      </div>
      {panel === 'editor' && (
        <EditorRelations
          artifact={sel} arts={treeArts} triplets={triplets}
          selBlockId={selBlockId}
          onTripletsChange={setTriplets} onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
