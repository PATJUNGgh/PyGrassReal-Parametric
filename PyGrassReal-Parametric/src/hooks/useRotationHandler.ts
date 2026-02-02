import { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useIntersection } from './useIntersection';
import type { ThreeEvent } from '@react-three/fiber/dist/declarations/src/core/events';

const ROTATION_SNAP_DEG = 30;

export function useRotationHandler(
  targetRef: React.RefObject<THREE.Object3D | null>,
  onHandleInteract: (active: boolean) => void,
  setDraggingAxis: (axis: 'x' | 'y' | 'z' | null) => void,
  rotationSnapEnabled: boolean
) {
  const { camera, gl } = useThree();
  const [isRotating, setIsRotating] = useState(false);
  const rotationState = useRef<{
    axis: 'x' | 'y' | 'z' | null;
    initialQuaternion: THREE.Quaternion;
    axisWorld: THREE.Vector3;
    center: THREE.Vector3;
    centerScreen: THREE.Vector2;
    dragPlane: THREE.Plane;
    worldToRing: THREE.Quaternion;
    startAngle: number;
    angleSign: number;
    prevAngle: number;
    accumAngle: number;
    lastPointer?: { x: number; y: number };
    lastAppliedSnappedAngle: number;
  }>({
    axis: null,
    initialQuaternion: new THREE.Quaternion(),
    axisWorld: new THREE.Vector3(),
    center: new THREE.Vector3(),
    centerScreen: new THREE.Vector2(),
    dragPlane: new THREE.Plane(),
    worldToRing: new THREE.Quaternion(),
    startAngle: 0,
    angleSign: 1,
    prevAngle: 0,
    accumAngle: 0,
    lastPointer: undefined,
    lastAppliedSnappedAngle: 0,
  });

  const [sectorState, setSectorState] = useState({ startAngle: 0, angle: 0, isFlipped: false });
  const { getIntersection } = useIntersection();

  const getAxisRotation = useCallback((axis: 'x' | 'y' | 'z') => {
    const quat = new THREE.Quaternion();
    if (axis === 'y') {
      quat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    } else if (axis === 'x') {
      quat.setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
    } else {
      quat.identity();
    }
    return quat;
  }, []);

  const computeLocalAngle = useCallback((state: typeof rotationState.current, point: THREE.Vector3) => {
    const local = point.clone().sub(state.center).applyQuaternion(state.worldToRing);
    return Math.atan2(local.y, local.x);
  }, []);

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>, axis: 'x' | 'y' | 'z') => {
      if (e.button !== 0 || !targetRef.current) return;
      e.stopPropagation();

      setIsRotating(true);
      const state = rotationState.current;
      state.axis = axis;
      setDraggingAxis(axis);
      state.initialQuaternion.copy(targetRef.current.quaternion);

      if (axis === 'x') state.axisWorld.set(1, 0, 0);
      else if (axis === 'y') state.axisWorld.set(0, 1, 0);
      else if (axis === 'z') state.axisWorld.set(0, 0, 1);

      state.axisWorld.applyQuaternion(state.initialQuaternion).normalize();

      state.center.copy(targetRef.current.position);
      const centerNdc = state.center.clone().project(camera);
      const canvasRect = gl.domElement.getBoundingClientRect();
      const width = canvasRect.width;
      const height = canvasRect.height;
      const left = canvasRect.left;
      const top = canvasRect.top;
      const centerX = (centerNdc.x * 0.5 + 0.5) * width + left;
      const centerY = (-centerNdc.y * 0.5 + 0.5) * height + top;
      state.centerScreen.set(centerX, centerY);

      state.angleSign = axis === 'y' ? 1 : -1;

      state.dragPlane.setFromNormalAndCoplanarPoint(state.axisWorld, state.center);
      const axisRotation = getAxisRotation(axis);
      const ringToWorld = state.initialQuaternion.clone().multiply(axisRotation);
      state.worldToRing.copy(ringToWorld).invert();

      const hit = getIntersection(e.clientX, e.clientY, state.dragPlane);
      const startAngle = hit
        ? computeLocalAngle(state, hit)
        : Math.atan2(e.clientY - centerY, e.clientX - centerX);
      state.startAngle = startAngle;
      state.prevAngle = startAngle;
      state.accumAngle = 0;
      state.lastAppliedSnappedAngle = 0; // Initialize total applied snapped angle to 0 relative to initialQuaternion
      setSectorState({ startAngle, angle: 0, isFlipped: false });

      onHandleInteract(true);
      state.lastPointer = { x: e.clientX, y: e.clientY };
    },
    [targetRef, onHandleInteract, setDraggingAxis, camera, gl, getIntersection, getAxisRotation, computeLocalAngle]
  );

  useEffect(() => {
    const onGlobalMove = (e: PointerEvent) => {
      const state = rotationState.current;
      if (!isRotating || !state.axis || !targetRef.current) return;

      let hit = getIntersection(e.clientX, e.clientY, state.dragPlane);
      if (!hit && state.lastPointer) {
        hit = getIntersection(state.lastPointer.x, state.lastPointer.y, state.dragPlane);
      }
      if (!hit) return;

      const currentAngle = computeLocalAngle(state, hit);
      const deltaRaw = Math.atan2(
        Math.sin(currentAngle - state.prevAngle),
        Math.cos(currentAngle - state.prevAngle)
      );

      if (Math.abs(deltaRaw) === 0) { // Only proceed if there's actual mouse movement
        return;
      }

      state.accumAngle += deltaRaw; // Accumulate raw mouse movement
      state.prevAngle = currentAngle;

      let rotationAngleForObject: number; // The angle change to apply to object's quaternion
      let rotationAngleForSector: number; // The total angle to display for visual sector

      if (rotationSnapEnabled) {
        const step = THREE.MathUtils.degToRad(ROTATION_SNAP_DEG);
        const continuousTotalAngle = -state.accumAngle * state.angleSign; // Total angle from start, continuous
        const snappedTotalAngle = Math.round(continuousTotalAngle / step) * step;

        rotationAngleForObject = snappedTotalAngle - state.lastAppliedSnappedAngle;
        state.lastAppliedSnappedAngle = snappedTotalAngle; // Update last applied snapped angle

        rotationAngleForSector = snappedTotalAngle; // Sector also shows snapped angle
      } else {
        // Continuous rotation
        rotationAngleForObject = -deltaRaw * state.angleSign;
        rotationAngleForSector = -state.accumAngle * state.angleSign; // Sector shows continuous angle
        // When snapping is toggled off, sync lastAppliedSnappedAngle with the current continuous angle
        state.lastAppliedSnappedAngle = rotationAngleForSector;
      }

      if (Math.abs(rotationAngleForObject) > 0) {
        const deltaQ = new THREE.Quaternion().setFromAxisAngle(state.axisWorld, rotationAngleForObject);
        targetRef.current.quaternion.premultiply(deltaQ);
      }

      setSectorState((prev) => ({
          ...prev,
          startAngle: state.startAngle,
          angle: rotationAngleForSector,
          isFlipped: false
      }));

      targetRef.current.updateMatrixWorld();
      state.lastPointer = { x: e.clientX, y: e.clientY };
    };

    const onGlobalUp = () => {
        if (isRotating) {
            setIsRotating(false);
            setDraggingAxis(null);
            setSectorState({ startAngle: 0, angle: 0, isFlipped: false });
            onHandleInteract(false);
        }
    };

    window.addEventListener('pointermove', onGlobalMove);
    window.addEventListener('pointerup', onGlobalUp);

    return () => {
      window.removeEventListener('pointermove', onGlobalMove);
      window.removeEventListener('pointerup', onGlobalUp);
    };
  }, [isRotating, targetRef, onHandleInteract, rotationSnapEnabled, setDraggingAxis, getIntersection, computeLocalAngle]);

  return {
    isRotating,
    handleRotationPointerDown: handlePointerDown,
    rotationSectorState: sectorState,
  };
}
