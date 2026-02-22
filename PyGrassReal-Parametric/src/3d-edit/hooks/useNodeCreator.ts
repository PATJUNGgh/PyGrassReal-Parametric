import { useCallback } from 'react';
import type { NodeData } from '../types/NodeTypes';
import { getNodeDefinition } from '../definitions/nodeDefinitions';
import { findNonOverlappingPosition } from '../utils/findNonOverlappingPosition';
import {
    BACKGROUND_NODE_OUTPUT_AUTOCONNECT_TARGET,
    BACKGROUND_NODE_OUTPUT_SOURCE_NODE_TYPE,
    BACKGROUND_NODE_OUTPUT_SOURCE_PORT,
    AI_MASK_TARGET_NODE_TYPES,
    AI_MESH_INPUT_WHITELIST_SET,
    AI_MESH_OUTPUT_AUTOCONNECT_TARGET_PORT,
    AI_MESH_OUTPUT_SOURCE_NODE_TYPES,
    AI_MESH_OUTPUT_SOURCE_PORT,
    getAllowedTypesForOutput,
    getAiMeshOutputAllowedTypes,
    getFirstMeshOutputPortId,
    INSPECTOR_OUTPUT_SOURCE_NODE_TYPE,
    INSPECTOR_OUTPUT_SOURCE_PORT,
    NUMBER_SLIDER_OUTPUT_AUTOCONNECT_TARGET_PORT,
    NUMBER_SLIDER_OUTPUT_SOURCE_NODE_TYPE,
    NUMBER_SLIDER_OUTPUT_SOURCE_PORT,
    TEXT_ON_MESH_OUTPUT_AUTOCONNECT_TARGET,
    TEXT_ON_MESH_OUTPUT_SOURCE_NODE_TYPE,
    TEXT_ON_MESH_OUTPUT_SOURCE_PORT,
    LAYER_SOURCE_OUTPUT_AUTOCONNECT_TARGET_PORT,
    MESH_BOOLEAN_OUTPUT_AUTOCONNECT_TARGET_PORT,
    MESH_BOOLEAN_OUTPUT_SOURCE_NODE_TYPES,
    MESH_BOOLEAN_OUTPUT_SOURCE_PORT,
    PROMPT_NODE_OUTPUT_AUTOCONNECT_TARGET,
    PROMPT_NODE_OUTPUT_SOURCE_NODE_TYPE,
    PROMPT_NODE_OUTPUT_SOURCE_PORT,
    TEXT_DATA_OUTPUT_AUTOCONNECT_TARGET,
    TEXT_DATA_OUTPUT_SOURCE_NODE_TYPE,
    TEXT_DATA_OUTPUT_SOURCE_PORT,
    AI_ASSISTANT_OUTPUT_SOURCE_NODE_TYPE,
    AI_ASSISTANT_OUTPUT_SOURCE_PORT,
    VIEWPORT_NODE_OUTPUT_AUTOCONNECT_TARGET,
    VIEWPORT_NODE_OUTPUT_SOURCE_NODE_TYPE,
    VIEWPORT_NODE_OUTPUT_SOURCE_PORT,
    TRANSFORM_MATRIX_OUTPUT_WHITELIST_SET,
    LAYER_BRIDGE_INPUT_WHITELIST,
    isLayerBridgeInputPort,
    VERTEX_MASK_BOOLEAN_INPUT_PORTS,
    VERTEX_MASK_GHOST_WHITELIST_SET,
    VERTEX_MASK_GHOST_X_OFFSET,
    VERTEX_MASK_OUTPUT_PORT,
    VERTEX_MASK_TARGET_INPUT_PORT
} from '../utils/canvasUtils';

interface UseNodeCreatorProps {
    nodes: NodeData[];
    addNode: (type: NodeData['type'], position: { x: number; y: number; }, options?: {
        editorOrigin?: 'nodes' | 'widget',
        initialData?: Partial<NodeData['data']>,
        initialConnections?: Array<{
            sourceNodeId?: string;
            sourcePort: string;
            targetNodeId?: string;
            targetPort: string;
        }>
    }) => string | undefined;
    hideSearchBox: () => void;
    scale: number;
    offset: { x: number; y: number };
    newNodeCategory?: 'nodes' | 'widget';
}

const INSPECTOR_AUTOCONNECT_MAP: Partial<Record<NodeData['type'], string>> = {
    'ai-sculpt': 'input-plan',
    'ai-paint': 'input-plan',
    'panel': 'input-main',
    'output': 'input-1',
};

const AI_ASSISTANT_AUTOCONNECT_MAP: Partial<Record<NodeData['type'], string>> = {
    'widget-window': 'input-1',
    'layer-source': 'input-1',
};

export const useNodeCreator = ({
    nodes,
    addNode,
    hideSearchBox,
    scale,
    offset,
    newNodeCategory,
}: UseNodeCreatorProps) => {
    const handleNodeCreationFromSearch = useCallback((
        type: NodeData['type'],
        searchBoxPos: { x: number; y: number },
        searchBoxContext: { sourceNodeId: string, sourcePortId: string } | null
    ) => {
        // 1) Candidate position from mouse drop point in canvas units.
        const rawX = (searchBoxPos.x - offset.x) / scale;
        const rawY = (searchBoxPos.y - offset.y) / scale;
        const searchSourceNode = searchBoxContext
            ? nodes.find(n => n.id === searchBoxContext.sourceNodeId)
            : undefined;
        const searchSourceDef = searchSourceNode
            ? getNodeDefinition(searchSourceNode.type)
            : undefined;
        const searchSourcePortId = searchBoxContext?.sourcePortId ?? '';
        const searchSourceInputs = searchSourceNode?.data.inputs ?? searchSourceDef?.initialData.inputs ?? [];
        const searchSourceOutputs = searchSourceNode?.data.outputs ?? searchSourceDef?.initialData.outputs ?? [];
        const isSearchSourceInput = searchSourcePortId
            ? searchSourceInputs.some(input => input.id === searchSourcePortId)
            : false;
        const isSearchSourceOutput = searchSourcePortId
            ? searchSourceOutputs.some(
                output => output.id === searchSourcePortId
            )
            : false;

        // Determine editor origin for the new node
        let editorOrigin = newNodeCategory;
        if (searchSourceNode) {
            editorOrigin = searchSourceNode.data.editorOrigin || 'nodes';
        }

        const isVertexMaskMaskMarkOutputContext =
            searchSourceNode?.type === 'vertex-mask' &&
            searchSourcePortId === VERTEX_MASK_OUTPUT_PORT &&
            isSearchSourceOutput;
        const isLayerSourceOutputContext =
            searchSourceNode?.type === 'layer-source' &&
            isSearchSourceOutput;
        const isLayerBridgeInputContext =
            searchSourceNode?.type === 'layer-bridge' &&
            isSearchSourceInput &&
            isLayerBridgeInputPort(searchSourcePortId);
        const isMeshBooleanOutputContext =
            !!searchSourceNode &&
            MESH_BOOLEAN_OUTPUT_SOURCE_NODE_TYPES.has(searchSourceNode.type) &&
            searchSourcePortId === MESH_BOOLEAN_OUTPUT_SOURCE_PORT &&
            isSearchSourceOutput;
        const isTextDataOutputContext =
            searchSourceNode?.type === TEXT_DATA_OUTPUT_SOURCE_NODE_TYPE &&
            searchSourcePortId === TEXT_DATA_OUTPUT_SOURCE_PORT &&
            isSearchSourceOutput;
        const isPromptOutputContext =
            searchSourceNode?.type === PROMPT_NODE_OUTPUT_SOURCE_NODE_TYPE &&
            searchSourcePortId === PROMPT_NODE_OUTPUT_SOURCE_PORT &&
            isSearchSourceOutput;
        const isBackgroundOutputContext =
            searchSourceNode?.type === BACKGROUND_NODE_OUTPUT_SOURCE_NODE_TYPE &&
            searchSourcePortId === BACKGROUND_NODE_OUTPUT_SOURCE_PORT &&
            isSearchSourceOutput;
        const isInspectorOutputContext =
            searchSourceNode?.type === INSPECTOR_OUTPUT_SOURCE_NODE_TYPE &&
            searchSourcePortId === INSPECTOR_OUTPUT_SOURCE_PORT &&
            isSearchSourceOutput;
        const isAiAssistantOutputContext =
            searchSourceNode?.type === AI_ASSISTANT_OUTPUT_SOURCE_NODE_TYPE &&
            searchSourcePortId === AI_ASSISTANT_OUTPUT_SOURCE_PORT &&
            isSearchSourceOutput;
        const isNumberSliderOutputContext =
            searchSourceNode?.type === NUMBER_SLIDER_OUTPUT_SOURCE_NODE_TYPE &&
            searchSourcePortId === NUMBER_SLIDER_OUTPUT_SOURCE_PORT &&
            isSearchSourceOutput;
        const isTextOnMeshOutputContext =
            searchSourceNode?.type === TEXT_ON_MESH_OUTPUT_SOURCE_NODE_TYPE &&
            searchSourcePortId === TEXT_ON_MESH_OUTPUT_SOURCE_PORT &&
            isSearchSourceOutput;
        const isViewportOutputContext =
            searchSourceNode?.type === VIEWPORT_NODE_OUTPUT_SOURCE_NODE_TYPE &&
            searchSourcePortId === VIEWPORT_NODE_OUTPUT_SOURCE_PORT &&
            isSearchSourceOutput;
        const sourceOutputAllowedTypeSet = new Set<NodeData['type']>(
            (isSearchSourceOutput && searchSourceNode)
                ? (getAllowedTypesForOutput(searchSourceNode, searchSourcePortId) ?? [])
                : []
        );

        // 2) Use node definition size to compute overlap bounds.
        const newNodeDefinition = getNodeDefinition(type);
        const newNodeWidth = (newNodeDefinition?.initialData.width && newNodeDefinition.initialData.width > 1)
            ? newNodeDefinition.initialData.width
            : 280;
        const newNodeHeight = (newNodeDefinition?.initialData.height && newNodeDefinition.initialData.height > 1)
            ? newNodeDefinition.initialData.height
            : 220;

        // 3) Build existing node rectangles.
        const existingRects = nodes.map((node) => ({
            x: node.position.x,
            y: node.position.y,
            w: (node.data.width && node.data.width > 1) ? node.data.width : 280,
            h: (node.data.height && node.data.height > 1) ? node.data.height : 220,
        }));
        const preferredPosition =
            isVertexMaskMaskMarkOutputContext &&
                VERTEX_MASK_GHOST_WHITELIST_SET.has(type) &&
                searchSourceNode
                ? {
                    x: searchSourceNode.position.x + VERTEX_MASK_GHOST_X_OFFSET,
                    y: searchSourceNode.position.y
                }
                : { x: rawX, y: rawY };

        // 4) Move candidate to nearest non-overlapping position when needed.
        const { x: unitX, y: unitY } = findNonOverlappingPosition(
            preferredPosition,
            { w: newNodeWidth, h: newNodeHeight },
            existingRects
        );

        if (searchBoxContext && searchSourceNode && isLayerBridgeInputContext) {
            if (!LAYER_BRIDGE_INPUT_WHITELIST.includes(type) || type !== 'layer-source') {
                hideSearchBox();
                return;
            }

            addNode('layer-source', { x: unitX, y: unitY }, {
                editorOrigin,
                initialConnections: [{
                    sourcePort: 'output-1',
                    targetNodeId: searchSourceNode.id,
                    targetPort: searchSourcePortId,
                }]
            });
            hideSearchBox();
            return;
        }

        if (searchBoxContext && searchSourceNode && (
            isLayerSourceOutputContext ||
            isMeshBooleanOutputContext ||
            isTextDataOutputContext ||
            isPromptOutputContext ||
            isBackgroundOutputContext ||
            isInspectorOutputContext ||
            isAiAssistantOutputContext ||
            isNumberSliderOutputContext ||
            isTextOnMeshOutputContext ||
            isViewportOutputContext
        )) {
            if (!sourceOutputAllowedTypeSet.has(type)) {
                hideSearchBox();
                return;
            }

            const targetPort = isMeshBooleanOutputContext
                ? MESH_BOOLEAN_OUTPUT_AUTOCONNECT_TARGET_PORT[type]
                : isLayerSourceOutputContext
                    ? LAYER_SOURCE_OUTPUT_AUTOCONNECT_TARGET_PORT[type]
                    : isTextDataOutputContext
                        ? TEXT_DATA_OUTPUT_AUTOCONNECT_TARGET[type]
                        : isPromptOutputContext
                            ? PROMPT_NODE_OUTPUT_AUTOCONNECT_TARGET[type]
                            : isBackgroundOutputContext
                                ? BACKGROUND_NODE_OUTPUT_AUTOCONNECT_TARGET[type]
                                    : isAiAssistantOutputContext
                                        ? AI_ASSISTANT_AUTOCONNECT_MAP[type]
                                    : isNumberSliderOutputContext
                                        ? NUMBER_SLIDER_OUTPUT_AUTOCONNECT_TARGET_PORT[type]
                                    : isTextOnMeshOutputContext
                                        ? TEXT_ON_MESH_OUTPUT_AUTOCONNECT_TARGET[type]
                                    : isViewportOutputContext
                                        ? VIEWPORT_NODE_OUTPUT_AUTOCONNECT_TARGET[type]
                                        : INSPECTOR_AUTOCONNECT_MAP[type];
            if (!targetPort) {
                if (isInspectorOutputContext) {
                    addNode(type, { x: unitX, y: unitY }, { editorOrigin });
                    hideSearchBox();
                    return;
                }
                hideSearchBox();
                return;
            }

            addNode(type, { x: unitX, y: unitY }, {
                editorOrigin,
                initialConnections: [{
                    sourceNodeId: searchBoxContext.sourceNodeId,
                    sourcePort: searchSourcePortId,
                    targetPort,
                }]
            });
            hideSearchBox();
            return;
        }

        if (searchBoxContext && type === 'panel') {
            const sourceNode = nodes.find(n => n.id === searchBoxContext.sourceNodeId);
            if (sourceNode?.type === 'boolean-toggle') {
                addNode('panel', { x: unitX, y: unitY }, {
                    editorOrigin,
                    initialConnections: [{
                        sourceNodeId: sourceNode.id,
                        sourcePort: searchBoxContext.sourcePortId || 'out_1',
                        targetPort: 'input-main',
                    }]
                });
                hideSearchBox();
                return;
            }
        }

        // SPECIAL HANDLING: Inspector chain when selecting Inspector from an input-port drag.
        if (searchBoxContext && type === 'panel') {
            const sourceNode = nodes.find(n => n.id === searchBoxContext.sourceNodeId);
            const sourceDef = sourceNode ? getNodeDefinition(sourceNode.type) : undefined;
            const isDraggedFromInput = sourceDef?.initialData.inputs?.some(
                input => input.id === searchBoxContext.sourcePortId
            ) ?? false;
            const isBuild3dScopeInput =
                sourceNode?.type === 'build-3d-ai' && searchBoxContext.sourcePortId === 'input-scope';
            const isAiPlanInputContext =
                !!sourceNode &&
                AI_MASK_TARGET_NODE_TYPES.has(sourceNode.type) &&
                searchBoxContext.sourcePortId === 'input-plan';

            const spawnInspectorChain = (
                connectSourceFromSecondInspector: boolean,
                inspector2YOffset: number,
                isAiPlanChain: boolean
            ) => {
                const getNodeSize = (nodeType: NodeData['type']) => {
                    const def = getNodeDefinition(nodeType);
                    return {
                        w: (def?.initialData.width && def.initialData.width > 1) ? def.initialData.width : 280,
                        h: (def?.initialData.height && def.initialData.height > 1) ? def.initialData.height : 220,
                    };
                };

                const occupiedRects = [...existingRects];
                const placeNode = (nodeType: NodeData['type'], preferred: { x: number; y: number }) => {
                    const size = getNodeSize(nodeType);
                    const pos = findNonOverlappingPosition(preferred, size, occupiedRects);
                    occupiedRects.push({ x: pos.x, y: pos.y, w: size.w, h: size.h });
                    return pos;
                };

                const inspector1Pos = placeNode('panel', { x: unitX, y: unitY });
                const inspector2Pos = placeNode('panel', {
                    x: isAiPlanChain ? inspector1Pos.x - 320 : inspector1Pos.x + 320,
                    y: inspector1Pos.y + inspector2YOffset
                });
                const textPos = placeNode('node-prompt', {
                    x: isAiPlanChain ? inspector2Pos.x - 320 : inspector1Pos.x - 320,
                    y: isAiPlanChain ? inspector2Pos.y : inspector1Pos.y
                });

                const textNodeId = addNode('node-prompt', textPos, { editorOrigin });
                if (!textNodeId || !sourceNode) {
                    return;
                }

                if (isAiPlanChain) {
                    const inspector2Id = addNode('panel', inspector2Pos, {
                        editorOrigin,
                        initialConnections: [
                            {
                                sourceNodeId: textNodeId,
                                sourcePort: 'output-prompt',
                                targetPort: 'input-main'
                            }
                        ]
                    });

                    if (inspector2Id) {
                        addNode('panel', inspector1Pos, {
                            editorOrigin,
                            initialConnections: [
                                {
                                    sourceNodeId: inspector2Id,
                                    sourcePort: 'output-main',
                                    targetPort: 'input-main'
                                },
                                {
                                    sourcePort: 'output-main',
                                    targetNodeId: searchBoxContext.sourceNodeId,
                                    targetPort: searchBoxContext.sourcePortId
                                }
                            ]
                        });
                    }
                    return;
                }

                const inspector1Id = addNode('panel', inspector1Pos, {
                    editorOrigin,
                    initialConnections: [
                        {
                            sourceNodeId: textNodeId,
                            sourcePort: 'output-prompt',
                            targetPort: 'input-main'
                        },
                        ...(!connectSourceFromSecondInspector
                            ? [{
                                sourcePort: 'output-main',
                                targetNodeId: searchBoxContext.sourceNodeId,
                                targetPort: searchBoxContext.sourcePortId
                            }]
                            : []),
                    ]
                });

                if (inspector1Id) {
                    addNode('panel', inspector2Pos, {
                        editorOrigin,
                        initialConnections: [
                            {
                                sourceNodeId: inspector1Id,
                                sourcePort: 'output-main',
                                targetPort: 'input-main'
                            },
                            ...(connectSourceFromSecondInspector
                                ? [{
                                    sourcePort: 'output-main',
                                    targetNodeId: searchBoxContext.sourceNodeId,
                                    targetPort: searchBoxContext.sourcePortId
                                }]
                                : [])
                        ]
                    });
                }
            };

            if (sourceNode && isDraggedFromInput) {
                // AI Plan keeps Inspector B horizontally aligned; other flows keep a slight vertical offset.
                const inspector2YOffset = isAiPlanInputContext ? 0 : 50;
                spawnInspectorChain(isBuild3dScopeInput, inspector2YOffset, isAiPlanInputContext);

                hideSearchBox();
                return;
            }
        }

        if (searchBoxContext && type === 'boolean-toggle') {
            const sourceNode = nodes.find(n => n.id === searchBoxContext.sourceNodeId);
            const sourceDef = sourceNode ? getNodeDefinition(sourceNode.type) : undefined;
            const isDraggedFromInput = sourceDef?.initialData.inputs?.some(
                input => input.id === searchBoxContext.sourcePortId
            ) ?? false;
            const isVertexMaskBooleanInput =
                sourceNode?.type === 'vertex-mask' &&
                isDraggedFromInput &&
                VERTEX_MASK_BOOLEAN_INPUT_PORTS.has(searchBoxContext.sourcePortId);

            if (sourceNode && isVertexMaskBooleanInput) {
                const toggleDefinition = getNodeDefinition('boolean-toggle');
                const toggleWidth = Math.max(
                    (toggleDefinition?.initialData.width && toggleDefinition.initialData.width > 1)
                        ? toggleDefinition.initialData.width
                        : 230,
                    230
                );
                const toggleHeight = (toggleDefinition?.initialData.height && toggleDefinition.initialData.height > 1)
                    ? toggleDefinition.initialData.height
                    : 100;
                const togglePosition = findNonOverlappingPosition(
                    { x: sourceNode.position.x - 250, y: sourceNode.position.y },
                    { w: toggleWidth, h: toggleHeight },
                    existingRects
                );
                const initialData = {
                    customName: 'Hit / Erase Toggle',
                    value: true,
                    toggles: [
                        { id: 'toggle_1', value: true },
                        { id: 'toggle_2', value: false }
                    ],
                    toggleNextId: 3,
                    outputs: [
                        { id: 'out_1', label: 'Bool #1', type: 'Boolean' },
                        { id: 'out_2', label: 'Bool #2', type: 'Boolean' }
                    ]
                };
                const initialConnections = [
                    { sourcePort: 'out_1', targetNodeId: sourceNode.id, targetPort: 'input-hit' },
                    { sourcePort: 'out_2', targetNodeId: sourceNode.id, targetPort: 'input-erase' }
                ];

                addNode('boolean-toggle', togglePosition, {
                    editorOrigin,
                    initialData,
                    initialConnections
                });

                hideSearchBox();
                return;
            }
        }

        // SPECIAL HANDLING: If creating a Slider for Vector XYZ, create 1 node with 3 sliders
        if (searchBoxContext && type === 'number-slider') {
            const sourceNode = nodes.find(n => n.id === searchBoxContext.sourceNodeId);
            const sourceDef = sourceNode ? getNodeDefinition(sourceNode.type) : undefined;
            const isDraggedFromInput = sourceDef?.initialData.inputs?.some(
                input => input.id === searchBoxContext.sourcePortId
            ) ?? false;
            const isConeNumericInput =
                sourceNode?.type === 'cone' && new Set(['input-radius', 'input-length', 'input-corner']).has(searchBoxContext.sourcePortId);
            const isTextOnMeshNumericInput =
                sourceNode?.type === 'text-on-mesh' &&
                new Set(['input-height', 'input-depth']).has(searchBoxContext.sourcePortId);
            const isVertexMaskNumericInput =
                sourceNode?.type === 'vertex-mask' &&
                isDraggedFromInput &&
                new Set(['input-radius', 'input-smooth']).has(searchBoxContext.sourcePortId);

            if (sourceNode && isVertexMaskNumericInput) {
                const sliderDefinition = getNodeDefinition('number-slider');
                const sliderWidth = (sliderDefinition?.initialData.width && sliderDefinition.initialData.width > 1)
                    ? sliderDefinition.initialData.width
                    : 420;
                const sliderHeight = (sliderDefinition?.initialData.height && sliderDefinition.initialData.height > 1)
                    ? sliderDefinition.initialData.height
                    : 190;
                const sliderPosition = findNonOverlappingPosition(
                    { x: sourceNode.position.x - 300, y: sourceNode.position.y },
                    { w: sliderWidth, h: sliderHeight },
                    existingRects
                );
                const initialData = {
                    customName: 'Brush Settings',
                    useGlobalConfig: true,
                    globalMin: 0,
                    globalMax: 1,
                    globalStep: 0.01,
                    sliders: [
                        { id: 'slider-1', value: 0.1, min: 0, max: 1, step: 0.01 },
                        { id: 'slider-2', value: 0, min: 0, max: 1, step: 1 }
                    ],
                    value: [0.1, 0]
                };
                const initialConnections = [
                    { sourcePort: 'output-main', targetNodeId: sourceNode.id, targetPort: 'input-radius' },
                    { sourcePort: 'output-2', targetNodeId: sourceNode.id, targetPort: 'input-smooth' }
                ];

                addNode('number-slider', sliderPosition, {
                    editorOrigin,
                    initialData,
                    initialConnections
                });

                hideSearchBox();
                return;
            }

            if (sourceNode && isConeNumericInput) {
                const initialData = {
                    customName: 'Cone Params',
                    useGlobalConfig: false,
                    sliders: [
                        { id: 'slider-1', value: 1.0, min: 0, max: 10, step: 0.1 },
                        { id: 'slider-2', value: 2.0, min: 0, max: 10, step: 0.1 },
                        { id: 'slider-3', value: 0.0, min: 0, max: 1, step: 0.1 }
                    ],
                    value: [1.0, 2.0, 0.0]
                };

                const initialConnections = [
                    { sourcePort: 'output-main', targetNodeId: sourceNode.id, targetPort: 'input-radius' },
                    { sourcePort: 'output-2', targetNodeId: sourceNode.id, targetPort: 'input-length' },
                    { sourcePort: 'output-3', targetNodeId: sourceNode.id, targetPort: 'input-corner' }
                ];

                addNode('number-slider', { x: unitX, y: unitY }, {
                    editorOrigin,
                    initialData,
                    initialConnections
                });

                hideSearchBox();
                return;
            }

            if (sourceNode && isTextOnMeshNumericInput) {
                const textHeight = Number.isFinite(sourceNode.data.textHeight) ? Number(sourceNode.data.textHeight) : 10;
                const textDepth = Number.isFinite(sourceNode.data.textDepth) ? Number(sourceNode.data.textDepth) : 2;
                const sliderDefinition = getNodeDefinition('number-slider');
                const sliderWidth = (sliderDefinition?.initialData.width && sliderDefinition.initialData.width > 1)
                    ? sliderDefinition.initialData.width
                    : 420;
                const sliderHeight = (sliderDefinition?.initialData.height && sliderDefinition.initialData.height > 1)
                    ? sliderDefinition.initialData.height
                    : 190;
                const sliderPosition = findNonOverlappingPosition(
                    { x: sourceNode.position.x - 250, y: sourceNode.position.y },
                    { w: sliderWidth, h: sliderHeight },
                    existingRects
                );
                const initialData = {
                    customName: 'Text Size',
                    useGlobalConfig: true,
                    globalMin: 0,
                    globalMax: 100,
                    globalStep: 0.1,
                    sliders: [
                        { id: 'slider-1', value: textHeight, min: 0, max: 100, step: 0.1 },
                        { id: 'slider-2', value: textDepth, min: 0, max: 100, step: 0.1 }
                    ],
                    value: [textHeight, textDepth]
                };
                const initialConnections = [
                    { sourcePort: 'output-main', targetNodeId: sourceNode.id, targetPort: 'input-height' },
                    { sourcePort: 'output-2', targetNodeId: sourceNode.id, targetPort: 'input-depth' }
                ];

                addNode('number-slider', sliderPosition, {
                    editorOrigin,
                    initialData,
                    initialConnections
                });

                hideSearchBox();
                return;
            }

            if (sourceNode?.type === 'vector-xyz' && ['X', 'Y', 'Z'].includes(searchBoxContext.sourcePortId)) {
                const initialData = {
                    customName: 'Vector Inputs',
                    useGlobalConfig: true,
                    globalMin: 0,
                    globalMax: 100,
                    globalStep: 1,
                    sliders: [
                        { id: 'slider-1', value: 0, min: 0, max: 100, step: 1 },
                        { id: 'slider-2', value: 0, min: 0, max: 100, step: 1 },
                        { id: 'slider-3', value: 0, min: 0, max: 100, step: 1 }
                    ]
                };

                const initialConnections = [
                    { sourcePort: 'output-main', targetNodeId: sourceNode.id, targetPort: 'X' },
                    { sourcePort: 'output-2', targetNodeId: sourceNode.id, targetPort: 'Y' },
                    { sourcePort: 'output-3', targetNodeId: sourceNode.id, targetPort: 'Z' }
                ];

                addNode('number-slider', { x: unitX, y: unitY }, {
                    editorOrigin,
                    initialData,
                    initialConnections
                });

                hideSearchBox();
                return;
            }
        }

        // Apply preset data while preserving drop position
        let initialData: Partial<NodeData['data']> | undefined = undefined;

        if (searchBoxContext) {
            const sourceNode = nodes.find(n => n.id === searchBoxContext.sourceNodeId);

            if (type === 'number-slider') {
                const sourceDef = sourceNode ? getNodeDefinition(sourceNode.type) : undefined;
                const isSourcePortInput = sourceDef?.initialData.inputs?.some(
                    input => input.id === searchBoxContext.sourcePortId
                ) ?? false;
                const isMeshSmoothnessInput =
                    !!sourceNode &&
                    isSourcePortInput &&
                    searchBoxContext.sourcePortId === 'S' &&
                    (sourceNode.type === 'mesh-union'
                        || sourceNode.type === 'mesh-difference'
                        || sourceNode.type === 'mesh-intersection');

                if (isMeshSmoothnessInput) {
                    const sourceSmoothness = Number.isFinite(sourceNode.data.smoothness)
                        ? Number(sourceNode.data.smoothness)
                        : 0.5;
                    const clampedSmoothness = Math.min(1, Math.max(0.001, sourceSmoothness));
                    initialData = {
                        useGlobalConfig: true,
                        globalMin: 0.001,
                        globalMax: 1,
                        globalStep: 0.001,
                        sliders: [{ id: 'slider-1', value: clampedSmoothness, min: 0.001, max: 1, step: 0.001 }],
                        value: [clampedSmoothness],
                        customName: 'Smoothness'
                    };
                } else if (sourceNode?.type === 'unit-x' || sourceNode?.type === 'unit-y' || sourceNode?.type === 'unit-z') {
                    initialData = {
                        useGlobalConfig: true,
                        globalMin: 0,
                        globalMax: 5,
                        globalStep: 0.001,
                        sliders: [{ id: 'slider-1', value: 1, min: 0, max: 5, step: 0.001 }],
                        value: [1],
                        customName: 'Factor'
                    };
                }
            }
        }

        // Prepare Initial Connections
        let initialConnections: { sourceNodeId?: string; sourcePort: string; targetNodeId?: string; targetPort: string }[] | undefined;

        if (searchBoxContext) {
            const sourceNode = nodes.find(n => n.id === searchBoxContext.sourceNodeId);

            if (sourceNode) {
                const sourceDef = getNodeDefinition(sourceNode.type);
                const isSourcePortInput = sourceDef?.initialData.inputs?.some(i => i.id === searchBoxContext.sourcePortId);
                const isVertexMaskMaskMarkOutputContext =
                    sourceNode.type === 'vertex-mask' &&
                    searchBoxContext.sourcePortId === VERTEX_MASK_OUTPUT_PORT &&
                    !isSourcePortInput;
                const isAiMaskMarkInputContext =
                    AI_MASK_TARGET_NODE_TYPES.has(sourceNode.type) &&
                    searchBoxContext.sourcePortId === VERTEX_MASK_TARGET_INPUT_PORT &&
                    isSourcePortInput;
                const isAiMeshInputContext =
                    (sourceNode.type === 'ai-paint' || sourceNode.type === 'ai-sculpt') &&
                    searchBoxContext.sourcePortId === 'input-mesh' &&
                    isSourcePortInput;
                const isAiMeshOutputContext =
                    AI_MESH_OUTPUT_SOURCE_NODE_TYPES.has(sourceNode.type) &&
                    searchBoxContext.sourcePortId === AI_MESH_OUTPUT_SOURCE_PORT &&
                    !isSourcePortInput;
                const aiMeshInputOutputPortId =
                    AI_MESH_INPUT_WHITELIST_SET.has(type) ? getFirstMeshOutputPortId(type) : null;
                const aiMeshOutputAllowedTypes =
                    isAiMeshOutputContext ? getAiMeshOutputAllowedTypes(sourceNode.type) : [];
                const aiMeshOutputAllowedTypeSet = new Set<NodeData['type']>(aiMeshOutputAllowedTypes);
                const aiMeshOutputTargetPort =
                    aiMeshOutputAllowedTypeSet.has(type) ? AI_MESH_OUTPUT_AUTOCONNECT_TARGET_PORT[type] : null;

                if (isAiMeshOutputContext) {
                    if (!aiMeshOutputAllowedTypeSet.has(type) || !aiMeshOutputTargetPort) {
                        hideSearchBox();
                        return;
                    }
                    initialConnections = [{
                        sourceNodeId: searchBoxContext.sourceNodeId,
                        sourcePort: AI_MESH_OUTPUT_SOURCE_PORT,
                        targetPort: aiMeshOutputTargetPort
                    }];
                } else if (isAiMeshInputContext && aiMeshInputOutputPortId) {
                    initialConnections = [{
                        sourcePort: aiMeshInputOutputPortId,
                        targetNodeId: searchBoxContext.sourceNodeId,
                        targetPort: 'input-mesh'
                    }];
                } else if (isVertexMaskMaskMarkOutputContext && VERTEX_MASK_GHOST_WHITELIST_SET.has(type)) {
                    initialConnections = [{
                        sourceNodeId: searchBoxContext.sourceNodeId,
                        sourcePort: VERTEX_MASK_OUTPUT_PORT,
                        targetPort: VERTEX_MASK_TARGET_INPUT_PORT
                    }];
                } else if (isAiMaskMarkInputContext && type === 'vertex-mask') {
                    initialConnections = [{
                        sourcePort: VERTEX_MASK_OUTPUT_PORT,
                        targetNodeId: searchBoxContext.sourceNodeId,
                        targetPort: VERTEX_MASK_TARGET_INPUT_PORT
                    }];
                } else if (type === 'number-slider' && sourceNode.type.startsWith('unit-') && isSourcePortInput) {
                    initialConnections = [{
                        sourcePort: 'output-main',
                        targetNodeId: searchBoxContext.sourceNodeId,
                        targetPort: searchBoxContext.sourcePortId
                    }];
                } else if (
                    type === 'transform' &&
                    sourceNode.type === 'vector-xyz' &&
                    searchBoxContext.sourcePortId === 'V' &&
                    !isSourcePortInput
                ) {
                    initialConnections = [{
                        sourceNodeId: searchBoxContext.sourceNodeId,
                        sourcePort: 'V',
                        targetPort: 'move_in'
                    }];
                } else if (type === 'transform' && searchBoxContext.sourcePortId === 'input-transform') {
                    initialConnections = [{
                        sourcePort: 'matrix_out',
                        targetNodeId: searchBoxContext.sourceNodeId,
                        targetPort: 'input-transform'
                    }];
                } else if (type === 'vector-xyz' && sourceNode.type === 'transform' && isSourcePortInput) {
                    initialConnections = [{
                        sourcePort: 'V', // Output port of Vector XYZ
                        targetNodeId: searchBoxContext.sourceNodeId,
                        targetPort: searchBoxContext.sourcePortId
                    }];
                } else if (
                    sourceNode.type === 'transform' &&
                    searchBoxContext.sourcePortId === 'matrix_out' &&
                    TRANSFORM_MATRIX_OUTPUT_WHITELIST_SET.has(type)
                ) {
                    initialConnections = [{
                        sourceNodeId: searchBoxContext.sourceNodeId,
                        sourcePort: 'matrix_out',
                        targetPort: 'input-transform'
                    }];
                } else {
                    const def = getNodeDefinition(type);
                    if (def) {
                        const sourceIsInput = isSourcePortInput || (searchBoxContext.sourcePortId === 'F');

                        const targetInputs = def.initialData.inputs || [];
                        const targetOutputs = def.initialData.outputs || [];

                        const newNodePortId = sourceIsInput
                            ? (targetOutputs[0]?.id)
                            : (targetInputs[0]?.id);

                        if (newNodePortId) {
                            if (sourceIsInput) {
                                initialConnections = [{
                                    sourcePort: newNodePortId,
                                    targetNodeId: searchBoxContext.sourceNodeId,
                                    targetPort: searchBoxContext.sourcePortId
                                }];
                            } else {
                                initialConnections = [{
                                    sourceNodeId: searchBoxContext.sourceNodeId,
                                    sourcePort: searchBoxContext.sourcePortId,
                                    targetPort: newNodePortId
                                }];
                            }
                        }
                    }
                }
            }
        }

        addNode(type, { x: unitX, y: unitY }, {
            editorOrigin,
            initialData,
            initialConnections
        });

        hideSearchBox();
    }, [nodes, addNode, hideSearchBox, scale, offset, newNodeCategory]);

    return { handleNodeCreationFromSearch };
};
