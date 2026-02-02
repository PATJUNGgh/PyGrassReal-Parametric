import { useRef, useEffect } from 'react';
import type { NodeData } from '../types/NodeTypes';
import { getInitialDataForNode } from '../definitions/nodeDefinitions';
import { useNodeGraph } from '../context/NodeGraphContext';

const SCENE_OBJECT_NODE_TYPES: NodeData['type'][] = ['box', 'sphere'];

interface SceneObject {
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
}

export function useSceneSync(
    sceneObjects: SceneObject[] | undefined,
) {
    const { setNodesRaw, isUndoingRef } = useNodeGraph();
    const prevSceneObjectsRef = useRef<string>();

    useEffect(() => {
        if (!sceneObjects) return;

        // Prevent loop by checking if sceneObjects have actually changed (Deep check)
        const currentSceneState = JSON.stringify(sceneObjects.map(o => ({ id: o.id, type: o.type, position: o.position })));
        if (currentSceneState === prevSceneObjectsRef.current) {
            return;
        }
        prevSceneObjectsRef.current = currentSceneState;

        // IMPORTANT: If we are currently performing an Undo/Redo (isUndoingRef.current is true), 
        // we MUST NOT sync from sceneObjects. These sceneObjects are currently stale 
        // (calculated before the undo) and would overwrite our newly restored nodes.
        if (isUndoingRef.current) return;

        // Use raw setNodes for syncs. We handle history (pushToHistory) at the 
        // interaction boundaries (e.g. at the start of a 3D drag).
        const setter = setNodesRaw;

        setter((prev) => {
            const sceneIds = new Set(
                sceneObjects
                    .filter((obj) => SCENE_OBJECT_NODE_TYPES.includes(obj.type as NodeData['type']))
                    .map((obj) => obj.id)
            );

            const sceneMap = new Map<string, NodeData>();
            const nonSceneNodes: NodeData[] = [];

            prev.forEach((node) => {
                const inferredSceneId = node.data?.sceneObjectId ?? (sceneIds.has(node.id) ? node.id : undefined);
                if (inferredSceneId) {
                    const normalized = node.data?.sceneObjectId
                        ? node
                        : { ...node, data: { ...node.data, sceneObjectId: inferredSceneId } };
                    sceneMap.set(inferredSceneId, normalized);
                } else {
                    nonSceneNodes.push(node);
                }
            });

            const nextNodes = [...nonSceneNodes];

            sceneObjects.forEach((obj, index) => {
                if (!SCENE_OBJECT_NODE_TYPES.includes(obj.type as NodeData['type'])) {
                    return;
                }
                const linkedNode = sceneMap.get(obj.id);
                if (linkedNode) {
                    nextNodes.push(linkedNode);
                    return;
                }

                const newNode: NodeData = {
                    id: obj.id,
                    type: obj.type as NodeData['type'],
                    position: { x: 80 + index * 220, y: 120 },
                    data: {
                        ...getInitialDataForNode(obj.type as NodeData['type']),
                        sceneObjectId: obj.id,
                    },
                };
                nextNodes.push(newNode);
            });

            return nextNodes;
        });
    }, [sceneObjects, setNodesRaw, isUndoingRef]);
}
