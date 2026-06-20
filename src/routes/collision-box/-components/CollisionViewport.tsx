import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import type { CollisionBox } from '../types';

interface ViewportProps {
  boxes: CollisionBox[];
  selectedBoxId: string | null;
  onSelectBox: (id: string) => void;
}

export function CollisionViewport({ boxes, selectedBoxId, onSelectBox }: ViewportProps) {
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

  return (
    <div className="w-full h-[520px] sm:h-[560px] lg:h-[640px] xl:h-[720px] bg-muted rounded-lg overflow-hidden border border-border relative">
      <Canvas camera={{ position: [2.2, 2.2, 3.2], fov: 45 }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[10, 15, 10]} intensity={0.4} />

        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />

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

          const width = (box.maxX - box.minX) / 16;
          const height = (box.maxY - box.minY) / 16;
          const depth = (box.maxZ - box.minZ) / 16;

          const posX = (box.minX + box.maxX) / 32 - 0.5;
          const posY = (box.minY + box.maxY) / 32 - 0.5;
          const posZ = (box.minZ + box.maxZ) / 32 - 0.5;

          return (
            <group 
              key={box.id} 
              position={[posX, posY, posZ]}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelectBox(box.id);
              }}
            >
              <mesh>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial 
                  color={isSelected ? "#f59e0b" : "#71717a"} 
                  transparent 
                  opacity={isSelected ? 0.4 : 0.25} 
                  roughness={0.5}
                />
              </mesh>
              <mesh>
                <boxGeometry args={[width, height, depth]} />
                <meshBasicMaterial color={isSelected ? "#fbbf24" : "#a1a1aa"} wireframe />
              </mesh>
            </group>
          );
        })}
      </Canvas>

      <div className="absolute top-2.5 left-2.5 flex gap-1.5 pointer-events-none select-none">
        <span className="bg-background text-red-500 text-[10px] font-mono px-1.5 py-0.5 rounded border border-border">North (-Z)</span>
        <span className="bg-background text-blue-500 text-[10px] font-mono px-1.5 py-0.5 rounded border border-border">West (-X)</span>
      </div>
    </div>
  );
}