import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { SceneObject } from '../types/scene';

interface SyncProps {
    selectedIds?: Set<string>;
    sceneObjects: SceneObject[];
    build3DAiScopeBoxes?: any[];
    targetRef?: React.MutableRefObject<any>;
    selectionGroupRef?: React.RefObject<any>;
    build3DAiScopeRefs?: React.MutableRefObject<Map<string, { current: any }>>;
    isHandleDragging?: boolean;
    isGumballDragging?: boolean;
    transformControlsRef?: React.RefObject<any>;
    dragJustFinishedRef?: React.RefObject<boolean>;
    scene?: THREE.Scene; // Add scene as optional prop
}

export function useSceneSync(props: SyncProps | SceneObject[]) {
    // Handle both object props and array props
    const isArray = Array.isArray(props);
    const {
        selectedIds,
        sceneObjects,
        build3DAiScopeBoxes,
        targetRef,
        selectionGroupRef,
        build3DAiScopeRefs,
        isHandleDragging,
        isGumballDragging,
        transformControlsRef,
        dragJustFinishedRef,
        scene
    } = isArray ? { sceneObjects: props } as SyncProps : props;

    const initializedObjectsRef = useRef<Set<string>>(new Set());

    // 1. Purge Orphan Objects (Ensure Graph is Source of Truth)
    // Only run if scene is provided (from within Canvas)
    useEffect(() => {
        if (!scene || !sceneObjects) return;

        const currentOwnerIds = new Set([
            ...sceneObjects.map(obj => obj.id),
            ...(build3DAiScopeBoxes || []).map(box => box.id)
        ]);
        const objectsToRemove: THREE.Object3D[] = [];

        scene.traverse((child) => {
            if (!(child as THREE.Mesh).isMesh && child.type !== 'Group' && child.type !== 'Object3D') return;
            
            const userData = child.userData;
            if (userData.isSceneBackground || userData.isSelectionHelper || userData.isGizmo) return;
            
            const sceneId = userData.sceneId || userData.ownerNodeId;
            
            if (sceneId) {
                if (!currentOwnerIds.has(sceneId)) {
                    objectsToRemove.push(child);
                }
            } else if (userData.isSceneObject) {
                objectsToRemove.push(child);
            }
        });

        objectsToRemove.forEach((obj) => {
            if (obj.parent) {
                obj.parent.remove(obj);
                if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
                if ((obj as THREE.Mesh).material) {
                    if (Array.isArray((obj as THREE.Mesh).material)) {
                        ((obj as THREE.Mesh).material as THREE.Material[]).forEach(m => m.dispose());
                    } else {
                        ((obj as THREE.Mesh).material as THREE.Material).dispose();
                    }
                }
            }
        });
    }, [scene, sceneObjects, build3DAiScopeBoxes]);

    // 2. Sync targetRef based on selection
    useEffect(() => {
        if (!selectedIds || !sceneObjects || !targetRef || !selectionGroupRef || !build3DAiScopeRefs) return;

        if (selectedIds.size === 0) {
            targetRef.current = null;
        } else if (selectedIds.size === 1) {
            const selectedId = selectedIds.values().next().value;
            const selectedObject = sceneObjects.find(obj => obj.id === selectedId);
            if (selectedObject?.ref.current) {
                targetRef.current = selectedObject.ref.current;
            } else {
                const scopeRef = build3DAiScopeRefs.current.get(selectedId!);
                targetRef.current = scopeRef?.current ?? null;
            }
        } else {
            targetRef.current = selectionGroupRef.current;
        }
    }, [selectedIds, sceneObjects, selectionGroupRef, targetRef, build3DAiScopeRefs]);

    // 3. Sync Props to 3D Objects
    useEffect(() => {
        if (!sceneObjects) return;

        const isBusy = isHandleDragging || isGumballDragging || transformControlsRef?.current?.dragging || dragJustFinishedRef?.current;
        if (isBusy) return;

        sceneObjects.forEach((obj) => {
            const target = obj.ref.current;
            if (!target) return;
            
            const hasInit = initializedObjectsRef.current.has(obj.id);
            const epsilon = 1e-6;
            const posMatch = 
                Math.abs(target.position.x - obj.position[0]) < epsilon && 
                Math.abs(target.position.y - obj.position[1]) < epsilon &&
                Math.abs(target.position.z - obj.position[2]) < epsilon;
            
            if (!hasInit || !posMatch) {
                target.position.fromArray(obj.position);
                target.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
                target.scale.fromArray(obj.scale);
                target.updateMatrixWorld(true);
                initializedObjectsRef.current.add(obj.id);
            }
        });

        const currentIds = new Set(sceneObjects.map(o => o.id));
        for (const id of initializedObjectsRef.current) {
            if (!currentIds.has(id)) initializedObjectsRef.current.delete(id);
        }
    }, [sceneObjects, isHandleDragging, isGumballDragging, transformControlsRef, dragJustFinishedRef?.current]);
}
