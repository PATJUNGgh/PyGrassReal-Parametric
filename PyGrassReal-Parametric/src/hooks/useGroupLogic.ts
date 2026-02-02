import { useRef, useCallback } from 'react';
import type { NodeData } from '../types/NodeTypes';
import { useNodeGraph } from '../context/NodeGraphContext';

// --- Shared sizing constants ---
const PORT_STICKOUT = 24;
const EXTRA_BOTTOM = 0;
const VIEWPORT_EXTRA_BOTTOM = 10;
const WIDGET_WINDOW_HEIGHT_OFFSET = 0;
const BACKGROUND_BASE_EXTRA_HEIGHT = 20;
const BACKGROUND_GRADIENT_EXTRA_HEIGHT = 20;
const LAYER_SOURCE_EXTRA_BOTTOM = 0;

// Type definition for node sizing logic
type NodeSizing = {
    width: number | ((node: NodeData) => number);
    height: number | ((node: NodeData) => number);
    extraLeft?: number;
    extraRight?: number;
};

// Configuration for fallback node sizes. Aliases can be used for node types that share sizing logic.
const nodeSizeFallbacks: Record<string, NodeSizing | string> = {
    panel: { width: 340, height: 300 },
    series: {
        width: 260,
        height: (node) => {
            const maxPorts = Math.max(node.data?.inputs?.length || 0, node.data?.outputs?.length || 0);
            return maxPorts > 0 ? 182 + maxPorts * 28 : 160;
        },
        extraLeft: 57, extraRight: 32
    },
    'layer-source': {
        width: 300,
        height: (node) => {
            const inputCount = node.data?.inputs?.length ?? 0;
            const inputRowsHeight = inputCount > 0 ? inputCount * 28 : 28;
            return 85 + inputRowsHeight + LAYER_SOURCE_EXTRA_BOTTOM;
        },
    },
    'layer-view': { width: 300, height: 50 },
    'number-slider': { width: 300, height: 160 },
    custom: {
        width: (node) => {
            const nameLen = (node.data?.customName || 'Custom Node').length;
            return Math.min(620, Math.max(320, nameLen * 8 + 180));
        },
        height: (node) => {
            const maxPorts = Math.max(node.data?.inputs?.length || 0, node.data?.outputs?.length || 0);
            return maxPorts > 0 ? 182 + maxPorts * 28 : 200;
        },
    },
    sphere: {
        width: 300,
        height: (node) => {
            const maxPorts = Math.max(node.data?.inputs?.length || 0, node.data?.outputs?.length || 0);
            return maxPorts > 0 ? 110 + maxPorts * 28 : 200;
        },
    },
    box: 'sphere',
    'vector-xyz': 'sphere',
    antivirus: 'custom',
    input: 'custom',
    output: 'custom',
};


export const getNodeBoundingBox = (node: NodeData) => {


    // 1. Calculate port stick-out, which is mostly consistent


    const isSeries = node.type === 'series';


    let extraLeft = 0;


    let extraRight = 0;


    if (!isSeries) {


        if ((node.data?.inputs?.length || 0) > 0) extraLeft = PORT_STICKOUT;


        if ((node.data?.outputs?.length || 0) > 0) extraRight = PORT_STICKOUT;


    }





    let baseWidth: number;


    let baseHeight: number;





    // 2. Determine base dimensions. Prioritize real, measured dimensions from the DOM.


    const isPrimitive = node.type === 'sphere' || node.type === 'box' || node.type === 'vector-xyz';


    if (!isPrimitive && node.data?.width && node.data?.height && node.data.width > 1 && node.data.height > 1) {


        baseWidth = node.data.width;


        baseHeight = node.data.height;


    } else {


        // --- Use fallback estimation logic if no measured dimensions ---


        let sizingConfig = nodeSizeFallbacks[node.type];


        if (typeof sizingConfig === 'string') {


            sizingConfig = nodeSizeFallbacks[sizingConfig] as NodeSizing;


        }





        let fallbackWidth = 280;


        let fallbackHeight = 180;





        if (sizingConfig) {


            fallbackWidth = typeof sizingConfig.width === 'function' ? sizingConfig.width(node) : sizingConfig.width;


            fallbackHeight = typeof sizingConfig.height === 'function' ? sizingConfig.height(node) : sizingConfig.height;


            if (sizingConfig.extraLeft) extraLeft = sizingConfig.extraLeft;


            if (sizingConfig.extraRight) extraRight = sizingConfig.extraRight;


        }





        // Allow partial override from node data even in fallback mode


        baseWidth = (node.data?.width && node.data.width > 50) ? node.data.width : fallbackWidth;





        const isLayerSource = node.type === 'layer-source';


        if (!isPrimitive && !isLayerSource && node.data?.height && node.data.height > 50) {


            baseHeight = node.data.height;


        } else {


            baseHeight = fallbackHeight;


        }


    }





    // 3. Apply all adjustments and safety floors in one place


    let adjustedHeight = baseHeight;





    // Special offsets/additions based on type


    if (node.type === 'widget-window') {


        adjustedHeight = Math.max(100, adjustedHeight - WIDGET_WINDOW_HEIGHT_OFFSET);


    }


    if (node.type === 'viewport') {


        adjustedHeight += VIEWPORT_EXTRA_BOTTOM;


    }


    if (node.type === 'background-color') {


        adjustedHeight += BACKGROUND_BASE_EXTRA_HEIGHT;


        if (node.data?.backgroundMode === 'gradient') {


            adjustedHeight += BACKGROUND_GRADIENT_EXTRA_HEIGHT;


        }


    }





    // 4. Apply safety floors to prevent nodes from being too small


    const finalWidth = Math.max(100, baseWidth);


    const minHeight = node.type === 'layer-view' ? 50 : 100;


    const finalHeight = Math.max(minHeight, adjustedHeight);


    


    return {


        x: node.position.x - extraLeft,


        y: node.position.y,


        width: finalWidth + extraLeft + extraRight,


        height: finalHeight


    };


};


interface UseGroupLogicProps {
    selectedNodeIds: Set<string>;
    setSelectedNodeIds: (ids: Set<string>) => void;
    onNodeCreate?: (node: NodeData) => void;
    groupEligibleNodeIds?: Set<string>;
    groupEditorOrigin?: 'nodes' | 'widget';
}

export const useGroupLogic = ({
    selectedNodeIds,
    setSelectedNodeIds,
    onNodeCreate,
    groupEligibleNodeIds,
    groupEditorOrigin
}: UseGroupLogicProps) => {
    const { nodes, setNodesWithHistory } = useNodeGraph();

    // Animation frame IDs for group resize (smoother than setTimeout)
    const groupResizeFrames = useRef<Map<string, number>>(new Map());

    // Safe group auto-resize with requestAnimationFrame for smooth updates
    const scheduleGroupResize = useCallback((groupId: string) => {
        // Clear existing frame for this group
        const existingFrame = groupResizeFrames.current.get(groupId);
        if (existingFrame) {
            cancelAnimationFrame(existingFrame);
        }

        // Schedule new resize with requestAnimationFrame (syncs with browser refresh)
        const frameId = requestAnimationFrame(() => {
            setNodesWithHistory((prev) => {
                const group = prev.find(n => n.id === groupId && n.type === 'group');
                if (!group || !group.data?.childNodeIds) return prev;

                const childNodes = prev.filter(n => group.data?.childNodeIds?.includes(n.id));
                if (childNodes.length === 0) return prev;

                const PADDING = 20;
                const PADDING_BOTTOM = 30;
                const HEADER_HEIGHT = 45;

                const childDimensions = childNodes.map(getNodeBoundingBox);

                const minX = Math.min(...childDimensions.map(d => d.x));
                const maxX = Math.max(...childDimensions.map(d => d.x + d.width));
                const minY = Math.min(...childDimensions.map(d => d.y));
                const maxY = Math.max(...childDimensions.map(d => d.y + d.height));

                const newWidth = (maxX - minX) + (PADDING * 2);
                const newHeight = (maxY - minY) + PADDING + PADDING_BOTTOM + HEADER_HEIGHT;
                const newX = minX - PADDING;
                const newY = minY - PADDING - HEADER_HEIGHT;

                // Only update if dimensions changed significantly
                const currentWidth = group.data.width || 0;
                const currentHeight = group.data.height || 0;
                const currentX = group.position.x;
                const currentY = group.position.y;

                if (
                    Math.abs(currentWidth - newWidth) < 1 &&
                    Math.abs(currentHeight - newHeight) < 1 &&
                    Math.abs(currentX - newX) < 1 &&
                    Math.abs(currentY - newY) < 1
                ) {
                    return prev;
                }

                return prev.map(node => {
                    if (node.id === groupId) {
                        return {
                            ...node,
                            position: { x: newX, y: newY },
                            data: {
                                ...node.data,
                                width: newWidth,
                                height: newHeight
                            }
                        };
                    }
                    return node;
                });
            });

            groupResizeFrames.current.delete(groupId);
        });

        groupResizeFrames.current.set(groupId, frameId);
    }, [setNodesWithHistory]);

    // Create a group node from selected nodes
    const createGroupNode = useCallback(() => {
        const selectedNodes = nodes.filter(n => {
            if (!selectedNodeIds.has(n.id)) return false;
            if (!groupEligibleNodeIds) return true;
            return groupEligibleNodeIds.has(n.id);
        });
        if (selectedNodes.length < 2) return;
        const resolvedEditorOrigin = groupEditorOrigin ?? selectedNodes[0]?.data?.editorOrigin;

        const PADDING = 20;
        const PADDING_BOTTOM = 30;
        const HEADER_HEIGHT = 45;

        const childDimensions = selectedNodes.map(getNodeBoundingBox);

        const minX = Math.min(...childDimensions.map(d => d.x));
        const maxX = Math.max(...childDimensions.map(d => d.x + d.width));
        const minY = Math.min(...childDimensions.map(d => d.y));
        const maxY = Math.max(...childDimensions.map(d => d.y + d.height));


        // Group node dimensions
        const groupWidth = (maxX - minX) + (PADDING * 2);
        const groupHeight = (maxY - minY) + PADDING + PADDING_BOTTOM + HEADER_HEIGHT;
        const groupX = minX - PADDING;
        const groupY = minY - PADDING - HEADER_HEIGHT;

        // Create group node
        const groupNode: NodeData = {
            id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'group',
            position: { x: groupX, y: groupY },
            data: {
                width: groupWidth,
                height: groupHeight,
                isGroup: true,
                customName: `Group(${selectedNodes.length})`,
                childNodeIds: selectedNodes.map(n => n.id),
                inputs: [],
                outputs: [],
                scale: { x: 1, y: 1, z: 1 },
                rotation: { x: 0, y: 0, z: 0 },
                location: { x: 0, y: 0, z: 0 },
                isNewGroup: true,
                ...(resolvedEditorOrigin ? { editorOrigin: resolvedEditorOrigin } : {})
            },
        };

        // Prepend to nodes array (renders first = behind)
        setNodesWithHistory((prev) => [groupNode, ...prev]);
        onNodeCreate?.(groupNode);

        // Recalculate once the DOM has had a moment to report real sizes.
        // This fixes cases where the initial group is created from fallback
        // sizes and ends up not covering the actual nodes.
        setTimeout(() => {
            scheduleGroupResize(groupNode.id);
        }, 50);

        // Clear selection after exit animation completes
        setTimeout(() => {
            setSelectedNodeIds(new Set());
        }, 500);

        // Remove the pop-in flag after the animation finishes
        setTimeout(() => {
            setNodesWithHistory((prev) => prev.map(node => {
                if (node.id === groupNode.id) {
                    return {
                        ...node,
                        data: { ...node.data, isNewGroup: false }
                    };
                }
                return node;
            }));
        }, 500);
    }, [
        nodes,
        selectedNodeIds,
        onNodeCreate,
        setNodesWithHistory,
        setSelectedNodeIds,
        groupEligibleNodeIds,
        groupEditorOrigin,
        scheduleGroupResize
    ]);

    const handleJoinGroup = useCallback((nodeId: string, groupId: string) => {
        setNodesWithHistory((prev) => {
            // 1. First remove the node from any OTHER group it might be part of
            const cleanedNodes = prev.map(node => {
                if (node.type === 'group' && node.data.childNodeIds?.includes(nodeId) && node.id !== groupId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            childNodeIds: node.data.childNodeIds.filter(id => id !== nodeId)
                        }
                    };
                }
                return node;
            });

            // 2. Add to target group
            return cleanedNodes.map(node => {
                if (node.id === groupId) {
                    if (node.data.childNodeIds?.includes(nodeId)) return node;
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            childNodeIds: [...(node.data.childNodeIds || []), nodeId]
                        }
                    };
                }
                return node;
            });
        });

        setTimeout(() => {
            scheduleGroupResize(groupId);
        }, 50);
    }, [setNodesWithHistory, scheduleGroupResize]);

    const handleLeaveGroup = useCallback((nodeId: string) => {
        setNodesWithHistory((prev) => {
            return prev.map(node => {
                if (node.type === 'group' && node.data.childNodeIds?.includes(nodeId)) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            childNodeIds: node.data.childNodeIds.filter(id => id !== nodeId)
                        }
                    };
                }
                return node;
            });
        });

        const parentGroup = nodes.find(n =>
            n.type === 'group' && n.data.childNodeIds?.includes(nodeId)
        );
        if (parentGroup) {
            setTimeout(() => {
                scheduleGroupResize(parentGroup.id);
            }, 50);
        }
    }, [setNodesWithHistory, nodes, scheduleGroupResize]);

    // Helper to check if a node overlaps with a group
    const isNodeOverlappingGroup = useCallback((node: NodeData, group: NodeData): boolean => {
        if (!node || !group) return false;

        const nodeW = node.data.width || 280;
        const nodeH = node.data.height || 180;
        const nodeX = node.position.x;
        const nodeY = node.position.y;
        const nodeCenterX = nodeX + nodeW / 2;
        const nodeCenterY = nodeY + nodeH / 2;

        const groupX = group.position.x;
        const groupY = group.position.y;
        const groupW = group.data.width || 300;
        const groupH = group.data.height || 300;

        return (
            nodeCenterX >= groupX &&
            nodeCenterX <= groupX + groupW &&
            nodeCenterY >= groupY &&
            nodeCenterY <= groupY + groupH
        );
    }, []);

    return {
        scheduleGroupResize,
        createGroupNode,
        handleJoinGroup,
        handleLeaveGroup,
        isNodeOverlappingGroup
    };
};
