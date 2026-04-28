import type { NodeData } from '../types/NodeTypes';
import { NODE_DEFINITIONS } from '../definitions/nodeDefinitions';
import { HIDDEN_NODES } from '../definitions/hiddenNodes';
import { NODE_CATEGORIES, WIDGET_CATEGORIES, type NodeCategory } from '../definitions/nodeCategories';

export interface SearchPolicyContext {
    allowedTypes?: string[];
    categoryMode?: 'nodes' | 'widget';
}

export interface SearchableNodeEntry {
    type: NodeData['type'];
    name: string;
}

export interface CategoryEntry {
    id: string;
    label: string;
    nodeTypes: NodeData['type'][];
    defaultExpanded: boolean;
}

const SEARCH_EXCLUDED_NODE_TYPES = new Set<NodeData['type']>(['group', 'component']);

const ALL_SEARCHABLE_NODES: SearchableNodeEntry[] = Object.values(NODE_DEFINITIONS)
    .filter((definition) => !HIDDEN_NODES.includes(definition.type) && !SEARCH_EXCLUDED_NODE_TYPES.has(definition.type))
    .map((definition) => ({
        type: definition.type,
        name: definition.name,
    }));

const normalizeCategory = (category: NodeCategory): CategoryEntry => ({
    id: category.id,
    label: category.label,
    nodeTypes: category.nodeTypes,
    defaultExpanded: Boolean(category.defaultExpanded),
});

const getCategoryConfig = (categoryMode?: 'nodes' | 'widget'): CategoryEntry[] => {
    if (categoryMode === 'nodes') {
        return NODE_CATEGORIES.map(normalizeCategory);
    }
    if (categoryMode === 'widget') {
        return WIDGET_CATEGORIES.map(normalizeCategory);
    }

    const seenNodeTypes = new Set<NodeData['type']>();
    const mergedCategories: CategoryEntry[] = [];

    const pushCategory = (category: NodeCategory) => {
        const uniqueNodeTypes = category.nodeTypes.filter((nodeType) => {
            if (seenNodeTypes.has(nodeType)) {
                return false;
            }
            seenNodeTypes.add(nodeType);
            return true;
        });

        if (uniqueNodeTypes.length === 0) {
            return;
        }

        mergedCategories.push({
            id: category.id,
            label: category.label,
            nodeTypes: uniqueNodeTypes,
            defaultExpanded: Boolean(category.defaultExpanded),
        });
    };

    NODE_CATEGORIES.forEach(pushCategory);
    WIDGET_CATEGORIES.forEach(pushCategory);

    return mergedCategories;
};

export const getSearchableNodes = (context?: SearchPolicyContext): SearchableNodeEntry[] => {
    const allowedTypes = context?.allowedTypes;
    if (!allowedTypes || allowedTypes.length === 0) {
        return ALL_SEARCHABLE_NODES;
    }

    const searchableNodeMap = new Map(ALL_SEARCHABLE_NODES.map((node) => [node.type, node]));
    return allowedTypes
        .map((nodeType) => searchableNodeMap.get(nodeType as NodeData['type']))
        .filter((node): node is SearchableNodeEntry => !!node);
};

export const getSearchCategories = (context?: SearchPolicyContext): CategoryEntry[] => {
    const searchableNodes = getSearchableNodes(context);
    const searchableTypeSet = new Set(searchableNodes.map((node) => node.type));

    return getCategoryConfig(context?.categoryMode)
        .map((category) => ({
            ...category,
            nodeTypes: category.nodeTypes.filter((nodeType) => searchableTypeSet.has(nodeType)),
        }))
        .filter((category) => category.nodeTypes.length > 0);
};
