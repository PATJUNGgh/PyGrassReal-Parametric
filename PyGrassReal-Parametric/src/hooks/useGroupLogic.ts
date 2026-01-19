import { useRef, useCallback } from 'react';
import type { NodeData } from '../types/NodeTypes';

interface UseGroupLogicProps {
    nodes: NodeData[];
    setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
    selectedNodeIds: Set<string>;
    setSelectedNodeIds: (ids: Set<string>) => void;
    onNodeCreate?: (node: NodeData) => void;
}

export const useGroupLogic = ({
    nodes,
    setNodes,
    selectedNodeIds,
    setSelectedNodeIds,
    onNodeCreate
}: UseGroupLogicProps) => {

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
            setNodes((prev) => {
                const group = prev.find(n => n.id === groupId && n.type === 'group');
                if (!group || !group.data?.childNodeIds) return prev;

                const childNodes = prev.filter(n => group.data?.childNodeIds?.includes(n.id));
                if (childNodes.length === 0) return prev;

                const PADDING = 25;
                const PADDING_BOTTOM = 25;
                const HEADER_HEIGHT = 45;

                // Measure node dimensions using data or fallback to defaults (for accurate bounding box)
                const childDimensions = childNodes.map(child => {
                    let width = 280;
                    let height = 180;

                    const isPanel = child.type === 'panel' || (child.data?.customName && child.data.customName.includes('Panel'));
                    const isCustom = child.type === 'custom' || child.type === 'antivirus';

                    if (isPanel) {
                        width = 340;
                        height = 300;
                    } else if (isCustom) {
                        const nameLen = (child.data?.customName || 'Custom Node').length;
                        width = Math.min(620, Math.max(320, (nameLen * 8) + 180));

                        const maxPorts = Math.max(child.data?.inputs?.length || 0, child.data?.outputs?.length || 0);
                        if (maxPorts > 0) height = 140 + (maxPorts * 40);
                    }

                    if (child.data?.width && child.data.width > 50) width = child.data.width;
                    if (child.data?.height && child.data.height > 50) height = child.data.height;

                    // Safety floor
                    if (width < 100) width = 200;
                    if (height < 100) height = 100;

                    return {
                        x: child.position.x,
                        y: child.position.y,
                        width,
                        height
                    };
                });

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
                    Math.abs(currentWidth - newWidth) < 5 &&
                    Math.abs(currentHeight - newHeight) < 5 &&
                    Math.abs(currentX - newX) < 5 &&
                    Math.abs(currentY - newY) < 5
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
    }, [setNodes]);

    // Create a group node from selected nodes
    const createGroupNode = useCallback(() => {
        const selectedNodes = nodes.filter(n => selectedNodeIds.has(n.id));
        if (selectedNodes.length < 2) return;

        const NODE_WIDTH = 280;
        const NODE_HEIGHT = 180;
        const PADDING = 25;
        const PADDING_BOTTOM = 25;
        const HEADER_HEIGHT = 45;

        // Calculate bounding box
        const minX = Math.min(...selectedNodes.map(n => n.position.x));
        const minY = Math.min(...selectedNodes.map(n => n.position.y));

        const maxX = Math.max(...selectedNodes.map(n => {
            let w = 280;
            const isPanel = n.type === 'panel' || (n.data?.customName && n.data.customName.includes('Panel'));
            const isCustom = n.type === 'custom' || n.type === 'antivirus';

            if (isPanel) {
                w = 340;
            } else if (isCustom) {
                const nameLen = (n.data?.customName || 'Custom Node').length;
                w = Math.min(620, Math.max(320, (nameLen * 8) + 180));
            }

            if (n.data?.width && n.data.width > 50) w = n.data.width;
            if (w < 100) w = 200; // Safety floor

            return n.position.x + w;
        }));

        const maxY = Math.max(...selectedNodes.map(n => {
            let h = 180;
            const isPanel = n.type === 'panel' || (n.data?.customName && n.data.customName.includes('Panel'));
            const isCustom = n.type === 'custom' || n.type === 'input' || n.type === 'output' || n.type === 'antivirus';

            if (isPanel) {
                h = 300;
            } else if (isCustom) {
                const maxPorts = Math.max(n.data?.inputs?.length || 0, n.data?.outputs?.length || 0);
                if (maxPorts > 0) h = 140 + (maxPorts * 40);
            }

            if (n.data?.height && n.data.height > 50) h = n.data.height;
            if (h < 100) h = 100; // Safety floor

            return n.position.y + h;
        }));

        // Group node dimensions
        const groupWidth = (maxX - minX) + (PADDING * 2);
        const groupHeight = (maxY - minY) + PADDING + PADDING_BOTTOM + HEADER_HEIGHT;
        const groupX = minX - PADDING;
        const groupY = minY - PADDING - HEADER_HEIGHT;

        // Create group node
        const groupNode: NodeData = {
            id: `group-${Date.now()}`,
            type: 'group',
            position: { x: groupX, y: groupY },
            data: {
                width: groupWidth,
                height: groupHeight,
                isGroup: true,
                customName: `Group(${selectedNodes.length})`,
                childNodeIds: Array.from(selectedNodeIds),
                inputs: [],
                outputs: [],
                scale: { x: 1, y: 1, z: 1 },
                rotation: { x: 0, y: 0, z: 0 },
                location: { x: 0, y: 0, z: 0 },
            },
        };

        // Prepend to nodes array (renders first = behind)
        setNodes((prev) => [groupNode, ...prev]);
        onNodeCreate?.(groupNode);

        // Clear selection after exit animation completes
        setTimeout(() => {
            setSelectedNodeIds(new Set());
        }, 500);
    }, [nodes, selectedNodeIds, onNodeCreate, setNodes, setSelectedNodeIds]);

    const handleJoinGroup = useCallback((nodeId: string, groupId: string) => {
        setNodes((prev) => {
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
    }, [setNodes, scheduleGroupResize]);

    const handleLeaveGroup = useCallback((nodeId: string) => {
        setNodes((prev) => {
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
    }, [setNodes, nodes, scheduleGroupResize]);

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
