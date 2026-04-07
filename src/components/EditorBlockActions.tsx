// EditorBlockActions.tsx — block 操作按鈕群（hover 顯示，6 個）（≤100行）
interface Props {
  lineIdx: number;
  onAddBelow: (i: number) => void;
  onDelete: (i: number) => void;
  onMoveUp: (i: number) => void;
  onMoveDown: (i: number) => void;
  onIndentLeft?: (i: number) => void;
  onIndentRight?: (i: number) => void;
}

const BTN = 'w-5 h-5 flex items-center justify-center rounded text-xs transition-colors text-zinc-600 hover:text-zinc-300';

export default function EditorBlockActions({ lineIdx, onAddBelow, onDelete, onMoveUp, onMoveDown, onIndentLeft, onIndentRight }: Props) {
  return (
    <div className="flex-shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
      <button className={BTN} title="左 indent（減層級）"
        onClick={e => { e.stopPropagation(); onIndentLeft ? onIndentLeft(lineIdx) : console.log('[indent-left]', lineIdx); }}>←</button>
      <button className={BTN} title="在下方新增 block"
        onClick={e => { e.stopPropagation(); onAddBelow(lineIdx); }}>＋</button>
      <button className={`${BTN} hover:text-red-400`} title="刪除此 block"
        onClick={e => { e.stopPropagation(); onDelete(lineIdx); }}>✕</button>
      <button className={BTN} title="上移"
        onClick={e => { e.stopPropagation(); onMoveUp(lineIdx); }}>↑</button>
      <button className={BTN} title="下移"
        onClick={e => { e.stopPropagation(); onMoveDown(lineIdx); }}>↓</button>
      <button className={BTN} title="右 indent（加層級）"
        onClick={e => { e.stopPropagation(); onIndentRight ? onIndentRight(lineIdx) : console.log('[indent-right]', lineIdx); }}>→</button>
    </div>
  );
}
