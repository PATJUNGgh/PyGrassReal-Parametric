// src/hooks/useSelectionGroup.ts
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { SceneObject } from '../types/scene';

interface UseSelectionGroupProps {
  selectedIds: Set<string>;
  sceneObjects: SceneObject[];
  firstSelectedAppId?: string | null;
  selectionGroupRef?: React.RefObject<THREE.Group>;
}

export function useSelectionGroup({ selectedIds, sceneObjects, firstSelectedAppId, selectionGroupRef }: UseSelectionGroupProps) {
  const internalGroupRef = useRef<THREE.Group>(null);
  const groupRef = selectionGroupRef ?? internalGroupRef;

  // Manage SelectionGroup: Attach/Detach objects based on selectedIds
  useEffect(() => {
    if (!groupRef.current) return;

    const group = groupRef.current;

    // Clear group first - RE-ATTACH to scene (parent)
    if (group.parent) {
      const childrenToMove = [...group.children];
      for (const child of childrenToMove) {
        group.parent.attach(child);
      }
    } else {
      // Fallback if group is not attached, just clear it.
      group.clear();
    }


    // Only use group for MULTIPLE selection
    if (selectedIds.size <= 1) {
      // Single or no selection - don't use group
      group.position.set(0, 0, 0);
      group.rotation.set(0, 0, 0);
      group.scale.set(1, 1, 1);
      return;
    }

    // Multiple selection - attach to group
    const selectedObjects = sceneObjects.filter(obj => selectedIds.has(obj.id));
    if (selectedObjects.length === 0) return;

    // Position group at the center of selected objects (world space).
    const center = new THREE.Vector3();
    selectedObjects.forEach(obj => {
      if (obj.ref.current) {
        obj.ref.current.updateMatrixWorld(true);
        const worldPos = new THREE.Vector3();
        obj.ref.current.getWorldPosition(worldPos);
        center.add(worldPos);
      }
    });
    center.divideScalar(selectedObjects.length);
    group.position.copy(center);

    group.rotation.set(0, 0, 0);
    group.scale.set(1, 1, 1);
    group.updateMatrixWorld(true); // Update group's matrix before attaching

    // Attach objects to group
    selectedObjects.forEach(obj => {
      if (obj.ref.current) {
        group.attach(obj.ref.current);
      }
    });

  }, [selectedIds, sceneObjects, groupRef]);

  return groupRef;
}
