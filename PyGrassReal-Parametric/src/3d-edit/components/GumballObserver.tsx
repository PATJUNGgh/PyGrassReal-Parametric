// src/components/GumballObserver.tsx
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

interface GumballObserverProps {
  controlsRef: React.RefObject<{ dragging?: boolean } | null>;
  onDraggingChange: (isDragging: boolean) => void;
  isGumballEngagedRef?: React.MutableRefObject<boolean>;
}

// Helper component to observe Gumball dragging state
export const GumballObserver = ({ controlsRef, onDraggingChange, isGumballEngagedRef }: GumballObserverProps) => {
  const wasDragging = useRef(false);

  useEffect(() => {
    const handlePointerRelease = () => {
      if (isGumballEngagedRef) {
        isGumballEngagedRef.current = false;
      }
      if (!wasDragging.current) return;
      wasDragging.current = false;
      onDraggingChange(false);
    };

    window.addEventListener('pointerup', handlePointerRelease);
    window.addEventListener('pointercancel', handlePointerRelease);
    return () => {
      window.removeEventListener('pointerup', handlePointerRelease);
      window.removeEventListener('pointercancel', handlePointerRelease);
    };
  }, [onDraggingChange]);

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
