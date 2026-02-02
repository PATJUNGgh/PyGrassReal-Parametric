// src/components/GumballObserver.tsx
import { useRef } from 'react';
import type { TransformControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

interface GumballObserverProps {
  controlsRef: React.RefObject<TransformControls | null>;
  onDraggingChange: (isDragging: boolean) => void;
}

// Helper component to observe Gumball dragging state
export const GumballObserver = ({ controlsRef, onDraggingChange }: GumballObserverProps) => {
  const wasDragging = useRef(false);

  useFrame(() => {
    const isDragging = controlsRef.current?.dragging ?? false;

    // If state changed
    if (wasDragging.current !== isDragging) {
      onDraggingChange(isDragging);
    }
    wasDragging.current = isDragging;
  });

  return null;
};
