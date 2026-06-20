import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CollisionBox, MoveAxis } from './types'
import { CollisionViewport } from './-components/CollisionViewport'
import { JSONImport } from './-components/JSONImport'
import { Plus, Trash2, Eye, EyeOff, Undo2, Redo2, FileJson2, RotateCcw } from 'lucide-react'

type NumericCoordKey = 'minX' | 'minY' | 'minZ' | 'maxX' | 'maxY' | 'maxZ';

const DEFAULT_BOXES: CollisionBox[] = [];

export const Route = createFileRoute('/collision-box')({
  component: RouteComponent,
})

function RouteComponent() {
  const [boxes, setBoxes] = useState<CollisionBox[]>(() => DEFAULT_BOXES.map(box => ({ ...box })));
  const [selectedBoxId, setSelectedBoxId] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [moveAxis, setMoveAxis] = useState<MoveAxis>('X');
  const [moveStep, setMoveStep] = useState<number>(1);
  const [copiedBox, setCopiedBox] = useState<CollisionBox | null>(null);
  
  // History tracking arrays
  const [history, setHistory] = useState<CollisionBox[][]>([]);
  const [redoStack, setRedoStack] = useState<CollisionBox[][]>([]);
  const pendingHistorySnapshotRef = useRef<CollisionBox[] | null>(null);
  const isHistoryPendingRef = useRef(false);

  const selectedBox = boxes.find(b => b.id === selectedBoxId);

  const clampCoordValue = (value: number) => Math.max(0, Math.min(16, Number(value.toFixed(2))));

  const saveHistoryState = (currentBoxes: CollisionBox[]) => {
    setHistory(prev => [...prev, currentBoxes]);
    setRedoStack([]); // Clear redo stack on manual actions
  };

  const beginPendingHistory = (currentBoxes: CollisionBox[]) => {
    if (!isHistoryPendingRef.current) {
      pendingHistorySnapshotRef.current = currentBoxes;
      isHistoryPendingRef.current = true;
    }
  };

  const commitPendingHistory = () => {
    if (!isHistoryPendingRef.current || !pendingHistorySnapshotRef.current) return;

    saveHistoryState(pendingHistorySnapshotRef.current);
    pendingHistorySnapshotRef.current = null;
    isHistoryPendingRef.current = false;
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack(prev => [boxes, ...prev]);
    setBoxes(previous);
    setHistory(prev => prev.slice(0, -1));
  };

  const resetBuilder = () => {
    setBoxes(DEFAULT_BOXES.map(box => ({ ...box })));
    setSelectedBoxId('');
    setHistory([]);
    setRedoStack([]);
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

  const duplicateSelectedBox = () => {
    if (!selectedBox) return;

    saveHistoryState(boxes);
    const duplicatedBox: CollisionBox = {
      ...selectedBox,
      id: crypto.randomUUID(),
      name: `${selectedBox.name || 'unnamed'}_copy`,
      visible: selectedBox.visible,
    };

    const nextBoxes = [...boxes, duplicatedBox];
    setBoxes(nextBoxes);
    setSelectedBoxId(duplicatedBox.id);
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

  const resetSelectedBox = () => {
    if (!selectedBox) return;

    saveHistoryState(boxes);
    const resetBox: CollisionBox = {
      ...selectedBox,
      minX: 4,
      minY: 2,
      minZ: 4,
      maxX: 12,
      maxY: 10,
      maxZ: 12,
    };

    setBoxes(boxes.map(box => box.id === selectedBox.id ? resetBox : box));
  };

  const updateBoxAttribute = (id: string, key: keyof CollisionBox, value: CollisionBox[keyof CollisionBox]) => {
    beginPendingHistory(boxes);

    setBoxes(prev => prev.map(b => {
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

  const moveBoxByDelta = useCallback((id: string, axis: MoveAxis, delta: number) => {
    const roundedDelta = Number(delta.toFixed(2));
    if (roundedDelta === 0 || !selectedBoxId) return;

    beginPendingHistory(boxes);

    setBoxes(prev => prev.map(box => {
      if (box.id !== id) return box;

      const updated = { ...box } as CollisionBox;

      if (axis === 'X') {
        updated.minX = clampCoordValue(box.minX + roundedDelta);
        updated.maxX = clampCoordValue(box.maxX + roundedDelta);
      } else if (axis === 'Y') {
        updated.minY = clampCoordValue(box.minY + roundedDelta);
        updated.maxY = clampCoordValue(box.maxY + roundedDelta);
      } else {
        updated.minZ = clampCoordValue(box.minZ + roundedDelta);
        updated.maxZ = clampCoordValue(box.maxZ + roundedDelta);
      }

      return updated;
    }));

    commitPendingHistory();
  }, [boxes, selectedBoxId]);

  const getEffectiveStep = useCallback((event?: { shiftKey?: boolean; ctrlKey?: boolean }) => {
    if (event?.shiftKey) return Math.max(0.25, moveStep / 4);
    if (event?.ctrlKey) return moveStep * 2;
    return moveStep;
  }, [moveStep]);

  const nudgeSelectedBox = useCallback((axis: MoveAxis, direction: -1 | 1, event?: { shiftKey?: boolean; ctrlKey?: boolean }) => {
    if (!selectedBox) return;
    moveBoxByDelta(selectedBox.id, axis, direction * getEffectiveStep(event));
  }, [getEffectiveStep, moveBoxByDelta, selectedBox]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target?.isContentEditable ?? false);
      const isModifierPressed = event.ctrlKey || event.metaKey;

      if (isModifierPressed && !event.altKey) {
        const key = event.key.toLowerCase();

        if (key === 'z') {
          event.preventDefault();
          if (event.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          return;
        }

        if (key === 'y') {
          event.preventDefault();
          handleRedo();
          return;
        }

        if (key === 'c' && selectedBox && !isTypingTarget) {
          event.preventDefault();
          setCopiedBox({ ...selectedBox });
          return;
        }

        if (key === 'v' && copiedBox && !isTypingTarget) {
          event.preventDefault();
          saveHistoryState(boxes);
          const pastedBox: CollisionBox = {
            ...copiedBox,
            id: crypto.randomUUID(),
            name: `${copiedBox.name || 'unnamed'}_copy`,
          };
          const nextBoxes = [...boxes, pastedBox];
          setBoxes(nextBoxes);
          setSelectedBoxId(pastedBox.id);
          return;
        }
      }

      if (isTypingTarget) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setSelectedBoxId('');
        }
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (!selectedBox) return;
        event.preventDefault();
        removeBox(selectedBox.id);
        return;
      }

      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        addNewBox();
        return;
      }

      if (event.key === 'd' || event.key === 'D') {
        event.preventDefault();
        duplicateSelectedBox();
        return;
      }

      if (event.key === 'v' || event.key === 'V') {
        if (!selectedBox) return;
        event.preventDefault();
        toggleVisibility(selectedBox.id);
        return;
      }

      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        resetSelectedBox();
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedBoxId('');
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        if (boxes.length === 0) return;
        const currentIndex = boxes.findIndex(box => box.id === selectedBoxId);
        const nextIndex = event.shiftKey
          ? (currentIndex <= 0 ? boxes.length - 1 : currentIndex - 1)
          : (currentIndex === -1 || currentIndex >= boxes.length - 1 ? 0 : currentIndex + 1);
        setSelectedBoxId(boxes[nextIndex].id);
        return;
      }

      if (!selectedBox) return;

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
        nudgeSelectedBox(moveAxis, direction as -1 | 1, event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addNewBox, boxes, copiedBox, duplicateSelectedBox, handleRedo, handleUndo, moveAxis, moveStep, nudgeSelectedBox, removeBox, resetSelectedBox, saveHistoryState, selectedBox, selectedBoxId, toggleVisibility]);

  return (
    <div className="w-full max-w-screen-2xl mx-auto space-y-4 text-foreground app-shell min-h-screen">
      <div className="border-b border-border pb-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Voxel Collision Builder</h1>
            <p className="text-xs text-muted-foreground">Construct complex compound Minecraft VoxelShapes interactively.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1 bg-muted p-1 rounded-md border border-border">
            <button
              type="button"
              onClick={() => setShowShortcutsHelp(prev => !prev)}
              className="rounded border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground transition hover:bg-accent"
            >
              {showShortcutsHelp ? 'Hide Shortcuts' : 'Shortcuts'}
            </button>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground transition hover:bg-accent"
            >
              <FileJson2 size={13} /> Import
            </button>
            <button
              type="button"
              onClick={resetBuilder}
              className="flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground transition hover:bg-accent"
            >
              <RotateCcw size={13} /> Reset
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

        {showShortcutsHelp ? (
          <div className="rounded-lg border border-border bg-muted/70 p-3 text-[11px] text-muted-foreground">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium uppercase tracking-wide text-foreground">Keyboard shortcuts</span>
              <span className="text-[10px] text-muted-foreground">Press once to use</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2"><span>Undo / Redo</span><span className="font-mono text-foreground">Ctrl/Cmd + Z / Y</span></div>
                <div className="flex items-center justify-between gap-2"><span>New box</span><span className="font-mono text-foreground">N</span></div>
                <div className="flex items-center justify-between gap-2"><span>Duplicate box</span><span className="font-mono text-foreground">D</span></div>
                <div className="flex items-center justify-between gap-2"><span>Delete box</span><span className="font-mono text-foreground">Delete / Backspace</span></div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2"><span>Toggle visibility</span><span className="font-mono text-foreground">V</span></div>
                <div className="flex items-center justify-between gap-2"><span>Reset selected box</span><span className="font-mono text-foreground">R</span></div>
                <div className="flex items-center justify-between gap-2"><span>Copy / Paste box</span><span className="font-mono text-foreground">Ctrl/Cmd + C / V</span></div>
                <div className="flex items-center justify-between gap-2"><span>Move selected box</span><span className="font-mono text-foreground">Arrow keys</span></div>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              Tip: hold Shift for smaller nudges and Ctrl/Cmd for larger nudges while moving with the arrow keys.
            </div>
          </div>
        ) : null}
      </div>

      {showImportModal ? (
        <JSONImport isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleImport} />
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] gap-4 items-start">
        <div className="min-w-0 space-y-3">
          <CollisionViewport
            boxes={boxes}
            selectedBoxId={selectedBoxId}
            moveAxis={moveAxis}
            moveStep={moveStep}
            onSelectBox={setSelectedBoxId}
            onMoveAxisChange={setMoveAxis}
            onMoveStepChange={setMoveStep}
            onMoveBox={moveBoxByDelta}
          />

          <div className="p-3 bg-muted border border-border rounded-lg">
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">Java Code Output</h3>
            <pre className="text-xs text-amber-600 overflow-x-auto p-2 bg-background rounded border border-border font-mono select-all">
  {`public static final VoxelShape SHAPE = VoxelShapes.or(\n${boxes.map(b => `  Block.box(${b.minX}, ${b.minY}, ${b.minZ}, ${b.maxX}, ${b.maxY}, ${b.maxZ})`).join(',\n')}\n);`}
            </pre>
          </div>
        </div>

        <div className="w-full lg:max-w-[360px] space-y-4">
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
                  onBlur={commitPendingHistory}
                  onKeyDown={(e) => e.key === 'Enter' && commitPendingHistory()}
                  className="w-full bg-muted border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-ring font-mono text-foreground" />
              </div>
              <div className="border-t border-border pt-2 space-y-2">
                <div className="flex flex-wrap items-center gap-2 rounded border border-border bg-background/70 p-2">
                  {(['X', 'Y', 'Z'] as const).map((axis) => (
                    <div key={axis} className="flex items-center gap-1">
                      <span className="text-[10px] font-medium uppercase text-muted-foreground">{axis}</span>
                      <button
                        type="button"
                        onClick={() => nudgeSelectedBox(axis, -1)}
                        className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground hover:bg-accent"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeSelectedBox(axis, 1)}
                        className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground hover:bg-accent"
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
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
                              onMouseUp={commitPendingHistory}
                              className="flex-1 h-1 bg-border rounded appearance-none accent-foreground" />
                            <input type="number" step="0.5"
                              value={selectedBox[key as keyof CollisionBox] as number}
                              onChange={(e) => updateBoxAttribute(selectedBox.id, key as keyof CollisionBox, parseFloat(e.target.value) || 0)}
                              onBlur={commitPendingHistory}
                              onKeyDown={(e) => e.key === 'Enter' && commitPendingHistory()}
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