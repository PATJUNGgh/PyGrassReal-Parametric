import { useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { SceneObject } from '../types/scene';
import type { NodeData } from '../types/NodeTypes';

interface TransformLogicProps {
    selectedIds: Set<string>;
    firstSelectedAppId: string | null;
    sceneObjects: SceneObject[];
    sceneObjectMap: Map<string, SceneObject>;
    targetRef: React.MutableRefObject<THREE.Object3D | null>;
    ghostRef: React.MutableRefObject<THREE.Group | null>;
    transformControlsRef: React.RefObject<any>;
    selectionGroupRef: React.RefObject<THREE.Group | null>;
    isGumballDragging: boolean;
    isHandleDragging: boolean;
    isScalingHandle: boolean;
    onTransformChange?: (id: string, transform: any) => void;
    nodes: NodeData[];
    build3DAiScopeBoxes: any[];
    isPictureLayerTransformActive: boolean;
    activePictureLayerPlacement: any;
}

export function useSceneTransformLogic({
    selectedIds,
    firstSelectedAppId,
    sceneObjects,
    sceneObjectMap,
    targetRef,
    ghostRef,
    transformControlsRef,
    selectionGroupRef,
    isGumballDragging,
    isHandleDragging,
    isScalingHandle,
    onTransformChange,
    build3DAiScopeBoxes,
    isPictureLayerTransformActive,
    activePictureLayerPlacement
}: TransformLogicProps) {
    const lastSceneTransformSyncTimeRef = useRef(0);
    const lastEmittedTransformsRef = useRef<Map<string, any>>(new Map());
    const hadGumballDragRef = useRef(false);
    const draggingNodeIdRef = useRef<string | null>(null);
    const dragJustFinishedRef = useRef(false);
    const lockedSelectionIdsRef = useRef<Set<string> | null>(null);

    // Cleanup stale IDs
    useEffect(() => {
        if (!sceneObjects || !build3DAiScopeBoxes) return;
        const activeIds = new Set([...sceneObjects.map(o => o.id), ...build3DAiScopeBoxes.map(s => s.id)]);
        for (const id of lastEmittedTransformsRef.current.keys()) {
            if (!activeIds.has(id)) lastEmittedTransformsRef.current.delete(id);
        }
    }, [sceneObjects, build3DAiScopeBoxes]);

    // Update dragging context
    useEffect(() => {
        if (isGumballDragging && selectedIds) {
            const selectedCandidate = selectedIds.size ? selectedIds.values().next().value : null;
            draggingNodeIdRef.current = selectedIds.size === 1
                ? (firstSelectedAppId ?? (typeof selectedCandidate === 'string' ? selectedCandidate : null))
                : null;
            hadGumballDragRef.current = true;
            dragJustFinishedRef.current = false;
        } else if (!isGumballDragging && hadGumballDragRef.current) {
            dragJustFinishedRef.current = true;
            const timer = setTimeout(() => {
                dragJustFinishedRef.current = false;
                hadGumballDragRef.current = false;
            }, 300); // Increased buffer to 300ms for safety
            return () => clearTimeout(timer);
        }
    }, [isGumballDragging, selectedIds, firstSelectedAppId]);

    useEffect(() => {
        const shouldLockSelection = isGumballDragging || isHandleDragging || isScalingHandle;
        if (shouldLockSelection) {
            if (!lockedSelectionIdsRef.current) {
                lockedSelectionIdsRef.current = new Set(selectedIds);
            }
            return;
        }

        lockedSelectionIdsRef.current = null;
    }, [selectedIds, isGumballDragging, isHandleDragging, isScalingHandle]);

    const getActiveSelectionIds = useCallback(() => {
        const lockedSelection = lockedSelectionIdsRef.current;
        if (lockedSelection && lockedSelection.size > 0) {
            return Array.from(lockedSelection);
        }
        return selectedIds.size > 0 ? Array.from(selectedIds) : [];
    }, [selectedIds]);

    const getObjectWorldTransform = useCallback((obj: THREE.Object3D) => {
        const selectionGroup = selectionGroupRef.current;
        const isInsideGroup = !!(obj.parent && (obj.parent === selectionGroup || obj.parent.userData?.isSelectionGroup));

        if (!isInsideGroup) {
            return {
                position: [obj.position.x, obj.position.y, obj.position.z] as [number, number, number],
                rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z] as [number, number, number],
                scale: [obj.scale.x, obj.scale.y, obj.scale.z] as [number, number, number],
            };
        }

        obj.updateMatrixWorld(true);
        const position = new THREE.Vector3(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3();
        obj.matrixWorld.decompose(position, quaternion, scale);
        const rotation = new THREE.Euler().setFromQuaternion(quaternion, obj.rotation.order);

        return {
            position: [position.x, position.y, position.z] as [number, number, number],
            rotation: [rotation.x, rotation.y, rotation.z] as [number, number, number],
            scale: [scale.x, scale.y, scale.z] as [number, number, number],
        };
    }, [selectionGroupRef]);

    const emitSceneTransformChange = useCallback((forcedIds?: string[], bypassThrottle = false) => {
        if (!onTransformChange || !selectedIds) return;
        const ids = forcedIds ?? getActiveSelectionIds();
        if (ids.length === 0) return;

        const now = performance.now();
        if (!bypassThrottle && now - lastSceneTransformSyncTimeRef.current < 48) return;

        ids.forEach((id) => {
            const sceneObj = sceneObjectMap.get(id);
            const mesh = sceneObj?.ref.current;
            if (mesh) {
                mesh.updateMatrixWorld(true);
                const transform = getObjectWorldTransform(mesh);
                onTransformChange(id, transform);
            }
        });
        lastSceneTransformSyncTimeRef.current = now;
    }, [onTransformChange, selectedIds, getActiveSelectionIds, sceneObjectMap, getObjectWorldTransform]);

    const commitFinalTransform = useCallback(() => {
        if (!hadGumballDragRef.current) return;
        const target = targetRef.current;
        const ghost = ghostRef.current;
        if (target && ghost) {
            target.position.copy(ghost.position);
            target.quaternion.copy(ghost.quaternion);
            target.scale.copy(ghost.scale);
            target.updateMatrixWorld(true);
        }
        emitSceneTransformChange(undefined, true);
    }, [emitSceneTransformChange, targetRef, ghostRef]);

    useFrame(() => {
        const target = targetRef.current;
        const ghost = ghostRef.current;
        const activeSelection = lockedSelectionIdsRef.current ?? selectedIds;
        if (!target || !ghost || !activeSelection || activeSelection.size === 0) return;

        const isTransformDragging = !!transformControlsRef.current?.dragging;

        if (isHandleDragging) {
            ghost.position.copy(target.position);
            ghost.quaternion.copy(target.quaternion);
            ghost.scale.copy(target.scale);
            if (isScalingHandle) emitSceneTransformChange();
        } else if (isTransformDragging) {
            target.position.copy(ghost.position);
            target.quaternion.copy(ghost.quaternion);
            target.scale.copy(ghost.scale); // Fixed typo: was target.scale.copy(target.scale)
            emitSceneTransformChange();
        } else if (!dragJustFinishedRef.current) {
            if (isPictureLayerTransformActive && activePictureLayerPlacement) {
                const { worldPos, scale, rotation } = activePictureLayerPlacement;
                if (worldPos) ghost.position.set(worldPos.x, worldPos.y, worldPos.z);
                else ghost.position.copy(target.position);
                if (typeof rotation === 'number') ghost.rotation.set(0, 0, rotation);
                else ghost.quaternion.copy(target.quaternion);
                if (typeof scale === 'number') ghost.scale.set(scale, scale, scale);
                else ghost.scale.copy(target.scale);
            } else {
                ghost.position.copy(target.position);
                ghost.quaternion.copy(target.quaternion);
                ghost.scale.copy(target.scale);
            }
        }
        
        ghost.updateMatrixWorld(true);
        target.updateMatrixWorld(true);
    });

    return { emitSceneTransformChange, commitFinalTransform, hadGumballDragRef, draggingNodeIdRef, dragJustFinishedRef };
}
