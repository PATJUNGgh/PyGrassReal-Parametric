import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { getAxisHandleTexture } from './constants';
import type { ThreeEvent } from '@react-three/fiber/dist/declarations/src/core/events';

export function CornerHandle({
  position,
  onPointerDown,
  onInteract = () => { },
  onHover = () => { },
  visible = true,
  handleTextures,
  isGumballDragging = false,
}: {
  name: string;
  position: [number, number, number];
  onPointerDown: (e: ThreeEvent<PointerEvent>, axis: 'x' | 'y' | 'z') => void;
  onInteract?: (active: boolean) => void;
  onHover?: (hovering: boolean) => void;
  visible?: boolean;
  handleTextures?: Partial<Record<'x' | 'y' | 'z', THREE.Texture>>;
  userData?: any;
  isGumballDragging?: boolean;
}) {
  const [activePlane, setActivePlane] = useState<'x' | 'y' | 'z' | null>(null);
  const [hoveredPlane, setHoveredPlane] = useState<'x' | 'y' | 'z' | null>(null);

  const xPlaneRef = useRef<THREE.Mesh>(null!);
  const yPlaneRef = useRef<THREE.Mesh>(null!);
  const zPlaneRef = useRef<THREE.Mesh>(null!);
  const { raycaster, camera, pointer, gl } = useThree();
  const activePointerIdRef = useRef<number | null>(null);

  const xTexture = handleTextures?.x ?? getAxisHandleTexture('x');
  const yTexture = handleTextures?.y ?? getAxisHandleTexture('y');
  const zTexture = handleTextures?.z ?? getAxisHandleTexture('z');

  const isXActive = activePlane === 'x' || (!activePlane && hoveredPlane === 'x');
  const isYActive = activePlane === 'y' || (!activePlane && hoveredPlane === 'y');
  const isZActive = activePlane === 'z' || (!activePlane && hoveredPlane === 'z');

  useEffect(() => {
    if (isGumballDragging && hoveredPlane) {
      setHoveredPlane(null);
      onHover(false);
    }
  }, [isGumballDragging, hoveredPlane, onHover]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>, plane: 'x' | 'y' | 'z') => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
    try {
      gl.domElement.setPointerCapture(e.pointerId);
      activePointerIdRef.current = e.pointerId;
    } catch (err) {
      // ignore
    }
    setActivePlane(plane);
    onInteract(true);
    onPointerDown(e, plane);
  };

  const handlePointerUp = () => {
    setActivePlane(null);
    onInteract(false);
    if (activePointerIdRef.current !== null) {
      try {
        if (gl.domElement.hasPointerCapture(activePointerIdRef.current)) {
          gl.domElement.releasePointerCapture(activePointerIdRef.current);
        }
      } catch (err) {
        // ignore
      }
      activePointerIdRef.current = null;
    }
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (activePlane) {
        setActivePlane(null);
        onInteract(false);
        onHover(false);
        if (activePointerIdRef.current !== null) {
          try {
            if (gl.domElement.hasPointerCapture(activePointerIdRef.current)) {
              gl.domElement.releasePointerCapture(activePointerIdRef.current);
            }
          } catch (err) {
            // ignore
          }
          activePointerIdRef.current = null;
        }
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [activePlane, onInteract, onHover, gl]);

  const xSign = position[0] > 0 ? 1 : -1;
  const ySign = position[1] > 0 ? 1 : -1;
  const zSign = position[2] > 0 ? 1 : -1;

  const size = 0.15;
  const offset = size / 2;
  const gap = size * 0.2;

  const handlePointerEnter = (e: ThreeEvent<PointerEvent>, plane: 'x' | 'y' | 'z') => {
    e.stopPropagation();
    setHoveredPlane(plane);
    onHover(true);
  };

  return (
    <group position={position} onPointerUp={handlePointerUp} visible={visible}>
      {/* Red Plane (YZ) - Rotates around X */}
      <mesh
        ref={xPlaneRef}
        rotation={[0, Math.PI / 2, 0]}
        position={[0 + xSign * gap, ySign * offset + ySign * gap, zSign * offset + zSign * gap]}
        onPointerDown={(e) => handlePointerDown(e, 'x')}
        onPointerEnter={(e) => handlePointerEnter(e, 'x')}
        onPointerLeave={() => {
          setHoveredPlane(null);
          if (!activePlane) onHover(false);
        }}
        raycast={undefined}
      >
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          map={xTexture}
          color={isXActive ? 'orange' : '#ffffff'}
          side={THREE.DoubleSide}
          transparent
          alphaTest={0.1}
        />
      </mesh>

      {/* Green Plane (XZ) - Rotates around Y */}
      <mesh
        ref={yPlaneRef}
        rotation={[Math.PI / 2, 0, 0]}
        position={[xSign * offset + xSign * gap, 0 + ySign * gap, zSign * offset + zSign * gap]}
        onPointerDown={(e) => handlePointerDown(e, 'y')}
        onPointerEnter={(e) => handlePointerEnter(e, 'y')}
        onPointerLeave={() => {
          setHoveredPlane(null);
          if (!activePlane) onHover(false);
        }}
        raycast={undefined}
      >
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          map={yTexture}
          color={isYActive ? 'orange' : '#ffffff'}
          side={THREE.DoubleSide}
          transparent
          alphaTest={0.1}
        />
      </mesh>

      {/* Blue Plane (XY) - Rotates around Z */}
      <mesh
        ref={zPlaneRef}
        rotation={[0, 0, 0]}
        position={[xSign * offset + xSign * gap, ySign * offset + ySign * gap, 0 + zSign * gap]}
        onPointerDown={(e) => handlePointerDown(e, 'z')}
        onPointerEnter={(e) => handlePointerEnter(e, 'z')}
        onPointerLeave={() => {
          setHoveredPlane(null);
          if (!activePlane) onHover(false);
        }}
        raycast={undefined}
      >
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          map={zTexture}
          color={isZActive ? 'orange' : '#ffffff'}
          side={THREE.DoubleSide}
          transparent
          alphaTest={0.1}
        />
      </mesh>
    </group>
  );
}
