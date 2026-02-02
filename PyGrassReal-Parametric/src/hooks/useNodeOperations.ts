import { useCallback } from 'react';
import type { NodeData, Connection } from '../types/NodeTypes';
import type { ComponentData } from '../types/ComponentTypes';
import { getInitialDataForNode, getNodeDefinition } from '../definitions/nodeDefinitions';
import { useNodeGraph } from '../context/NodeGraphContext';

interface UseNodeOperationsProps {
    selectedNodeIds: Set<string>;
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setFireEffects: React.Dispatch<React.SetStateAction<Array<{ id: string; x: number; y: number }>>>;
    setMagicEffects: React.Dispatch<React.SetStateAction<Array<{ id: string; x: number; y: number; color: string }>>>;
    scheduleGroupResize: (groupId: string) => void;
    componentLibraryRef: React.MutableRefObject<Map<string, ComponentData>>;
    onNodeCreate?: (node: NodeData) => void;
    onNodeDelete?: (nodeId: string) => void;
}

export const useNodeOperations = ({
    selectedNodeIds,
    setSelectedNodeIds,
    setFireEffects,
    setMagicEffects,
    scheduleGroupResize,
    componentLibraryRef,
    onNodeCreate,
    onNodeDelete,
}: UseNodeOperationsProps) => {
    const {
        nodes,
        connections,
        setNodesWithHistory,
        setConnectionsWithHistory
    } = useNodeGraph();

    const addNode = useCallback((
        type: NodeData['type'],
        position: { x: number; y: number },
        options?: { editorOrigin?: 'nodes' | 'widget' }
    ) => {
        const definition = getNodeDefinition(type);
        if (!definition) {
            console.error(`No definition found for node type: ${type}`);
            return;
        }

        const isSceneLinkedType = type === 'box' || type === 'sphere';
        const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newNode: NodeData = {
            id: newId,
            type,
            position,
            data: {
                ...getInitialDataForNode(type),
                editorOrigin: options?.editorOrigin,
                sceneObjectId: isSceneLinkedType ? newId : undefined,
            },
        };

        setNodesWithHistory((prev) => [...prev, newNode]);
        setSelectedNodeIds(new Set([newNode.id]));
        onNodeCreate?.(newNode);

        // Add magic particle effect at center of node
        const effectId = `effect-${Date.now()}`;
        const effectColor = definition.effectColor;

        // Dynamically calculate center for the effect, falling back to default sizes.
        const nodeWidth = (newNode.data.width && newNode.data.width > 1) ? newNode.data.width : 280;
        const nodeHeight = (newNode.data.height && newNode.data.height > 1) ? newNode.data.height : 220;

        const centerX = position.x + nodeWidth / 2;
        const centerY = position.y + nodeHeight / 2;
        setMagicEffects((prev) => [...prev, { id: effectId, x: centerX, y: centerY, color: effectColor }]);

        // Remove effect after animation completes
        setTimeout(() => {
            setMagicEffects((prev) => prev.filter((e) => e.id !== effectId));
        }, 1200);
    }, [onNodeCreate, setNodesWithHistory, setSelectedNodeIds, setMagicEffects]);

    const deleteNode = useCallback((id: string, deleteChildren = false) => {
        const nodeToDelete = nodes.find((node) => node.id === id);
        const idsToDelete = new Set<string>([id]);

        if (deleteChildren && nodeToDelete?.type === 'group' && nodeToDelete.data?.childNodeIds) {
            nodeToDelete.data.childNodeIds.forEach((childId) => idsToDelete.add(childId));
        }

        if (onNodeDelete) {
            idsToDelete.forEach((nodeId) => {
                onNodeDelete(nodeId);
            });
        }

        idsToDelete.forEach((nodeId) => {
            const targetNode = nodes.find((node) => node.id === nodeId);
            if (!targetNode || targetNode.type === 'group') return;

            const effectId = `fire-${Date.now()}-${nodeId}`;
            const nodeWidth = targetNode.data?.width || 280;
            const nodeHeight = targetNode.data?.height || 180;
            setFireEffects((prev) => [...prev, {
                id: effectId,
                x: targetNode.position.x + nodeWidth / 2,
                y: targetNode.position.y + nodeHeight / 2
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

        // Refactor Note: The original atomic update is split into two sequential updates.
        // This may result in two separate history entries, which is a slight degradation.
        // A better solution would involve a single context function to update both nodes and connections.
        setConnectionsWithHistory((prevConns) =>
            prevConns.filter(
                (conn) => !idsToDelete.has(conn.sourceNodeId) && !idsToDelete.has(conn.targetNodeId)
            )
        );

        setNodesWithHistory((prevNodes) =>
            prevNodes
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
    }, [nodes, setNodesWithHistory, setConnectionsWithHistory, setSelectedNodeIds, setFireEffects, onNodeDelete]);

    const duplicateNode = useCallback((nodeId: string) => {
        const nodeToDuplicate = nodes.find(n => n.id === nodeId);
        if (!nodeToDuplicate) return;

        // Deep copy the node to avoid any reference issues.
        const newNode: NodeData = JSON.parse(JSON.stringify(nodeToDuplicate));

        // Assign a new unique ID and a new position.
        newNode.id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        newNode.position = {
            x: nodeToDuplicate.position.x + 50,
            y: nodeToDuplicate.position.y + 50
        };

        // Ensure scene-linked nodes point to their own scene object after duplication.
        if (newNode.type === 'box' || newNode.type === 'sphere') {
            newNode.data = {
                ...newNode.data,
                sceneObjectId: newNode.id,
            };
        } else if (newNode.data?.sceneObjectId) {
            const { sceneObjectId, ...restData } = newNode.data;
            newNode.data = restData;
        }

        // Add a "(Copy)" suffix to the name for better UX, if it has a name.
        if (newNode.data.customName) {
            newNode.data.customName = `${newNode.data.customName} (Copy)`;
        }

        setNodesWithHistory(prev => [...prev, newNode]);
        setSelectedNodeIds(new Set([newNode.id]));
        onNodeCreate?.(newNode);
    }, [nodes, setNodesWithHistory, setSelectedNodeIds, onNodeCreate]);

    const updateNodeData = useCallback((id: string, data: Partial<NodeData['data']>) => {
        const isStructureChange = '_structureChanged' in data;
        const isDimensionChange = 'width' in data || 'height' in data;

        setNodesWithHistory((prev) => {
            let portsChanged = false;

            const updated = prev.map((node) => {
                if (node.id !== id) return node;
                if (node.type === 'component' && data.customName) {
                    const componentId = node.data.componentId || node.id;
                    const componentData = componentLibraryRef.current.get(componentId);
                    if (componentData) {
                        componentLibraryRef.current.set(componentId, { ...componentData, name: data.customName });
                    }
                }

                const prevInputsLen = node.data?.inputs?.length ?? 0;
                const prevOutputsLen = node.data?.outputs?.length ?? 0;
                const nextInputsLen = 'inputs' in data
                    ? (data.inputs?.length ?? 0)
                    : prevInputsLen;
                const nextOutputsLen = 'outputs' in data
                    ? (data.outputs?.length ?? 0)
                    : prevOutputsLen;

                if (prevInputsLen !== nextInputsLen || prevOutputsLen !== nextOutputsLen) {
                    portsChanged = true;
                }

                return { ...node, data: { ...node.data, ...data } };
            });

            if (isStructureChange || isDimensionChange || portsChanged) {
                const parentGroup = updated.find(n =>
                    n.type === 'group' && n.data?.childNodeIds?.includes(id)
                );

                if (parentGroup) {
                    scheduleGroupResize(parentGroup.id);
                }
            }

            return updated;
        });
    }, [scheduleGroupResize, setNodesWithHistory, componentLibraryRef]);

    const updateNodePosition = useCallback((id: string, position: { x: number; y: number }) => {
        setNodesWithHistory((prev) => {
            const targetNode = prev.find(n => n.id === id);
            if (!targetNode) return prev;

            const deltaX = position.x - targetNode.position.x;
            const deltaY = position.y - targetNode.position.y;

            // Step 1: Calculate the new state for all nodes
            let nextNodes: NodeData[];
            if (targetNode.type === 'group' && targetNode.data?.childNodeIds) {
                const childIds = new Set(targetNode.data.childNodeIds);
                nextNodes = prev.map((node) => {
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
            } else if (selectedNodeIds.has(id)) {
                nextNodes = prev.map((node) => {
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
            } else {
                nextNodes = prev.map((node) => (node.id === id ? { ...node, position } : node));
            }


            // Step 2: Perform side-effect checks on the new state
            const newTargetNode = nextNodes.find(n => n.id === id)!; // It must exist
            const parentGroup = nextNodes.find(n => n.type === 'group' && n.data?.childNodeIds?.includes(id));

            if (parentGroup) {
                // If the node is in a group, schedule a resize for the parent.
                scheduleGroupResize(parentGroup.id);
            }
            return nextNodes;
        });
    }, [selectedNodeIds, setNodesWithHistory, scheduleGroupResize]);

    return {
        addNode,
        deleteNode,
        duplicateNode,
        updateNodeData,
        updateNodePosition
    };
};
