import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ViewportToolbar, type PreviewDirection } from './ViewportToolbar';
import { ViewportGizmoOverlay, ViewportGizmoScene, type ViewPreset } from './ViewportGizmo';
import type { CollisionBox, MoveAxis } from '../types/types';
import { getEffectiveStepValue } from '../lib/stepUtils';

interface ViewportProps {
  boxes: CollisionBox[];
  selectedBoxId: string | null;
  moveAxis: MoveAxis;
  moveStep: number;
  showPivotPoint: boolean;
  activePreviewDirection: PreviewDirection;
  isViewportToolbarOpen: boolean;
  onSelectBox: (id: string) => void;
  onMoveAxisChange: (axis: MoveAxis) => void;
  onMoveStepChange: (step: number) => void;
  onMoveBox: (id: string, axis: MoveAxis, delta: number) => void;
  onPreviewDirectionChange: (direction: PreviewDirection) => void;
  onViewportToolbarToggle: () => void;
}

const markerColorMap = {
  'Light Blue': '#60a5fa',
  Yellow: '#facc15',
  Orange: '#fb923c',
  Red: '#f87171',
  Purple: '#a78bfa',
  Blue: '#3b82f6',
  Green: '#34d399',
  Lime: '#a3e635',
  Pink: '#f472b6',
  Silver: '#cbd5e1',
};

const menuOptions: Array<{ label: string; preset: ViewPreset }> = [
  { label: 'Initial View', preset: 'default' },
  { label: 'Top View (+Y)', preset: 'top' },
  { label: 'Bottom View (-Y)', preset: 'bottom' },
  { label: 'Front View (+Z)', preset: 'front' },
  { label: 'Back View (-Z)', preset: 'back' },
  { label: 'Right View (+X)', preset: 'right' },
  { label: 'Left View (-X)', preset: 'left' },
];

const presetViewMap: Record<ViewPreset, { position: [number, number, number]; target: [number, number, number]; previewDirection: PreviewDirection }> = {
  default: { position: [2.2, 2.2, 3.2], target: [0, 0, 0], previewDirection: 'NORTH' },
  top: { position: [0, 4.2, 0.01], target: [0, 0, 0], previewDirection: 'NORTH' },
  bottom: { position: [0, -4.2, 0.01], target: [0, 0, 0], previewDirection: 'NORTH' },
  front: { position: [0, 0, 4.2], target: [0, 0, 0], previewDirection: 'NORTH' },
  back: { position: [0, 0, -4.2], target: [0, 0, 0], previewDirection: 'SOUTH' },
  right: { position: [4.2, 0, 0], target: [0, 0, 0], previewDirection: 'EAST' },
  left: { position: [-4.2, 0, 0], target: [0, 0, 0], previewDirection: 'WEST' },
};

export function CollisionViewport({
  boxes,
  selectedBoxId,
  moveAxis,
  moveStep,
  showPivotPoint,
  activePreviewDirection,
  isViewportToolbarOpen,
  onSelectBox,
  onMoveAxisChange,
  onMoveStepChange,
  onMoveBox,
  onPreviewDirectionChange,
  onViewportToolbarToggle,
}: ViewportProps) {
  const [dragState, setDragState] = useState<{ boxId: string; lastX: number; lastY: number; axis: MoveAxis } | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [adjustedContextMenuPosition, setAdjustedContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const centerPixelGridLines = [];
  const startPos = -0.5;
  const step = 1.0 / 16;

  for (let i = 0; i <= 16; i++) {
    const offset = startPos + i * step;
    centerPixelGridLines.push(
      <Line key={`z-${i}`} points={[[offset, -0.5, -0.5], [offset, -0.5, 0.5]]} color="#e4e4e7" lineWidth={1} />
    );
    centerPixelGridLines.push(
      <Line key={`x-${i}`} points={[[-0.5, -0.5, offset], [0.5, -0.5, offset]]} color="#e4e4e7" lineWidth={1} />
    );
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>, boxId: string) => {
    event.stopPropagation();
    onSelectBox(boxId);
    setDragState({ boxId, lastX: event.clientX, lastY: event.clientY, axis: moveAxis });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;

    const deltaX = Math.round((event.clientX - dragState.lastX) / 60);
    const deltaY = Math.round((event.clientY - dragState.lastY) / 60);
    const deltaUnits = dragState.axis === 'X' ? deltaX : dragState.axis === 'Y' ? deltaY : Math.round((deltaX + deltaY) / 2);
    const effectiveStep = getEffectiveStepValue(moveStep, event);

    if (deltaUnits !== 0) {
      onMoveBox(dragState.boxId, dragState.axis, deltaUnits * effectiveStep);
    }

    setDragState({ ...dragState, lastX: event.clientX, lastY: event.clientY });
  };

  const handlePointerUp = () => {
    setDragState(null);
  };

  useEffect(() => () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  useEffect(() => {
    if (!adjustedContextMenuPosition) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (contextMenuRef.current?.contains(event.target as Node)) {
        return;
      }

      setContextMenuPosition(null);
      setAdjustedContextMenuPosition(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenuPosition(null);
        setAdjustedContextMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [adjustedContextMenuPosition]);

  useLayoutEffect(() => {
    if (!contextMenuPosition) {
      setAdjustedContextMenuPosition(null);
      return;
    }

    const menuWidth = contextMenuRef.current?.offsetWidth ?? 176;
    const menuHeight = contextMenuRef.current?.offsetHeight ?? 220;
    const padding = 12;
    const maxX = Math.max(padding, window.innerWidth - menuWidth - padding);
    const maxY = Math.max(padding, window.innerHeight - menuHeight - padding);

    setAdjustedContextMenuPosition({
      x: Math.min(Math.max(contextMenuPosition.x, padding), maxX),
      y: Math.min(Math.max(contextMenuPosition.y, padding), maxY),
    });
  }, [contextMenuPosition]);

  const animateCameraToPreset = (preset: ViewPreset) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const presetData = presetViewMap[preset];
    const startPosition = controls.object.position.clone();
    const startTarget = controls.target.clone();
    const endPosition = new Vector3(...presetData.position);
    const endTarget = new Vector3(...presetData.target);
    const duration = 220;
    const startTime = performance.now();

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const tick = (time: number) => {
      const progress = Math.min(1, (time - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      controls.object.position.lerpVectors(startPosition, endPosition, eased);
      controls.target.lerpVectors(startTarget, endTarget, eased);
      controls.update();

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const handleViewChange = (preset: ViewPreset) => {
    setContextMenuPosition(null);
    animateCameraToPreset(preset);
  };

  const getPreviewBounds = (box: CollisionBox) => {
    switch (activePreviewDirection) {
      case 'SOUTH':
        return {
          minX: 16 - box.maxX,
          maxX: 16 - box.minX,
          minZ: 16 - box.maxZ,
          maxZ: 16 - box.minZ,
        };
      case 'WEST':
        return {
          minX: box.minZ,
          maxX: box.maxZ,
          minZ: 16 - box.maxX,
          maxZ: 16 - box.minX,
        };
      case 'EAST':
        return {
          minX: 16 - box.maxZ,
          maxX: 16 - box.minZ,
          minZ: box.minX,
          maxZ: box.maxX,
        };
      case 'NORTH':
      default:
        return {
          minX: box.minX,
          maxX: box.maxX,
          minZ: box.minZ,
          maxZ: box.maxZ,
        };
    }
  };

  const previewDirectionLabel = activePreviewDirection === 'NORTH'
    ? 'North'
    : activePreviewDirection === 'SOUTH'
      ? 'South'
      : activePreviewDirection === 'EAST'
        ? 'East'
        : 'West';

  const previewDirectionMatrix = activePreviewDirection === 'NORTH'
    ? '0°'
    : activePreviewDirection === 'SOUTH'
      ? '180°'
      : activePreviewDirection === 'EAST'
        ? '270°'
        : '90°';

  return (
    <div
      className="relative h-[320px] w-full overflow-visible rounded-lg border border-border bg-muted sm:h-[380px] md:h-[460px] lg:h-[560px] xl:h-[640px]"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <Canvas camera={{ position: [2.2, 2.2, 3.2], fov: 45 }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[10, 15, 10]} intensity={0.4} />

        <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.05} />
        <ViewportGizmoScene />

        {/* 3x3 Outer Borders */}
        {[-1.5, -0.5, 0.5, 1.5].map((coord, i) => (
          <group key={`outer-grid-${i}`}>
            <Line points={[[coord, -0.5, -1.5], [coord, -0.5, 1.5]]} color="#d4d4d8" lineWidth={1.5} />
            <Line points={[[-1.5, -0.5, coord], [1.5, -0.5, coord]]} color="#d4d4d8" lineWidth={1.5} />
          </group>
        ))}

        {/* Isolated Center Subdivisions */}
        {centerPixelGridLines}

        {/* Core Block Cage Wireframe */}
        <group position={[0, 0, 0]}>
          <Line points={[[-0.5, 0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]]} color="#d4d4d8" lineWidth={1} />
          <Line points={[[-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5]]} color="#d4d4d8" lineWidth={1} />
          <Line points={[[0.5, -0.5, -0.5], [0.5, 0.5, -0.5]]} color="#d4d4d8" lineWidth={1} />
          <Line points={[[0.5, -0.5, 0.5], [0.5, 0.5, 0.5]]} color="#d4d4d8" lineWidth={1} />
          <Line points={[[-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5]]} color="#d4d4d8" lineWidth={1} />
        </group>

        {/* Orientation Accents */}
        <Line points={[[-0.5, -0.495, -0.5], [0.5, -0.495, -0.5]]} color="#ef4444" lineWidth={3.5} />
        <Line points={[[-0.5, -0.495, -0.5], [-0.5, -0.495, 0.5]]} color="#3b82f6" lineWidth={3.5} />

        {/* Hitboxes */}
        {boxes.map((box) => {
          if (!box.visible) return null;
          const isSelected = box.id === selectedBoxId;

          const { minX, maxX, minZ, maxZ } = getPreviewBounds(box);
          const width = (maxX - minX) / 16;
          const height = (box.maxY - box.minY) / 16;
          const depth = (maxZ - minZ) / 16;

          const posX = (minX + maxX) / 32 - 0.5;
          const posY = (box.minY + box.maxY) / 32 - 0.5;
          const posZ = (minZ + maxZ) / 32 - 0.5;
          const pivotX = box.pivotX / 16 - 0.5;
          const pivotY = box.pivotY / 16 - 0.5;
          const pivotZ = box.pivotZ / 16 - 0.5;
          const rotationX = (box.rotationX * Math.PI) / 180;
          const rotationY = (box.rotationY * Math.PI) / 180;
          const rotationZ = (box.rotationZ * Math.PI) / 180;

          const markerColor = box.markerColor ? markerColorMap[box.markerColor] : '#71717a';

          return (
            <group key={box.id}>
              {showPivotPoint ? (
                <group>
                  <mesh position={[pivotX, pivotY, pivotZ]}>
                    <sphereGeometry args={[0.025, 12, 12]} />
                    <meshBasicMaterial color={isSelected ? '#fbbf24' : markerColor} />
                  </mesh>
                  <Line points={[[pivotX, pivotY, pivotZ], [posX, posY, posZ]]} color={isSelected ? '#f59e0b' : markerColor} lineWidth={1.5} />
                </group>
              ) : null}
              <group
                position={[pivotX, pivotY, pivotZ]}
                onPointerDown={(e) => {
                  handlePointerDown(e as unknown as React.PointerEvent<HTMLDivElement>, box.id);
                }}
              >
                <group rotation={[rotationX, rotationY, rotationZ]}>
                  <group position={[(posX - pivotX), (posY - pivotY), (posZ - pivotZ)]}>
                    <mesh>
                      <boxGeometry args={[width, height, depth]} />
                      <meshStandardMaterial 
                        color={isSelected ? '#f59e0b' : markerColor} 
                        transparent 
                        opacity={isSelected ? 0.4 : 0.25} 
                        roughness={0.5}
                      />
                    </mesh>
                    <mesh>
                      <boxGeometry args={[width, height, depth]} />
                      <meshBasicMaterial color={isSelected ? '#fbbf24' : markerColor} wireframe />
                    </mesh>
                  </group>
                </group>
              </group>
            </group>
          );
        })}
      </Canvas>

      <ViewportToolbar
        activeDirection={activePreviewDirection}
        isOpen={isViewportToolbarOpen}
        onDirectionChange={onPreviewDirectionChange}
        onToggle={onViewportToolbarToggle}
      />

      {activePreviewDirection !== 'NORTH' ? (
        <div className="pointer-events-none absolute bottom-2.5 left-2.5 z-10 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs font-mono shadow-sm backdrop-blur-md select-none">
          <span className="text-amber-500">Facing: {previewDirectionLabel} ({previewDirectionMatrix})</span>
        </div>
      ) : null}

      <ViewportGizmoOverlay onViewChange={handleViewChange} onContextMenuRequest={(x, y) => setContextMenuPosition({ x, y })} />

      {adjustedContextMenuPosition ? (
        <div
          ref={contextMenuRef}
          className="pointer-events-auto fixed z-20 min-w-[11rem] rounded-xl border border-border bg-background/95 p-1.5 shadow-xl backdrop-blur-md"
          style={{ left: adjustedContextMenuPosition.x, top: adjustedContextMenuPosition.y }}
        >
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            View presets
          </div>
          {menuOptions.map((option) => (
            <button
              key={option.preset}
              type="button"
              className="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-sm text-foreground transition hover:bg-accent"
              onClick={() => handleViewChange(option.preset)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="pointer-events-auto absolute right-2.5 top-2.5 z-10 flex flex-wrap items-center justify-end gap-1 rounded border border-border bg-background/95 px-1.5 py-1 shadow-sm">
        {(['X', 'Y', 'Z'] as const).map((axis) => (
          <button
            key={axis}
            type="button"
            onClick={() => onMoveAxisChange(axis)}
            className={`min-w-[1.45rem] rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${moveAxis === axis ? 'bg-foreground text-background' : 'text-foreground hover:bg-accent'}`}
          >
            {axis}
          </button>
        ))}
        <label className="flex items-center gap-1 rounded border border-border bg-background px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
          <span className="whitespace-nowrap">S</span>
          <select
            value={moveStep}
            onChange={(event) => {
              const nextStep = Number(event.target.value);
              if (!Number.isNaN(nextStep)) {
                onMoveStepChange(nextStep);
              }
            }}
            className="rounded border-0 bg-transparent px-0.5 py-0 text-[10px] font-medium text-foreground outline-none"
          >
            {[0.1, 0.25, 0.5, 1].map((step) => (
              <option key={step} value={step}>
                {step}
              </option>
            ))}
          </select>
        </label>
      </div>

    </div>
  );
}