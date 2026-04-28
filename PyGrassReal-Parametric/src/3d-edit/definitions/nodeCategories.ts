import type { NodeData } from '../types/NodeTypes';

export interface NodeCategory {
    id: string;
    label: string;
    nodeTypes: NodeData['type'][];
    defaultExpanded?: boolean;
}

export const NODE_CATEGORIES: NodeCategory[] = [
    {
        id: 'primitives',
        label: 'Primitives',
        nodeTypes: ['box', 'sphere', 'cone', 'cylinder'],
        defaultExpanded: true,
    },
    {
        id: 'transform',
        label: 'Transform',
        nodeTypes: ['transform', 'vector-xyz', 'unit-x', 'unit-y', 'unit-z'],
    },
    {
        id: 'mesh-operations',
        label: 'Mesh Operations',
        nodeTypes: [
            'mesh-union',
            'mesh-difference',
            'mesh-intersection',
            'model-material',
            'vertex-mask',
            'picture-on-mesh',
            'text-on-mesh',
            'mesh-array',
        ],
        defaultExpanded: true,
    },
    {
        id: 'ai',
        label: 'AI',
        nodeTypes: ['build-3d-ai', 'ai-agent', 'ai-sculpt', 'ai-paint', 'node-prompt'],
    },
    {
        id: 'data-input',
        label: 'Data & Input',
        nodeTypes: ['number-slider', 'boolean-toggle', 'series'],
    },
    {
        id: 'graph-structure',
        label: 'Graph & Structure',
        nodeTypes: ['input', 'output', 'custom', 'panel', 'layer-source', 'layer-bridge', 'group', 'component', 'antivirus'],
    },
];

export const WIDGET_CATEGORIES: NodeCategory[] = [
    {
        id: 'widget-ui-display',
        label: 'UI & Display',
        nodeTypes: ['widget-window', 'panel', 'viewport', 'background-color', 'layer-view'],
        defaultExpanded: true,
    },
    {
        id: 'widget-ai',
        label: 'AI',
        nodeTypes: ['ai-assistant', 'prompt'],
    },
    {
        id: 'widget-graph-structure',
        label: 'Graph & Structure',
        nodeTypes: ['input', 'output', 'custom', 'layer-source', 'layer-bridge', 'group', 'component', 'antivirus'],
    },
    {
        id: 'widget-input',
        label: 'Input',
        nodeTypes: ['number-slider', 'boolean-toggle'],
    },
];
