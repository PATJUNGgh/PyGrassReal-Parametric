import { useFrame, useThree } from '@react-three/fiber';
import { GizmoHelper, GizmoViewcube } from '@react-three/drei';
import { OrbitControls, TransformControls } from '@react-three/drei';
import { useEffect, useRef, useContext, useCallback, useState, useMemo } from 'react';
import * as THREE from 'three';
import { SelectionLogic } from '../../hooks/useSelection3D';
import { GumballObserver } from '../GumballObserver';
import { SelectionBox } from './SelectionBox';
import { Model } from './Model';
import { SelectionSnapToggle } from '../ui/SelectionSnapToggle';
import type { SceneObject } from '../../types/scene';
import { SceneInteractionContext } from '../../context/SceneInteractionContext';
import { useSelectionGroup } from '../../hooks/useSelectionGroup';

// Define the props for the new component
interface SceneInnerProps {
    controlsContainerRef: React.RefObject<HTMLDivElement>;
    sceneObjects: SceneObject[];
    handleTextures: { [key: string]: THREE.Texture | undefined };
    gizmoBackdropTexture: THREE.CanvasTexture;
    backgroundColor: string;
    isGradientBackground: boolean;
    viewportMode: 'wireframe' | 'depth' | 'monochrome' | 'rendered';
    interactionMode?: '3d' | 'node' | 'wire';
    onTransformChange?: (id: string, updates: { position?: number[]; rotation?: number[]; scale?: number[] }) => void;
    onInteractionStart?: () => void;
    onInteractionEnd?: () => void;
}

export function SceneInner({
    controlsContainerRef,
    sceneObjects,
    handleTextures,
    gizmoBackdropTexture,
    backgroundColor,
    isGradientBackground,
    viewportMode,
    interactionMode = '3d',
    onTransformChange,
    onInteractionStart,
    onInteractionEnd
}: SceneInnerProps) {
    const context = useContext(SceneInteractionContext);
    if (!context) {
        throw new Error('SceneInner must be used within a SceneInteractionProvider');
    }

    const {
        transformControlsRef,
        selectionGroupRef,
        ghostRef,
        targetRef,
        selectedIds,
        setSelectedIds,
        firstSelectedAppId,
        isGumballDragging,
        setIsGumballDragging,
        isHandleDragging,
        setIsHandleDragging,
        isHandleHovered,
        setIsHandleHovered,
        dragJustFinishedRef,
        gumballHoveredRef,
        handlesHoveredRef,
        draggingAxis,
        setDraggingAxis,
        isScalingHandle,
        setIsScalingHandle,
        rotationSnapEnabled,
        setRotationSnapEnabled,
        selectionSource,
        setSelectionSource,
        processingRect,
        setProcessingRect
    } = context;

    // Track the object being dragged even if selection clears.
    const draggingNodeIdRef = useRef<string | null>(null);

    const { gl, scene, camera, raycaster } = useThree();
    const initializedObjectsRef = useRef<Set<string>>(new Set());
    const [isGumballHovering, setIsGumballHovering] = useState(false);

    // LOGIC MOVED FROM APP.TSX
    useSelectionGroup({ selectedIds, sceneObjects, firstSelectedAppId, selectionGroupRef });

    useEffect(() => {
        if (selectedIds.size === 0) {
            targetRef.current = null;
        } else if (selectedIds.size === 1) {
            const selectedId = selectedIds.values().next().value;
            const selectedObject = sceneObjects.find(obj => obj.id === selectedId);
            targetRef.current = selectedObject ? selectedObject.ref.current : null;
        } else {
            targetRef.current = selectionGroupRef.current;
        }
    }, [selectedIds, sceneObjects]);

    // Multi-selection in 3D must use the model source so the dashed bounding box renders.
    // This only applies when 2+ items are selected.
    useEffect(() => {
        if (interactionMode !== '3d') return;
        if (selectedIds.size > 1 && selectionSource !== 'model') {
            setSelectionSource('model');
        }
    }, [interactionMode, selectedIds, selectionSource, setSelectionSource]);

    const onSelectionCalculated = useCallback((newlySelectedIds: Set<string>) => {
        setSelectedIds(newlySelectedIds);
        setSelectionSource(newlySelectedIds.size > 0 ? 'model' : null);
        // processingRect is now managed by the overlay/input system, we don't clear it here directly 
        // unless we want to force stop the selection visual, but usually 'pointerup' clears it.
    }, [setSelectedIds, setSelectionSource]);
    // END LOGIC MOVED FROM APP.TSX

    const clickCandidateRef = useRef(false);
    const downPosRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!gl?.domElement) return;

        const handleWindowPointerDown = (e: PointerEvent) => {
            if (interactionMode !== '3d') return;
            if (e.button !== 0) return;

            // Should not track click candidate if we are on a handle
            if (handlesHoveredRef.current) {
                clickCandidateRef.current = false;
                return;
            }

            const path = (e.composedPath?.() || []) as EventTarget[];
            if (!path.includes(gl.domElement)) {
                clickCandidateRef.current = false;
                return;
            }

            downPosRef.current = { x: e.clientX, y: e.clientY };
            clickCandidateRef.current = true;
        };

        const handleWindowPointerUp = (e: PointerEvent) => {
            if (interactionMode !== '3d') return;
            if (e.button !== 0) return;
            if (isGumballDragging || isHandleDragging) return;

            // Debug blocking conditions
            if (handlesHoveredRef.current) return;
            if (isHandleHovered) return;
            if (draggingAxis) return;
            if (isScalingHandle) return;

            const target = e.target as HTMLElement | null;
            const isNodeElement = !!target?.closest(
                '.custom-node-base, .widget-window-node-base, .group-node-base, .node-port, button, input, select, textarea'
            );
            if (isNodeElement) return;

            if (!clickCandidateRef.current) return;

            const moveDist = Math.hypot(e.clientX - downPosRef.current.x, e.clientY - downPosRef.current.y);
            if (moveDist > 6) {
                // Determine if this was a marquee drag or just a messy click.
                // If it was a long drag, the Overlay handles selection.
                // We should NOT deselect here.
                return;
            }

            // It was a click (or very short drag).
            // Perform Raycast to see if we hit background.
            const rect = gl.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );

            raycaster.setFromCamera(mouse, camera);
            const objectsToTest = sceneObjects
                .map((obj) => obj.ref?.current)
                .filter((obj): obj is THREE.Object3D => !!obj);

            const hits = raycaster.intersectObjects(objectsToTest, true);

            if (hits.length > 0) {
                // Hit an object. Model component handles 'onClick'/'onPointerDown'.
                // Do NOTHING here to avoid double-handling or race conditions.
                return;
            }

            // Hit nothing? Deselect.
            // console.log('[DESELECT] Empty space');
            setSelectedIds(new Set());
            setSelectionSource(null);
        };

        window.addEventListener('pointerdown', handleWindowPointerDown);
        window.addEventListener('pointerup', handleWindowPointerUp);
        return () => {
            window.removeEventListener('pointerdown', handleWindowPointerDown);
            window.removeEventListener('pointerup', handleWindowPointerUp);
        }
    }, [
        gl,
        camera,
        raycaster,
        sceneObjects,
        interactionMode,
        setSelectedIds,
        setSelectionSource,
        isGumballDragging,
        isHandleDragging,
        handlesHoveredRef,
        isHandleHovered,
        draggingAxis,
        isScalingHandle
    ]);



    useEffect(() => {
        if (isGradientBackground) {
            scene.background = null;
            gl.setClearColor(0x000000, 0);
        } else {
            scene.background = null;
            gl.setClearColor(new THREE.Color(backgroundColor), 1);
        }
    }, [backgroundColor, isGradientBackground, gl, scene]);

    // Create a quick lookup map for latest object state to prevent stale data
    const sceneObjectMap = useMemo(() => new Map(sceneObjects.map(o => [o.id, o])), [sceneObjects]);
    const lastSceneTransformSyncTimeRef = useRef(0);

    const emitSceneTransformChange = useCallback((forcedIds?: string[], bypassThrottle = false) => {
        if (!onTransformChange) return;
        const ids = forcedIds ?? (selectedIds.size > 0 ? Array.from(selectedIds) : []);
        if (ids.length === 0) return;
        if (!bypassThrottle && !hadGumballDragRef.current && !isHandleDragging && !forcedIds) return;

        const now = performance.now();
        if (!bypassThrottle && now - lastSceneTransformSyncTimeRef.current < 120) {
            return;
        }

        let emitted = false;
        ids.forEach((id) => {
            const sceneObj = sceneObjectMap.get(id);
            const mesh = sceneObj?.ref.current;
            if (!mesh) return;

            onTransformChange(id, {
                position: [mesh.position.x, mesh.position.y, mesh.position.z],
                rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
                scale: [mesh.scale.x, mesh.scale.y, mesh.scale.z],
            });
            emitted = true;
        });

        if (emitted) {
            lastSceneTransformSyncTimeRef.current = now;
        }
    }, [isHandleDragging, onTransformChange, sceneObjectMap, selectedIds]);

    const snapGhostToTarget = useCallback(() => {
        const ghost = ghostRef.current;
        if (!ghost) return;
        const targetId = draggingNodeIdRef.current;
        const target = targetId
            ? sceneObjectMap.get(targetId)?.ref.current
            : targetRef.current;
        if (!target) return;

        target.position.copy(ghost.position);
        target.quaternion.copy(ghost.quaternion);
        target.scale.copy(ghost.scale);
        target.updateMatrixWorld(true);
    }, [sceneObjectMap, targetRef]);

    const handleTransformControlsMouseUp = useCallback(() => {
        snapGhostToTarget();
        const fallbackId = draggingNodeIdRef.current ? [draggingNodeIdRef.current] : undefined;
        emitSceneTransformChange(fallbackId, true);
    }, [emitSceneTransformChange, snapGhostToTarget]);

    useEffect(() => {
        const applyWireframe = (material: THREE.Material | THREE.Material[] | undefined, enabled: boolean) => {
            if (!material) return;
            if (Array.isArray(material)) {
                material.forEach((mat) => {
                    if ('wireframe' in mat) {
                        (mat as THREE.MeshStandardMaterial).wireframe = enabled;
                        mat.needsUpdate = true;
                    }
                });
            } else if ('wireframe' in material) {
                (material as THREE.MeshStandardMaterial).wireframe = enabled;
                material.needsUpdate = true;
            }
        };

        scene.traverse((obj) => {
            if (!(obj as THREE.Mesh).isMesh) return;
            const mesh = obj as THREE.Mesh;
            if (!mesh.userData?.isSceneObject) return;

            // Resolve current ghost state from Source of Truth
            const sceneId = mesh.userData.sceneId;
            const objData = sceneId ? sceneObjectMap.get(sceneId) : null;
            const isGhost = objData ? objData.isGhost : mesh.userData.isGhost;

            if (!mesh.material) {
                mesh.material = new THREE.MeshStandardMaterial({ color: '#ffffff' });
            }

            if (!mesh.userData.originalMaterial) {
                if (mesh.userData.baseMaterial) {
                    mesh.userData.originalMaterial = mesh.userData.baseMaterial;
                } else {
                    mesh.userData.originalMaterial = mesh.material;
                }
            }

            let materialToApply: THREE.Material | THREE.Material[] | undefined;

            if (viewportMode === 'wireframe') {
                if (!mesh.userData.wireframeMaterial) {
                    mesh.userData.wireframeMaterial = new THREE.MeshBasicMaterial({ color: '#e5e7eb', wireframe: true });
                }
                materialToApply = mesh.userData.wireframeMaterial;
            } else {
                applyWireframe(mesh.userData.originalMaterial, false);
                if (viewportMode === 'depth') {
                    if (!mesh.userData.depthMaterial) {
                        mesh.userData.depthMaterial = new THREE.MeshDepthMaterial();
                    }
                    materialToApply = mesh.userData.depthMaterial;
                } else if (viewportMode === 'monochrome') {
                    if (!mesh.userData.monoMaterial) {
                        mesh.userData.monoMaterial = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.7, metalness: 0.05 });
                    }
                    materialToApply = mesh.userData.monoMaterial;
                } else { // 'rendered' mode
                    if (!mesh.userData.renderedMaterial) {
                        mesh.userData.renderedMaterial = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.5 });
                    }
                    const material = mesh.userData.renderedMaterial as THREE.MeshStandardMaterial;
                    const originalMaterial = mesh.userData.originalMaterial as THREE.MeshStandardMaterial;

                    // It's possible originalMaterial is not a standard material, so check properties exist
                    const baseColor = originalMaterial?.color ?? new THREE.Color('#ffffff');
                    const baseEmissive = originalMaterial?.emissive ?? new THREE.Color('#000000');
                    const baseEmissiveIntensity = typeof mesh.userData.baseEmissiveIntensity === 'number' ? mesh.userData.baseEmissiveIntensity : 0;

                    material.color.set(baseColor);
                    material.emissive.set(baseEmissive);
                    material.emissiveIntensity = baseEmissiveIntensity;

                    // Respect Ghost visibility from trusted source
                    if (isGhost) {
                        material.transparent = true;
                        material.opacity = 0;
                        material.depthWrite = false;
                    } else {
                        material.transparent = false;
                        material.opacity = 1;
                        material.depthWrite = true;
                    }

                    materialToApply = material;
                }
            }
            if (materialToApply) {
                mesh.material = materialToApply;
                mesh.material.needsUpdate = true;
            }
        });
    }, [scene, viewportMode, sceneObjects, sceneObjectMap]);

    useEffect(() => {
        // Cleanup initializedObjectsRef for objects that have been removed
        const currentIds = new Set(sceneObjects.map(o => o.id));
        for (const id of initializedObjectsRef.current) {
            if (!currentIds.has(id)) {
                initializedObjectsRef.current.delete(id);
            }
        }

        sceneObjects.forEach((obj) => {
            const target = obj.ref.current;
            if (!target) return;
            // If the ref instance has changed but the ID remains (e.g., re-mount),
            // we should technically re-sync, but for now we rely on the ID check + Ref existence.
            // If it's a new ref from Undo, it won't be in the ref map potentially?
            // Actually, simply checking if the ID is tracked is enough IF we clean it up.

            if (initializedObjectsRef.current.has(obj.id)) return;

            target.position.fromArray(obj.position);
            target.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
            target.scale.fromArray(obj.scale);
            target.updateMatrixWorld(true);
            initializedObjectsRef.current.add(obj.id);
        });
    }, [sceneObjects]);

    useEffect(() => {
        // Snap ghost to target when selection changes or a handle drag finishes
        if (targetRef.current && ghostRef.current && selectedIds.size > 0) {
            ghostRef.current.position.copy(targetRef.current.position);
            ghostRef.current.quaternion.copy(targetRef.current.quaternion);
            ghostRef.current.scale.copy(targetRef.current.scale);
        }
    }, [selectedIds, isHandleDragging]);

    useEffect(() => {
        if (transformControlsRef.current) {
            const shouldBeVisible = !isHandleDragging && !isHandleHovered && draggingAxis === null && !isScalingHandle;
            if (transformControlsRef.current.visible !== shouldBeVisible) {
                transformControlsRef.current.visible = shouldBeVisible;
                transformControlsRef.current.enabled = shouldBeVisible;
            }
        }
    }, [isHandleDragging, isHandleHovered, draggingAxis, isScalingHandle]);

    const prevHandleDraggingRef = useRef(false);
    useEffect(() => {
        if (isHandleDragging && !prevHandleDraggingRef.current) {
            onInteractionStart?.();
        }
        prevHandleDraggingRef.current = isHandleDragging;
    }, [isHandleDragging, onInteractionStart]);

    useFrame((_state, delta) => {
        if (!targetRef.current || !ghostRef.current || selectedIds.size === 0) return;
        if (!targetRef.current.parent || !ghostRef.current.parent) return;

        if (!transformControlsRef.current?.dragging && isGumballDragging) {
            setIsGumballDragging(false);
        }

        if (isHandleDragging) {
            ghostRef.current.position.copy(targetRef.current.position);
            ghostRef.current.quaternion.copy(targetRef.current.quaternion);
            ghostRef.current.scale.copy(targetRef.current.scale);
        } else {
            const factor = 1 - Math.pow(0.00000001, delta);
            targetRef.current.position.lerp(ghostRef.current.position, factor);
            targetRef.current.quaternion.slerp(ghostRef.current.quaternion, factor);
            targetRef.current.scale.lerp(ghostRef.current.scale, factor);
        }

        if (!isDraggingLocal.current && !isHandleDragging) {
            if (orbitRef.current && !orbitRef.current.enabled) {
                orbitRef.current.enabled = true;
            }
        }
    });

    const orbitRef = useRef<OrbitControls>(null);
    const gumballTimeoutRef = useRef<number | null>(null);
    const isDraggingLocal = useRef(false);
    const lastPointerIdRef = useRef<number | null>(null);
    const hadGumballDragRef = useRef(false);

    useEffect(() => {
        const controls = transformControlsRef.current;
        if (!controls) return;
        const handleDraggingChanged = (event: { value: boolean }) => {
            setIsGumballDragging(event.value);
            isDraggingLocal.current = event.value;
            if (event.value) {
                // Capture the active object ID at drag start so we can sync even if selection is cleared mid-drag.
                draggingNodeIdRef.current = firstSelectedAppId ?? (selectedIds.size ? selectedIds.values().next().value : null);
                hadGumballDragRef.current = true;
            }
        };
        controls.addEventListener?.('dragging-changed', handleDraggingChanged);
        return () => controls.removeEventListener?.('dragging-changed', handleDraggingChanged);
    }, [firstSelectedAppId, selectedIds, setIsGumballDragging]);

    useEffect(() => {
        setIsHandleHovered(false);
        handlesHoveredRef.current = false;
        setIsHandleDragging(false);
        setIsGumballDragging(false);
        gumballHoveredRef.current = false;
        setIsGumballHovering(false);
    }, [selectionSource, setIsHandleHovered, setIsHandleDragging, setIsGumballDragging, setIsGumballHovering]);

    useEffect(() => {
        const handleGlobalPointerUp = () => {
            const hadDrag = isDraggingLocal.current || isGumballDragging || hadGumballDragRef.current || isHandleDragging;
            if (hadDrag) {
                if (isGumballDragging || hadGumballDragRef.current) {
                    snapGhostToTarget();
                }
                const fallbackId = selectedIds.size > 0
                    ? undefined
                    : draggingNodeIdRef.current
                        ? [draggingNodeIdRef.current]
                        : undefined;
                emitSceneTransformChange(fallbackId, true);
                onInteractionEnd?.();
            }
            setIsGumballDragging(false);
            isDraggingLocal.current = false;
            if (hadDrag) {
                if (transformControlsRef.current?.dragging) {
                    transformControlsRef.current.dragging = false;
                    transformControlsRef.current.dispatchEvent?.({ type: 'dragging-changed', value: false });
                }
                const canvas = gl.domElement;
                if (lastPointerIdRef.current !== null) {
                    try {
                        if (canvas.hasPointerCapture?.(lastPointerIdRef.current)) {
                            canvas.releasePointerCapture(lastPointerIdRef.current);
                        }
                    } catch (err) { /* ignore */ }
                    lastPointerIdRef.current = null;
                }
                gumballTimeoutRef.current = setTimeout(() => { gumballHoveredRef.current = false; }, 100);
                dragJustFinishedRef.current = true;
                setTimeout(() => { dragJustFinishedRef.current = false; }, 200);
                if (orbitRef.current) orbitRef.current.enabled = true;
            }
            hadGumballDragRef.current = false;
        };
        window.addEventListener('pointerup', handleGlobalPointerUp);
        return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
    }, [emitSceneTransformChange, gl, isGumballDragging, isHandleDragging, setIsGumballDragging, snapGhostToTarget, selectedIds]);

    return (
        <>
            {interactionMode === '3d' && (
                <SelectionLogic
                    selectionRect={processingRect}
                    sceneObjects={sceneObjects}
                    onSelectionCalculated={onSelectionCalculated}
                    firstSelectedAppId={firstSelectedAppId}
                />
            )}
            <GumballObserver
                controlsRef={transformControlsRef}
                onDraggingChange={(isDragging) => {
                    setIsGumballDragging(isDragging);
                    isDraggingLocal.current = isDragging;
                    if (isDragging) {
                        dragJustFinishedRef.current = true;
                        if (gumballTimeoutRef.current) clearTimeout(gumballTimeoutRef.current);
                        gumballHoveredRef.current = true;
                        hadGumballDragRef.current = true;
                        onInteractionStart?.();
                    } else {
                        if (orbitRef.current) orbitRef.current.enabled = true;
                        setTimeout(() => {
                            dragJustFinishedRef.current = false;
                        }, 200);
                        // onInteractionEnd is now handled in handleGlobalPointerUp to ensure state is updated first
                    }
                }}
            />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <gridHelper args={[20, 20]} />

            <OrbitControls
                ref={orbitRef}
                makeDefault
                domElement={controlsContainerRef.current as HTMLElement}
                mouseButtons={{ LEFT: undefined, MIDDLE: 2, RIGHT: 0 }}
            />

            <group ref={selectionGroupRef} />
            <group ref={ghostRef} />

            {sceneObjects.map((obj) => (
                <Model
                    key={obj.id}
                    ref={obj.ref}
                    data={obj}
                    isSelected={selectedIds.has(obj.id)}
                    highlightEnabled={selectionSource === 'node'}
                    interactionDisabled={!!draggingAxis || isScalingHandle || isGumballDragging || isHandleDragging}
                    gumballHoveredRef={gumballHoveredRef}
                    handlesHoveredRef={handlesHoveredRef}
                    onClick={(e: ThreeEvent<PointerEvent>) => {
                        const isGumballInternalHovered = (transformControlsRef.current as any)?.axis;
                        if (
                            interactionMode !== '3d' ||
                            isGumballDragging ||
                            isHandleDragging ||
                            dragJustFinishedRef.current ||
                            isGumballInternalHovered ||
                            handlesHoveredRef.current
                        ) return;

                        const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
                        const newSelectedIds = new Set(isMultiSelect ? selectedIds : []);

                        if (isMultiSelect && newSelectedIds.has(obj.id)) {
                            newSelectedIds.delete(obj.id);
                        } else {
                            newSelectedIds.add(obj.id);
                        }

                        setSelectedIds(newSelectedIds);
                        setSelectionSource(newSelectedIds.size > 0 ? 'model' : null);
                    }}
                />
            ))}

            {selectedIds.size > 0 && targetRef.current && interactionMode === '3d' && (
                <>
                    {selectionSource === 'model' && draggingAxis === null && !isHandleDragging && !isScalingHandle && (
                        <TransformControls
                            ref={transformControlsRef}
                            object={ghostRef.current || undefined}
                            mode="translate"
                            space={selectedIds.size === 1 ? "local" : "world"}
                            size={isGumballHovering ? 1.2 : 1}
                            onDraggingChanged={(e: { value: boolean }) => {
                                setIsGumballDragging(e.value);
                                isDraggingLocal.current = e.value;
                                if (e.value) {
                                    if (gumballTimeoutRef.current) clearTimeout(gumballTimeoutRef.current);
                                    gumballHoveredRef.current = true;
                                    setIsGumballHovering(true);
                                    // Capture ID at start of drag
                                    draggingNodeIdRef.current = firstSelectedAppId ?? (selectedIds.size ? selectedIds.values().next().value : null);
                                }
                                if (!e.value) {
                                    if (orbitRef.current) orbitRef.current.enabled = true;
                                    dragJustFinishedRef.current = true;
                                    setTimeout(() => { dragJustFinishedRef.current = false; }, 200);

                                    // Note: We do NOT trigger onTransformChange here anymore.
                                    // We rely on onMouseUp -> emitSceneTransformChange which uses the captured draggingNodeIdRef.
                                    // This prevents the race condition where selectedIds is cleared before this event fires.
                                }
                            }}
                            onPointerDown={(e: ThreeEvent<PointerEvent>) => {
                                e.stopPropagation();
                                if (gumballTimeoutRef.current) clearTimeout(gumballTimeoutRef.current);
                                gumballHoveredRef.current = true;
                                setIsGumballHovering(true);
                                const canvas = gl.domElement;
                                try {
                                    canvas.setPointerCapture(e.pointerId);
                                    lastPointerIdRef.current = e.pointerId;
                                } catch (err) { /* ignore */ }
                            }}
                            onPointerUp={(e: ThreeEvent<PointerEvent>) => {
                                gumballHoveredRef.current = true;
                                const canvas = gl.domElement;
                                try {
                                    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
                                } catch (err) { /* ignore */ }
                                if (lastPointerIdRef.current === e.pointerId) lastPointerIdRef.current = null;
                            }}
                            onMouseUp={handleTransformControlsMouseUp}
                            onPointerOver={() => {
                                if (gumballTimeoutRef.current) clearTimeout(gumballTimeoutRef.current);
                                gumballHoveredRef.current = true;
                                setIsGumballHovering(true);
                            }}
                            onPointerOut={() => {
                                if (isDraggingLocal.current) return;
                                gumballTimeoutRef.current = setTimeout(() => { gumballHoveredRef.current = false; }, 300);
                                setTimeout(() => setIsGumballHovering(false), 300);
                            }}
                        />
                    )}

                    {selectionSource === 'model' && (
                        <SelectionBox
                            targetRef={targetRef}
                            onHandleInteract={setIsHandleDragging}
                            onHandleHover={setIsHandleHovered}
                            handlesHoveredRef={handlesHoveredRef}
                            onScalingChange={setIsScalingHandle}
                            setDraggingAxis={setDraggingAxis}
                            draggingAxis={draggingAxis}
                            rotationSnapEnabled={rotationSnapEnabled}
                            handleTextures={handleTextures}
                            isDashed={selectedIds.size > 1}
                            isGumballDragging={isGumballDragging}
                            firstSelectedAppId={firstSelectedAppId}
                        />
                    )}

                    {selectionSource === 'model' && (
                        <SelectionSnapToggle
                            targetRef={targetRef}
                            enabled={rotationSnapEnabled}
                            setEnabled={setRotationSnapEnabled}
                            visible={!isHandleDragging && !isScalingHandle && draggingAxis === null}
                        />
                    )}
                </>
            )}

            <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                <mesh position={[0, 0, -0.4]} raycast={() => null}>
                    <planeGeometry args={[2.2, 2.2]} />
                    <meshBasicMaterial map={gizmoBackdropTexture} transparent opacity={0.9} depthWrite={false} depthTest={false} />
                </mesh>
                <GizmoViewcube font="18px Inter, sans-serif" opacity={0.98} color="#2c5fa0" hoverColor="#ffffff" textColor="#ffffff" strokeColor="#0f1e33" />
            </GizmoHelper>
        </>
    );
}
