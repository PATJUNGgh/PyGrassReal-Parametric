import React, { useCallback } from 'react';
import * as THREE from 'three';
import { 
    applySculptOpsToObject, 
    cloneObjectForSculpt, 
    parseSculptPlan, 
    resolveSculptMaskMark 
} from '../utils/aiSculpt';
import { 
    applyPaintOpToObject, 
    getPaintOpsSignature, 
    parsePaintPlan, 
    resolvePaintMaskMark 
} from '../utils/aiPaint';
import { ensurePictureContainer, getPictureSignature } from '../utils/pictureMesh';
import { resolveInputValue } from '../utils/nodeValueResolvers';
import { resetClonedMeshProperties } from '../utils/nodeUtils';
import type { NodeData, Connection } from '../types/NodeTypes';
import type { SceneObject } from '../types/scene';

export const useAiProcessor = () => {
    const processAiSculptNodes = useCallback((
        nodes: NodeData[],
        connections: Connection[],
        nodeMap: Map<string, NodeData>,
        sceneObjectMap: Map<string, SceneObject>,
        finalResults: any,
        lastHashesRef: React.MutableRefObject<Map<string, string>>
    ) => {
        const aiSculptNodes = nodes.filter((node) => node.type === 'ai-sculpt');

        const resolveRenderableSourceId = (candidateNodeId: string, visited: Set<string>): string | null => {
            if (visited.has(candidateNodeId)) return null;
            visited.add(candidateNodeId);

            if (finalResults.generatedObjects.has(candidateNodeId) || sceneObjectMap.has(candidateNodeId)) {
                return candidateNodeId;
            }

            const incomingConnections = connections.filter((connection) => connection.targetNodeId === candidateNodeId);
            for (const connection of incomingConnections) {
                const resolved = resolveRenderableSourceId(connection.sourceNodeId, visited);
                if (resolved) return resolved;
            }

            return null;
        };

        aiSculptNodes.forEach((node) => {
            finalResults.processedBooleanIds.add(node.id);

            const meshConnection = connections.find((connection) => {
                return connection.targetNodeId === node.id && connection.targetPort === 'input-mesh';
            });
            if (!meshConnection) return;

            const renderableSourceNodeId = resolveRenderableSourceId(meshConnection.sourceNodeId, new Set<string>());
            if (!renderableSourceNodeId) return;

            const sourceObject = finalResults.generatedObjects.get(renderableSourceNodeId)
                || sceneObjectMap.get(renderableSourceNodeId);
            if (!sourceObject) return;

            const sourceObject3D = (sourceObject.customObject || sourceObject.ref.current) as THREE.Object3D | undefined;
            if (!sourceObject3D) return;

            const sourceHash = lastHashesRef.current.get(renderableSourceNodeId)
                || `${sourceObject.position.join(',')}|${sourceObject.rotation.join(',')}|${sourceObject.scale.join(',')}`;
            const planInput = (node.data.sculptOps && node.data.sculptOps.length > 0)
                ? node.data.sculptOps
                : (node.data.sculptPlan ?? []);
            const sculptPlan = parseSculptPlan(planInput);
            const maskInput = resolveInputValue(node.id, 'input-mask', nodeMap, connections, null);
            const maskMark = resolveSculptMaskMark(maskInput);

            const currentHash = [
                'type:ai-sculpt',
                `src:${renderableSourceNodeId}`,
                `srcHash:${sourceHash}`,
                `ops:${JSON.stringify(sculptPlan.ops)}`,
                `mask:${maskMark ? JSON.stringify(maskMark) : 'none'}`,
            ].join('|');

            const resultObject = sceneObjectMap.get(node.id);
            const lastHash = lastHashesRef.current.get(node.id);

            finalResults.ghostIds.add(renderableSourceNodeId);

            if (currentHash === lastHash && resultObject?.customObject) {
                const updatedCachedObj: SceneObject = {
                    ...resultObject,
                    color: sourceObject.color,
                    materialParams: sourceObject.materialParams,
                    proxySelectionId: sourceObject.proxySelectionId ?? renderableSourceNodeId,
                };
                finalResults.generatedObjects.set(node.id, updatedCachedObj);
                return;
            }

            lastHashesRef.current.set(node.id, currentHash);

            const sculptedObject = cloneObjectForSculpt(sourceObject3D);
            resetClonedMeshProperties(sculptedObject, node.id);
            if (sculptPlan.ops.length > 0) {
                applySculptOpsToObject(sculptedObject, sculptPlan.ops, maskMark);
            }

            const newObject: SceneObject = {
                id: node.id,
                type: 'custom',
                ref: resultObject?.ref || React.createRef(),
                position: [...sourceObject.position] as [number, number, number],
                rotation: [...sourceObject.rotation] as [number, number, number],
                scale: [...sourceObject.scale] as [number, number, number],
                color: sourceObject.color,
                materialParams: sourceObject.materialParams,
                customObject: sculptedObject,
                proxySelectionId: sourceObject.proxySelectionId ?? renderableSourceNodeId,
                objectLabel: 'AI Sculpt Result',
                objectNodeType: 'ai-sculpt',
            };

            finalResults.generatedObjects.set(node.id, newObject);
        });
    }, []);

    const processAiPaintNodes = useCallback((
        nodes: NodeData[],
        connections: Connection[],
        nodeMap: Map<string, NodeData>,
        sceneObjectMap: Map<string, SceneObject>,
        finalResults: any,
        lastHashesRef: React.MutableRefObject<Map<string, string>>
    ) => {
        const aiPaintNodes = nodes.filter((node) => node.type === 'ai-paint');

        const resolveRenderableSourceId = (candidateNodeId: string, visited: Set<string>): string | null => {
            if (visited.has(candidateNodeId)) return null;
            visited.add(candidateNodeId);

            if (finalResults.generatedObjects.has(candidateNodeId) || sceneObjectMap.has(candidateNodeId)) {
                return candidateNodeId;
            }

            const incomingConnections = connections.filter((connection) => connection.targetNodeId === candidateNodeId);
            for (const connection of incomingConnections) {
                const resolved = resolveRenderableSourceId(connection.sourceNodeId, visited);
                if (resolved) return resolved;
            }

            return null;
        };

        aiPaintNodes.forEach((node) => {
            finalResults.processedBooleanIds.add(node.id);

            const meshConnection = connections.find((connection) => {
                return connection.targetNodeId === node.id && connection.targetPort === 'input-mesh';
            });
            if (!meshConnection) return;

            const renderableSourceNodeId = resolveRenderableSourceId(meshConnection.sourceNodeId, new Set<string>());
            if (!renderableSourceNodeId) return;

            const sourceObject = finalResults.generatedObjects.get(renderableSourceNodeId)
                || sceneObjectMap.get(renderableSourceNodeId);
            if (!sourceObject) return;

            const sourceObject3D = (sourceObject.customObject || sourceObject.ref.current) as THREE.Object3D | undefined;
            if (!sourceObject3D) return;

            const sourceHash = lastHashesRef.current.get(renderableSourceNodeId)
                || `${sourceObject.position.join(',')}|${sourceObject.rotation.join(',')}|${sourceObject.scale.join(',')}`;
            const planInput = (node.data.paintOps && node.data.paintOps.length > 0)
                ? node.data.paintOps
                : (node.data.paintPlan ?? []);
            const paintPlan = parsePaintPlan(planInput);
            const opsSignature = getPaintOpsSignature(paintPlan.ops);
            const maskInput = resolveInputValue(node.id, 'input-mask', nodeMap, connections, null);
            const maskMark = resolvePaintMaskMark(maskInput);

            const currentHash = [
                'type:ai-paint',
                `src:${renderableSourceNodeId}`,
                `srcHash:${sourceHash}`,
                `ops:${opsSignature}`,
                `mask:${maskMark ? JSON.stringify(maskMark) : 'none'}`,
            ].join('|');

            const resultObject = sceneObjectMap.get(node.id);
            const lastHash = lastHashesRef.current.get(node.id);

            finalResults.ghostIds.add(renderableSourceNodeId);

            if (currentHash === lastHash && resultObject?.customObject) {
                const updatedCachedObj: SceneObject = {
                    ...resultObject,
                    color: sourceObject.color,
                    materialParams: sourceObject.materialParams,
                    proxySelectionId: sourceObject.proxySelectionId ?? renderableSourceNodeId,
                };
                finalResults.generatedObjects.set(node.id, updatedCachedObj);
                return;
            }

            lastHashesRef.current.set(node.id, currentHash);

            const paintedObject = cloneObjectForSculpt(sourceObject3D);
            resetClonedMeshProperties(paintedObject, node.id);
            for (const op of paintPlan.ops) {
                applyPaintOpToObject(paintedObject, op, maskMark);
            }

            const newObject: SceneObject = {
                id: node.id,
                type: 'custom',
                ref: resultObject?.ref || React.createRef(),
                position: [...sourceObject.position] as [number, number, number],
                rotation: [...sourceObject.rotation] as [number, number, number],
                scale: [...sourceObject.scale] as [number, number, number],
                color: sourceObject.color,
                materialParams: sourceObject.materialParams,
                customObject: paintedObject,
                proxySelectionId: sourceObject.proxySelectionId ?? renderableSourceNodeId,
                objectLabel: 'AI Paint Result',
                objectNodeType: 'ai-paint',
            };

            finalResults.generatedObjects.set(node.id, newObject);
        });
    }, []);

    const processPictureOnMeshNodes = useCallback((
        nodes: NodeData[],
        connections: Connection[],
        nodeMap: Map<string, NodeData>,
        sceneObjectMap: Map<string, SceneObject>,
        finalResults: any,
        lastHashesRef: React.MutableRefObject<Map<string, string>>
    ) => {
        const pictureNodes = nodes.filter((node) => node.type === 'picture-on-mesh');

        const resolveRenderableSourceId = (candidateNodeId: string, visited: Set<string>): string | null => {
            if (visited.has(candidateNodeId)) return null;
            visited.add(candidateNodeId);

            if (finalResults.generatedObjects.has(candidateNodeId) || sceneObjectMap.has(candidateNodeId)) {
                return candidateNodeId;
            }

            const incomingConnections = connections.filter((connection) => connection.targetNodeId === candidateNodeId);
            for (const connection of incomingConnections) {
                const resolved = resolveRenderableSourceId(connection.sourceNodeId, visited);
                if (resolved) return resolved;
            }

            return null;
        };

        pictureNodes.forEach((node) => {
            const meshConnection = connections.find((connection) => {
                return connection.targetNodeId === node.id && connection.targetPort === 'context-mesh';
            });
            if (!meshConnection) return;

            const renderableSourceNodeId = resolveRenderableSourceId(meshConnection.sourceNodeId, new Set<string>());
            if (!renderableSourceNodeId) return;

            const sourceObject = finalResults.generatedObjects.get(renderableSourceNodeId)
                || sceneObjectMap.get(renderableSourceNodeId);
            if (!sourceObject) return;

            const sourceObject3D = (sourceObject.customObject || sourceObject.ref.current) as THREE.Object3D | undefined;
            if (!sourceObject3D) return;

            const contextSourceNode = nodeMap.get(meshConnection.sourceNodeId);
            const pictureData = ensurePictureContainer(contextSourceNode?.data.pictureData ?? node.data.pictureData);
            const pictureSignature = getPictureSignature(pictureData);
            const sourceHash = lastHashesRef.current.get(renderableSourceNodeId)
                || `${sourceObject.position.join(',')}|${sourceObject.rotation.join(',')}|${sourceObject.scale.join(',')}`;

            const currentHash = [
                'type:picture-on-mesh',
                `src:${renderableSourceNodeId}`,
                `srcHash:${sourceHash}`,
                `picture:${pictureSignature}`,
            ].join('|');

            const lastHash = lastHashesRef.current.get(node.id);
            if (currentHash === lastHash) return;

            lastHashesRef.current.set(node.id, currentHash);

            let updatedMeshCount = 0;
            sourceObject3D.traverse((child) => {
                const mesh = child as THREE.Mesh;
                if (!(mesh as any).isMesh) return;
                mesh.userData.picture = pictureData;
                updatedMeshCount += 1;
            });

            if (updatedMeshCount === 0) {
                sourceObject3D.userData.picture = pictureData;
            }
        });
    }, []);

    return { processAiSculptNodes, processAiPaintNodes, processPictureOnMeshNodes };
};
