import React, { useCallback } from 'react';
import * as THREE from 'three';
import { MarchingCubes } from '../utils/marchingCubesWrapper';
import { updateMarchingCubesField } from '../utils/marchingCubes';
import { 
    OPERATION_CONFIGS, 
    MIN_BOOLEAN_BOUNDS_AXIS, 
    hasUsableBounds, 
    ensureMinimumBoundsSize, 
    calculateGroupSDF, 
    processInputGroup, 
    calculateBlendedColor,
    hasFiniteBounds
} from '../utils/booleanNodeUtils';
import { resolveInputValue } from '../utils/nodeValueResolvers';
import { extractBoolean, extractNumber } from '../utils/nodeUtils';
import type { NodeData, Connection } from '../types/NodeTypes';
import type { SceneObject } from '../types/scene';

interface BooleanProcessorProps {
    nodeMap: Map<string, NodeData>;
    sceneObjectMap: Map<string, SceneObject>;
    mcInstancesRef: React.MutableRefObject<Map<string, any>>;
    lastHashesRef: React.MutableRefObject<Map<string, string>>;
    gatherPrimitives: (nodeId: string, visited: Set<string>, nodeMap: Map<string, NodeData>, connections: Connection[]) => NodeData[];
    averageColors: (nodeIds: string[], sceneObjectMap: Map<string, SceneObject>) => string;
    averageMaterialParams: (nodeIds: string[], sceneObjectMap: Map<string, SceneObject>) => any;
    resolution: number;
    fallbackColor: string;
    defaultSmoothness: number;
    defaultDifferenceSmoothness: number;
    differenceSmoothnessScaleFactor: number;
    maxVertices: number;
    defaultRoughness: number;
    defaultMetalness: number;
    debugEnabled?: boolean;
}

export const useBooleanProcessor = () => {
    const processBooleanNodes = useCallback((
        nodes: NodeData[],
        connections: Connection[],
        finalResults: {
            generatedObjects: Map<string, SceneObject>;
            processedBooleanIds: Set<string>;
            ghostIds: Set<string>;
            unghostableIds: Set<string>;
            fadedIds: Set<string>;
        },
        props: BooleanProcessorProps
    ) => {
        const { 
            nodeMap, 
            sceneObjectMap, 
            mcInstancesRef, 
            lastHashesRef, 
            gatherPrimitives, 
            averageColors, 
            averageMaterialParams, 
            resolution,
            fallbackColor,
            defaultSmoothness,
            defaultDifferenceSmoothness,
            differenceSmoothnessScaleFactor,
            maxVertices,
            defaultRoughness,
            defaultMetalness,
            debugEnabled
        } = props;

        for (const nodeType of Object.keys(OPERATION_CONFIGS)) {
            const config = OPERATION_CONFIGS[nodeType];
            const booleanNodes = nodes.filter(n => n.type === nodeType);

            booleanNodes.forEach(node => {
                finalResults.processedBooleanIds.add(node.id);

                const inputConnections = connections.filter(c => c.targetNodeId === node.id);
                const nodeDefaultSmoothness = extractNumber(
                    node.data.smoothness,
                    node.type === 'mesh-difference' ? defaultDifferenceSmoothness : defaultSmoothness
                );
                const smoothnessRaw = extractNumber(
                    resolveInputValue(node.id, 'S', nodeMap, connections, nodeDefaultSmoothness),
                    nodeDefaultSmoothness
                );
                const smoothness = Math.min(1, Math.max(0.001, smoothnessRaw));
                const isMeshDifferenceNode = node.type === 'mesh-difference';
                const isMeshIntersectionNode = node.type === 'mesh-intersection';

                const showMeshesB = isMeshDifferenceNode
                    ? extractBoolean(resolveInputValue(node.id, 'showMeshesB', nodeMap, connections, !!node.data.showMeshesB), !!node.data.showMeshesB)
                    : true;

                const showMeshesAB = isMeshIntersectionNode
                    ? extractBoolean(resolveInputValue(node.id, 'showMeshesAB', nodeMap, connections, !!node.data.showMeshesAB), !!node.data.showMeshesAB)
                    : false;

                const inputGroups: { [groupName: string]: NodeData[] } = {};
                for (const conn of inputConnections) {
                    const groupName = config.inputGroups[conn.targetPort];
                    if (groupName) {
                        if (!inputGroups[groupName]) inputGroups[groupName] = [];
                        const primitives = gatherPrimitives(conn.sourceNodeId, new Set<string>(), nodeMap, connections);
                        inputGroups[groupName].push(...primitives);

                        const isBGroup = groupName === 'B';
                        let shouldGhost = true;

                        if (isMeshDifferenceNode && isBGroup && showMeshesB) {
                            shouldGhost = false;
                        } else if (isMeshIntersectionNode && showMeshesAB) {
                            shouldGhost = false;
                        }

                        if (shouldGhost) {
                            primitives.forEach(p => finalResults.ghostIds.add(p.id));
                        } else {
                            primitives.forEach(p => {
                                finalResults.unghostableIds.add(p.id);
                                finalResults.fadedIds.add(p.id);
                            });
                        }
                    }
                }

                for (const groupName in inputGroups) {
                    inputGroups[groupName] = Array.from(new Map(inputGroups[groupName].map(n => [n.id, n])).values());
                }

                if (Object.keys(inputGroups).length === 0) return;
                const requiredGroupNames = Array.from(new Set(Object.values(config.inputGroups)));

                let currentHash = `type:${node.type}|s:${smoothness}|r:${resolution}|bbox:v7`;
                const evaluableGroups: { [groupName: string]: any[] } = {};
                const groupWorldBounds: { [groupName: string]: THREE.Box3 } = {};

                for (const groupName of requiredGroupNames) {
                    const groupBounds = new THREE.Box3();
                    const groupNodes = inputGroups[groupName] || [];
                    const { evaluables, newHash } = processInputGroup(groupNodes, sceneObjectMap, currentHash, groupBounds, fallbackColor);
                    evaluableGroups[groupName] = evaluables;
                    groupWorldBounds[groupName] = groupBounds;
                    currentHash = newHash;
                }

                const worldBounds = new THREE.Box3();
                const validGroupBounds: THREE.Box3[] = [];
                for (const groupName in groupWorldBounds) {
                    const groupBounds = groupWorldBounds[groupName];
                    if (hasUsableBounds(groupBounds)) {
                        validGroupBounds.push(groupBounds);
                    }
                }

                if (isMeshDifferenceNode && hasUsableBounds(groupWorldBounds.A)) {
                    worldBounds.copy(groupWorldBounds.A);
                } else {
                    for (const groupBounds of validGroupBounds) {
                        worldBounds.union(groupBounds);
                    }
                }

                if (!hasUsableBounds(worldBounds) && hasFiniteBounds(worldBounds) && !worldBounds.isEmpty()) {
                    ensureMinimumBoundsSize(worldBounds, MIN_BOOLEAN_BOUNDS_AXIS);
                }

                if (!hasUsableBounds(worldBounds)) return;
                ensureMinimumBoundsSize(worldBounds, MIN_BOOLEAN_BOUNDS_AXIS);

                const selectionBounds = worldBounds.clone();
                ensureMinimumBoundsSize(selectionBounds, MIN_BOOLEAN_BOUNDS_AXIS);
                const samplingBounds = selectionBounds.clone();
                const boundsSize = new THREE.Vector3();
                selectionBounds.getSize(boundsSize);
                const maxBoundsAxis = Math.max(boundsSize.x, boundsSize.y, boundsSize.z, 0);
                const differenceSmoothnessCap = isMeshDifferenceNode
                    ? Math.max(0.001, maxBoundsAxis * differenceSmoothnessScaleFactor)
                    : 1;
                const effectiveSmoothness = isMeshDifferenceNode
                    ? Math.min(smoothness, differenceSmoothnessCap)
                    : smoothness;
                currentHash += `|sa:${effectiveSmoothness.toFixed(4)}`;
                const voxelPadding = maxBoundsAxis > 0 ? (maxBoundsAxis / Math.max(1, resolution)) * 2 : 0;
                const samplingPadding = Math.max(MIN_BOOLEAN_BOUNDS_AXIS * 0.2, voxelPadding);
                samplingBounds.expandByScalar(samplingPadding);

                const allEvaluables: any[] = [];
                for (const groupName in evaluableGroups) {
                    allEvaluables.push(...evaluableGroups[groupName]);
                }
                const colorFn = (x: number, y: number, z: number) => calculateBlendedColor(allEvaluables, new THREE.Vector3(x, y, z));

                const allPrimitiveIds = new Set<string>();
                for (const groupName in inputGroups) {
                    inputGroups[groupName].forEach(p => allPrimitiveIds.add(p.id));
                }
                const primitiveIdsArray = Array.from(allPrimitiveIds);
                const blendedColor = averageColors(primitiveIdsArray, sceneObjectMap);
                const blendedParams = averageMaterialParams(primitiveIdsArray, sceneObjectMap);

                let primaryPrimitiveId: string | undefined;
                const primaryPort = node.type === 'mesh-union' ? 'M' : 'A';
                const primaryConn = inputConnections.find(c => c.targetPort === primaryPort);
                if (primaryConn) {
                    const primaryPrimitives = gatherPrimitives(primaryConn.sourceNodeId, new Set<string>(), nodeMap, connections);
                    if (primaryPrimitives.length > 0) {
                        primaryPrimitiveId = primaryPrimitives[0].id;
                    }
                }

                const lastHash = lastHashesRef.current.get(node.id);
                const resultObj = sceneObjectMap.get(node.id);

                if (currentHash !== lastHash || !resultObj?.customObject) {
                    lastHashesRef.current.set(node.id, currentHash);

                    const sdf = (x: number, y: number, z: number) => {
                        const p = new THREE.Vector3(x, y, z);
                        const distances: { [key: string]: number } = {};
                        for (const groupName of requiredGroupNames) {
                            const groupEvaluables = evaluableGroups[groupName] || [];
                            distances[groupName] = groupEvaluables.length > 0
                                ? calculateGroupSDF(groupEvaluables, p, effectiveSmoothness)
                                : Infinity;
                        }
                        return config.sdf(distances, effectiveSmoothness);
                    };

                    const mcData = mcInstancesRef.current.get(node.id);
                    let mc = mcData?.mc;
                    let wrapper = mcData?.wrapper as THREE.Group | undefined;

                    if (!mc) {
                        const material = new THREE.MeshStandardMaterial({
                            color: new THREE.Color(0xffffff),
                            vertexColors: true,
                            roughness: blendedParams?.roughness ?? defaultRoughness,
                            metalness: blendedParams?.metalness ?? defaultMetalness,
                            side: THREE.DoubleSide
                        });
                        mc = new MarchingCubes(resolution, material, true, true, maxVertices);
                        wrapper = new THREE.Group();
                        wrapper.add(mc);
                        mcInstancesRef.current.set(node.id, { mc, wrapper });
                    } else if (!wrapper) {
                        wrapper = new THREE.Group();
                        wrapper.add(mc);
                        mcInstancesRef.current.set(node.id, { mc, wrapper });
                    } else {
                        if (mc.material instanceof THREE.MeshStandardMaterial) {
                            mc.material.vertexColors = true;
                            mc.material.color.setHex(0xffffff);
                            mc.material.side = THREE.DoubleSide;
                            if (blendedParams) {
                                mc.material.roughness = blendedParams.roughness;
                                mc.material.metalness = blendedParams.metalness;
                            }
                        }
                        if (mc.enableColors !== true) {
                            mc.enableColors = true;
                            mc.init(resolution);
                        }
                    }
                    wrapper.userData.selectionBoxAsObject = true;

                    const selectionCenter = new THREE.Vector3();
                    selectionBounds.getCenter(selectionCenter);
                    const selectionSize = new THREE.Vector3();
                    selectionBounds.getSize(selectionSize);

                    const samplingCenter = new THREE.Vector3();
                    samplingBounds.getCenter(samplingCenter);
                    const samplingSize = new THREE.Vector3();
                    samplingBounds.getSize(samplingSize);

                    wrapper.scale.set(selectionSize.x || 1, selectionSize.y || 1, selectionSize.z || 1);
                    wrapper.position.copy(selectionCenter);

                    mc.position.copy(samplingCenter).sub(selectionCenter);
                    mc.position.x /= (selectionSize.x || 1);
                    mc.position.y /= (selectionSize.y || 1);
                    mc.position.z /= (selectionSize.z || 1);

                    mc.scale.set(
                        (samplingSize.x / (selectionSize.x || 1)) * 0.5,
                        (samplingSize.y / (selectionSize.y || 1)) * 0.5,
                        (samplingSize.z / (selectionSize.z || 1)) * 0.5
                    );
                    mc.updateMatrixWorld();

                    const virtualWorldMatrix = new THREE.Matrix4().compose(
                        samplingCenter,
                        new THREE.Quaternion(),
                        samplingSize.clone().multiplyScalar(0.5)
                    );
                    updateMarchingCubesField(mc, sdf, samplingBounds, resolution, virtualWorldMatrix, colorFn);
                    mc.update?.();

                    const newObj: SceneObject = {
                        id: node.id,
                        type: 'custom',
                        ref: resultObj?.ref || React.createRef(),
                        position: [selectionCenter.x, selectionCenter.y, selectionCenter.z],
                        rotation: [0, 0, 0],
                        scale: [selectionSize.x, selectionSize.y, selectionSize.z],
                        color: blendedColor,
                        materialParams: blendedParams,
                        customObject: wrapper,
                        proxySelectionId: primaryPrimitiveId,
                        objectNodeType: node.type as any
                    };
                    finalResults.generatedObjects.set(node.id, newObj);
                } else if (resultObj) {
                    const updatedCachedObj = {
                        ...resultObj,
                        color: blendedColor,
                        materialParams: blendedParams,
                        proxySelectionId: primaryPrimitiveId ?? resultObj.proxySelectionId
                    };

                    if (updatedCachedObj.customObject instanceof THREE.Group) {
                        updatedCachedObj.customObject.userData.selectionBoxAsObject = true;
                        const mc = updatedCachedObj.customObject.children[0] as any;
                        if (mc?.material instanceof THREE.MeshStandardMaterial) {
                            mc.material.color.setHex(0xffffff);
                            mc.material.side = THREE.DoubleSide;
                            if (blendedParams) {
                                mc.material.roughness = blendedParams.roughness;
                                mc.material.metalness = blendedParams.metalness;
                            }
                        }
                    } else if ((updatedCachedObj.customObject as THREE.Mesh | undefined)?.material instanceof THREE.MeshStandardMaterial) {
                        const meshObject = updatedCachedObj.customObject as THREE.Mesh;
                        meshObject.material.color.setHex(0xffffff);
                        meshObject.material.side = THREE.DoubleSide;
                        if (blendedParams) {
                            meshObject.material.roughness = blendedParams.roughness;
                            meshObject.material.metalness = blendedParams.metalness;
                        }
                    }

                    finalResults.generatedObjects.set(node.id, updatedCachedObj);
                }
            });
        }
    }, []);

    return { processBooleanNodes };
};
