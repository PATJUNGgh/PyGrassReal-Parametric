import { useState, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber/dist/declarations/src/core/events';

export interface UseTransformHandleProps {
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onHover?: (hovering: boolean) => void;
  onInteract?: (interacting: boolean) => void;
  isGumballDragging?: boolean;
}

export function useTransformHandle({
  onPointerDown,
  onHover = () => { },
  onInteract = () => { },
  isGumballDragging = false,
}: UseTransformHandleProps) {
  const [hovered, setHovered] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null!);
  const { gl } = useThree();
  const activePointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (interacting) {
        setInteracting(false);
        onInteract(false);
        if (activePointerIdRef.current !== null) {
          try {
            if (gl.domElement.hasPointerCapture(activePointerIdRef.current)) {
              gl.domElement.releasePointerCapture(activePointerIdRef.current);
            }
          } catch (err) { /* ignore */ }
          activePointerIdRef.current = null;
        }
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [interacting, onInteract, gl.domElement]);


  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();

    try {
      gl.domElement.setPointerCapture(e.pointerId);
      activePointerIdRef.current = e.pointerId;
    } catch (err) { /* ignore */ }

    setInteracting(true);
    onInteract(true);
    if (onPointerDown) {
      onPointerDown(e);
    }
  };

  const handlePointerEnter = (e: ThreeEvent<PointerEvent>) => {
    if (interacting) return;
    e.stopPropagation();
    setHovered(true);
    onHover(true);
  };

  const handlePointerLeave = () => {
    if (interacting) return;
    setHovered(false);
    onHover(false);
  };

  return {
    hovered,
    interacting,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerEnter: handlePointerEnter,
      onPointerLeave: handlePointerLeave,
    },
    ref: meshRef,
  };
}
