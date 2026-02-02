import React, { createContext, useState, useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { TransformControls } from '@react-three/drei';

// Define the shape of the context's state
export interface SceneInteractionState {
  // Refs to important 3D objects
  transformControlsRef: React.RefObject<TransformControls>;
  selectionGroupRef: React.RefObject<THREE.Group>;
  ghostRef: React.RefObject<THREE.Group>;
  targetRef: React.RefObject<THREE.Object3D | null>;

  // Selection state
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  firstSelectedAppId: string | null;

  // Interaction states
  isGumballDragging: boolean;
  setIsGumballDragging: (isDragging: boolean) => void;
  isHandleDragging: boolean;
  setIsHandleDragging: (isDragging: boolean) => void;
  isHandleHovered: boolean;
  setIsHandleHovered: (isHovered: boolean) => void;
  draggingAxis: 'x' | 'y' | 'z' | null;
  setDraggingAxis: (axis: 'x' | 'y' | 'z' | null) => void;
  isScalingHandle: boolean;
  setIsScalingHandle: (active: boolean) => void;

  // Interaction state REFS (for non-reactive updates)
  dragJustFinishedRef: React.MutableRefObject<boolean>;
  gumballHoveredRef: React.MutableRefObject<boolean>;
  handlesHoveredRef: React.MutableRefObject<boolean>;

  // Tool settings
  rotationSnapEnabled: boolean;
  setRotationSnapEnabled: (snap: boolean) => void;

  // Source tracking
  selectionSource: 'node' | 'model' | null;
  setSelectionSource: (source: 'node' | 'model' | null) => void;

  // Selection Box State
  processingRect: { x: number; y: number; width: number; height: number } | null;
  setProcessingRect: (rect: { x: number; y: number; width: number; height: number } | null) => void;
}

// Create the context
export const SceneInteractionContext = createContext<SceneInteractionState | null>(null);

// Create the provider component
export const SceneInteractionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Refs
  const transformControlsRef = useRef<TransformControls>(null!);
  const selectionGroupRef = useRef<THREE.Group>(null!);
  const ghostRef = useRef<THREE.Group>(null!);
  const targetRef = useRef<THREE.Object3D | null>(null);
  const dragJustFinishedRef = useRef<boolean>(false);
  const gumballHoveredRef = useRef<boolean>(false);
  const handlesHoveredRef = useRef<boolean>(false);

  // Selection State
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [firstSelectedAppId, setFirstSelectedAppId] = useState<string | null>(null);

  // Update firstSelectedAppId whenever selectedIds changes
  useEffect(() => {
    setFirstSelectedAppId(selectedIds.size > 0 ? selectedIds.values().next().value : null);
  }, [selectedIds]);

  // Interaction State
  const [isGumballDragging, setIsGumballDragging] = useState(false);
  const [isHandleDragging, setIsHandleDragging] = useState(false);
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const [draggingAxis, setDraggingAxis] = useState<'x' | 'y' | 'z' | null>(null);
  const [isScalingHandle, setIsScalingHandle] = useState(false);
  const [selectionSource, setSelectionSource] = useState<'node' | 'model' | null>('model');
  const [processingRect, setProcessingRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Tool Settings
  const [rotationSnapEnabled, setRotationSnapEnabled] = useState(false);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    transformControlsRef,
    selectionGroupRef,
    ghostRef,
    targetRef,
    selectedIds,
    setSelectedIds,
    firstSelectedAppId,
    isGumballDragging,
    setIsGumballDragging,
    isHandleDragging,
    setIsHandleDragging,
    isHandleHovered,
    setIsHandleHovered,
    dragJustFinishedRef,
    gumballHoveredRef,
    handlesHoveredRef,
    draggingAxis,
    setDraggingAxis,
    isScalingHandle,
    setIsScalingHandle,
    rotationSnapEnabled,
    setRotationSnapEnabled,
    selectionSource,
    setSelectionSource,
    processingRect,
    setProcessingRect,
  }), [
    selectedIds,
    firstSelectedAppId,
    isGumballDragging,
    isHandleDragging,
    isHandleHovered,
    draggingAxis,
    isScalingHandle,
    rotationSnapEnabled,
    selectionSource,
    setSelectionSource,
    processingRect,
    setProcessingRect,
  ]);

return (
  <SceneInteractionContext.Provider value={value}>
    {children}
  </SceneInteractionContext.Provider>
);
};
