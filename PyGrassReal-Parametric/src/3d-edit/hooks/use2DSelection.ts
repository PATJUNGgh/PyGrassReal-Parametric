// src/hooks/use2DSelection.ts
import { useState, useCallback } from 'react';

interface Use2DSelectionProps {
  setSelectedIds: (ids: Set<string>) => void;
  isGumballDragging: React.MutableRefObject<boolean>; // Changed to Ref for realtime check
  handlesHovered: React.MutableRefObject<boolean>;
  gumballHovered: React.MutableRefObject<boolean>;
  isHandleDragging: React.MutableRefObject<boolean>; // Add this line
  interactionMode: '3d' | 'node' | 'wire';
  setProcessingRect: (rect: { x: number; y: number; width: number; height: number; } | null) => void;
}

export function use2DSelection({
  setSelectedIds,
  isGumballDragging, // This is now a REF
  handlesHovered,
  gumballHovered,
  isHandleDragging, // Destructure new prop
  interactionMode,
  setProcessingRect,
}: Use2DSelectionProps) {
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only Left Click in 3D mode
    if (e.button !== 0 || interactionMode !== '3d') return;

    // Ignore if clicking on UI elements (Toolbar, Buttons, Labels, etc.)
    const target = e.target as HTMLElement;
    const isUIElement =
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'LABEL' ||
      target.closest('button') !== null ||
      target.closest('label') !== null ||
      target.draggable === true ||
      target.closest('[draggable="true"]') !== null ||
      target.closest('[data-no-selection="true"]') !== null; // Explicitly marked NO SELECTION elements (Nodes, Toolbar)

    if (isUIElement) return;

    // Don't start 2D selection if clicking on Gumball or Handles (TransformControls)
    // Check REFS for immediate feedback
    if (isGumballDragging.current || gumballHovered.current || handlesHovered.current || isHandleDragging.current) {
      return;
    }

    e.preventDefault(); // Prevent default browser actions (like text selection)
    setProcessingRect(null);
    setSelectionRect(null);

    // Start Drag Logic
    const startX = e.clientX;
    const startY = e.clientY;
    let isDrag = false;
    let currentRect: { x: number; y: number; width: number; height: number; } | null = null;

    const onMove = (mv: PointerEvent) => {
      // Only track left-button drag
      if ((mv.buttons & 1) !== 1) {
        isDrag = false;
        setSelectionRect(null);
        return;
      }
      // SAFETY CHECK: Abort if dragging starts mid-move (Gumball takes over)
      if (isGumballDragging.current || gumballHovered.current || handlesHovered.current || isHandleDragging.current) {
        isDrag = false;
        setSelectionRect(null); // Clear any partial rect
        return;
      }

      const dist = Math.sqrt(Math.pow(mv.clientX - startX, 2) + Math.pow(mv.clientY - startY, 2));
      // Threshold 10px to distinguish click from drag
      if (!isDrag && dist > 10) {
        isDrag = true;
        // Clear existing selection on drag start (unless holding Shift)
        if (!mv.shiftKey) {
          setSelectedIds(new Set());
        }
        setProcessingRect(null);
      }

      if (isDrag) {
        currentRect = {
          x: Math.min(startX, mv.clientX),
          y: Math.min(startY, mv.clientY),
          width: Math.abs(mv.clientX - startX),
          height: Math.abs(mv.clientY - startY)
        };
        setSelectionRect(currentRect);
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove, { passive: false });
      window.removeEventListener('pointerup', onUp, { passive: false });

      if (isGumballDragging.current || isHandleDragging.current) {
        return;
      }

      if (isDrag && currentRect) {
        // Trigger selection calculation ONLY on mouse up
        setProcessingRect(currentRect);
      } else {
        setProcessingRect(null);
      }
      // Clear visual rect on drag end
      setSelectionRect(null);
    };

    const onClick = () => {
      if (!isDrag) {
        setProcessingRect(null);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp, { passive: false });
    window.addEventListener('click', onClick, { passive: true, once: true });
  }, [setSelectedIds, isGumballDragging, handlesHovered, gumballHovered, isHandleDragging, interactionMode, setProcessingRect]);


  return {
    selectionRect,
    handleCanvasPointerDown,
  };
}
