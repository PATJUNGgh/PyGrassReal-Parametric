import { useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import type { SceneObject } from '../types/scene';

interface InteractionLogicProps {
    interactionMode: '3d' | 'node' | 'wire' | '2d';
    selectedIds: Set<string>;
    setSelectedIds: (ids: Set<string>) => void;
    setSelectionSource: (source: 'model' | 'node' | null) => void;
    sceneObjectMap: Map<string, SceneObject>;
    resolveSelectionTargetId: (sceneId: string) => string;
    isGumballDragging: boolean;
    isGizmoDraggingRef: React.RefObject<boolean>;
    isHandleDragging: boolean;
    isHandleHovered: boolean;
    handlesHoveredRef: React.RefObject<boolean>;
    draggingAxis: string | null;
    isScalingHandle: boolean;
    resetInteractionState: () => void;
    onBackgroundDoubleClick?: (x: number, y: number) => void;
    onDeselectAll?: () => void;
    transformControlsRef: React.RefObject<any>;
}

const CLICK_MOVE_THRESHOLD_PX = 8;
const SELECTION_BLOCKING_SELECTOR = '.custom-node-base, .widget-window-node-base, .group-node-base, .node-port, .ui-toolbar, button, input, select, textarea, [data-no-selection="true"]';

export function useSceneInteractionLogic({
    interactionMode,
    selectedIds,
    setSelectedIds,
    setSelectionSource,
    sceneObjectMap,
    resolveSelectionTargetId,
    isGumballDragging,
    isGizmoDraggingRef,
    isHandleDragging,
    isHandleHovered,
    handlesHoveredRef,
    draggingAxis,
    isScalingHandle,
    resetInteractionState,
    onBackgroundDoubleClick,
    onDeselectAll,
    transformControlsRef
}: InteractionLogicProps) {
    const { gl, scene, camera, raycaster } = useThree();
    
    const clickCandidateRef = useRef(false);
    const downPosRef = useRef({ x: 0, y: 0 });
    const downHitMetaRef = useRef<{ sceneId: string | null; hitNonSelectable: boolean }>({ sceneId: null, hitNonSelectable: false });
    const selectionAppliedOnDownRef = useRef<string | null>(null);

    const stateRef = useRef({
        selectedIds,
        interactionMode,
        isGumballDragging,
        isGizmoDraggingRef,
        isHandleDragging,
        isHandleHovered,
        draggingAxis,
        isScalingHandle,
        resolveSelectionTargetId,
        onBackgroundDoubleClick,
        onDeselectAll
    });

    useEffect(() => {
        stateRef.current = {
            selectedIds,
            interactionMode,
            isGumballDragging,
            isGizmoDraggingRef,
            isHandleDragging,
            isHandleHovered,
            draggingAxis,
            isScalingHandle,
            resolveSelectionTargetId,
            onBackgroundDoubleClick,
            onDeselectAll
        };
    }, [selectedIds, interactionMode, isGumballDragging, isGizmoDraggingRef, isHandleDragging, isHandleHovered, draggingAxis, isScalingHandle, resolveSelectionTargetId, onBackgroundDoubleClick, onDeselectAll]);

    const findSceneIdFromObject = useCallback((obj: THREE.Object3D | null): string | null => {
        let current: THREE.Object3D | null = obj;
        while (current) {
            const sceneId = current.userData?.sceneId;
            if (typeof sceneId === 'string' && sceneId.length > 0) return sceneId;
            current = current.parent;
        }
        return null;
    }, []);

    const collectRaycastTargets = useCallback((): THREE.Object3D[] => {
        const targets: THREE.Object3D[] = [];
        scene.traverse((obj) => {
            if (obj.userData?.isScopeBox) {
                targets.push(obj);
                return;
            }
            const sceneId = obj.userData?.sceneId;
            if (typeof sceneId !== 'string' || sceneId.length === 0) return;
            const sceneObj = sceneObjectMap.get(sceneId);
            if (sceneObj?.isGhost) return;
            if (!obj.visible) return;
            targets.push(obj);
        });
        return targets;
    }, [scene, sceneObjectMap]);

    const raycastMetaAtClientPoint = useCallback((clientX: number, clientY: number) => {
        const rect = gl.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1
        );

        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(collectRaycastTargets(), true);
        
        for (const hit of hits) {
            const sceneId = findSceneIdFromObject(hit.object);
            if (sceneId) return { sceneId, hitNonSelectable: false };
        }

        const allHits = raycaster.intersectObjects(scene.children, true);
        const hitNonSelectable = allHits.some(hit => {
            let curr: THREE.Object3D | null = hit.object;
            while (curr) {
                if (curr.userData?.isSelectionHelper) return true;
                curr = curr.parent;
            }
            return false;
        });

        return { sceneId: null, hitNonSelectable };
    }, [camera, collectRaycastTargets, findSceneIdFromObject, gl, raycaster, scene]);

    const applySelection = useCallback((sceneId: string, event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => {
        const targetId = stateRef.current.resolveSelectionTargetId(sceneId);
        const isMultiSelect = event.shiftKey || event.ctrlKey || event.metaKey;
        const currentIds = stateRef.current.selectedIds || new Set();
        const newSelectedIds = new Set(isMultiSelect ? currentIds : []);

        if (isMultiSelect && newSelectedIds.has(targetId)) {
            newSelectedIds.delete(targetId);
        } else {
            newSelectedIds.add(targetId);
        }

        setSelectedIds(newSelectedIds);
        setSelectionSource(newSelectedIds.size > 0 ? 'model' : null);
    }, [setSelectedIds, setSelectionSource]);

    useEffect(() => {
        const handleDown = (e: PointerEvent) => {
            if (stateRef.current.interactionMode !== '3d' || e.button !== 0) return;

            // Reset Gizmo Lock if we're not actually dragging it right now
            // This prevents "Double-click to select" issues.
            if (!stateRef.current.isGumballDragging && !stateRef.current.isHandleDragging) {
                stateRef.current.isGizmoDraggingRef.current = false;
            }

            const target = e.target as HTMLElement | null;
            if (target?.closest(SELECTION_BLOCKING_SELECTOR)) {
                clickCandidateRef.current = false;
                return;
            }

            downPosRef.current = { x: e.clientX, y: e.clientY };
            const hit = raycastMetaAtClientPoint(e.clientX, e.clientY);
            downHitMetaRef.current = hit;

            // IF GUMBALL IS HIT, LOCK IT IMMEDIATELY
            if (hit.hitNonSelectable) {
                stateRef.current.isGizmoDraggingRef.current = true;
                clickCandidateRef.current = false;
                return;
            }

            // Priority Guard (Only block if Gizmo IS actually active)
            if (stateRef.current.isGumballDragging || stateRef.current.isHandleDragging) {
                clickCandidateRef.current = false;
                return;
            }

            clickCandidateRef.current = true;

            if (hit.sceneId && !(e.shiftKey || e.ctrlKey || e.metaKey)) {
                applySelection(hit.sceneId, e);
                selectionAppliedOnDownRef.current = hit.sceneId;
            }
        };

        const handleUp = (e: PointerEvent) => {
            if (stateRef.current.interactionMode !== '3d' || e.button !== 0) return;

            // Priority Guard
            if (stateRef.current.isGizmoDraggingRef.current || stateRef.current.isGumballDragging || stateRef.current.isHandleDragging) {
                clickCandidateRef.current = false;
                resetInteractionState();
                return;
            }

            if (!clickCandidateRef.current) {
                const fallbackHit = raycastMetaAtClientPoint(e.clientX, e.clientY);
                if (fallbackHit.sceneId) applySelection(fallbackHit.sceneId, e);
                return;
            }

            clickCandidateRef.current = false;
            const moveDist = Math.hypot(e.clientX - downPosRef.current.x, e.clientY - downPosRef.current.y);
            if (moveDist > CLICK_MOVE_THRESHOLD_PX) return;

            const upHit = raycastMetaAtClientPoint(e.clientX, e.clientY);
            const hitId = upHit.sceneId ?? downHitMetaRef.current.sceneId;

            if (hitId) {
                if (!(e.shiftKey || e.ctrlKey || e.metaKey) && selectionAppliedOnDownRef.current === hitId) {
                    selectionAppliedOnDownRef.current = null;
                    return;
                }
                applySelection(hitId, e);
            } else if (!upHit.hitNonSelectable && !downHitMetaRef.current.hitNonSelectable) {
                setSelectedIds(new Set());
                setSelectionSource(null);
                resetInteractionState();
                stateRef.current.onDeselectAll?.();
            }
            selectionAppliedOnDownRef.current = null;
        };

        const handleDblClick = (e: MouseEvent) => {
            if (stateRef.current.interactionMode !== '3d' || e.button !== 0) return;
            if ((e.target as HTMLElement)?.closest(SELECTION_BLOCKING_SELECTOR)) return;

            const hit = raycastMetaAtClientPoint(e.clientX, e.clientY);
            if (!hit.sceneId && !hit.hitNonSelectable) {
                stateRef.current.onBackgroundDoubleClick?.(e.clientX, e.clientY);
            }
        };

        gl.domElement.addEventListener('pointerdown', handleDown, true);
        gl.domElement.addEventListener('pointerup', handleUp, true);
        gl.domElement.addEventListener('dblclick', handleDblClick);

        return () => {
            gl.domElement.removeEventListener('pointerdown', handleDown, true);
            gl.domElement.removeEventListener('pointerup', handleUp, true);
            gl.domElement.removeEventListener('dblclick', handleDblClick);
        };
    }, [gl, raycastMetaAtClientPoint, applySelection, setSelectedIds, setSelectionSource, resetInteractionState, transformControlsRef]);

    return { raycastMetaAtClientPoint };
}
