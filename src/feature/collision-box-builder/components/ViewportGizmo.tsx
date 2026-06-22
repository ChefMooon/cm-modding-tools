import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type ViewPreset = 'default' | 'top' | 'bottom' | 'front' | 'back' | 'right' | 'left';

interface ViewportGizmoOverlayProps {
  onViewChange: (preset: ViewPreset) => void;
  onContextMenuRequest: (x: number, y: number) => void;
}

// 1. SCENE COMPONENT: Dispatches native events to avoid React state re-render loops
export function ViewportGizmoScene() {
  useFrame(({ camera }) => {
    // Dispatch camera quaternion to window target instantly without triggering React lifecycle
    const event = new CustomEvent('gizmo-camera-update', { detail: camera.quaternion });
    window.dispatchEvent(event);
  });
  return null;
}

// 2. OVERLAY COMPONENT: Draws crisp vector axes dynamically via 2D Canvas context
export function ViewportGizmoOverlay({ onViewChange, onContextMenuRequest }: ViewportGizmoOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const isMovingRef = useRef(false);
  const longPressTriggeredRef = useRef(false);

  // Keep track of projected coordinates for precise clicking/raycasting
  const axisPositionsRef = useRef({
    X: { x: 0, y: 0 },
    Y: { x: 0, y: 0 },
    Z: { x: 0, y: 0 },
    center: { x: 48, y: 48 }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 96 * dpr;
    canvas.height = 96 * dpr;
    ctx.scale(dpr, dpr);

    // Reusable structures to prevent garbage collection allocations on every frame
    const matrix = new THREE.Matrix4();
    const vX = new THREE.Vector3();
    const vY = new THREE.Vector3();
    const vZ = new THREE.Vector3();

    const handleCameraUpdate = (e: Event) => {
      const quaternion = (e as CustomEvent<THREE.Quaternion>).detail;
      
      const width = 96;
      const height = 96;
      const cx = width / 2;
      const cy = height / 2;
      const radius = 28; // slightly scaled down to keep tips perfectly bounded

      // Extract the direction directly from the rotation transformation matrix 
      matrix.makeRotationFromQuaternion(quaternion).invert();
      
      // Calculate real screen-space directions
      vX.set(1, 0, 0).applyMatrix4(matrix);
      vY.set(0, 1, 0).applyMatrix4(matrix);
      vZ.set(0, 0, 1).applyMatrix4(matrix);

      // Map vectors perfectly to 2D screen coordinate space (Canvas Y runs downwards)
      axisPositionsRef.current.X = { x: cx + vX.x * radius, y: cy - vX.y * radius };
      axisPositionsRef.current.Y = { x: cx + vY.x * radius, y: cy - vY.y * radius };
      axisPositionsRef.current.Z = { x: cx + vZ.x * radius, y: cy - vZ.y * radius };

      // Clear the canvas layout
      ctx.clearRect(0, 0, width, height);

      // Sort axes based on Z depth value so elements further in the screen render underneath
      const axes = [
        { label: 'X', pos: axisPositionsRef.current.X, color: '#ef4444', depth: vX.z },
        { label: 'Y', pos: axisPositionsRef.current.Y, color: '#22c55e', depth: vY.z },
        { label: 'Z', pos: axisPositionsRef.current.Z, color: '#3b82f6', depth: vZ.z }
      ].sort((a, b) => a.depth - b.depth);

      // Draw passive container boundary
      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();

      // Draw the lines from back-to-front
      axes.forEach((axis) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(axis.pos.x, axis.pos.y);
        ctx.strokeStyle = axis.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Interactive node caps
        ctx.beginPath();
        ctx.arc(axis.pos.x, axis.pos.y, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = axis.color;
        ctx.fill();

        // Vector labels
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(axis.label, axis.pos.x, axis.pos.y + 0.5);
      });

      // Bounding origin target
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#64748b';
      ctx.fill();
    };

    window.addEventListener('gizmo-camera-update', handleCameraUpdate);
    return () => window.removeEventListener('gizmo-camera-update', handleCameraUpdate);
  }, []);

  /* --- GESTURE DETECTORS --- */

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const resetGestureState = () => {
    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    pointerStartRef.current = null;
    isMovingRef.current = false;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    isMovingRef.current = false;
    longPressTriggeredRef.current = false;

    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(10);
      }
      onContextMenuRequest(event.clientX, event.clientY);
      clearLongPressTimer();
    }, 500);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    const deltaX = event.clientX - pointerStartRef.current.x;
    const deltaY = event.clientY - pointerStartRef.current.y;
    
    if (Math.hypot(deltaX, deltaY) > 6) {
      isMovingRef.current = true;
      clearLongPressTimer();
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    clearLongPressTimer();

    if (longPressTriggeredRef.current) {
      resetGestureState();
      return;
    }

    if (!isMovingRef.current) {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      const p = axisPositionsRef.current;
      const hitRadius = 12;

      // Check proximity targets for coordinate snapping
      if (Math.hypot(clickX - p.X.x, clickY - p.X.y) < hitRadius) {
        onViewChange('right');
      } else if (Math.hypot(clickX - p.Y.x, clickY - p.Y.y) < hitRadius) {
        onViewChange('top');
      } else if (Math.hypot(clickX - p.Z.x, clickY - p.Z.y) < hitRadius) {
        onViewChange('front');
      } else {
        onViewChange('default');
      }
    }
    pointerStartRef.current = null;
    isMovingRef.current = false;
  };

  return (
    <div
      className="pointer-events-auto absolute bottom-2 right-2 z-10 h-16 w-16 rounded-full border border-border/40 bg-background/40 shadow-md backdrop-blur-md transition-all hover:bg-background/60 cursor-pointer flex items-center justify-center select-none sm:h-20 sm:w-20 md:h-24 md:w-24"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={resetGestureState}
      onPointerLeave={resetGestureState}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenuRequest(e.clientX, e.clientY);
        clearLongPressTimer();
      }}
    >
      <canvas ref={canvasRef} className="h-full w-full pointer-events-none" style={{ width: '96px', height: '96px' }} />
    </div>
  );
}