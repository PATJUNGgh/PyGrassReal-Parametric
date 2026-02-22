import { useRef, useCallback, useEffect, useMemo, useContext } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneInteractionContext } from '../../context/SceneInteractionContext';
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
  isDashed?: boolean;
  isVisible?: boolean;
  showHandles?: boolean;
  isGumballDragging?: boolean;
  label?: string | null;
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
  isDashed = false,
  isVisible = true,
  showHandles = true,
  isGumballDragging = false,
  label = null,
  setDraggingAxis,
  draggingAxis,
  firstSelectedAppId,
}: SelectionBoxProps) {
  const context = useContext(SceneInteractionContext);

  const meshRef = useRef<THREE.Group>(null);
  const handlesRef = useRef<THREE.Group>(null);
  const labelRef = useRef<THREE.Group>(null);
  const labelState = useMemo(() => ({
    up: new THREE.Vector3(0, 1, 0),
    offset: new THREE.Vector3(),
  }), []);

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
      safeOnHover(true);
    } else if (!isRotating) {
      safeOnHover(false);
    }
  }, [isScaling, isRotating, safeOnHover]);

  useEffect(() => {
    onScalingChange(isScaling);
  }, [isScaling, onScalingChange]);

  useEffect(() => {
    if (!labelRef.current) return;
    labelRef.current.visible = !!label;
  }, [label]);

  useFrame(() => {
    if (!label || !meshRef.current || !labelRef.current) return;
    const mesh = meshRef.current;
    const height = mesh.scale.y * 0.5 + 0.1;
    labelState.up.set(0, 1, 0).applyQuaternion(mesh.quaternion);
    labelState.offset.copy(labelState.up).multiplyScalar(height);
    labelRef.current.position.copy(mesh.position).add(labelState.offset);
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

      <group 
        ref={handlesRef}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.nativeEvent) {
            (e.nativeEvent as any).stopImmediatePropagation?.();
          }
        }}
      >
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
            isGumballDragging={isGumballDragging}
          />
        ))}
      </group>

      {label && (
        <group ref={labelRef}>
          <Html center style={{ pointerEvents: 'none' }}>
            <div
              style={{
                padding: '4px 8px',
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(56, 189, 248, 0.6)',
                borderRadius: '6px',
                color: '#e2e8f0',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.2px',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </div>
          </Html>
        </group>
      )}
    </>
  );
}
