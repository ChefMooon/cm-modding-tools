import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import type { CollisionBox } from './types'
import { CollisionViewport } from './-components/CollisionViewport'
import { Plus, Trash2, Eye, EyeOff, Undo2, Redo2 } from 'lucide-react'

export const Route = createFileRoute('/collision-box')({
  component: RouteComponent,
})

function RouteComponent() {
  const [boxes, setBoxes] = useState<CollisionBox[]>([
    { id: 'base-plate', name: 'base_plate', visible: true, minX: 0, minY: 0, minZ: 0, maxX: 16, maxY: 2, maxZ: 16 }
  ]);
  const [selectedBoxId, setSelectedBoxId] = useState<string>('base-plate');
  
  // History tracking arrays
  const [history, setHistory] = useState<CollisionBox[][]>([]);
  const [redoStack, setRedoStack] = useState<CollisionBox[][]>([]);

  const selectedBox = boxes.find(b => b.id === selectedBoxId);

  const saveHistoryState = (currentBoxes: CollisionBox[]) => {
    setHistory(prev => [...prev, currentBoxes]);
    setRedoStack([]); // Clear redo stack on manual actions
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack(prev => [boxes, ...prev]);
    setBoxes(previous);
    setHistory(prev => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory(prev => [...prev, boxes]);
    setBoxes(next);
    setRedoStack(prev => prev.slice(1));
  };

  const addNewBox = () => {
    saveHistoryState(boxes);
    const newId = crypto.randomUUID();
    const newBox: CollisionBox = {
      id: newId,
      name: `shape_${boxes.length + 1}`,
      visible: true,
      minX: 4, minY: 2, minZ: 4,
      maxX: 12, maxY: 10, maxZ: 12,
    };
    setBoxes([...boxes, newBox]);
    setSelectedBoxId(newId);
  };

  const removeBox = (id: string) => {
    saveHistoryState(boxes);
    const remaining = boxes.filter(b => b.id !== id);
    setBoxes(remaining);
    if (selectedBoxId === id && remaining.length > 0) {
      setSelectedBoxId(remaining[0].id);
    }
  };

  const toggleVisibility = (id: string) => {
    saveHistoryState(boxes);
    setBoxes(boxes.map(b => b.id === id ? { ...b, visible: !b.visible } : b));
  };

  const updateBoxAttribute = (id: string, key: keyof CollisionBox, value: any) => {
    // Avoid cloning full history intervals on simple name text modifications
    if (key !== 'name') {
      saveHistoryState(boxes);
    }

    setBoxes(boxes.map(b => {
      if (b.id !== id) return b;
      let updated = { ...b } as any;
      updated[key] = value;

      if (typeof value === 'number') {
        const clamped = Math.max(0, Math.min(16, value));
        updated[key] = clamped;

        if (key.startsWith('min')) {
          const maxKey = key.replace('min', 'max');
          if (clamped > (b[maxKey as keyof CollisionBox] as number)) updated[maxKey] = clamped;
        }
        if (key.startsWith('max')) {
          const minKey = key.replace('max', 'min');
          if (clamped < (b[minKey as keyof CollisionBox] as number)) updated[minKey] = clamped;
        }
      }
      return updated as CollisionBox;
    }));
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4 text-zinc-900 bg-white min-h-screen">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Voxel Collision Builder</h1>
          <p className="text-xs text-zinc-400">Construct complex compound Minecraft VoxelShapes interactively.</p>
        </div>
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-md border border-zinc-200">
          <button disabled={history.length === 0} onClick={handleUndo}
            className="p-1.5 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-700 disabled:opacity-30 disabled:pointer-events-none cursor-pointer">
            <Undo2 size={15} />
          </button>
          <button disabled={redoStack.length === 0} onClick={handleRedo}
            className="p-1.5 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-700 disabled:opacity-30 disabled:pointer-events-none cursor-pointer">
            <Redo2 size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-3">
          <CollisionViewport boxes={boxes} selectedBoxId={selectedBoxId} onSelectBox={setSelectedBoxId} />
          
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
            <h3 className="text-xs font-medium text-zinc-400 mb-1.5">Java Code Output</h3>
            <pre className="text-xs text-amber-600 overflow-x-auto p-2 bg-white rounded border border-zinc-200 font-mono select-all">
  {`public static final VoxelShape SHAPE = VoxelShapes.or(\n${boxes.map(b => `  Block.box(${b.minX}, ${b.minY}, ${b.minZ}, ${b.maxX}, ${b.maxY}, ${b.maxZ})`).join(',\n')}\n);`}
            </pre>
          </div>
        </div>

        <div className="space-y-4">
          {/* Elements list */}
          <div className="bg-white border border-zinc-200 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-medium tracking-wider text-zinc-400 uppercase">Elements</h2>
              <button onClick={addNewBox}
                className="flex items-center gap-1 text-xs bg-zinc-900 text-white font-medium hover:bg-zinc-700 transition px-2 py-1 rounded cursor-pointer">
                <Plus size={13} /> Add Box
              </button>
            </div>
            <div className="space-y-1 max-h-[140px] overflow-y-auto">
              {boxes.map((box) => (
                <div key={box.id} onClick={() => setSelectedBoxId(box.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition border ${
                    selectedBoxId === box.id
                      ? 'bg-zinc-100 border-zinc-300 text-zinc-900'
                      : 'bg-transparent border-transparent hover:border-zinc-200 text-zinc-500'
                  }`}>
                  <span className="font-mono truncate max-w-[150px]">{box.name || 'unnamed'}</span>
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => toggleVisibility(box.id)} className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer">
                      {box.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button onClick={() => removeBox(box.id)} className="p-1 text-zinc-400 hover:text-red-500 cursor-pointer">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coordinate editor */}
          {selectedBox ? (
            <div className="bg-white border border-zinc-200 rounded-lg p-3 space-y-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 block mb-1">Element Name</label>
                <input type="text" value={selectedBox.name}
                  onChange={(e) => updateBoxAttribute(selectedBox.id, 'name', e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-zinc-400 font-mono text-zinc-800" />
              </div>
              <div className="border-t border-zinc-100 pt-2 space-y-2">
                {(['X', 'Y', 'Z'] as const).map((axis) => {
                  const minKey = `min${axis}` as 'minX' | 'minY' | 'minZ';
                  const maxKey = `max${axis}` as 'maxX' | 'maxY' | 'maxZ';
                  return (
                    <div key={axis} className="grid grid-cols-12 gap-2 items-center bg-zinc-50 p-2 rounded border border-zinc-100">
                      <span className="col-span-1 text-xs font-bold text-zinc-400 text-center font-mono">{axis}</span>
                      <div className="col-span-11 space-y-1.5">
                        {[['Min', minKey], ['Max', maxKey]].map(([label, key]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-400 font-mono w-6">{label}</span>
                            <input type="range" min="0" max="16" step="0.25"
                              value={selectedBox[key as keyof CollisionBox] as number}
                              onChange={(e) => updateBoxAttribute(selectedBox.id, key as keyof CollisionBox, parseFloat(e.target.value))}
                              className="flex-1 h-1 bg-zinc-200 rounded appearance-none accent-zinc-800" />
                            <input type="number" step="0.5"
                              value={selectedBox[key as keyof CollisionBox] as number}
                              onChange={(e) => updateBoxAttribute(selectedBox.id, key as keyof CollisionBox, parseFloat(e.target.value) || 0)}
                              className="w-10 bg-white text-center rounded border border-zinc-200 text-[11px] font-mono py-0.5 text-zinc-700" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center p-4 border border-dashed border-zinc-200 rounded-lg text-zinc-400 text-xs">
              Select or add an element.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}