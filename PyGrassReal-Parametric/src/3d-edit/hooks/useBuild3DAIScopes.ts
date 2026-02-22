import { useMemo, useCallback, useRef } from 'react';
import type { NodeData, Connection } from '../types/NodeTypes';

export function useBuild3DAIScopes(nodes: NodeData[], connections: Connection[]) {
    const build3DAiScopeRefs = useRef<Map<string, { current: any }>>(new Map());

    const getBuild3DAiScopeRef = useCallback((id: string) => {
        if (!build3DAiScopeRefs.current.has(id)) {
            build3DAiScopeRefs.current.set(id, { current: null });
        }
        return build3DAiScopeRefs.current.get(id)!;
    }, []);

    const build3DAiScopeBoxes = useMemo(() => {
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        return nodes.filter(n => n.type === 'build-3d-ai').map(node => {
            const conn = connections.find(c => c.targetNodeId === node.id && c.targetPort === 'input-transform');
            const source = (conn && nodeMap.get(conn.sourceNodeId)?.type === 'transform') ? nodeMap.get(conn.sourceNodeId) : node;
            return {
                id: node.id,
                transformTargetNodeId: source?.id,
                position: [source?.data.location?.x || 0, source?.data.location?.y || 0, source?.data.location?.z || 0] as [number, number, number],
                rotation: [source?.data.rotation?.x || 0, source?.data.rotation?.y || 0, source?.data.rotation?.z || 0] as [number, number, number],
                scale: [source?.data.scale?.x || 1, source?.data.scale?.y || 1, source?.data.scale?.z || 1] as [number, number, number],
            };
        });
    }, [nodes, connections]);

    return { build3DAiScopeBoxes, getBuild3DAiScopeRef, build3DAiScopeRefs };
}
