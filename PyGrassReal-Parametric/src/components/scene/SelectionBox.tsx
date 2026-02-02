import { useFrame } from '@react-three/fiber';
import { useRef, useCallback, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RotationRingFeedback } from '../RotationRingFeedback';
import { useRotationHandler } from '../../hooks/useRotationHandler';
import { useScalingHandler } from '../../hooks/useScalingHandler';
import { CornerHandle } from './transform-handles/CornerHandle';
import { CornerScaleHandle } from './transform-handles/CornerScaleHandle';
import { FaceScaleHandle } from './transform-handles/FaceScaleHandle';
import { WireframeBox } from './transform-handles/WireframeBox';
import { corners, faceHandles } from './transform-handles/constants';

export interface SelectionBoxProps {
  targetRef: React.RefObject<THREE.Object3D | null>;
  onHandleInteract?: (active: boolean) => void;
  onHandleHover?: (hovering: boolean) => void;
  handlesHoveredRef?: React.MutableRefObject<boolean>;
  onScalingChange?: (active: boolean) => void;
  rotationSnapEnabled?: boolean;
  handleTextures?: Partial<Record<'x' | 'y' | 'z', THREE.Texture>>;
  isDashed?: boolean;
  isVisible?: boolean;
  showHandles?: boolean;
  isGumballDragging?: boolean;
  setDraggingAxis: (axis: 'x' | 'y' | 'z' | null) => void;
  draggingAxis: 'x' | 'y' | 'z' | null;
  firstSelectedAppId?: string | null;
}

export function SelectionBox({
  targetRef,
  onHandleInteract = () => { },
  onHandleHover = () => { },
  handlesHoveredRef,
  onScalingChange = () => { },
  rotationSnapEnabled = false,
  handleTextures,
  isDashed = false,
  isVisible = true,
  showHandles = true,
  isGumballDragging = false,
  setDraggingAxis,
  draggingAxis,
}: SelectionBoxProps) {
  const meshRef = useRef<THREE.Group>(null);
  const handlesRef = useRef<THREE.Group>(null);

  const safeOnHover = useCallback((hovering: boolean) => {
    if (handlesHoveredRef) {
      handlesHoveredRef.current = hovering;
    }
    onHandleHover(hovering);
  }, [onHandleHover, handlesHoveredRef]);

  const { isRotating, handleRotationPointerDown, rotationSectorState } = useRotationHandler(
    targetRef,
    onHandleInteract,
    setDraggingAxis,
    rotationSnapEnabled
  );

  const { isScaling, activeScaleHandleId, handleCornerScalePointerDown, handleAxialScalePointerDown } =
    useScalingHandler(targetRef, onHandleInteract);

  const safeOnInteract = useCallback(
    (active: boolean) => {
      if ((isRotating || isScaling) && !active) {
        return;
      }
      onHandleInteract(active);
    },
    [isRotating, isScaling, onHandleInteract]
  );

  useEffect(() => {
    onHandleInteract(isRotating || isScaling);
  }, [isRotating, isScaling, onHandleInteract]);

  useEffect(() => {
    if (isScaling) {
      onHandleHover(true);
    } else if (!isRotating) {
      onHandleHover(false);
    }
  }, [isScaling, isRotating, onHandleHover]);

  useEffect(() => {
    onScalingChange(isScaling);
  }, [isScaling, onScalingChange]);

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

  return (
    <>
      <group ref={meshRef}>
        <WireframeBox isDashed={isDashed} />
        {draggingAxis && (
          <RotationRingFeedback
            axis={draggingAxis}
            startAngle={rotationSectorState.startAngle}
            angle={rotationSectorState.angle}
            invertAngle={rotationSectorState.isFlipped}
            visible={!!draggingAxis}
            showLabels={false}
          />
        )}
      </group>

      <group ref={handlesRef}>
        {corners.map((pos, i) => (
          <CornerScaleHandle
            key={`corner-scale-${i}`}
            name={`corner-scale-${i}`}
            position={pos as [number, number, number]}
            onPointerDown={(e) => handleCornerScalePointerDown(e, i)}
            onInteract={safeOnInteract}
            onHover={safeOnHover}
            visible={!isRotating && (!isScaling || activeScaleHandleId === i)}
            isActive={activeScaleHandleId === i}
            isGumballDragging={isGumballDragging}
          />
        ))}

        {!isDashed &&
          faceHandles.map((handle, i) => (
            <FaceScaleHandle
              key={`face-${i}`}
              name={`face-${i}`}
              position={handle.pos as [number, number, number]}
              axis={handle.axis as 'x' | 'y' | 'z'}
              onPointerDown={(e, axis) => handleAxialScalePointerDown(e, axis, 8 + i)}
              onInteract={safeOnInteract}
              onHover={safeOnHover}
              visible={!isRotating && (!isScaling || activeScaleHandleId === 8 + i)}
              isActive={activeScaleHandleId === 8 + i}
              isGumballDragging={isGumballDragging}
            />
          ))}

        {corners.map((pos, i) => (
          <CornerHandle
            key={`corner-rotate-${i}`}
            name={`corner-rotate-${i}`}
            position={pos as [number, number, number]}
            onPointerDown={handleRotationPointerDown}
            onInteract={safeOnInteract}
            onHover={safeOnHover}
            visible={!draggingAxis && !isScaling}
            handleTextures={handleTextures}
            isGumballDragging={isGumballDragging}
          />
        ))}
      </group>
    </>
  );
}
