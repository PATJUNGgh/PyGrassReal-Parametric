import { useCallback } from 'react';
import type { NodeData, Connection } from '../types/NodeTypes';
import type { ComponentData } from '../types/ComponentTypes';
import { useNodeGraph } from '../context/NodeGraphContext';

interface UseComponentLogicProps {
    componentLibraryRef: React.MutableRefObject<Map<string, ComponentData>>;
}

export const useComponentLogic = ({
    componentLibraryRef
}: UseComponentLogicProps) => {
    const {
        nodes,
        connections,
        setNodesWithHistory,
        setConnectionsWithHistory
    } = useNodeGraph();

    const convertGroupToComponent = useCallback((groupId: string) => {
        const group = nodes.find((node) => node.id === groupId && node.type === 'group');
        if (!group || !group.data?.childNodeIds?.length) {
            return;
        }

        const childIds = new Set(group.data.childNodeIds);
        const childNodes = nodes.filter((node) => childIds.has(node.id));
        const internalConnections = connections.filter(
            (conn) => childIds.has(conn.sourceNodeId) && childIds.has(conn.targetNodeId)
        );
        const externalConnections = connections.filter(
            (conn) => childIds.has(conn.sourceNodeId) !== childIds.has(conn.targetNodeId)
        );

        const inputPortMap = new Map<string, { id: string; label: string }>();
        const outputPortMap = new Map<string, { id: string; label: string }>();
        const newConnections: Connection[] = [];
        const inputBindings = new Map<string, { componentPortId: string; nodeId: string; portId: string }>();
        const outputBindings = new Map<string, { componentPortId: string; nodeId: string; portId: string }>();
        const portLabelMap = new Map<string, string>();

        let inputIndex = 1;
        let outputIndex = 1;
        const componentId = `component-${Date.now()}`;

        const inputNodes = childNodes.filter((node) => node.type === 'input' || node.type === 'number-slider' || node.type === 'series');
        const outputNodes = childNodes.filter((node) => node.type === 'output');
        const inputNodePortMap = new Map<string, { id: string; label: string }>();
        const outputNodePortMap = new Map<string, { id: string; label: string }>();

        childNodes.forEach((node) => {
            (node.data.inputs || []).forEach((portDef) => {
                if (portDef.label) {
                    portLabelMap.set(`${node.id}:${portDef.id}`, portDef.label);
                }
            });
            (node.data.outputs || []).forEach((portDef) => {
                if (portDef.label) {
                    portLabelMap.set(`${node.id}:${portDef.id}`, portDef.label);
                }
            });
        });

        inputNodes.forEach((node, index) => {
            const outputs = node.data.outputs?.length ? node.data.outputs : [{ id: `output-${index + 1}`, label: '' }];
            outputs.forEach((portDef, _portIndex) => {
                const label = portDef.label || node.data.customName || `Input ${inputIndex}`;
                const port = { id: `in-${inputIndex}`, label };
                inputIndex += 1;
                inputPortMap.set(`node:${node.id}:${portDef.id}`, port);
                inputNodePortMap.set(`${node.id}:${portDef.id}`, port);
                inputBindings.set(port.id, { componentPortId: port.id, nodeId: node.id, portId: portDef.id });
            });
        });

        outputNodes.forEach((node, index) => {
            const inputs = node.data.inputs?.length ? node.data.inputs : [{ id: `input-${index + 1}`, label: '' }];
            inputs.forEach((portDef, _portIndex) => {
                const label = portDef.label || node.data.customName || `Output ${outputIndex}`;
                const port = { id: `out-${outputIndex}`, label };
                outputIndex += 1;
                outputPortMap.set(`node:${node.id}:${portDef.id}`, port);
                outputNodePortMap.set(`${node.id}:${portDef.id}`, port);
                outputBindings.set(port.id, { componentPortId: port.id, nodeId: node.id, portId: portDef.id });
            });
        });

        externalConnections.forEach((conn, index) => {
            const sourceInside = childIds.has(conn.sourceNodeId);
            const targetInside = childIds.has(conn.targetNodeId);

            if (!sourceInside && targetInside) {
                const directPort = inputNodePortMap.get(`${conn.targetNodeId}:${conn.targetPort}`);
                const key = `${conn.targetNodeId}:${conn.targetPort}`;
                if (!directPort && !inputPortMap.has(key)) {
                    const label = portLabelMap.get(key) || conn.targetPort;
                    inputPortMap.set(key, { id: `in-${inputIndex}`, label });
                    inputIndex += 1;
                }
                const port = directPort || inputPortMap.get(key);
                if (!port) return;
                if (!inputBindings.has(port.id)) {
                    inputBindings.set(port.id, {
                        componentPortId: port.id,
                        nodeId: conn.targetNodeId,
                        portId: conn.targetPort,
                    });
                }
                newConnections.push({
                    id: `conn-${Date.now()}-${index}`,
                    sourceNodeId: conn.sourceNodeId,
                    targetNodeId: componentId,
                    sourcePort: conn.sourcePort,
                    targetPort: port.id,
                });
            }

            if (sourceInside && !targetInside) {
                const directPort = outputNodePortMap.get(`${conn.sourceNodeId}:${conn.sourcePort}`);
                const key = `${conn.sourceNodeId}:${conn.sourcePort}`;
                if (!directPort && !outputPortMap.has(key)) {
                    const label = portLabelMap.get(key) || conn.sourcePort;
                    outputPortMap.set(key, { id: `out-${outputIndex}`, label });
                    outputIndex += 1;
                }
                const port = directPort || outputPortMap.get(key);
                if (!port) return;
                if (!outputBindings.has(port.id)) {
                    outputBindings.set(port.id, {
                        componentPortId: port.id,
                        nodeId: conn.sourceNodeId,
                        portId: conn.sourcePort,
                    });
                }
                newConnections.push({
                    id: `conn-${Date.now()}-${index}`,
                    sourceNodeId: componentId,
                    targetNodeId: conn.targetNodeId,
                    sourcePort: port.id,
                    targetPort: conn.targetPort,
                });
            }
        });

        const componentData: ComponentData = {
            id: componentId,
            name: group.data.customName || 'Component',
            inputPorts: Array.from(inputPortMap.values()),
            outputPorts: Array.from(outputPortMap.values()),
            internalNodes: childNodes.map((node) => ({
                id: node.id,
                type: node.type,
                position: node.position,
                data: node.data as Record<string, unknown>,
            })),
            internalConnections: internalConnections.map((conn) => ({ ...conn })),
            inputBindings: Array.from(inputBindings.values()),
            outputBindings: Array.from(outputBindings.values()),
            origin: { ...group.position },
        };

        const componentNode: NodeData = {
            id: componentId,
            type: 'component',
            position: group.position,
            data: {
                customName: componentData.name,
                inputs: componentData.inputPorts.map((port) => ({ id: port.id, label: port.label })),
                outputs: componentData.outputPorts.map((port) => ({ id: port.id, label: port.label })),
                componentId,
                width: group.data.width,
                height: group.data.height,
            },
        };

        componentLibraryRef.current.set(componentId, componentData);

        setNodesWithHistory((prev) => prev.filter((node) => !childIds.has(node.id) && node.id !== groupId).concat(componentNode));
        setConnectionsWithHistory((prev) => {
            const preserved = prev.filter(
                (conn) => !childIds.has(conn.sourceNodeId) && !childIds.has(conn.targetNodeId)
            );
            return preserved.concat(newConnections);
        });
    }, [nodes, connections, setNodesWithHistory, setConnectionsWithHistory, componentLibraryRef]);

    const handleComponentCluster = useCallback((componentNodeId: string) => {
        const componentNode = nodes.find((node) => node.id === componentNodeId && node.type === 'component');
        if (!componentNode) {
            return;
        }
        const componentId = componentNode.data.componentId || componentNode.id;
        const componentData = componentLibraryRef.current.get(componentId);
        if (!componentData) {
            return;
        }

        const existingIds = new Set(nodes.map((node) => node.id));
        const idMap = new Map<string, string>();

        componentData.internalNodes.forEach((node, index) => {
            let nextId = node.id;
            if (existingIds.has(nextId)) {
                nextId = `node-${Date.now()}-${index}`;
            }
            idMap.set(node.id, nextId);
            existingIds.add(nextId);
        });

        const origin = componentData.origin || componentNode.position;
        const deltaX = componentNode.position.x - origin.x;
        const deltaY = componentNode.position.y - origin.y;

        const restoredNodes: NodeData[] = componentData.internalNodes.map((node) => ({
            id: idMap.get(node.id) || node.id,
            type: node.type as NodeData['type'],
            position: { x: node.position.x + deltaX, y: node.position.y + deltaY },
            data: node.data as NodeData['data'],
        }));

        const restoredConnections: Connection[] = componentData.internalConnections.map((conn, index) => ({
            id: `conn-${Date.now()}-${index}`,
            sourceNodeId: idMap.get(conn.sourceNodeId) || conn.sourceNodeId,
            targetNodeId: idMap.get(conn.targetNodeId) || conn.targetNodeId,
            sourcePort: conn.sourcePort,
            targetPort: conn.targetPort,
        }));

        const bindingInputMap = new Map(
            (componentData.inputBindings || []).map((binding) => [binding.componentPortId, binding])
        );
        const bindingOutputMap = new Map(
            (componentData.outputBindings || []).map((binding) => [binding.componentPortId, binding])
        );

        const externalConnections = connections.filter(
            (conn) => conn.sourceNodeId === componentNodeId || conn.targetNodeId === componentNodeId
        );
        const preservedConnections = connections.filter(
            (conn) => conn.sourceNodeId !== componentNodeId && conn.targetNodeId !== componentNodeId
        );

        const reboundConnections: Connection[] = [];
        externalConnections.forEach((conn, index) => {
            if (conn.targetNodeId === componentNodeId) {
                const binding = bindingInputMap.get(conn.targetPort);
                if (!binding) return;
                reboundConnections.push({
                    id: `conn-${Date.now()}-${index}`,
                    sourceNodeId: conn.sourceNodeId,
                    targetNodeId: idMap.get(binding.nodeId) || binding.nodeId,
                    sourcePort: conn.sourcePort,
                    targetPort: binding.portId,
                });
                return;
            }
            if (conn.sourceNodeId === componentNodeId) {
                const binding = bindingOutputMap.get(conn.sourcePort);
                if (!binding) return;
                reboundConnections.push({
                    id: `conn-${Date.now()}-${index}`,
                    sourceNodeId: idMap.get(binding.nodeId) || binding.nodeId,
                    targetNodeId: conn.targetNodeId,
                    sourcePort: binding.portId,
                    targetPort: conn.targetPort,
                });
            }
        });

        const NODE_WIDTH = 280;
        const NODE_HEIGHT = 180;
        const PADDING = 25;
        const PADDING_BOTTOM = 25;
        const HEADER_HEIGHT = 45;

        const minX = Math.min(...restoredNodes.map((node) => node.position.x));
        const maxX = Math.max(...restoredNodes.map((node) => node.position.x + NODE_WIDTH));
        const minY = Math.min(...restoredNodes.map((node) => node.position.y));
        const maxY = Math.max(...restoredNodes.map((node) => node.position.y + NODE_HEIGHT));

        const groupNode: NodeData = {
            id: `group-${Date.now()}`,
            type: 'group',
            position: { x: minX - PADDING, y: minY - PADDING - HEADER_HEIGHT },
            data: {
                width: (maxX - minX) + (PADDING * 2),
                height: (maxY - minY) + PADDING + PADDING_BOTTOM + HEADER_HEIGHT,
                isGroup: true,
                customName: componentData.name,
                childNodeIds: restoredNodes.map((node) => node.id),
                inputs: [],
                outputs: [],
                scale: { x: 1, y: 1, z: 1 },
                rotation: { x: 0, y: 0, z: 0 },
                location: { x: 0, y: 0, z: 0 },
            },
        };

        setNodesWithHistory((prev) => {
            const filtered = prev.filter((node) => node.id !== componentNodeId);
            return [groupNode, ...restoredNodes, ...filtered];
        });
        setConnectionsWithHistory([...preservedConnections, ...restoredConnections, ...reboundConnections]);
    }, [nodes, connections, setNodesWithHistory, setConnectionsWithHistory, componentLibraryRef]);

    return {
        convertGroupToComponent,
        handleComponentCluster
    };
};
