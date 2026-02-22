import { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useIntersection } from './useIntersection';
import { faceHandles } from '../components/scene/transform-handles/constants';
import { corners } from '../components/scene/transform-handles/constants';
import type { ThreeEvent } from '@react-three/fiber/dist/declarations/src/core/events';

export function useScalingHandler(
  targetRef: React.RefObject<THREE.Object3D | null>,
  onHandleInteract: (active: boolean) => void
) {
  const { camera } = useThree();
  const { getIntersection } = useIntersection();
  const [isScaling, setIsScaling] = useState(false);

  const scalingState = useRef<{
    axis: 'x' | 'y' | 'z' | null;
    activeHandleId: number | null;
    initialScale: THREE.Vector3;
    initialPosition: THREE.Vector3;
    initialQuaternion: THREE.Quaternion;
    initialDistance: number;
    cornerStartPoint: THREE.Vector3;
    dragPlane: THREE.Plane;
    handleSign: number;
    lastPointer?: { x: number; y: number };
    lastIntersection?: THREE.Vector3;
  }>({
    axis: null,
    activeHandleId: null,
    initialScale: new THREE.Vector3(1, 1, 1),
    initialPosition: new THREE.Vector3(),
    initialQuaternion: new THREE.Quaternion(),
    initialDistance: 0,
    cornerStartPoint: new THREE.Vector3(),
    dragPlane: new THREE.Plane(),
    handleSign: 1,
    lastPointer: undefined,
    lastIntersection: undefined,
  });

  const [activeScaleHandleId, setActiveScaleHandleId] = useState<number | null>(null);

  const handleCornerScalePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>, index: number) => {
      if (e.button !== 0 || !targetRef.current) return;
      e.stopPropagation();

      setIsScaling(true);
      const state = scalingState.current;
      state.axis = null; // Uniform scale
      state.activeHandleId = index;
      setActiveScaleHandleId(index);

      state.initialScale.copy(targetRef.current.scale);
      state.initialPosition.copy(targetRef.current.position);
      state.initialQuaternion.copy(targetRef.current.quaternion);

      const center = targetRef.current.position.clone();
      const cornerPos = new THREE.Vector3().fromArray(corners[index]);

      const initialCornerWorld = cornerPos
        .clone()
        .multiply(state.initialScale)
        .applyQuaternion(state.initialQuaternion)
        .add(center);

      const normal = new THREE.Vector3().subVectors(camera.position, initialCornerWorld).normalize();
      state.dragPlane.setFromNormalAndCoplanarPoint(normal, initialCornerWorld);

      const intersection = getIntersection(e.nativeEvent.clientX, e.nativeEvent.clientY, state.dragPlane);

      if (intersection) {
        state.cornerStartPoint.copy(intersection);
        state.initialDistance = intersection.distanceTo(center);
        state.lastIntersection = intersection.clone();
      } else {
        state.cornerStartPoint.copy(center);
        state.initialDistance = 1.0;
      }

      onHandleInteract(true);
      state.lastPointer = { x: e.clientX, y: e.clientY };
    },
    [targetRef, camera, getIntersection, onHandleInteract]
  );

  const handleAxialScalePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>, axis: 'x' | 'y' | 'z', index: number) => {
      if (e.button !== 0 || !targetRef.current) return;
      e.stopPropagation();

      setIsScaling(true);
      const state = scalingState.current;
      state.axis = axis;
      state.activeHandleId = index;
      setActiveScaleHandleId(index);

      state.initialScale.copy(targetRef.current.scale);
      state.initialPosition.copy(targetRef.current.position);
      state.initialQuaternion.copy(targetRef.current.quaternion);

      // Store the initial handle sign based on handle position
      const handleIndex = index - 8; // Face handles start at index 8
      if (handleIndex >= 0 && handleIndex < faceHandles.length) {
        const handlePos = faceHandles[handleIndex].pos;
        const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
        state.handleSign = Math.sign(handlePos[axisIndex]) || 1;
      } else {
        state.handleSign = 1;
      }

      const objectQuaternion = targetRef.current.quaternion;
      const normal = new THREE.Vector3();
      if (axis === 'x') normal.set(0, 0, 1);
      else if (axis === 'y') normal.set(0, 0, 1);
      else normal.set(0, 1, 0);
      normal.applyQuaternion(objectQuaternion).normalize();

      const center = targetRef.current.position.clone();
      state.dragPlane.setFromNormalAndCoplanarPoint(normal, center);

      const intersection = getIntersection(e.nativeEvent.clientX, e.nativeEvent.clientY, state.dragPlane);
      if (intersection) {
        const localAxis = new THREE.Vector3(
          axis === 'x' ? 1 : 0,
          axis === 'y' ? 1 : 0,
          axis === 'z' ? 1 : 0
        ).applyQuaternion(objectQuaternion);
        const centerToPoint = new THREE.Vector3().subVectors(intersection, center);
        state.initialDistance = centerToPoint.dot(localAxis);
        if (Math.abs(state.initialDistance) < 0.001) state.initialDistance = 0.001;
        state.lastIntersection = intersection.clone();
      }
      onHandleInteract(true);
      state.lastPointer = { x: e.clientX, y: e.clientY };
    },
    [targetRef, getIntersection, onHandleInteract]
  );

  useEffect(() => {
    const onGlobalMove = (e: PointerEvent) => {
      const state = scalingState.current;
      if (!isScaling || !targetRef.current) return;

      let intersection = getIntersection(e.clientX, e.clientY, state.dragPlane);
      if (!intersection) {
        if (state.lastPointer) {
          intersection = getIntersection(state.lastPointer.x, state.lastPointer.y, state.dragPlane);
        }
        if (!intersection && state.lastIntersection) {
          intersection = state.lastIntersection.clone();
        }
        if (!intersection) return;
      }
      state.lastIntersection = intersection.clone();

      // Uniform Scaling
      if (state.axis === null && state.activeHandleId !== null) {
        const worldDelta = new THREE.Vector3().subVectors(intersection, state.cornerStartPoint);
        const localDelta = worldDelta.clone().applyQuaternion(state.initialQuaternion.clone().invert());

        const rawCorner = corners[state.activeHandleId];
        const localCornerStart = new THREE.Vector3(
          rawCorner[0] * state.initialScale.x,
          rawCorner[1] * state.initialScale.y,
          rawCorner[2] * state.initialScale.z
        );

        const initialDist = localCornerStart.length();
        const cornerDir = localCornerStart.clone().normalize();
        const projDist = localDelta.dot(cornerDir) * 0.5;

        const ratio = (initialDist + projDist) / initialDist;
        const safeRatio = Number.isFinite(ratio) ? ratio : 1;
        const newScale = state.initialScale.clone().multiplyScalar(Math.max(0.01, safeRatio));
        targetRef.current.scale.copy(newScale);

        const deltaScale = newScale.clone().sub(state.initialScale);
        const sign = new THREE.Vector3(Math.sign(rawCorner[0]), Math.sign(rawCorner[1]), Math.sign(rawCorner[2]));
        const localShift = deltaScale.clone().multiplyScalar(0.5).multiply(sign);
        const worldShift = localShift.applyQuaternion(state.initialQuaternion);
        targetRef.current.position.copy(state.initialPosition.clone().add(worldShift));
      }
      // Axial Scaling
      else if (state.axis) {
        const axis = state.axis;
        const objectQuaternion = targetRef.current.quaternion;
        const localAxis = new THREE.Vector3(
          axis === 'x' ? 1 : 0,
          axis === 'y' ? 1 : 0,
          axis === 'z' ? 1 : 0
        ).applyQuaternion(objectQuaternion);

        const center = targetRef.current.position.clone();
        const centerToPoint = new THREE.Vector3().subVectors(intersection, center);
        const currentDistance = centerToPoint.dot(localAxis);

        if (Math.abs(state.initialDistance) > 0.0001) {
          const ratio = currentDistance / state.initialDistance;
          const safeRatio = Number.isFinite(ratio) ? ratio : 1;
          const newScale = state.initialScale.clone();
          newScale[axis] *= safeRatio;
          targetRef.current.scale.copy(newScale);

          const deltaScale = newScale.clone().sub(state.initialScale);
          // Use the stored initial handle sign instead of calculating from current position
          const sign = state.handleSign;

          const localShift = new THREE.Vector3();
          localShift[axis] = deltaScale[axis] * 0.5 * sign;
          const worldShift = localShift.applyQuaternion(state.initialQuaternion);
          targetRef.current.position.copy(state.initialPosition.clone().add(worldShift));
        }
      }
      targetRef.current.updateMatrixWorld();
    };

    const onGlobalUp = () => {
      if (isScaling) {
        setIsScaling(false);
        setActiveScaleHandleId(null);
        onHandleInteract(false);
      }
    };

    window.addEventListener('pointermove', onGlobalMove);
    window.addEventListener('pointerup', onGlobalUp);
    return () => {
      window.removeEventListener('pointermove', onGlobalMove);
      window.removeEventListener('pointerup', onGlobalUp);
    };
  }, [isScaling, getIntersection, targetRef, onHandleInteract, camera]);

  return {
    isScaling,
    activeScaleHandleId,
    handleCornerScalePointerDown,
    handleAxialScalePointerDown,
  };
}
