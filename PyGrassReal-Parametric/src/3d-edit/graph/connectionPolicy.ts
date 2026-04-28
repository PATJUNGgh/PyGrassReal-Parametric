import type { NodeData } from '../types/NodeTypes';
import {
    AI_ASSISTANT_OUTPUT_SOURCE_NODE_TYPE,
    AI_ASSISTANT_OUTPUT_SOURCE_PORT,
    AI_ASSISTANT_OUTPUT_WHITELIST_SET,
    BACKGROUND_NODE_OUTPUT_SOURCE_NODE_TYPE,
    BACKGROUND_NODE_OUTPUT_SOURCE_PORT,
    BACKGROUND_NODE_OUTPUT_TARGET_WHITELIST_SET,
    INSPECTOR_OUTPUT_SOURCE_NODE_TYPE,
    INSPECTOR_OUTPUT_SOURCE_PORT,
    INSPECTOR_OUTPUT_WHITELIST_SET,
    LAYER_BRIDGE_INPUT_WHITELIST_SET,
    NUMBER_SLIDER_OUTPUT_SOURCE_NODE_TYPE,
    NUMBER_SLIDER_OUTPUT_SOURCE_PORT,
    NUMBER_SLIDER_OUTPUT_WHITELIST_SET,
    PROMPT_NODE_OUTPUT_SOURCE_NODE_TYPE,
    PROMPT_NODE_OUTPUT_SOURCE_PORT,
    PROMPT_NODE_OUTPUT_TARGET_WHITELIST_SET,
    TEXT_ON_MESH_OUTPUT_SOURCE_NODE_TYPE,
    TEXT_ON_MESH_OUTPUT_SOURCE_PORT,
    TEXT_ON_MESH_OUTPUT_WHITELIST_SET,
    VIEWPORT_NODE_OUTPUT_SOURCE_NODE_TYPE,
    VIEWPORT_NODE_OUTPUT_SOURCE_PORT,
    VIEWPORT_NODE_OUTPUT_TARGET_WHITELIST_SET,
    isLayerBridgeInputPort,
} from '../utils/canvasUtils';

export interface ConnectionRule {
    allow: boolean;
    reason: string;
}

export type DisconnectScope = 'none' | 'all' | 'incoming' | 'outgoing';

export interface DisconnectPolicy extends ConnectionRule {
    scope: DisconnectScope;
}

const MESH_BOOLEAN_INPUT_WHITELIST = new Set<NodeData['type']>([
    'box',
    'sphere',
    'cone',
    'cylinder',
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
]);

const AI_MESH_INPUT_WHITELIST = new Set<NodeData['type']>([
    'box',
    'sphere',
    'cone',
    'cylinder',
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
]);

const MODEL_MATERIAL_INPUT_WHITELIST = new Set<NodeData['type']>([
    'box',
    'sphere',
    'cone',
    'cylinder',
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
]);

const MESH_BOOLEAN_SMOOTHNESS_NODE_TYPES = new Set<NodeData['type']>([
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
]);

const TRANSFORM_MATRIX_OUTPUT_WHITELIST = new Set<NodeData['type']>([
    'box',
    'sphere',
    'cone',
    'cylinder',
    'build-3d-ai',
]);

const AI_MESH_OUTPUT_SOURCE_NODE_TYPES = new Set<NodeData['type']>(['ai-paint', 'ai-sculpt']);
const AI_MESH_OUTPUT_SOURCE_PORT = 'output-mesh';
const AI_MESH_OUTPUT_BASE_TARGET_WHITELIST = new Set<NodeData['type']>([
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
    'layer-source',
    'panel',
]);
const AI_MESH_OUTPUT_AI_TARGET_WHITELIST = new Set<NodeData['type']>(['ai-sculpt', 'ai-paint']);

const LAYER_SOURCE_OUTPUT_TARGET_WHITELIST = new Set<NodeData['type']>(['layer-bridge', 'panel']);

const MESH_BOOLEAN_OUTPUT_SOURCE_NODE_TYPES = new Set<NodeData['type']>([
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
]);
const MESH_BOOLEAN_OUTPUT_SOURCE_PORT = 'R';
const MESH_BOOLEAN_OUTPUT_TARGET_WHITELIST = new Set<NodeData['type']>([
    'ai-sculpt',
    'ai-paint',
    'model-material',
    'mesh-union',
    'mesh-difference',
    'mesh-intersection',
    'panel',
    'layer-source',
]);

const TEXT_DATA_OUTPUT_SOURCE_NODE_TYPE: NodeData['type'] = 'node-prompt';
const TEXT_DATA_OUTPUT_SOURCE_PORT = 'output-prompt';
const TEXT_DATA_OUTPUT_TARGET_WHITELIST = new Set<NodeData['type']>(['panel', 'layer-source']);

const AI_MASK_TARGET_NODE_TYPES = new Set<NodeData['type']>(['ai-paint', 'ai-sculpt']);
const AI_MASK_TARGET_INPUT_PORT = 'input-mask';
const AI_MASK_ALLOWED_SOURCE_NODE_TYPE: NodeData['type'] = 'vertex-mask';

const allow = (reason = 'Connection allowed by scaffold policy'): ConnectionRule => ({
    allow: true,
    reason,
});

const deny = (reason: string): ConnectionRule => ({
    allow: false,
    reason,
});

const allowDisconnect = (scope: DisconnectScope, reason: string): DisconnectPolicy => ({
    allow: true,
    reason,
    scope,
});

const denyDisconnect = (reason: string): DisconnectPolicy => ({
    allow: false,
    reason,
    scope: 'none',
});

const isAllowedAiMeshOutputTargetType = (
    sourceNodeType: NodeData['type'] | undefined,
    targetNodeType: NodeData['type'] | undefined
): boolean => {
    if (!targetNodeType) {
        return false;
    }
    if (AI_MESH_OUTPUT_BASE_TARGET_WHITELIST.has(targetNodeType)) {
        return true;
    }
    const isAiMeshOutputSourceType = sourceNodeType === 'ai-sculpt' || sourceNodeType === 'ai-paint';
    return isAiMeshOutputSourceType && AI_MESH_OUTPUT_AI_TARGET_WHITELIST.has(targetNodeType);
};

const isMeshBooleanInputPort = (nodeType: NodeData['type'] | undefined, portId: string): boolean => {
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

const isInputPortForNode = (node: NodeData | undefined, portId: string): boolean => {
    if (!node) {
        return false;
    }

    const inputs = node.data.inputs ?? [];
    if (inputs.some((port) => port.id === portId)) {
        return true;
    }

    const outputs = node.data.outputs ?? [];
    if (outputs.some((port) => port.id === portId)) {
        return false;
    }

    const normalizedPortId = portId.toLowerCase();
    if (normalizedPortId.startsWith('input-')) {
        return true;
    }
    if (normalizedPortId.startsWith('output-')) {
        return false;
    }

    return false;
};

export const canConnect = (
    sourceNode: NodeData | undefined,
    sourcePort: string,
    targetNode: NodeData | undefined,
    targetPort: string
): ConnectionRule => {
    if (!sourceNode || !targetNode) {
        return deny('Missing source or target node');
    }

    const isLayerSourceOutput =
        sourceNode.type === 'layer-source' &&
        !isInputPortForNode(sourceNode, sourcePort);
    const isMeshBooleanOutput =
        MESH_BOOLEAN_OUTPUT_SOURCE_NODE_TYPES.has(sourceNode.type) &&
        sourcePort === MESH_BOOLEAN_OUTPUT_SOURCE_PORT;
    const isTextDataOutput =
        sourceNode.type === TEXT_DATA_OUTPUT_SOURCE_NODE_TYPE &&
        sourcePort === TEXT_DATA_OUTPUT_SOURCE_PORT;
    const isPromptOutput =
        sourceNode.type === PROMPT_NODE_OUTPUT_SOURCE_NODE_TYPE &&
        sourcePort === PROMPT_NODE_OUTPUT_SOURCE_PORT;
    const isBackgroundColorOutput =
        sourceNode.type === BACKGROUND_NODE_OUTPUT_SOURCE_NODE_TYPE &&
        sourcePort === BACKGROUND_NODE_OUTPUT_SOURCE_PORT;
    const isInspectorOutput =
        sourceNode.type === INSPECTOR_OUTPUT_SOURCE_NODE_TYPE &&
        sourcePort === INSPECTOR_OUTPUT_SOURCE_PORT;
    const isAiAssistantOutput =
        sourceNode.type === AI_ASSISTANT_OUTPUT_SOURCE_NODE_TYPE &&
        sourcePort === AI_ASSISTANT_OUTPUT_SOURCE_PORT;
    const isNumberSliderOutput =
        sourceNode.type === NUMBER_SLIDER_OUTPUT_SOURCE_NODE_TYPE &&
        sourcePort === NUMBER_SLIDER_OUTPUT_SOURCE_PORT;
    const isTextOnMeshOutput =
        sourceNode.type === TEXT_ON_MESH_OUTPUT_SOURCE_NODE_TYPE &&
        sourcePort === TEXT_ON_MESH_OUTPUT_SOURCE_PORT;
    const isViewportOutput =
        sourceNode.type === VIEWPORT_NODE_OUTPUT_SOURCE_NODE_TYPE &&
        sourcePort === VIEWPORT_NODE_OUTPUT_SOURCE_PORT;
    const isModelMaterialInputTarget =
        targetNode.type === 'model-material' && targetPort === 'in-M';
    const isModelMaterialNameInputTarget =
        targetNode.type === 'model-material' && targetPort === 'in-N';
    const sourceIsBooleanToggle = sourceNode.type === 'boolean-toggle';
    const sourceIsUnitNode =
        sourceNode.type === 'unit-x' ||
        sourceNode.type === 'unit-y' ||
        sourceNode.type === 'unit-z';
    const isBuild3dScopeTarget =
        targetNode.type === 'build-3d-ai' && targetPort === 'input-scope';
    const isAiMeshInputTarget =
        (targetNode.type === 'ai-paint' || targetNode.type === 'ai-sculpt') &&
        targetPort === 'input-mesh';
    const isAiMeshOutputSource =
        AI_MESH_OUTPUT_SOURCE_NODE_TYPES.has(sourceNode.type) &&
        sourcePort === AI_MESH_OUTPUT_SOURCE_PORT;
    const isLayerBridgeInputTarget =
        targetNode.type === 'layer-bridge' &&
        isInputPortForNode(targetNode, targetPort) &&
        isLayerBridgeInputPort(targetPort);

    if (isLayerBridgeInputTarget && !LAYER_BRIDGE_INPUT_WHITELIST_SET.has(sourceNode.type)) {
        return deny('Layer Bridge input only accepts Layer Source');
    }

    if (isLayerSourceOutput && !LAYER_SOURCE_OUTPUT_TARGET_WHITELIST.has(targetNode.type)) {
        return deny('Layer Source output target is not allowed');
    }

    if (isMeshBooleanOutput && !MESH_BOOLEAN_OUTPUT_TARGET_WHITELIST.has(targetNode.type)) {
        return deny('Mesh boolean output target is not allowed');
    }

    if (isTextDataOutput && !TEXT_DATA_OUTPUT_TARGET_WHITELIST.has(targetNode.type)) {
        return deny('Text data output target is not allowed');
    }

    if (isPromptOutput && !PROMPT_NODE_OUTPUT_TARGET_WHITELIST_SET.has(targetNode.type)) {
        return deny('Prompt output target is not allowed');
    }

    if (isBackgroundColorOutput && !BACKGROUND_NODE_OUTPUT_TARGET_WHITELIST_SET.has(targetNode.type)) {
        return deny('Background output target is not allowed');
    }

    if (isInspectorOutput && !INSPECTOR_OUTPUT_WHITELIST_SET.has(targetNode.type)) {
        return deny('Inspector output target is not allowed');
    }

    if (isAiAssistantOutput && !AI_ASSISTANT_OUTPUT_WHITELIST_SET.has(targetNode.type)) {
        return deny('AI assistant output target is not allowed');
    }

    if (isNumberSliderOutput && !NUMBER_SLIDER_OUTPUT_WHITELIST_SET.has(targetNode.type)) {
        return deny('Number slider output target is not allowed');
    }

    if (isTextOnMeshOutput && !TEXT_ON_MESH_OUTPUT_WHITELIST_SET.has(targetNode.type)) {
        return deny('Text on Mesh output target is not allowed');
    }

    if (isViewportOutput && !VIEWPORT_NODE_OUTPUT_TARGET_WHITELIST_SET.has(targetNode.type)) {
        return deny('Viewport output target is not allowed');
    }

    if (isAiMeshOutputSource && !isAllowedAiMeshOutputTargetType(sourceNode.type, targetNode.type)) {
        return deny('AI mesh output target is not allowed');
    }

    if (isAiMeshInputTarget && !AI_MESH_INPUT_WHITELIST.has(sourceNode.type)) {
        return deny('AI mesh input only accepts mesh providers');
    }

    if (isModelMaterialInputTarget && !MODEL_MATERIAL_INPUT_WHITELIST.has(sourceNode.type)) {
        return deny('Model Material input only accepts mesh providers');
    }

    if (isModelMaterialNameInputTarget && sourceNode.type !== 'node-prompt') {
        return deny('Model Material name input only accepts Text Data');
    }

    if (sourceIsBooleanToggle && targetNode.type !== 'panel') {
        return deny('Boolean toggle can only connect to Inspector');
    }

    if (sourceIsUnitNode && targetNode.type !== 'panel') {
        return deny('Unit node can only connect to Inspector');
    }

    if (isBuild3dScopeTarget && sourceNode.type !== 'panel') {
        return deny('Build 3D AI scope input only accepts Inspector output');
    }

    const isVectorXyzVectorOutput =
        sourceNode.type === 'vector-xyz' && sourcePort === 'V';
    if (isVectorXyzVectorOutput && targetNode.type !== 'transform') {
        return deny('Vector XYZ output V only connects to Transform');
    }

    const isTransformMatrixOutput =
        sourceNode.type === 'transform' && sourcePort === 'matrix_out';
    if (isTransformMatrixOutput && !TRANSFORM_MATRIX_OUTPUT_WHITELIST.has(targetNode.type)) {
        return deny('Transform matrix output target type is not allowed');
    }
    if (isTransformMatrixOutput && targetPort !== 'input-transform') {
        return deny('Transform matrix output must target input-transform');
    }

    const isAiMaskInputTarget =
        AI_MASK_TARGET_NODE_TYPES.has(targetNode.type) &&
        targetPort === AI_MASK_TARGET_INPUT_PORT;
    if (isAiMaskInputTarget && sourceNode.type !== AI_MASK_ALLOWED_SOURCE_NODE_TYPE) {
        return deny('Mask input only accepts Vertex Mask output');
    }

    const isAiPlanInputTarget =
        (targetNode.type === 'ai-paint' || targetNode.type === 'ai-sculpt') &&
        targetPort === 'input-plan';
    if (isAiPlanInputTarget && sourceNode.type !== 'panel') {
        return deny('AI plan input only accepts Inspector');
    }

    const sourceIsInputPort = isInputPortForNode(sourceNode, sourcePort);
    const targetIsInputPort = isInputPortForNode(targetNode, targetPort);
    const sourceIsRestrictedMeshInput =
        sourceIsInputPort && isMeshBooleanInputPort(sourceNode.type, sourcePort);
    const targetIsRestrictedMeshInput =
        targetIsInputPort && isMeshBooleanInputPort(targetNode.type, targetPort);

    if (sourceIsRestrictedMeshInput || targetIsRestrictedMeshInput) {
        const peerNodeType = sourceIsRestrictedMeshInput ? targetNode.type : sourceNode.type;
        if (!MESH_BOOLEAN_INPUT_WHITELIST.has(peerNodeType)) {
            return deny('Mesh boolean A/B/M ports only accept mesh providers');
        }
    }

    const sourceAllowedNodeType = sourceIsInputPort
        ? getMeshBooleanInputAllowedSourceNodeType(sourceNode.type, sourcePort)
        : null;
    const targetAllowedNodeType = targetIsInputPort
        ? getMeshBooleanInputAllowedSourceNodeType(targetNode.type, targetPort)
        : null;

    if (sourceAllowedNodeType && targetNode.type !== sourceAllowedNodeType) {
        return deny(`Source input requires ${sourceAllowedNodeType}`);
    }

    if (targetAllowedNodeType && sourceNode.type !== targetAllowedNodeType) {
        return deny(`Target input requires ${targetAllowedNodeType}`);
    }

    return allow();
};

export const getDisconnectPolicy = (
    nodeType: NodeData['type'],
    portMode: NodeData['data']['portMode'] | undefined,
    nextPortMode?: NodeData['data']['portMode'] | undefined
): DisconnectPolicy => {
    if (nodeType !== 'ai-agent') {
        return allowDisconnect('all', 'Disconnect is allowed');
    }

    if (portMode !== 'input' && portMode !== 'output') {
        return allowDisconnect('all', 'AI Agent mode is unknown; clean up all related connections');
    }

    if (!nextPortMode || nextPortMode === portMode) {
        return denyDisconnect('AI Agent mode is unchanged');
    }

    if (nextPortMode === 'input') {
        return allowDisconnect('outgoing', 'Switching to input mode removes outgoing connections');
    }

    if (nextPortMode === 'output') {
        return allowDisconnect('incoming', 'Switching to output mode removes incoming connections');
    }

    return allowDisconnect('all', 'AI Agent target mode is unknown; clean up all related connections');
};
