// src/hooks/useGlobalInteractionListeners.ts
import { useEffect } from 'react';

interface UseGlobalInteractionListenersProps {
  gumballHovered: React.MutableRefObject<boolean>;
  handlesHovered: React.MutableRefObject<boolean>;
  isHandleDragging: boolean;
  dragJustFinished: React.MutableRefObject<boolean>;
  isGumballActiveRef: React.MutableRefObject<boolean>;
}

export function useGlobalInteractionListeners({
  gumballHovered,
  handlesHovered,
  isHandleDragging,
  dragJustFinished,
  isGumballActiveRef,
}: UseGlobalInteractionListenersProps) {
  useEffect(() => {
    const handleGlobalPointerDown = () => {
      // If pointer down on Gumball, mark as active
      if (gumballHovered.current) {
        isGumballActiveRef.current = true;
      }
    };

    const handleGlobalPointerUp = () => {
      // If we were dragging Gumball or Handle, set cooldown
      if (isGumballActiveRef.current || isHandleDragging) {
        dragJustFinished.current = true;
        setTimeout(() => {
          dragJustFinished.current = false;
        }, 200);
      }
      // Reset Gumball active state
      isGumballActiveRef.current = false;
    };

    window.addEventListener('pointerdown', handleGlobalPointerDown, true); // Capture phase
    window.addEventListener('pointerup', handleGlobalPointerUp, true); // Capture phase

    return () => {
      window.removeEventListener('pointerdown', handleGlobalPointerDown, true);
      window.removeEventListener('pointerup', handleGlobalPointerUp, true);
    };
  }, [gumballHovered, handlesHovered, isHandleDragging, dragJustFinished, isGumballActiveRef]); // All refs and state need to be in dependencies
}
