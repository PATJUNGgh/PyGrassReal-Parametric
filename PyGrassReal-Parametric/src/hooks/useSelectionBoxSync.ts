
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';

interface UseSelectionBoxSyncProps {
  targetRef: React.RefObject<THREE.Object3D | null>;
  meshRef: React.RefObject<THREE.Group | null>;
  handlesRef: React.RefObject<THREE.Group | null>;
  isDashed: boolean;
  isVisible: boolean;
  showHandles: boolean;
}

export function useSelectionBoxSync({
  targetRef,
  meshRef,
  handlesRef,
  isDashed,
  isVisible,
  showHandles,
}: UseSelectionBoxSyncProps) {
  const frameState = useMemo(
    () => ({
      box: new THREE.Box3(),
      tempBox: new THREE.Box3(),
      inverseMatrix: new THREE.Matrix4(),
      worldCorners: Array.from({ length: 8 }, () => new THREE.Vector3()),
      inverseScale: new THREE.Vector3(),
    }),
    []
  );

  useFrame(() => {
    if (!targetRef.current || !meshRef.current || !handlesRef.current) return;

    const target = targetRef.current;
    const effectiveScale = target.scale.clone();

    if (isDashed) {
      if (target.children.length > 0 && target.children.some((c) => c.visible)) {
        const { box, tempBox, inverseMatrix, worldCorners } = frameState;

        box.makeEmpty();
        inverseMatrix.copy(target.matrixWorld).invert();

        target.children.forEach((child: THREE.Object3D) => {
          if (!child.visible) return;

          tempBox.setFromObject(child);

          if (!tempBox.isEmpty()) {
            worldCorners[0].set(tempBox.min.x, tempBox.min.y, tempBox.min.z);
            worldCorners[1].set(tempBox.min.x, tempBox.min.y, tempBox.max.z);
            worldCorners[2].set(tempBox.min.x, tempBox.max.y, tempBox.min.z);
            worldCorners[3].set(tempBox.min.x, tempBox.max.y, tempBox.max.z);
            worldCorners[4].set(tempBox.max.x, tempBox.min.y, tempBox.min.z);
            worldCorners[5].set(tempBox.max.x, tempBox.min.y, tempBox.max.z);
            worldCorners[6].set(tempBox.max.x, tempBox.max.y, tempBox.min.z);
            worldCorners[7].set(tempBox.max.x, tempBox.max.y, tempBox.max.z);

            worldCorners.forEach((c) => box.expandByPoint(c.applyMatrix4(inverseMatrix)));
          }
        });

        if (!box.isEmpty()) {
          box.getSize(effectiveScale);
        } else {
          effectiveScale.set(0, 0, 0);
        }
      } else {
        effectiveScale.set(0, 0, 0);
      }
    }

    meshRef.current.position.copy(target.position);
    meshRef.current.rotation.copy(target.rotation);
    meshRef.current.scale.copy(effectiveScale);
    meshRef.current.visible = isVisible;

    handlesRef.current.position.copy(target.position);
    handlesRef.current.rotation.copy(target.rotation);
    handlesRef.current.scale.copy(effectiveScale);
    handlesRef.current.visible = isVisible && showHandles && effectiveScale.lengthSq() > 0.001;

    const { inverseScale } = frameState;
    inverseScale.set(
      effectiveScale.x !== 0 ? 1 / effectiveScale.x : 1,
      effectiveScale.y !== 0 ? 1 / effectiveScale.y : 1,
      effectiveScale.z !== 0 ? 1 / effectiveScale.z : 1
    );

    handlesRef.current.children.forEach((child: THREE.Object3D) => {
      child.scale.copy(inverseScale);
    });
  });
}
