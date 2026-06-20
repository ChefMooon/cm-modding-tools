import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import type { CollisionBox } from './types'
import { CollisionViewport } from './-components/CollisionViewport'
import { JSONImport } from './-components/JSONImport'
import { Plus, Trash2, Eye, EyeOff, Undo2, Redo2, FileJson2 } from 'lucide-react'

type NumericCoordKey = 'minX' | 'minY' | 'minZ' | 'maxX' | 'maxY' | 'maxZ';

export const Route = createFileRoute('/collision-box')({
  component: RouteComponent,
})

function RouteComponent() {
  const [boxes, setBoxes] = useState<CollisionBox[]>([
    { id: 'base-plate', name: 'base_plate', visible: true, minX: 0, minY: 0, minZ: 0, maxX: 16, maxY: 2, maxZ: 16 }
  ]);
  const [selectedBoxId, setSelectedBoxId] = useState<string>('base-plate');
  const [showImportModal, setShowImportModal] = useState(false);
  
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

  const updateBoxAttribute = (id: string, key: keyof CollisionBox, value: CollisionBox[keyof CollisionBox]) => {
    // Avoid cloning full history intervals on simple name text modifications
    if (key !== 'name') {
      saveHistoryState(boxes);
    }

    setBoxes(boxes.map(b => {
      if (b.id !== id) return b;
      const updated = { ...b } as CollisionBox;

      if (typeof value === 'number' && ['minX', 'minY', 'minZ', 'maxX', 'maxY', 'maxZ'].includes(key)) {
        const numericKey = key as NumericCoordKey;
        const clamped = Math.max(0, Math.min(16, value));
        updated[numericKey] = clamped;

        if (numericKey.startsWith('min')) {
          const maxKey = `max${numericKey.slice(3)}` as NumericCoordKey;
          if (clamped > (b[maxKey] as number)) {
            updated[maxKey] = clamped;
          }
        }
        if (numericKey.startsWith('max')) {
          const minKey = `min${numericKey.slice(3)}` as NumericCoordKey;
          if (clamped < (b[minKey] as number)) {
            updated[minKey] = clamped;
          }
        }
      } else if (key === 'name' && typeof value === 'string') {
        updated.name = value;
      } else if (key === 'visible' && typeof value === 'boolean') {
        updated.visible = value;
      }

      return updated;
    }));
  };

  const handleImport = (importedBoxes: CollisionBox[], replaceExisting: boolean) => {
    saveHistoryState(boxes);
    const nextBoxes = replaceExisting ? importedBoxes : [...boxes, ...importedBoxes];
    setBoxes(nextBoxes);
    if (nextBoxes.length > 0) {
      setSelectedBoxId(nextBoxes[0].id);
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4 text-foreground app-shell min-h-screen">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Voxel Collision Builder</h1>
          <p className="text-xs text-muted-foreground">Construct complex compound Minecraft VoxelShapes interactively.</p>
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-md border border-border">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground transition hover:bg-accent"
          >
            <FileJson2 size={13} /> Import
          </button>
          <button disabled={history.length === 0} onClick={handleUndo}
            className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none cursor-pointer">
            <Undo2 size={15} />
          </button>
          <button disabled={redoStack.length === 0} onClick={handleRedo}
            className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none cursor-pointer">
            <Redo2 size={15} />
          </button>
        </div>
      </div>

      {showImportModal ? (
        <JSONImport isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleImport} />
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-3">
          <CollisionViewport boxes={boxes} selectedBoxId={selectedBoxId} onSelectBox={setSelectedBoxId} />

          <div className="p-3 bg-muted border border-border rounded-lg">
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">Java Code Output</h3>
            <pre className="text-xs text-amber-600 overflow-x-auto p-2 bg-background rounded border border-border font-mono select-all">
  {`public static final VoxelShape SHAPE = VoxelShapes.or(\n${boxes.map(b => `  Block.box(${b.minX}, ${b.minY}, ${b.minZ}, ${b.maxX}, ${b.maxY}, ${b.maxZ})`).join(',\n')}\n);`}
            </pre>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Elements</h2>
              <button onClick={addNewBox}
                className="flex items-center gap-1 text-xs bg-foreground text-background font-medium hover:opacity-90 transition px-2 py-1 rounded cursor-pointer">
                <Plus size={13} /> Add Box
              </button>
            </div>
            <div className="space-y-1 max-h-[140px] overflow-y-auto">
              {boxes.map((box) => (
                <div key={box.id} onClick={() => setSelectedBoxId(box.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition border ${
                    selectedBoxId === box.id
                      ? 'bg-muted border-border text-foreground'
                      : 'bg-transparent border-transparent hover:border-border text-muted-foreground'
                  }`}>
                  <span className="font-mono truncate max-w-[150px]">{box.name || 'unnamed'}</span>
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => toggleVisibility(box.id)} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer">
                      {box.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button onClick={() => removeBox(box.id)} className="p-1 text-muted-foreground hover:text-red-500 cursor-pointer">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedBox ? (
            <div className="bg-card border border-border rounded-lg p-3 space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Element Name</label>
                <input type="text" value={selectedBox.name}
                  onChange={(e) => updateBoxAttribute(selectedBox.id, 'name', e.target.value)}
                  className="w-full bg-muted border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-ring font-mono text-foreground" />
              </div>
              <div className="border-t border-border pt-2 space-y-2">
                {(['X', 'Y', 'Z'] as const).map((axis) => {
                  const minKey = `min${axis}` as 'minX' | 'minY' | 'minZ';
                  const maxKey = `max${axis}` as 'maxX' | 'maxY' | 'maxZ';
                  return (
                    <div key={axis} className="grid grid-cols-12 gap-2 items-center bg-muted p-2 rounded border border-border">
                      <span className="col-span-1 text-xs font-bold text-muted-foreground text-center font-mono">{axis}</span>
                      <div className="col-span-11 space-y-1.5">
                        {[['Min', minKey], ['Max', maxKey]].map(([label, key]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground font-mono w-6">{label}</span>
                            <input type="range" min="0" max="16" step="0.25"
                              value={selectedBox[key as keyof CollisionBox] as number}
                              onChange={(e) => updateBoxAttribute(selectedBox.id, key as keyof CollisionBox, parseFloat(e.target.value))}
                              className="flex-1 h-1 bg-border rounded appearance-none accent-foreground" />
                            <input type="number" step="0.5"
                              value={selectedBox[key as keyof CollisionBox] as number}
                              onChange={(e) => updateBoxAttribute(selectedBox.id, key as keyof CollisionBox, parseFloat(e.target.value) || 0)}
                              className="w-10 bg-background text-center rounded border border-border text-[11px] font-mono py-0.5 text-foreground" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center p-4 border border-dashed border-border rounded-lg text-muted-foreground text-xs">
              Select or add an element.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}