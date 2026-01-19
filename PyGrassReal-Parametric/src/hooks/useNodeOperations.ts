import { useCallback } from 'react';
import type { NodeData, Connection } from '../types/NodeTypes';
import type { ComponentData } from '../types/ComponentTypes';

interface UseNodeOperationsProps {
    nodes: NodeData[];
    setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
    connections: Connection[];
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
    selectedNodeIds: Set<string>;
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setFireEffects: React.Dispatch<React.SetStateAction<Array<{ id: string; x: number; y: number }>>>;
    setMagicEffects: React.Dispatch<React.SetStateAction<Array<{ id: string; x: number; y: number; color: string }>>>;
    scheduleGroupResize: (groupId: string) => void;
    componentLibraryRef: React.MutableRefObject<Map<string, ComponentData>>;
    setJoinCandidate: React.Dispatch<React.SetStateAction<{ groupId: string; nodeId: string } | null>>;
    onNodeCreate?: (node: NodeData) => void;
}

export const useNodeOperations = ({
    nodes,
    setNodes,
    connections,
    setConnections,
    selectedNodeIds,
    setSelectedNodeIds,
    setFireEffects,
    setMagicEffects,
    scheduleGroupResize,
    componentLibraryRef,
    setJoinCandidate,
    onNodeCreate
}: UseNodeOperationsProps) => {

    const addNode = useCallback((type: 'box' | 'sphere' | 'custom' | 'antivirus' | 'input' | 'output' | 'number-slider' | 'panel', position: { x: number; y: number }) => {
        const newNode: NodeData = {
            id: `node-${Date.now()}`,
            type,
            position,
            data: {
                width: 1,
                height: 1,
                depth: 1,
                radius: 1,
                scale: { x: 1, y: 1, z: 1 },
                rotation: { x: 0, y: 0, z: 0 },
                location: { x: 0, y: 0, z: 0 },
                ...(type === 'custom' && {
                    customName: 'Custom Node',
                    inputs: [],
                    outputs: [],
                }),
                ...(type === 'antivirus' && {
                    customName: 'AntiVirus Node',
                    inputs: [],
                    outputs: [],
                }),
                ...(type === 'input' && {
                    customName: 'Input Node',
                    inputs: [],
                    outputs: [{ id: 'output-1', label: 'Output 1' }],
                }),
                ...(type === 'output' && {
                    customName: 'Output Node',
                    inputs: [{ id: 'input-1', label: 'Input 1' }],
                    outputs: [],
                }),
                ...(type === 'number-slider' && {
                    customName: 'Number Slider',
                    width: 260,
                    height: 150,
                    min: 0,
                    max: 100,
                    step: 1,
                    value: 50,
                    inputs: [],
                    outputs: [{ id: 'output-main', label: 'Value' }],
                }),
                ...(type === 'panel' && {
                    customName: 'Panel',
                    width: 340,
                    height: 300,
                    inputs: [{ id: 'input-main', label: 'Inspector Input' }],
                    outputs: [{ id: 'output-main', label: 'Panel Output' }],
                }),
            },
        };
        setNodes((prev) => [...prev, newNode]);
        setSelectedNodeIds(new Set([newNode.id]));
        onNodeCreate?.(newNode);

        // Add magic particle effect at center of node
        const effectId = `effect-${Date.now()}`;
        const effectColor = type === 'box'
            ? '#646cff'
            : type === 'sphere'
                ? '#2196f3'
                : type === 'input'
                    ? '#22c55e'
                    : type === 'output'
                        ? '#ef4444'
                        : type === 'number-slider'
                            ? '#0ea5e9'
                            : type === 'antivirus'
                                ? '#dc2626'
                                : type === 'panel'
                                    ? '#eab308'
                                    : '#8b5cf6';
        // Calculate center based on node type
        const centerX = type === 'panel' ? position.x + 170 : position.x + 120;
        const centerY = type === 'panel' ? position.y + 150 : position.y + 100;
        setMagicEffects((prev) => [...prev, { id: effectId, x: centerX, y: centerY, color: effectColor }]);

        // Remove effect after animation completes
        setTimeout(() => {
            setMagicEffects((prev) => prev.filter((e) => e.id !== effectId));
        }, 1200);
    }, [onNodeCreate, setNodes, setSelectedNodeIds, setMagicEffects]);

    const deleteNode = useCallback((id: string, deleteChildren = false) => {
        // We need 'nodes' here to find the node and its children (if group)
        // But since we are inside useCallback, we rely on 'nodes' dependency or use functional update if possible.
        // However, we need to KNOW the children IDs to remove connections and to set Fire effects.
        // So we might need to rely on the 'nodes' prop being current.

        // ISSUE: 'nodes' in dependency array causes function re-creation on every node change.
        // But 'deleteNode' is passed to children, so re-creation might be okay or costly.
        // Let's use the functional update pattern where possible, but for effects we need the current state.

        // Actually, we can use setNodes(prev => ...) to get the latest nodes for logic that modifies them,
        // but generating effects requires reading the node's position.

        // Let's assume we have access to 'nodes' from props.
        const nodeToDelete = nodes.find((node) => node.id === id);
        const idsToDelete = new Set<string>([id]);

        if (deleteChildren && nodeToDelete?.type === 'group' && nodeToDelete.data?.childNodeIds) {
            nodeToDelete.data.childNodeIds.forEach((childId) => idsToDelete.add(childId));
        }

        idsToDelete.forEach((nodeId) => {
            const targetNode = nodes.find((node) => node.id === nodeId);
            if (!targetNode || targetNode.type === 'group') return;

            const effectId = `fire-${Date.now()}-${nodeId}`;
            setFireEffects((prev) => [...prev, {
                id: effectId,
                x: targetNode.position.x + 120,
                y: targetNode.position.y + 100
            }]);

            setTimeout(() => {
                setFireEffects((prev) => prev.filter((e) => e.id !== effectId));
            }, 1200);
        });

        setSelectedNodeIds((prev) => {
            if (prev.size === 0) return prev;
            const next = new Set<string>();
            prev.forEach((nodeId) => {
                if (!idsToDelete.has(nodeId)) {
                    next.add(nodeId);
                }
            });
            return next;
        });

        setNodes((prev) =>
            prev
                .map((node) => {
                    if (node.type !== 'group' || !node.data?.childNodeIds) return node;
                    const filteredChildIds = node.data.childNodeIds.filter((childId) => !idsToDelete.has(childId));
                    if (filteredChildIds.length === node.data.childNodeIds.length) return node;
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            childNodeIds: filteredChildIds
                        }
                    };
                })
                .filter((node) => !idsToDelete.has(node.id))
        );

        setConnections((prev) =>
            prev.filter(
                (conn) => !idsToDelete.has(conn.sourceNodeId) && !idsToDelete.has(conn.targetNodeId)
            )
        );
    }, [nodes, setNodes, setConnections, setSelectedNodeIds, setFireEffects]);

    const duplicateNode = useCallback((nodeId: string) => {
        const nodeToDuplicate = nodes.find(n => n.id === nodeId);
        if (!nodeToDuplicate) return;

        const newNode: NodeData = {
            ...JSON.parse(JSON.stringify(nodeToDuplicate)),
            id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            position: {
                x: nodeToDuplicate.position.x + 50,
                y: nodeToDuplicate.position.y + 50
            },
            data: {
                ...nodeToDuplicate.data,
                customName: nodeToDuplicate.data.customName,
            }
        };

        setNodes(prev => [...prev, newNode]);
        setSelectedNodeIds(new Set([newNode.id]));
    }, [nodes, setNodes, setSelectedNodeIds]);

    const updateNodeData = useCallback((id: string, data: Partial<NodeData['data']>) => {
        const isStructureChange = '_structureChanged' in data;
        const isDimensionChange = 'width' in data || 'height' in data;

        setNodes((prev) => {
            const updated = prev.map((node) => {
                if (node.id !== id) return node;
                if (node.type === 'component' && data.customName) {
                    const componentId = node.data.componentId || node.id;
                    const componentData = componentLibraryRef.current.get(componentId);
                    if (componentData) {
                        componentLibraryRef.current.set(componentId, { ...componentData, name: data.customName });
                    }
                }
                return { ...node, data: { ...node.data, ...data } };
            });

            if (isStructureChange || isDimensionChange) {
                const parentGroup = updated.find(n =>
                    n.type === 'group' && n.data?.childNodeIds?.includes(id)
                );

                if (parentGroup) {
                    scheduleGroupResize(parentGroup.id);
                }
            }

            return updated;
        });
    }, [scheduleGroupResize, setNodes, componentLibraryRef]);

    const updateNodePosition = useCallback((id: string, position: { x: number; y: number }) => {
        setNodes((prev) => {
            const targetNode = prev.find(n => n.id === id);
            if (!targetNode) return prev;

            const deltaX = position.x - targetNode.position.x;
            const deltaY = position.y - targetNode.position.y;

            if (targetNode.type === 'group' && targetNode.data?.childNodeIds) {
                const childIds = new Set(targetNode.data.childNodeIds);
                return prev.map((node) => {
                    if (node.id === id) {
                        return { ...node, position };
                    }
                    if (childIds.has(node.id)) {
                        return {
                            ...node,
                            position: {
                                x: node.position.x + deltaX,
                                y: node.position.y + deltaY,
                            },
                        };
                    }
                    return node;
                });
            }

            const parentGroup = prev.find(n =>
                n.type === 'group' &&
                n.data?.childNodeIds?.includes(id)
            );

            if (parentGroup) {
                let updatedNodes = prev.map((node) =>
                    node.id === id ? { ...node, position } : node
                );

                const PADDING = 25;
                const PADDING_BOTTOM = 25;
                const HEADER_HEIGHT = 45;

                const childNodes = updatedNodes.filter(n =>
                    parentGroup.data?.childNodeIds?.includes(n.id)
                );

                if (childNodes.length > 0) {
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

                    const newGroupX = minX - PADDING;
                    const newGroupY = minY - PADDING - HEADER_HEIGHT;
                    const newWidth = (maxX - minX) + (PADDING * 2);
                    const newHeight = (maxY - minY) + PADDING + PADDING_BOTTOM + HEADER_HEIGHT;

                    updatedNodes = updatedNodes.map(node => {
                        if (node.id === parentGroup.id) {
                            return {
                                ...node,
                                position: { x: newGroupX, y: newGroupY },
                                data: {
                                    ...node.data,
                                    width: newWidth,
                                    height: newHeight
                                }
                            };
                        }
                        return node;
                    });
                }

                return updatedNodes;
            }

            if (selectedNodeIds.has(id)) {
                return prev.map((node) => {
                    if (selectedNodeIds.has(node.id)) {
                        return {
                            ...node,
                            position: {
                                x: node.position.x + deltaX,
                                y: node.position.y + deltaY,
                            },
                        };
                    }
                    return node;
                });
            }

            const isNodeInGroup = prev.some(n => n.type === 'group' && n.data?.childNodeIds?.includes(id));
            const isGroupNode = targetNode.type === 'group';

            if (!isNodeInGroup && !isGroupNode) {
                const nodeWidth = targetNode.data?.width || 280;
                const nodeHeight = targetNode.data?.height || 180;

                const overlappingGroup = prev.find(g => {
                    if (g.type !== 'group' || g.id === id) return false;

                    const nodeCenterX = position.x + nodeWidth / 2;
                    const nodeCenterY = position.y + nodeHeight / 2;

                    const groupX = g.position.x;
                    const groupY = g.position.y;
                    const groupW = g.data?.width || 400;
                    const groupH = g.data?.height || 300;

                    const isOverlapping = (
                        nodeCenterX > groupX &&
                        nodeCenterX < groupX + groupW &&
                        nodeCenterY > groupY &&
                        nodeCenterY < groupY + groupH
                    );

                    return isOverlapping;
                });

                setTimeout(() => {
                    if (overlappingGroup) {
                        setJoinCandidate({ groupId: overlappingGroup.id, nodeId: id });
                    }
                }, 0);
            }

            return prev.map((node) => (node.id === id ? { ...node, position } : node));
        });
    }, [selectedNodeIds, setNodes, setJoinCandidate]);

    return {
        addNode,
        deleteNode,
        duplicateNode,
        updateNodeData,
        updateNodePosition
    };
};
