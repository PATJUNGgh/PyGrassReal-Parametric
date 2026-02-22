import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { Eye, EyeOff, Plus, X } from 'lucide-react';
import type { NodeData, Port, PictureData, PicturePlacement } from '../types/NodeTypes';
import { CustomNode } from './CustomNode';
import { getNodeDefinition } from '../definitions/nodeDefinitions';
import { SceneInteractionContext } from '../context/SceneInteractionContext';
import {
    addOrUpdateLayer,
    applySmoothEdge,
    ensurePictureContainer,
    eraseLayer,
    getPictureSignature,
    toggleLayerVisibility,
    updateLayerTransform,
} from '../utils/pictureMesh';
import styles from './PictureOnMeshNode.module.css';

interface PictureOnMeshNodeProps {
    node: NodeData;
    nodes: NodeData[];
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void;
    onConnectionStart: (nodeId: string, port: string, position: { x: number; y: number }) => void;
    onConnectionComplete: (nodeId: string, port: string) => void;
    connections?: Array<{ id: string; sourceNodeId: string; targetNodeId: string; sourcePort: string; targetPort: string }>;
    onDeleteConnection?: (connectionId: string) => void;
    onDelete?: (nodeId: string) => void;
    isShaking?: boolean;
    selected?: boolean;
    onSelect?: () => void;
    scale?: number;
    isInfected?: boolean;
    interactionMode?: 'node' | '3d' | 'wire';
    onDuplicate?: (id: string) => void;
    parentGroupId?: string;
    overlappingGroupId?: string;
    onJoinGroup?: (nodeId: string, groupId: string) => void;
    onLeaveGroup?: (nodeId: string) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}

const isFiniteNumber = (value: unknown): value is number => {
    return typeof value === 'number' && Number.isFinite(value);
};

const hasPictureContainer = (value: unknown): boolean => {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as { layers?: unknown };
    return Array.isArray(candidate.layers);
};

const normalizeLayerId = (value: unknown): string => {
    if (typeof value !== 'string') return 'default';
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : 'default';
};

const createLayer = (layerId: string) => ({
    id: normalizeLayerId(layerId),
    image: null,
    placements: [],
    visible: true,
});

const getNextLayerId = (pictureData: PictureData): string => {
    const usedIds = new Set(pictureData.layers.map((layer) => layer.id));
    let index = 1;
    while (usedIds.has(`layer-${index}`)) {
        index += 1;
    }
    return `layer-${index}`;
};

const RENDERABLE_NODE_TYPES = new Set<NodeData['type']>([
    'box',
    'sphere',
    'cone',
    'cylinder',
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
    'mesh-array',
    'text-on-mesh',
    'ai-sculpt',
    'ai-paint',
    'custom',
]);

const resolvePlacementFromNodeData = (data: NodeData['data']): PicturePlacement => {
    const locationCandidate = data.location as { x?: unknown; y?: unknown; z?: unknown } | undefined;
    const worldPos = locationCandidate
        && isFiniteNumber(locationCandidate.x)
        && isFiniteNumber(locationCandidate.y)
        && isFiniteNumber(locationCandidate.z)
        ? {
            x: locationCandidate.x,
            y: locationCandidate.y,
            z: locationCandidate.z,
        }
        : undefined;

    const scaleCandidate = data.scale as { x?: unknown; y?: unknown; z?: unknown } | undefined;
    const scale = scaleCandidate
        && isFiniteNumber(scaleCandidate.x)
        && isFiniteNumber(scaleCandidate.y)
        && isFiniteNumber(scaleCandidate.z)
        ? (scaleCandidate.x + scaleCandidate.y + scaleCandidate.z) / 3
        : undefined;

    const rotationCandidate = data.rotation as { z?: unknown } | undefined;
    const rotation = rotationCandidate && isFiniteNumber(rotationCandidate.z)
        ? rotationCandidate.z
        : undefined;

    return {
        worldPos,
        scale,
        rotation,
    };
};

interface PictureResultPayload {
    meshSourceNodeId: string | null;
    layerId: string;
    hasImage: boolean;
    hit: boolean;
    erase: boolean;
    smooth: boolean;
    signature: string;
}

export const PictureOnMeshNode: React.FC<PictureOnMeshNodeProps> = ({
    node,
    nodes,
    onPositionChange,
    onDataChange,
    onConnectionStart,
    onConnectionComplete,
    connections = [],
    onDeleteConnection,
    onDelete,
    isShaking,
    selected = false,
    onSelect,
    scale,
    isInfected = false,
    onDuplicate,
    parentGroupId,
    overlappingGroupId,
    onJoinGroup,
    onLeaveGroup,
}) => {
    const lastResolvedSignatureRef = useRef<string>('');
    const lastHitStateRef = useRef<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const pendingUploadLayerIdRef = useRef<string>('default');
    const lastTransformTokenRef = useRef<number>(0);

    const inputs = (node.data.inputs || []) as Port[];
    const outputs = (node.data.outputs || []) as Port[];
    const sceneInteraction = useContext(SceneInteractionContext);

    const nodeMap = useMemo(() => {
        return new Map(nodes.map((item) => [item.id, item]));
    }, [nodes]);

    const resolveRenderableSourceId = useCallback((candidateNodeId: string, visited: Set<string>): string | null => {
        const visit = (nodeId: string): string | null => {
            if (visited.has(nodeId)) return null;
            visited.add(nodeId);

            const candidate = nodeMap.get(nodeId);
            if (!candidate) return null;
            if (RENDERABLE_NODE_TYPES.has(candidate.type)) {
                return nodeId;
            }

            const incomingConnections = connections.filter((connection) => connection.targetNodeId === nodeId);
            for (const connection of incomingConnections) {
                const resolved = visit(connection.sourceNodeId);
                if (resolved) return resolved;
            }

            return null;
        };

        return visit(candidateNodeId);
    }, [connections, nodeMap]);

    useEffect(() => {
        const nodeDefinition = getNodeDefinition(node.type);
        if (!nodeDefinition) return;

        const { initialData, name: definitionName, icon: definitionIcon } = nodeDefinition;
        const dataUpdate: Partial<NodeData['data']> = {};

        const shouldInitInputs = !node.data.inputs || node.data.inputs.length === 0;
        if (shouldInitInputs) {
            dataUpdate.inputs = initialData?.inputs || [];
        }

        const shouldInitOutputs = !node.data.outputs || node.data.outputs.length === 0;
        if (shouldInitOutputs) {
            dataUpdate.outputs = initialData?.outputs || [];
        }

        const defaultName = initialData?.customName || definitionName;
        if (defaultName && node.data.customName !== defaultName) {
            dataUpdate.customName = defaultName;
        }

        const defaultIcon = initialData?.icon || definitionIcon;
        if (defaultIcon && node.data.icon !== defaultIcon) {
            dataUpdate.icon = defaultIcon;
        }

        if (Object.keys(dataUpdate).length > 0) {
            onDataChange(node.id, dataUpdate);
        }
    }, [
        node.id,
        node.type,
        node.data.inputs,
        node.data.outputs,
        node.data.customName,
        node.data.icon,
        onDataChange,
    ]);

    const resolvedInputs = useMemo(() => {
        const meshConnection = connections.find((connection) => {
            return connection.targetNodeId === node.id && connection.targetPort === 'context-mesh';
        });
        return {
            meshSourceNodeId: meshConnection?.sourceNodeId ?? null,
        };
    }, [connections, node.id]);

    const sourceNode = useMemo(() => {
        if (!resolvedInputs.meshSourceNodeId) return null;
        return nodeMap.get(resolvedInputs.meshSourceNodeId) ?? null;
    }, [nodeMap, resolvedInputs.meshSourceNodeId]);

    const resolvedRenderableMeshNodeId = useMemo(() => {
        if (!resolvedInputs.meshSourceNodeId) return null;
        return resolveRenderableSourceId(resolvedInputs.meshSourceNodeId, new Set<string>());
    }, [resolvedInputs.meshSourceNodeId, resolveRenderableSourceId]);

    const parameters = useMemo(() => {
        return {
            image: typeof node.data.pictureImage === 'string' ? node.data.pictureImage : null,
            hit: node.data.pictureHit === true,
            erase: node.data.pictureErase === true,
            smooth: node.data.pictureSmooth === true,
            layerId: normalizeLayerId(node.data.pictureLayerId),
            placement: resolvePlacementFromNodeData(node.data),
        };
    }, [
        node.data.pictureImage,
        node.data.pictureHit,
        node.data.pictureErase,
        node.data.pictureSmooth,
        node.data.pictureLayerId,
        node.data.location,
        node.data.scale,
        node.data.rotation,
    ]);

    const displayPictureData = useMemo(() => {
        return ensurePictureContainer(sourceNode?.data.pictureData ?? node.data.pictureData);
    }, [sourceNode?.data.pictureData, node.data.pictureData]);

    const activeLayer = useMemo(() => {
        return displayPictureData.layers.find((layer) => layer.id === parameters.layerId) ?? null;
    }, [displayPictureData.layers, parameters.layerId]);

    const activeLayerVisible = activeLayer ? activeLayer.visible !== false : true;
    const pictureLayerTransformMode = sceneInteraction?.pictureLayerTransformMode ?? 'translate';
    const pictureLayerUniformScaleLocked = sceneInteraction?.pictureLayerUniformScaleLocked ?? true;
    const canControlPictureLayerTransform = Boolean(
        sceneInteraction
        && activeLayer
        && resolvedRenderableMeshNodeId
    );

    const stopDragPropagation = useCallback((event: React.SyntheticEvent) => {
        event.stopPropagation();
    }, []);

    const activateMeshSelection = useCallback((targetLayerId?: string) => {
        if (!sceneInteraction || !resolvedRenderableMeshNodeId) return;
        const layerId = normalizeLayerId(targetLayerId ?? node.data.pictureLayerId);
        sceneInteraction.setSelectedIds(new Set([resolvedRenderableMeshNodeId]));
        sceneInteraction.setSelectionSource('model');
        sceneInteraction.setPictureLayerTransformTarget({
            pictureNodeId: node.id,
            renderableNodeId: resolvedRenderableMeshNodeId,
            layerId,
        });
    }, [
        node.data.pictureLayerId,
        node.id,
        resolvedRenderableMeshNodeId,
        sceneInteraction,
    ]);

    const commitPictureData = useCallback((nextPictureData: PictureData, dataUpdate: Partial<NodeData['data']> = {}) => {
        const normalized = ensurePictureContainer(nextPictureData);
        const nextActiveLayerId = normalized.layers.length === 0
            ? null
            : normalizeLayerId(
                dataUpdate.pictureLayerId
                ?? normalized.activeLayerId
                ?? node.data.pictureLayerId
            );
        const pictureDataWithActive: PictureData = {
            ...normalized,
            activeLayerId: nextActiveLayerId,
        };

        if (sourceNode) {
            onDataChange(sourceNode.id, { pictureData: pictureDataWithActive });
        }
        onDataChange(node.id, {
            pictureData: pictureDataWithActive,
            pictureHit: false,
            pictureErase: false,
            ...dataUpdate,
        });
    }, [sourceNode, onDataChange, node.id, node.data.pictureLayerId]);

    const handleSelectLayer = useCallback((layerId: string) => {
        const currentPictureData = ensurePictureContainer(displayPictureData);
        const normalizedLayerId = normalizeLayerId(layerId);
        commitPictureData(
            {
                ...currentPictureData,
                activeLayerId: normalizedLayerId,
            },
            { pictureLayerId: normalizedLayerId },
        );
        activateMeshSelection(normalizedLayerId);
    }, [displayPictureData, commitPictureData, activateMeshSelection]);

    const handleAddLayer = useCallback(() => {
        const currentPictureData = ensurePictureContainer(displayPictureData);
        const nextLayerId = getNextLayerId(currentPictureData);
        const nextPictureData: PictureData = {
            layers: [...currentPictureData.layers, createLayer(nextLayerId)],
            activeLayerId: nextLayerId,
        };
        commitPictureData(nextPictureData, { pictureLayerId: nextLayerId });
        activateMeshSelection(nextLayerId);
    }, [displayPictureData, commitPictureData, activateMeshSelection]);

    const handleDeleteLayer = useCallback((layerId: string) => {
        const currentPictureData = ensurePictureContainer(displayPictureData);
        const nextPictureData = eraseLayer(currentPictureData, layerId);
        const activeLayerId = normalizeLayerId(node.data.pictureLayerId);
        const fallbackLayerId = nextPictureData.layers[0]?.id ?? 'default';
        const nextActiveLayerId = activeLayerId === layerId ? fallbackLayerId : activeLayerId;
        commitPictureData(nextPictureData, {
            pictureLayerId: nextActiveLayerId,
            pictureImage: activeLayerId === layerId ? null : node.data.pictureImage ?? null,
        });
        if (nextPictureData.layers.length > 0) {
            activateMeshSelection(nextActiveLayerId);
        } else if (sceneInteraction?.pictureLayerTransformTarget?.pictureNodeId === node.id) {
            sceneInteraction.setPictureLayerTransformTarget(null);
        }
    }, [
        activateMeshSelection,
        commitPictureData,
        displayPictureData,
        node.data.pictureImage,
        node.data.pictureLayerId,
        node.id,
        sceneInteraction,
    ]);

    const handleToggleLayerVisible = useCallback((layerId: string) => {
        const currentPictureData = ensurePictureContainer(displayPictureData);
        const nextPictureData = toggleLayerVisibility(currentPictureData, layerId);
        commitPictureData(nextPictureData);
    }, [displayPictureData, commitPictureData]);

    const handleToggleActiveLayerVisible = useCallback(() => {
        if (!activeLayer) return;
        const currentPictureData = ensurePictureContainer(displayPictureData);
        const nextPictureData = toggleLayerVisibility(
            currentPictureData,
            activeLayer.id,
            !activeLayerVisible,
        );
        commitPictureData(nextPictureData, { pictureLayerId: activeLayer.id });
    }, [activeLayer, activeLayerVisible, commitPictureData, displayPictureData]);

    const handleSetPictureLayerTransformMode = useCallback((mode: 'translate' | 'rotate' | 'scale') => {
        if (!sceneInteraction) return;
        sceneInteraction.setPictureLayerTransformMode(mode);
        activateMeshSelection(activeLayer?.id);
    }, [activeLayer?.id, activateMeshSelection, sceneInteraction]);

    const handleToggleUniformScaleLock = useCallback(() => {
        if (!sceneInteraction) return;
        sceneInteraction.setPictureLayerUniformScaleLocked(!pictureLayerUniformScaleLocked);
        activateMeshSelection(activeLayer?.id);
    }, [
        activeLayer?.id,
        activateMeshSelection,
        pictureLayerUniformScaleLocked,
        sceneInteraction,
    ]);

    const handlePickImage = useCallback(() => {
        const currentPictureData = ensurePictureContainer(displayPictureData);
        const activeLayerId = normalizeLayerId(node.data.pictureLayerId);
        const hasActiveLayer = currentPictureData.layers.some((layer) => layer.id === activeLayerId);
        const uploadTargetLayerId = hasActiveLayer
            ? activeLayerId
            : (currentPictureData.layers[0]?.id ?? getNextLayerId(currentPictureData));
        pendingUploadLayerIdRef.current = uploadTargetLayerId;
        onDataChange(node.id, { pictureLayerId: uploadTargetLayerId });
        fileInputRef.current?.click();
    }, [displayPictureData, node.data.pictureLayerId, node.id, onDataChange]);

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : null;
            if (!result) return;

            const currentPictureData = ensurePictureContainer(displayPictureData);
            const targetLayerId = normalizeLayerId(
                pendingUploadLayerIdRef.current || node.data.pictureLayerId,
            );
            const hasTargetLayer = currentPictureData.layers.some((layer) => layer.id === targetLayerId);
            const basePictureData = hasTargetLayer
                ? currentPictureData
                : {
                    layers: [...currentPictureData.layers, createLayer(targetLayerId)],
                };

            const nextPictureData = addOrUpdateLayer(
                basePictureData,
                targetLayerId,
                result,
                parameters.placement,
            );
            commitPictureData(nextPictureData, {
                pictureLayerId: targetLayerId,
                pictureImage: result,
            });
            activateMeshSelection(targetLayerId);
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    }, [
        activateMeshSelection,
        commitPictureData,
        displayPictureData,
        node.data.pictureLayerId,
        parameters.placement,
    ]);

    useEffect(() => {
        if (!sceneInteraction) return;
        const activeTarget = sceneInteraction.pictureLayerTransformTarget;
        if (activeTarget?.pictureNodeId !== node.id) return;

        if (!selected || !resolvedRenderableMeshNodeId || !resolvedInputs.meshSourceNodeId) {
            sceneInteraction.setPictureLayerTransformTarget(null);
            return;
        }

        if (activeTarget.renderableNodeId !== resolvedRenderableMeshNodeId) {
            sceneInteraction.setPictureLayerTransformTarget({
                ...activeTarget,
                renderableNodeId: resolvedRenderableMeshNodeId,
            });
        }
    }, [
        node.id,
        resolvedInputs.meshSourceNodeId,
        resolvedRenderableMeshNodeId,
        sceneInteraction,
        selected,
    ]);

    useEffect(() => {
        const transformToken = node.data.pictureTransformToken;
        if (typeof transformToken !== 'number' || !Number.isFinite(transformToken)) return;
        if (transformToken <= lastTransformTokenRef.current) return;

        const patchCandidate = node.data.pictureTransformPatch;
        if (!patchCandidate || typeof patchCandidate !== 'object') return;

        const contextTarget = sceneInteraction?.pictureLayerTransformTarget;
        const targetLayerId = contextTarget?.pictureNodeId === node.id
            ? normalizeLayerId(contextTarget.layerId)
            : normalizeLayerId(node.data.pictureLayerId);
        const nextPictureData = updateLayerTransform(
            ensurePictureContainer(displayPictureData),
            targetLayerId,
            patchCandidate as Partial<PicturePlacement>,
        );

        lastTransformTokenRef.current = transformToken;
        commitPictureData(nextPictureData, { pictureLayerId: targetLayerId });
    }, [
        commitPictureData,
        displayPictureData,
        node.data.pictureLayerId,
        node.data.pictureTransformPatch,
        node.data.pictureTransformToken,
        node.id,
        sceneInteraction,
    ]);

    useEffect(() => {
        const sourcePictureData = ensurePictureContainer(sourceNode?.data.pictureData);
        const sourceHasContainer = hasPictureContainer(sourceNode?.data.pictureData);
        const nodePictureData = ensurePictureContainer(node.data.pictureData);

        const basePictureData = sourceNode
            ? sourcePictureData
            : nodePictureData;
        let nextPictureData = basePictureData;
        const shouldApplyAction = parameters.hit && !lastHitStateRef.current;
        lastHitStateRef.current = parameters.hit;

        if (shouldApplyAction) {
            if (parameters.erase) {
                nextPictureData = eraseLayer(nextPictureData, parameters.layerId);
            } else if (parameters.image) {
                nextPictureData = addOrUpdateLayer(
                    nextPictureData,
                    parameters.layerId,
                    parameters.image,
                    parameters.placement,
                );
            }

            if (parameters.smooth) {
                nextPictureData = applySmoothEdge(nextPictureData, parameters.layerId);
            }
        }

        const nextPictureSignature = getPictureSignature(nextPictureData);
        const currentNodeSignature = getPictureSignature(nodePictureData);
        const currentSourceSignature = getPictureSignature(sourcePictureData);

        const nextResultPayload: PictureResultPayload = {
            meshSourceNodeId: resolvedInputs.meshSourceNodeId,
            layerId: parameters.layerId,
            hasImage: Boolean(parameters.image),
            hit: parameters.hit,
            erase: parameters.erase,
            smooth: parameters.smooth,
            signature: nextPictureSignature,
        };

        const currentResult = node.data.pictureResult as Partial<PictureResultPayload> | undefined;
        const currentResultSignature = JSON.stringify({
            meshSourceNodeId: currentResult?.meshSourceNodeId ?? null,
            layerId: currentResult?.layerId ?? 'default',
            hasImage: currentResult?.hasImage === true,
            hit: currentResult?.hit === true,
            erase: currentResult?.erase === true,
            smooth: currentResult?.smooth === true,
            signature: typeof currentResult?.signature === 'string' ? currentResult.signature : currentNodeSignature,
        });
        const nextResultSignature = JSON.stringify(nextResultPayload);

        if (sourceNode && (!sourceHasContainer || nextPictureSignature !== currentSourceSignature)) {
            onDataChange(sourceNode.id, { pictureData: nextPictureData });
        }

        const shouldUpdateNodeData = nextPictureSignature !== currentNodeSignature
            || nextResultSignature !== currentResultSignature;
        if (!shouldUpdateNodeData) return;

        const mergedSignature = `${nextPictureSignature}|${nextResultSignature}`;
        if (mergedSignature === lastResolvedSignatureRef.current) return;

        lastResolvedSignatureRef.current = mergedSignature;
        onDataChange(node.id, {
            pictureData: nextPictureData,
            pictureResult: nextResultPayload,
        });
    }, [
        node.id,
        node.data.pictureData,
        node.data.pictureResult,
        onDataChange,
        parameters,
        resolvedInputs.meshSourceNodeId,
        sourceNode,
    ]);

    return (
        <CustomNode
            id={node.id}
            data={{
                ...node.data,
                customName: node.data.customName || 'Picture on Mesh',
                isNameEditable: false,
                inputs,
                outputs,
                width: 300,
                minWidth: 300,
                height: undefined,
                bodyPadding: '14px 20px 10px 0px',
                bodyMinHeight: 120,
                hideInputsAdd: true,
                hideInputsHeader: true,
                hideOutputsAdd: true,
                hideOutputsHeader: true,
                hidePortLabels: true,
                hidePortControls: true,
                hideModifierMenu: true,
                inputsAreaWidth: 1,
                inputPortOffsetLeft: -10,
                inputRowMinHeight: 20,
                inputRowPaddingY: 0,
            }}
            position={node.position}
            selected={selected}
            onPositionChange={onPositionChange}
            onDataChange={onDataChange}
            onDelete={onDelete ?? (() => { })}
            onConnectionStart={onConnectionStart}
            onConnectionComplete={onConnectionComplete}
            connections={connections}
            onDeleteConnection={onDeleteConnection}
            isShaking={isShaking}
            onSelect={onSelect}
            scale={scale}
            isInfected={isInfected}
            onDuplicate={onDuplicate}
            parentGroupId={parentGroupId}
            overlappingGroupId={overlappingGroupId}
            onJoinGroup={onJoinGroup}
            onLeaveGroup={onLeaveGroup}
            nodeType="picture-on-mesh"
        >
            <div
                className={styles.container}
                onMouseDown={stopDragPropagation}
                onPointerDown={stopDragPropagation}
            >
                <div className={styles.toolbarRow}>
                    <button
                        type="button"
                        className={styles.button}
                        onMouseDown={stopDragPropagation}
                        onPointerDown={stopDragPropagation}
                        onClick={handlePickImage}
                    >
                        Upload Image
                    </button>
                    <button
                        type="button"
                        className={styles.iconButton}
                        onMouseDown={stopDragPropagation}
                        onPointerDown={stopDragPropagation}
                        onClick={handleAddLayer}
                        title="Add Layer"
                    >
                        <Plus size={14} strokeWidth={2.5} />
                    </button>
                    <button
                        type="button"
                        className={styles.iconButton}
                        onMouseDown={stopDragPropagation}
                        onPointerDown={stopDragPropagation}
                        onClick={handleToggleActiveLayerVisible}
                        title="Toggle Active Layer Visibility"
                        disabled={!activeLayer}
                    >
                        {activeLayerVisible ? (
                            <Eye size={14} strokeWidth={2.3} />
                        ) : (
                            <EyeOff size={14} strokeWidth={2.3} />
                        )}
                    </button>
                    <div className={styles.modeGroup}>
                        <button
                            type="button"
                            className={`${styles.modeButton} ${pictureLayerTransformMode === 'translate' ? styles.modeButtonActive : ''}`}
                            onMouseDown={stopDragPropagation}
                            onPointerDown={stopDragPropagation}
                            onClick={() => handleSetPictureLayerTransformMode('translate')}
                            title="Move (W)"
                            disabled={!canControlPictureLayerTransform}
                        >
                            W
                        </button>
                        <button
                            type="button"
                            className={`${styles.modeButton} ${pictureLayerTransformMode === 'rotate' ? styles.modeButtonActive : ''}`}
                            onMouseDown={stopDragPropagation}
                            onPointerDown={stopDragPropagation}
                            onClick={() => handleSetPictureLayerTransformMode('rotate')}
                            title="Rotate (E)"
                            disabled={!canControlPictureLayerTransform}
                        >
                            E
                        </button>
                        <button
                            type="button"
                            className={`${styles.modeButton} ${pictureLayerTransformMode === 'scale' ? styles.modeButtonActive : ''}`}
                            onMouseDown={stopDragPropagation}
                            onPointerDown={stopDragPropagation}
                            onClick={() => handleSetPictureLayerTransformMode('scale')}
                            title="Scale (R)"
                            disabled={!canControlPictureLayerTransform}
                        >
                            R
                        </button>
                        <button
                            type="button"
                            className={`${styles.modeButton} ${pictureLayerUniformScaleLocked ? styles.modeButtonActive : ''}`}
                            onMouseDown={stopDragPropagation}
                            onPointerDown={stopDragPropagation}
                            onClick={handleToggleUniformScaleLock}
                            title="Uniform Scale Lock"
                            disabled={!canControlPictureLayerTransform}
                        >
                            U
                        </button>
                    </div>
                </div>

                <div className={styles.layerTable}>
                    <div className={styles.tableHeader}>
                        <span>Layer</span>
                        <span>V</span>
                        <span>X</span>
                    </div>
                    <div className={styles.tableBody}>
                        {displayPictureData.layers.length === 0 ? (
                            <div className={styles.emptyState}>
                                No layers yet
                            </div>
                        ) : (
                            displayPictureData.layers.map((layer) => {
                                const isSelected = layer.id === parameters.layerId;
                                const isVisible = layer.visible !== false;
                                return (
                                    <div
                                        key={layer.id}
                                        className={`${styles.layerRow} ${isSelected ? styles.layerRowActive : ''}`}
                                        onMouseDown={stopDragPropagation}
                                        onPointerDown={stopDragPropagation}
                                        onClick={() => handleSelectLayer(layer.id)}
                                    >
                                        <div className={styles.layerCell}>
                                            <span className={styles.layerName}>{layer.id}</span>
                                            <span className={styles.layerMeta}>
                                                {layer.image ? 'img' : 'empty'} | {layer.placements.length}
                                            </span>
                                        </div>
                                        <label className={styles.switchCell}>
                                            <input
                                                type="checkbox"
                                                checked={isVisible}
                                                onMouseDown={stopDragPropagation}
                                                onPointerDown={stopDragPropagation}
                                                onChange={() => handleToggleLayerVisible(layer.id)}
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            className={styles.deleteButton}
                                            onMouseDown={stopDragPropagation}
                                            onPointerDown={stopDragPropagation}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleDeleteLayer(layer.id);
                                            }}
                                        >
                                            <X size={12} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className={styles.hiddenInput}
                    onMouseDown={stopDragPropagation}
                    onPointerDown={stopDragPropagation}
                    onChange={handleFileChange}
                />
            </div>
        </CustomNode>
    );
};
