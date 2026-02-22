import type { NodeData } from '../types/NodeTypes';
import { getNodeDefinition } from '../definitions/nodeDefinitions';

// Search Box Context Helpers
const CONE_NUMERIC_INPUT_PORTS = new Set(['input-radius', 'input-length', 'input-corner']);
const TEXT_ON_MESH_NUMERIC_INPUT_PORTS = new Set(['input-height', 'input-depth']);
const TEXT_ON_MESH_TEXT_INPUT_PORTS = new Set(['input-text', 'input-font']);
const TEXT_ON_MESH_BASE_MESH_INPUT_WHITELIST: NodeData['type'][] = [
    'ai-sculpt',
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
    'box',
    'sphere',
    'cone',
    'cylinder',
];
const VERTEX_MASK_NUMERIC_INPUT_PORTS = new Set(['input-radius', 'input-smooth']);
export const VERTEX_MASK_BOOLEAN_INPUT_PORTS = new Set(['input-hit', 'input-erase']);
const VERTEX_MASK_GHOST_WHITELIST: NodeData['type'][] = ['ai-paint', 'ai-sculpt'];
export const VERTEX_MASK_GHOST_WHITELIST_SET = new Set<NodeData['type']>(VERTEX_MASK_GHOST_WHITELIST);
export const VERTEX_MASK_GHOST_X_OFFSET = 300;
export const VERTEX_MASK_OUTPUT_PORT = 'output-mask';
export const VERTEX_MASK_TARGET_INPUT_PORT = 'input-mask';
export const AI_MASK_TARGET_NODE_TYPES = new Set<NodeData['type']>(['ai-paint', 'ai-sculpt']);
const TRANSFORM_MATRIX_OUTPUT_WHITELIST: NodeData['type'][] = [
    'box',
    'sphere',
    'cone',
    'cylinder',
    'build-3d-ai',
];
export const TRANSFORM_MATRIX_OUTPUT_WHITELIST_SET = new Set<NodeData['type']>(TRANSFORM_MATRIX_OUTPUT_WHITELIST);
const AI_MESH_INPUT_WHITELIST: NodeData['type'][] = [
    'box',
    'sphere',
    'cone',
    'cylinder',
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
];
export const AI_MESH_INPUT_WHITELIST_SET = new Set<NodeData['type']>(AI_MESH_INPUT_WHITELIST);
const MESH_BOOLEAN_INPUT_WHITELIST = [...AI_MESH_INPUT_WHITELIST];
const MODEL_MATERIAL_INPUT_WHITELIST: NodeData['type'][] = [
    'box',
    'sphere',
    'cone',
    'cylinder',
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
];
const MESH_BOOLEAN_SMOOTHNESS_NODE_TYPES = new Set<NodeData['type']>([
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
]);
export const AI_MESH_OUTPUT_SOURCE_NODE_TYPES = new Set<NodeData['type']>(['ai-paint', 'ai-sculpt']);
export const AI_MESH_OUTPUT_SOURCE_PORT = 'output-mesh';
const AI_MESH_OUTPUT_BASE_TARGET_WHITELIST: NodeData['type'][] = [
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
    'layer-source',
    'panel',
];
export const AI_MESH_OUTPUT_AUTOCONNECT_TARGET_PORT: Partial<Record<NodeData['type'], string>> = {
    'ai-paint': 'input-mesh',
    'ai-sculpt': 'input-mesh',
    'mesh-union': 'M',
    'mesh-difference': 'A',
    'mesh-intersection': 'A',
    'layer-source': 'input-1',
    'panel': 'input-main',
};
const AI_MESH_OUTPUT_AI_TARGETS: NodeData['type'][] = ['ai-sculpt', 'ai-paint'];
export const LAYER_SOURCE_OUTPUT_WHITELIST: NodeData['type'][] = ['layer-bridge', 'panel'];
export const LAYER_SOURCE_OUTPUT_AUTOCONNECT_TARGET_PORT: Partial<Record<NodeData['type'], string>> = {
    'layer-bridge': 'input-layers',
    'panel': 'input-main',
};
export const LAYER_BRIDGE_INPUT_WHITELIST: NodeData['type'][] = ['layer-source'];
export const LAYER_BRIDGE_INPUT_WHITELIST_SET = new Set<NodeData['type']>(LAYER_BRIDGE_INPUT_WHITELIST);
export const isLayerBridgeInputPort = (portId: string): boolean =>
    portId === 'input-layers' || portId.startsWith('input-layers-');
export const MESH_BOOLEAN_OUTPUT_SOURCE_NODE_TYPES = new Set<NodeData['type']>([
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
]);
export const MESH_BOOLEAN_OUTPUT_SOURCE_PORT = 'R';
const MESH_BOOLEAN_OUTPUT_WHITELIST: NodeData['type'][] = [
    'ai-sculpt',
    'ai-paint',
    'model-material',
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
    'panel',
    'layer-source',
];
export const MESH_BOOLEAN_OUTPUT_AUTOCONNECT_TARGET_PORT: Partial<Record<NodeData['type'], string>> = {
    'ai-sculpt': 'input-mesh',
    'ai-paint': 'input-mesh',
    'model-material': 'in-M',
    'mesh-union': 'M',
    'mesh-difference': 'A',
    'mesh-intersection': 'A',
    'panel': 'input-main',
    'layer-source': 'input-1',
};
export const TEXT_DATA_OUTPUT_SOURCE_NODE_TYPE: NodeData['type'] = 'node-prompt';
export const TEXT_DATA_OUTPUT_SOURCE_PORT = 'output-prompt';
export const TEXT_DATA_OUTPUT_WHITELIST: NodeData['type'][] = ['panel', 'layer-source'];
export const TEXT_DATA_OUTPUT_AUTOCONNECT_TARGET: Partial<Record<NodeData['type'], string>> = {
    'panel': 'input-main',
    'layer-source': 'input-1',
};
export const PROMPT_NODE_OUTPUT_SOURCE_NODE_TYPE: NodeData['type'] = 'prompt';
export const PROMPT_NODE_OUTPUT_SOURCE_PORT = 'output-prompt';
export const PROMPT_NODE_OUTPUT_TARGET_WHITELIST: NodeData['type'][] = ['widget-window', 'layer-source'];
export const PROMPT_NODE_OUTPUT_TARGET_WHITELIST_SET = new Set<NodeData['type']>(PROMPT_NODE_OUTPUT_TARGET_WHITELIST);
export const PROMPT_NODE_OUTPUT_AUTOCONNECT_TARGET: Partial<Record<NodeData['type'], string>> = {
    'widget-window': 'input-1',
    'layer-source': 'input-1',
};
export const BACKGROUND_NODE_OUTPUT_SOURCE_NODE_TYPE: NodeData['type'] = 'background-color';
export const BACKGROUND_NODE_OUTPUT_SOURCE_PORT = 'output-background';
export const BACKGROUND_NODE_OUTPUT_TARGET_WHITELIST: NodeData['type'][] = ['widget-window', 'layer-source'];
export const BACKGROUND_NODE_OUTPUT_TARGET_WHITELIST_SET = new Set<NodeData['type']>(BACKGROUND_NODE_OUTPUT_TARGET_WHITELIST);
export const BACKGROUND_NODE_OUTPUT_AUTOCONNECT_TARGET: Partial<Record<NodeData['type'], string>> = {
    'widget-window': 'input-1',
    'layer-source': 'input-1',
};
export const INSPECTOR_OUTPUT_SOURCE_NODE_TYPE: NodeData['type'] = 'panel';
export const INSPECTOR_OUTPUT_SOURCE_PORT = 'output-main';
export const INSPECTOR_OUTPUT_WHITELIST: NodeData['type'][] = ['ai-sculpt', 'ai-paint', 'panel', 'output'];
export const INSPECTOR_OUTPUT_WHITELIST_SET = new Set<NodeData['type']>(INSPECTOR_OUTPUT_WHITELIST);
export const NUMBER_SLIDER_OUTPUT_SOURCE_NODE_TYPE: NodeData['type'] = 'number-slider';
export const NUMBER_SLIDER_OUTPUT_SOURCE_PORT = 'output-main';
export const NUMBER_SLIDER_OUTPUT_WHITELIST: NodeData['type'][] = ['panel', 'widget-window'];
export const NUMBER_SLIDER_OUTPUT_WHITELIST_SET = new Set<NodeData['type']>(NUMBER_SLIDER_OUTPUT_WHITELIST);
export const NUMBER_SLIDER_OUTPUT_AUTOCONNECT_TARGET_PORT: Partial<Record<NodeData['type'], string>> = {
    'panel': 'input-main',
    'widget-window': 'input-1',
};
export const TEXT_ON_MESH_OUTPUT_SOURCE_NODE_TYPE: NodeData['type'] = 'text-on-mesh';
export const TEXT_ON_MESH_OUTPUT_SOURCE_PORT = 'output-symbols';
export const TEXT_ON_MESH_OUTPUT_WHITELIST: NodeData['type'][] = ['panel', 'widget-window'];
export const TEXT_ON_MESH_OUTPUT_WHITELIST_SET = new Set<NodeData['type']>(TEXT_ON_MESH_OUTPUT_WHITELIST);
export const TEXT_ON_MESH_OUTPUT_AUTOCONNECT_TARGET: Partial<Record<NodeData['type'], string>> = {
    'panel': 'input-main',
    'widget-window': 'input-1',
};

export const AI_ASSISTANT_OUTPUT_SOURCE_NODE_TYPE: NodeData['type'] = 'ai-assistant';
export const AI_ASSISTANT_OUTPUT_SOURCE_PORT = 'output-response';
export const AI_ASSISTANT_OUTPUT_WHITELIST: NodeData['type'][] = ['widget-window', 'layer-source'];
export const AI_ASSISTANT_OUTPUT_WHITELIST_SET = new Set<NodeData['type']>(AI_ASSISTANT_OUTPUT_WHITELIST);
export const VIEWPORT_NODE_OUTPUT_SOURCE_NODE_TYPE: NodeData['type'] = 'viewport';
export const VIEWPORT_NODE_OUTPUT_SOURCE_PORT = 'output-viewport';
export const VIEWPORT_NODE_OUTPUT_TARGET_WHITELIST: NodeData['type'][] = ['widget-window', 'layer-source'];
export const VIEWPORT_NODE_OUTPUT_TARGET_WHITELIST_SET = new Set<NodeData['type']>(VIEWPORT_NODE_OUTPUT_TARGET_WHITELIST);
export const VIEWPORT_NODE_OUTPUT_AUTOCONNECT_TARGET: Partial<Record<NodeData['type'], string>> = {
    'widget-window': 'input-1',
    'layer-source': 'input-1',
};

export const getFirstMeshOutputPortId = (nodeType: NodeData['type']): string | null => {
    const definition = getNodeDefinition(nodeType);
    if (!definition) {
        return null;
    }

    const outputs = definition.initialData.outputs ?? [];
    const meshOutput = outputs.find((output) => output.type === 'Mesh');
    return meshOutput?.id ?? outputs[0]?.id ?? null;
};

export const getAiMeshOutputAllowedTypes = (sourceNodeType: NodeData['type'] | undefined): NodeData['type'][] => {
    if (sourceNodeType === 'ai-sculpt' || sourceNodeType === 'ai-paint') {
        return [...AI_MESH_OUTPUT_AI_TARGETS, ...AI_MESH_OUTPUT_BASE_TARGET_WHITELIST];
    }
    return [...AI_MESH_OUTPUT_BASE_TARGET_WHITELIST];
};

export const getAllowedTypesForOutput = (
    sourceNode: NodeData | undefined,
    portId: string
): NodeData['type'][] | null => {
    if (!sourceNode) {
        return null;
    }

    if (
        sourceNode.type === INSPECTOR_OUTPUT_SOURCE_NODE_TYPE &&
        portId === INSPECTOR_OUTPUT_SOURCE_PORT
    ) {
        return [...INSPECTOR_OUTPUT_WHITELIST];
    }

    if (
        sourceNode.type === NUMBER_SLIDER_OUTPUT_SOURCE_NODE_TYPE &&
        portId === NUMBER_SLIDER_OUTPUT_SOURCE_PORT
    ) {
        return [...NUMBER_SLIDER_OUTPUT_WHITELIST];
    }

    if (
        sourceNode.type === TEXT_ON_MESH_OUTPUT_SOURCE_NODE_TYPE &&
        portId === TEXT_ON_MESH_OUTPUT_SOURCE_PORT
    ) {
        return [...TEXT_ON_MESH_OUTPUT_WHITELIST];
    }

    if (sourceNode.type === 'layer-source') {
        return [...LAYER_SOURCE_OUTPUT_WHITELIST];
    }

    if (MESH_BOOLEAN_OUTPUT_SOURCE_NODE_TYPES.has(sourceNode.type) && portId === MESH_BOOLEAN_OUTPUT_SOURCE_PORT) {
        return [...MESH_BOOLEAN_OUTPUT_WHITELIST];
    }

    if (sourceNode.type === TEXT_DATA_OUTPUT_SOURCE_NODE_TYPE && portId === TEXT_DATA_OUTPUT_SOURCE_PORT) {
        return [...TEXT_DATA_OUTPUT_WHITELIST];
    }

    if (sourceNode.type === PROMPT_NODE_OUTPUT_SOURCE_NODE_TYPE && portId === PROMPT_NODE_OUTPUT_SOURCE_PORT) {
        return [...PROMPT_NODE_OUTPUT_TARGET_WHITELIST];
    }

    if (sourceNode.type === BACKGROUND_NODE_OUTPUT_SOURCE_NODE_TYPE && portId === BACKGROUND_NODE_OUTPUT_SOURCE_PORT) {
        return [...BACKGROUND_NODE_OUTPUT_TARGET_WHITELIST];
    }

    if (sourceNode.type === AI_ASSISTANT_OUTPUT_SOURCE_NODE_TYPE && portId === AI_ASSISTANT_OUTPUT_SOURCE_PORT) {
        return [...AI_ASSISTANT_OUTPUT_WHITELIST];
    }

    if (sourceNode.type === VIEWPORT_NODE_OUTPUT_SOURCE_NODE_TYPE && portId === VIEWPORT_NODE_OUTPUT_SOURCE_PORT) {
        return [...VIEWPORT_NODE_OUTPUT_TARGET_WHITELIST];
    }

    return null;
};

const isMeshBooleanInputPort = (nodeType: NodeData['type'] | undefined, portId: string) => {
    if (nodeType === 'mesh-union') {
        return portId === 'M';
    }
    if (nodeType === 'mesh-difference' || nodeType === 'mesh-intersection') {
        return portId === 'A' || portId === 'B';
    }
    return false;
};

const getMeshBooleanInputAllowedSourceNodeType = (
    nodeType: NodeData['type'] | undefined,
    portId: string
): NodeData['type'] | null => {
    if (nodeType && portId === 'S' && MESH_BOOLEAN_SMOOTHNESS_NODE_TYPES.has(nodeType)) {
        return 'number-slider';
    }
    if (nodeType === 'mesh-difference' && portId === 'showMeshesB') {
        return 'boolean-toggle';
    }
    if (nodeType === 'mesh-intersection' && portId === 'showMeshesAB') {
        return 'boolean-toggle';
    }
    return null;
};

export const getAllowedNodeTypesForContext = (
    searchBoxContext: { sourceNodeId: string, sourcePortId: string },
    nodes: NodeData[]
): string[] | undefined => {
    const sourceNode = nodes.find(n => n.id === searchBoxContext.sourceNodeId);
    if (!sourceNode) return undefined;

    const sourceDef = getNodeDefinition(sourceNode.type);
    const sourceInputs = sourceNode.data.inputs ?? sourceDef?.initialData.inputs ?? [];
    const sourceOutputs = sourceNode.data.outputs ?? sourceDef?.initialData.outputs ?? [];
    const isDraggedFromInput = sourceInputs.some(
        input => input.id === searchBoxContext.sourcePortId
    );
    const isDraggedFromOutput = sourceOutputs.some(
        output => output.id === searchBoxContext.sourcePortId
    );
    const isUnitNode =
        sourceNode.type === 'unit-x' || sourceNode.type === 'unit-y' || sourceNode.type === 'unit-z';
    const isVectorOutputContext =
        sourceNode.type === 'vector-xyz' &&
        searchBoxContext.sourcePortId === 'V' &&
        isDraggedFromOutput;

    // Check if dragging from 'input-transform' (Matrix input)
    const isTransformInput = searchBoxContext.sourcePortId === 'input-transform';
    const isBuild3dScopeInput =
        sourceNode.type === 'build-3d-ai' && searchBoxContext.sourcePortId === 'input-scope';
    const isConeNumericInput =
        sourceNode.type === 'cone' && CONE_NUMERIC_INPUT_PORTS.has(searchBoxContext.sourcePortId);
    const isTextOnMeshNumericInput =
        sourceNode.type === 'text-on-mesh' &&
        TEXT_ON_MESH_NUMERIC_INPUT_PORTS.has(searchBoxContext.sourcePortId) &&
        isDraggedFromInput;
    const isTextOnMeshTextInput =
        sourceNode.type === 'text-on-mesh' &&
        TEXT_ON_MESH_TEXT_INPUT_PORTS.has(searchBoxContext.sourcePortId) &&
        isDraggedFromInput;
    const isTextOnMeshBaseMeshInput =
        sourceNode.type === 'text-on-mesh' &&
        searchBoxContext.sourcePortId === 'input-base-mesh' &&
        isDraggedFromInput;
    const isVertexMaskNumericInput =
        sourceNode.type === 'vertex-mask' &&
        isDraggedFromInput &&
        VERTEX_MASK_NUMERIC_INPUT_PORTS.has(searchBoxContext.sourcePortId);
    const isVertexMaskBooleanInput =
        sourceNode.type === 'vertex-mask' &&
        isDraggedFromInput &&
        VERTEX_MASK_BOOLEAN_INPUT_PORTS.has(searchBoxContext.sourcePortId);
    const isVertexMaskMaskMarkOutputContext =
        sourceNode.type === 'vertex-mask' &&
        searchBoxContext.sourcePortId === VERTEX_MASK_OUTPUT_PORT &&
        isDraggedFromOutput;
    const isAiMaskMarkInputContext =
        AI_MASK_TARGET_NODE_TYPES.has(sourceNode.type) &&
        searchBoxContext.sourcePortId === VERTEX_MASK_TARGET_INPUT_PORT &&
        isDraggedFromInput;
    const isModelMaterialNameInputContext =
        sourceNode.type === 'model-material' &&
        searchBoxContext.sourcePortId === 'in-N' &&
        isDraggedFromInput;
    const isModelMaterialInputContext =
        sourceNode.type === 'model-material' &&
        searchBoxContext.sourcePortId === 'in-M' &&
        isDraggedFromInput;
    const isBooleanMeshInputContext =
        isDraggedFromInput && isMeshBooleanInputPort(sourceNode.type, searchBoxContext.sourcePortId);
    const specialMeshBooleanInputAllowedType = isDraggedFromInput
        ? getMeshBooleanInputAllowedSourceNodeType(sourceNode.type, searchBoxContext.sourcePortId)
        : null;
    const isBooleanToggleOutputContext =
        sourceNode.type === 'boolean-toggle' && isDraggedFromOutput;
    const isLayerBridgeInputContext =
        sourceNode.type === 'layer-bridge' &&
        isDraggedFromInput &&
        isLayerBridgeInputPort(searchBoxContext.sourcePortId);
    const isAiPlanInputContext =
        (sourceNode.type === 'ai-paint' || sourceNode.type === 'ai-sculpt') &&
        searchBoxContext.sourcePortId === 'input-plan' &&
        isDraggedFromInput;
    const isAiMeshInputContext =
        (sourceNode.type === 'ai-paint' || sourceNode.type === 'ai-sculpt') &&
        searchBoxContext.sourcePortId === 'input-mesh' &&
        isDraggedFromInput;
    const isAiMeshOutputContext =
        AI_MESH_OUTPUT_SOURCE_NODE_TYPES.has(sourceNode.type) &&
        searchBoxContext.sourcePortId === AI_MESH_OUTPUT_SOURCE_PORT &&
        isDraggedFromOutput;
    const isViewportOutputContext =
        sourceNode.type === VIEWPORT_NODE_OUTPUT_SOURCE_NODE_TYPE &&
        searchBoxContext.sourcePortId === VIEWPORT_NODE_OUTPUT_SOURCE_PORT &&
        isDraggedFromOutput;
    const outputAllowedTypes = isDraggedFromOutput
        ? getAllowedTypesForOutput(sourceNode, searchBoxContext.sourcePortId)
        : null;

    if (isViewportOutputContext) {
        return [...VIEWPORT_NODE_OUTPUT_TARGET_WHITELIST];
    }
    if (outputAllowedTypes) {
        return [...outputAllowedTypes];
    }
    if (isLayerBridgeInputContext) {
        return [...LAYER_BRIDGE_INPUT_WHITELIST];
    }
    if (isAiMeshOutputContext) {
        return getAiMeshOutputAllowedTypes(sourceNode.type);
    }
    if (isAiMeshInputContext) {
        return [...AI_MESH_INPUT_WHITELIST];
    }
    if (isAiPlanInputContext) {
        return ['panel'];
    }
    if (isBooleanToggleOutputContext) {
        return ['panel'];
    }
    if (isAiMaskMarkInputContext) {
        return ['vertex-mask'];
    }
    if (isBuild3dScopeInput) {
        return ['panel'];
    }
    if (specialMeshBooleanInputAllowedType) {
        return [specialMeshBooleanInputAllowedType];
    }
    if (isBooleanMeshInputContext) {
        return [...MESH_BOOLEAN_INPUT_WHITELIST];
    }
    if (isModelMaterialNameInputContext) {
        return ['node-prompt'];
    }
    if (isModelMaterialInputContext) {
        return [...MODEL_MATERIAL_INPUT_WHITELIST];
    }
    if (isVertexMaskMaskMarkOutputContext) {
        return [...VERTEX_MASK_GHOST_WHITELIST];
    }
    if (isVectorOutputContext) {
        return ['transform'];
    }
    if (isTransformInput) {
        return ['transform'];
    }
    if (isVertexMaskBooleanInput) {
        return ['boolean-toggle'];
    }
    if (isTextOnMeshTextInput) {
        return ['node-prompt'];
    }
    if (isTextOnMeshBaseMeshInput) {
        return [...TEXT_ON_MESH_BASE_MESH_INPUT_WHITELIST];
    }
    if (isConeNumericInput || isTextOnMeshNumericInput || isVertexMaskNumericInput) {
        return ['number-slider'];
    }
    if (['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane', 'build-3d-ai'].includes(sourceNode.type)) {
        return [
            'mesh-union',
            'mesh-difference',
            'mesh-intersection',
            'panel',
            'model-material',
            'ai-sculpt',
            'ai-paint',
            'layer-source',
            'picture-on-mesh',
            'text-on-mesh',
            'output'
        ];
    }
    if (sourceNode.type === 'mesh-array' && searchBoxContext.sourcePortId === 'input-direction') {
        return ['unit-x', 'unit-y', 'unit-z'];
    }
    if (isUnitNode && isDraggedFromOutput) {
        return ['panel'];
    }
    if (isUnitNode && isDraggedFromInput) {
        return ['number-slider'];
    }
    if ((sourceNode.type === 'input' || sourceNode.type === 'output') && (isDraggedFromInput || isDraggedFromOutput)) {
        return ['panel'];
    }
    if (sourceNode.type === 'transform') {
        if (searchBoxContext.sourcePortId === 'matrix_out') {
            return [...TRANSFORM_MATRIX_OUTPUT_WHITELIST];
        } else if (['move_in', 'rotate_in', 'scale_in'].includes(searchBoxContext.sourcePortId)) {
            return ['vector-xyz'];
        }
    }
    if (sourceNode.type === 'vector-xyz' && ['X', 'Y', 'Z'].includes(searchBoxContext.sourcePortId)) {
        return ['number-slider'];
    }

    return undefined;
};
