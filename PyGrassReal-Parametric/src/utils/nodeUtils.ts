import type { NodeData } from '../types/NodeTypes';

/**
 * Checks if a given port on a node is an input port.
 * @param nodes - The array of all nodes.
 * @param nodeId - The ID of the node to check.
 * @param portId - The ID of the port to check.
 * @returns `true` if the port is an input, `false` otherwise.
 */
export const isInputPort = (nodes: NodeData[], nodeId: string, portId:string): boolean => {
    const node = nodes.find((n) => n.id === nodeId);
    // As a fallback, if the node isn't found (e.g., during a state update),
    // infer from the port ID convention.
    if (!node) {
        return portId.toLowerCase().includes('input');
    }
    const inputs = node.data.inputs || [];
    return inputs.some((p) => p.id === portId);
};
