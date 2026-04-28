import { useFrame, useThree } from '@react-three/fiber';
import { GizmoHelper, GizmoViewcube, OrbitControls, TransformControls } from '@react-three/drei';
import { useEffect, useRef, useContext, useCallback, useState, useMemo } from 'react';
import * as THREE from 'three';
import { SelectionLogic } from '../../hooks/useSelection3D';
import { GumballObserver } from '../GumballObserver';
import { SelectionBox } from './SelectionBox';
import { Build3DAiScopeBox } from './Build3DAiScopeBox';
import { Model } from './Model';
import { SelectionSnapToggle } from '../ui/SelectionSnapToggle';
import type { SceneObject } from '../../types/scene';
import { SceneInteractionContext } from '../../context/SceneInteractionContext';
import { useSelectionGroup } from '../../hooks/useSelectionGroup';
import { useNodeGraph } from '../../context/NodeGraphContext';
import { useGizmoMargin } from '../../hooks/useGizmoMargin';
import { useViewportMaterials } from '../../hooks/useViewportMaterials';
import { useSceneInteractionLogic } from '../../hooks/useSceneInteractionLogic';
import { useSceneTransformLogic } from '../../hooks/useSceneTransformLogic';
import { useBuild3DAIScopes } from '../../hooks/useBuild3DAIScopes';
import { usePictureLayerLogic } from '../../hooks/usePictureLayerLogic';
import { useSceneSync } from '../../hooks/useSceneSync';

interface SceneInnerProps {
    controlsContainerRef: React.RefObject<HTMLDivElement>;
    sceneObjects: SceneObject[];
    gizmoBackdropTexture: THREE.CanvasTexture;
    backgroundColor: string | number;
    isGradientBackground: boolean;
    viewportMode: 'wireframe' | 'depth' | 'monochrome' | 'rendered';
    interactionMode?: '3d' | 'node' | 'wire' | '2d';
    onTransformChange?: (id: string, transform: any) => void;
    onBackgroundDoubleClick?: (x: number, y: number) => void;
    onInteractionStart?: () => void;
    onInteractionEnd?: () => void;
    onDeselectAll?: () => void;
}

export function SceneInner({
    controlsContainerRef,
    sceneObjects,
    gizmoBackdropTexture,
    backgroundColor,
    isGradientBackground,
    viewportMode,
    interactionMode = '3d',
    onTransformChange,
    onBackgroundDoubleClick,
    onInteractionStart,
    onInteractionEnd,
    onDeselectAll
}: SceneInnerProps) {
    const context = useContext(SceneInteractionContext);
    if (!context) throw new Error('SceneInner must be used within a SceneInteractionProvider');

    const {
        transformControlsRef, selectionGroupRef, ghostRef, targetRef,
        selectedIds, setSelectedIds, firstSelectedAppId,
        isGumballDragging, setIsGumballDragging, isHandleDragging, setIsHandleDragging,
        isHandleHovered, setIsHandleHovered, handlesHoveredRef, draggingAxis, setDraggingAxis, 
        isScalingHandle, setIsScalingHandle, resetInteractionState, rotationSnapEnabled, 
        setRotationSnapEnabled, selectionSource, setSelectionSource, processingRect,
        pictureLayerTransformTarget,
        pictureLayerTransformMode, setPictureLayerTransformMode,
        isGizmoDraggingRef, canvasElementRef, gumballHoveredRef
    } = context;

    const { nodes, connections } = useNodeGraph();
    const { gl, scene } = useThree();

    // Store the canvas DOM element in the shared context
    useEffect(() => {
        if (canvasElementRef && gl.domElement) {
            canvasElementRef.current = gl.domElement;
        }
    }, [gl, canvasElementRef]);
    const { gizmoMarginY, DEFAULT_GIZMO_MARGIN_X } = useGizmoMargin(gl, interactionMode);
    const cameraControlsEnabled = interactionMode === '3d';
    const orbitMouseButtons = useMemo(
        () => ({ LEFT: undefined, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }),
        []
    );
    
    // 1. Core State & Memoized Maps
    const sceneObjectMap = useMemo(() => new Map(sceneObjects.map(o => [o.id, o])), [sceneObjects]);
    const orbitRef = useRef<any>(null);
    const [isGumballHovering, setIsGumballHovering] = useState(false);
    const activeGumballPointerIdRef = useRef<number | null>(null);

    // 2. Specialized Logic Hooks
    const { build3DAiScopeBoxes, getBuild3DAiScopeRef, build3DAiScopeRefs } = useBuild3DAIScopes(nodes, connections);
    
    const { isPictureLayerTransformActive, activePictureLayerPlacement } = usePictureLayerLogic({
        pictureLayerTransformTarget, selectedIds, nodes, setPictureLayerTransformMode
    });

    const { commitFinalTransform, dragJustFinishedRef } = useSceneTransformLogic({
        selectedIds, firstSelectedAppId, sceneObjects, sceneObjectMap, targetRef, ghostRef,
        transformControlsRef, selectionGroupRef, isGumballDragging,
        isHandleDragging, isScalingHandle, onTransformChange,
        build3DAiScopeBoxes, isPictureLayerTransformActive, activePictureLayerPlacement
    });

    useSelectionGroup({ selectedIds, sceneObjects, firstSelectedAppId, selectionGroupRef });
    useViewportMaterials(scene, viewportMode, sceneObjects, sceneObjectMap);
    
    useSceneSync({
        selectedIds, sceneObjects, build3DAiScopeBoxes, targetRef, selectionGroupRef,
        build3DAiScopeRefs, isHandleDragging, isGumballDragging, 
        transformControlsRef, dragJustFinishedRef,
        scene // Pass the scene here
    });

    const resolveSelectionTargetId = useCallback((sceneId: string): string => {
        const hitObj = sceneObjectMap.get(sceneId);
        if (!hitObj?.proxySelectionId) return sceneId;
        const proxyObj = sceneObjectMap.get(hitObj.proxySelectionId);
        if (!proxyObj || !proxyObj.ref.current) return sceneId;
        const isBooleanResultProxy = hitObj.objectNodeType === 'mesh-union' || hitObj.objectNodeType === 'mesh-difference' || hitObj.objectNodeType === 'mesh-intersection';
        if (!isBooleanResultProxy) {
            if (proxyObj.isGhost || proxyObj.isFaded) return sceneId;
            if (!proxyObj.ref.current.visible) return sceneId;
        }
        return proxyObj.id;
    }, [sceneObjectMap]);

    useSceneInteractionLogic({
        interactionMode, selectedIds, setSelectedIds, setSelectionSource,
        sceneObjectMap, resolveSelectionTargetId, isGumballDragging,
        isGizmoDraggingRef,
        isHandleDragging, isHandleHovered, handlesHoveredRef,
        draggingAxis, isScalingHandle, resetInteractionState,
        onBackgroundDoubleClick, onDeselectAll, transformControlsRef
    });

    // 3. Interaction State Callbacks
    const prevHandleDraggingRef = useRef(false);
    useEffect(() => {
        if (isHandleDragging && !prevHandleDraggingRef.current) onInteractionStart?.();
        else if (!isHandleDragging && prevHandleDraggingRef.current) onInteractionEnd?.();
        prevHandleDraggingRef.current = isHandleDragging;
    }, [isHandleDragging, onInteractionStart, onInteractionEnd]);

    const handleGumballDraggingChanged = useCallback((isDragging: boolean) => {
        setIsGumballDragging(isDragging);
        if (isDragging) {
            onInteractionStart?.();
            if (orbitRef.current) orbitRef.current.enabled = false;
        } else {
            if (orbitRef.current) orbitRef.current.enabled = cameraControlsEnabled;
        }
    }, [setIsGumballDragging, onInteractionStart, cameraControlsEnabled]);

    const releaseGumballPointerCapture = useCallback(() => {
        const pointerId = activeGumballPointerIdRef.current;
        if (pointerId === null) return;
        try {
            if (gl.domElement.hasPointerCapture(pointerId)) {
                gl.domElement.releasePointerCapture(pointerId);
            }
        } catch (err) {
            // Ignore release failures when pointer is already gone.
        }
        activeGumballPointerIdRef.current = null;
    }, [gl]);

    useEffect(() => {
        const handlePointerRelease = () => releaseGumballPointerCapture();
        window.addEventListener('pointerup', handlePointerRelease, true);
        window.addEventListener('pointercancel', handlePointerRelease, true);
        window.addEventListener('blur', handlePointerRelease);
        return () => {
            window.removeEventListener('pointerup', handlePointerRelease, true);
            window.removeEventListener('pointercancel', handlePointerRelease, true);
            window.removeEventListener('blur', handlePointerRelease);
        };
    }, [releaseGumballPointerCapture]);

    const handleSelectionCalculated = useCallback((ids: Set<string>) => {
        setSelectedIds(ids);
        setSelectionSource(ids.size > 0 ? 'model' : null);
    }, [setSelectedIds, setSelectionSource]);

    // 4. Real-time Ghost Sync
    useFrame(() => {
        const ghost = ghostRef.current;
        const target = targetRef.current;
        if (!ghost || !target || !selectedIds || selectedIds.size === 0) return;
        if (isGumballDragging || isHandleDragging || transformControlsRef.current?.dragging) return;

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
        ghost.updateMatrixWorld(true);
    });

    // 5. Scene Styling
    useEffect(() => {
        gl.setClearColor(new THREE.Color(isGradientBackground ? 0x000000 : backgroundColor), isGradientBackground ? 0 : 1);
        scene.background = null;
    }, [backgroundColor, isGradientBackground, gl, scene]);

    const selectionLabel = useMemo(() => {
        if (!selectedIds || selectedIds.size !== 1) return null;
        const selectedId = selectedIds.values().next().value;
        if (!selectedId) return null;
        const obj = sceneObjectMap.get(selectedId);
        return obj?.objectNodeType === 'mesh-array' ? (obj.objectLabel || 'Selection Array') : null;
    }, [sceneObjectMap, selectedIds]);

    return (
        <>
            {interactionMode === '3d' && (
                <SelectionLogic
                    selectionRect={(isGumballDragging || isHandleDragging || dragJustFinishedRef.current) ? null : processingRect}
                    sceneObjects={[...sceneObjects, ...build3DAiScopeBoxes.map(b => ({ id: b.id, ref: getBuild3DAiScopeRef(b.id) }))]}
                    onSelectionCalculated={handleSelectionCalculated}
                    firstSelectedAppId={firstSelectedAppId}
                />
            )}
            <GumballObserver 
                controlsRef={transformControlsRef} 
                onDraggingChange={handleGumballDraggingChanged}
            />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <gridHelper args={[20, 20]} userData={{ isSceneBackground: true }} />
            <OrbitControls
                ref={orbitRef}
                makeDefault
                enabled={cameraControlsEnabled}
                domElement={controlsContainerRef.current as HTMLElement}
                mouseButtons={orbitMouseButtons}
                onStart={onInteractionStart}
                onEnd={onInteractionEnd}
            />
            <group ref={selectionGroupRef} />
            <group ref={ghostRef} />
            {sceneObjects.map((obj) => (
                <Model
                    key={obj.id}
                    ref={obj.ref}
                    data={obj}
                    isSelected={selectedIds?.has(obj.id)}
                    highlightEnabled={selectionSource === 'node'}
                />
            ))}
            {build3DAiScopeBoxes.map((scope) => (
                <Build3DAiScopeBox
                    key={scope.id}
                    id={scope.id}
                    position={scope.position}
                    rotation={scope.rotation}
                    scale={scope.scale}
                    scopeRef={getBuild3DAiScopeRef(scope.id)}
                />
            ))}
            {selectedIds && selectedIds.size > 0 && targetRef.current && interactionMode === '3d' && (
                <>
                    {selectionSource === 'model' && !isHandleDragging && !isScalingHandle && draggingAxis === null && (
                        <TransformControls
                            ref={transformControlsRef}
                            userData={{ isSelectionHelper: true, helperType: 'transform-controls-gumball' }}
                            object={ghostRef.current || undefined}
                            mode={isPictureLayerTransformActive ? pictureLayerTransformMode : 'translate'}
                            space={selectedIds.size === 1 ? "local" : "world"}
                            size={isGumballHovering ? 1.2 : 1}
                            onPointerOver={() => {
                                gumballHoveredRef.current = true;
                                setIsGumballHovering(true);
                            }}
                            onPointerOut={() => {
                                // Only reset if not currently dragging to avoid flicker/racing
                                if (!isGumballDragging && !isGizmoDraggingRef.current) {
                                    gumballHoveredRef.current = false;
                                    setIsGumballHovering(false);
                                }
                            }}
                            onPointerDown={(e) => {
                                // Stop both R3F and Native events immediately
                                e.stopPropagation();
                                const nativeEvent = e.nativeEvent as PointerEvent | undefined;
                                nativeEvent?.stopImmediatePropagation();
                                try {
                                    gl.domElement.setPointerCapture(e.pointerId);
                                    activeGumballPointerIdRef.current = e.pointerId;
                                } catch (err) {
                                    // Ignore capture failures.
                                }

                                isGizmoDraggingRef.current = true;
                                gumballHoveredRef.current = true;
                                setIsGumballHovering(true);
                                setIsGumballDragging(true);
                                onInteractionStart?.();
                            }}
                            onMouseUp={() => {
                                commitFinalTransform();
                                releaseGumballPointerCapture();
                                setIsGumballDragging(false);
                                isGizmoDraggingRef.current = false;
                                onInteractionEnd?.();
                            }}
                        />
                    )}
                    {selectionSource === 'model' && !isPictureLayerTransformActive && (
                        <SelectionBox
                            targetRef={targetRef}
                            onHandleInteract={setIsHandleDragging}
                            onHandleHover={setIsHandleHovered}
                            handlesHoveredRef={handlesHoveredRef}
                            onScalingChange={setIsScalingHandle}
                            setDraggingAxis={setDraggingAxis}
                            draggingAxis={draggingAxis}
                            rotationSnapEnabled={rotationSnapEnabled}
                            isDashed={selectedIds.size > 1}
                            isGumballDragging={isGumballDragging}
                            label={selectionLabel}
                            firstSelectedAppId={firstSelectedAppId}
                        />
                    )}
                    <SelectionSnapToggle
                        targetRef={targetRef}
                        enabled={rotationSnapEnabled}
                        setEnabled={setRotationSnapEnabled}
                        visible={!isHandleDragging && !isScalingHandle && draggingAxis === null}
                    />
                </>
            )}
            <GizmoHelper alignment="top-right" margin={[DEFAULT_GIZMO_MARGIN_X, gizmoMarginY]}>
                <mesh position={[0, 0, -0.4]} raycast={() => null}>
                    <planeGeometry args={[2.2, 2.2]} />
                    <meshBasicMaterial map={gizmoBackdropTexture} transparent opacity={0.9} depthWrite={false} depthTest={false} />
                </mesh>
                <GizmoViewcube font="18px Inter, sans-serif" opacity={0.98} color="#2c5fa0" hoverColor="#ffffff" textColor="#ffffff" strokeColor="#0f1e33" />
            </GizmoHelper>
        </>
    );
}
