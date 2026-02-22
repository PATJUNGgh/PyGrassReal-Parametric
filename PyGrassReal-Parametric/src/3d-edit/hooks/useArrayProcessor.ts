import React, { useCallback } from 'react';
import * as THREE from 'three';
import { resolveInputValue, resolveVectorValue } from '../utils/nodeValueResolvers';
import { extractNumber, resetClonedMeshProperties } from '../utils/nodeUtils';
import type { NodeData, Connection } from '../types/NodeTypes';
import type { SceneObject } from '../types/scene';

export const useArrayProcessor = () => {
    const processMeshArrayNodes = useCallback((
        nodes: NodeData[],
        connections: Connection[],
        nodeMap: Map<string, NodeData>,
        sceneObjectMap: Map<string, SceneObject>,
        finalResults: any,
        lastHashesRef: React.MutableRefObject<Map<string, string>>,
        directionVectorThreshold: number
    ) => {
        const arrayNodes = nodes.filter(n => n.type === 'mesh-array');
        arrayNodes.forEach(node => {
            const meshSourceConn = connections.find(c => c.targetNodeId === node.id && (c.targetPort === 'input-mesh' || c.targetPort.toLowerCase().includes('mesh')));
            const meshSourceNode = meshSourceConn ? nodeMap.get(meshSourceConn.sourceNodeId) : null;
            
            const directionSourceConn = connections.find(c => c.targetNodeId === node.id && (c.targetPort === 'input-direction' || c.targetPort.toLowerCase().includes('direction')));
            const directionSourceNode = directionSourceConn ? nodeMap.get(directionSourceConn.sourceNodeId) : null;

            const countSourceConn = connections.find(c => c.targetNodeId === node.id && (c.targetPort === 'input-count' || c.targetPort.toLowerCase().includes('count')));
            const countSourceNode = countSourceConn ? nodeMap.get(countSourceConn.sourceNodeId) : null;

            if (!meshSourceNode) return;

            const direction = directionSourceNode ? resolveVectorValue(directionSourceNode.id, '', nodeMap, connections) : new THREE.Vector3(1, 0, 0);
            if (direction.lengthSq() < directionVectorThreshold) {
                direction.set(1, 0, 0);
            }

            const countValue = countSourceNode ? extractNumber(resolveInputValue(countSourceNode.id, '', nodeMap, connections, 1), 1) : 1;
            const count = Math.max(1, Math.floor(countValue));
            const mode = node.data.meshArrayMode || 'linear';

            const sourceId = meshSourceNode.id;
            finalResults.ghostIds.add(sourceId);
            let sourceObj = finalResults.generatedObjects.get(sourceId) || sceneObjectMap.get(sourceId);
            if (!sourceObj) return;

            let currentHash = `type:array|mode:${mode}|cnt:${count}|dir:${direction.x.toFixed(3)},${direction.y.toFixed(3)},${direction.z.toFixed(3)}|src:${sourceId}`;

            const lastSourceHash = lastHashesRef.current.get(sourceId);
            if (lastSourceHash) {
                currentHash += `|srcHash:${lastSourceHash}`;
            } else if (sourceObj.type === 'box' || sourceObj.type === 'sphere' || sourceObj.type === 'cone' || sourceObj.type === 'cylinder') {
                currentHash += `|pos:${sourceObj.position.join(',')}|rot:${sourceObj.rotation.join(',')}|sca:${sourceObj.scale.join(',')}`;
            }

            const lastHash = lastHashesRef.current.get(node.id);
            const resultObj = sceneObjectMap.get(node.id);
            if (currentHash === lastHash && resultObj?.customObject) {
                const updatedCachedObj: SceneObject = {
                    ...resultObj,
                    color: sourceObj.color,
                    materialParams: sourceObj.materialParams
                };
                finalResults.generatedObjects.set(node.id, updatedCachedObj);
                return;
            }
            lastHashesRef.current.set(node.id, currentHash);

            const originalMesh = (sourceObj.customObject || sourceObj.ref.current) as THREE.Object3D;
            if (!originalMesh) return;

            const basePos = new THREE.Vector3();
            const baseQuat = new THREE.Quaternion();
            const baseScale = new THREE.Vector3();
            originalMesh.getWorldPosition(basePos);
            originalMesh.getWorldQuaternion(baseQuat);
            originalMesh.getWorldScale(baseScale);

            const group = resultObj?.customObject instanceof THREE.Group
                ? resultObj.customObject
                : new THREE.Group();
            group.clear();

            const groupPos = basePos.clone().add(direction.clone().multiplyScalar((count - 1) / 2));
            group.position.copy(groupPos);
            group.rotation.set(0, 0, 0);
            group.scale.set(1, 1, 1);

            if (mode === 'linear') {
                for (let i = 0; i < count; i++) {
                    const clone = originalMesh.clone();
                    resetClonedMeshProperties(clone, node.id);

                    const offset = direction.clone().multiplyScalar(i);
                    clone.position.copy(basePos).add(offset).sub(groupPos);
                    clone.quaternion.copy(baseQuat);
                    clone.scale.copy(baseScale);

                    clone.visible = true;
                    group.add(clone);
                }
            }

            const newObj: SceneObject = {
                id: node.id,
                type: 'custom',
                ref: resultObj?.ref || React.createRef(),
                position: [groupPos.x, groupPos.y, groupPos.z],
                rotation: [0, 0, 0],
                scale: [1, 1, 1],
                color: sourceObj.color,
                materialParams: sourceObj.materialParams,
                customObject: group,
                objectLabel: 'Selection Array',
                objectNodeType: 'mesh-array',
                isGhost: false
            };

            finalResults.generatedObjects.set(node.id, newObj);
        });
    }, []);

    return { processMeshArrayNodes };
};
