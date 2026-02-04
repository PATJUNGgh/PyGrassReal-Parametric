import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { RotationRingFeedback } from '../RotationRingFeedback';
import { useRotationHandler } from '../../hooks/useRotationHandler';
import { useScalingHandler } from '../../hooks/useScalingHandler';
import { useSelectionBoxSync } from '../../hooks/useSelectionBoxSync';
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
  onHandleInteract = () => {},
  onHandleHover = () => {},
  handlesHoveredRef,
  onScalingChange = () => {},
  rotationSnapEnabled = false,
  handleTextures,
  isDashed = false,
  isVisible = true,
  showHandles = true,
  isGumballDragging = false,
  setDraggingAxis,
  draggingAxis,
  firstSelectedAppId,
}: SelectionBoxProps) {
  const meshRef = useRef<THREE.Group>(null);
  const handlesRef = useRef<THREE.Group>(null);

  useSelectionBoxSync({
    targetRef,
    meshRef,
    handlesRef,
    isDashed,
    isVisible,
    showHandles,
  });

  const safeOnHover = useCallback(
    (hovering: boolean) => {
      if (handlesHoveredRef) {
        handlesHoveredRef.current = hovering;
      }
      onHandleHover(hovering);
    },
    [onHandleHover, handlesHoveredRef]
  );

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
