
import React, { useCallback, useRef, useEffect, useContext } from 'react';
import * as THREE from 'three';
import { sdBox, sdSphere, smin, smax, sdRoundedBox } from '../utils/sdfUtils';
import { updateMarchingCubesField } from '../utils/marchingCubes';
import { MarchingCubes } from '../utils/marchingCubesWrapper';
import { extractColorFromStyle } from '../components/MaterialPicker';
import type { NodeData, Connection } from '../types/NodeTypes';
import type { SceneObject } from '../types/scene';
import { SceneInteractionContext, type SceneInteractionState } from '../context/SceneInteractionContext';

// =================================================================
// Type Definitions for Refactoring
// =================================================================

interface Evaluable {
    type: string;
    inverseMatrix: THREE.Matrix4;
    dims: { x: number; y: number; z: number };
    radius: number;
    color: THREE.Color;
}

interface BooleanOperationConfig {
    sdf: (distances: { [key: string]: number }, smoothness: number) => number;
    color: string;
    // Maps input port ID on the boolean node to a named group (e.g., 'A', 'B')
    inputGroups: { [port: string]: string };
}

// =================================================================
// Configuration for Boolean Operations
// =================================================================

const operationConfigs: { [key: string]: BooleanOperationConfig } = {
    'mesh-union': {
        // For union, all inputs are combined with smin. We'll treat them as one group.
        sdf: (distances, smoothness) => Object.values(distances).reduce((d1, d2) => smin(d1, d2, smoothness)),
        color: '#f97316',
        inputGroups: { 'M': 'main' }, // All connections to 'M' port are part of the main union group
    },
    'mesh-intersection': {
        sdf: (distances, smoothness) => smax(distances.A, distances.B, smoothness),
        color: '#22c55e',
        inputGroups: { 'A': 'A', 'B': 'B' },
    },
    'mesh-difference': {
        // Subtractive Union: (Union A) - (Union B)
        // Note: distances.B is already a Union of all inputs connected to port B (calculated via smin in calculateGroupSDF)
        sdf: (distances, smoothness) => smax(distances.A, -distances.B, smoothness),
        color: '#f59e0b',
        inputGroups: { 'A': 'A', 'B': 'B' },
    }
};

const PASSTHROUGH_NODE_TYPES = new Set(['layer-source', 'model-material', ...Object.keys(operationConfigs)]);

interface UseGraphEvaluatorProps {
    sceneObjects: SceneObject[];
    setSceneObjects: React.Dispatch<React.SetStateAction<SceneObject[]>>;
}

export const useGraphEvaluator = ({ sceneObjects, setSceneObjects }: UseGraphEvaluatorProps) => {
    // Refs and Context remain the same
    const interactionContext = useContext(SceneInteractionContext) as SceneInteractionState;
    const { isGumballDragging, isHandleDragging, isScalingHandle } = interactionContext;

    const nodesRef = useRef<NodeData[]>([]);
    const connectionsRef = useRef<Connection[]>([]);
    const sceneObjectsRef = useRef<SceneObject[]>(sceneObjects);
    const mcInstancesRef = useRef<Map<string, any>>(new Map());
    const lastHashesRef = useRef<Map<string, string>>(new Map());
    const isEvaluatingRef = useRef<boolean>(false);

    // =================================================================
    // Value & Primitive Gathering
    // =================================================================

    const getInputValue = useCallback((nodeId: string, portId: string, defaultValue: any = 0): any => {
        const conn = connectionsRef.current.find(c => c.targetNodeId === nodeId && c.targetPort === portId);
        if (!conn) return defaultValue;
        const source = nodesRef.current.find(n => n.id === conn.sourceNodeId);
        if (!source) return defaultValue;

        // Generic input handling: if the source node has a 'value' field, return it.
        // This makes it compatible with both 'number-slider' and 'boolean-toggle'
        // and any future value-providing nodes.
        if (source.data && source.data.value !== undefined) {
            return source.data.value;
        }

        return defaultValue;
    }, []);

    const averageColors = useCallback((nodeIds: string[], sceneObjectMap: Map<string, SceneObject>): string => {
        if (nodeIds.length === 0) return '#f97316';
        let r = 0, g = 0, b = 0;
        let count = 0;
        nodeIds.forEach(id => {
            const obj = sceneObjectMap.get(id);
            if (obj && obj.color) {
                const c = new THREE.Color(obj.color);
                r += c.r;
                g += c.g;
                b += c.b;
                count++;
            }
        });
        if (count === 0) return '#f97316';
        return '#' + new THREE.Color(r / count, g / count, b / count).getHexString();
    }, []);

    const averageMaterialParams = useCallback((nodeIds: string[], sceneObjectMap: Map<string, SceneObject>) => {
        if (nodeIds.length === 0) return undefined;
        let roughness = 0, metalness = 0, emissive = 0, transparency = 0;
        let count = 0;
        nodeIds.forEach(id => {
            const obj = sceneObjectMap.get(id);
            const params = obj?.materialParams;
            if (params) {
                roughness += params.roughness ?? 0.5;
                metalness += params.metalness ?? 0.5;
                emissive += params.emissive ?? 0;
                transparency += params.transparency ?? 0;
                count++;
            } else if (obj) {
                roughness += 0.5;
                metalness += 0.5;
                count++;
            }
        });
        if (count === 0) return undefined;
        return {
            roughness: roughness / count,
            metalness: metalness / count,
            emissive: emissive / count,
            transparency: transparency / count,
        };
    }, []);

    const gatherPrimitives = useCallback((
        nodeId: string,
        visited: Set<string>,
        nodeMap: Map<string, NodeData>,
        connections: Connection[]
    ): NodeData[] => {
        if (visited.has(nodeId)) return [];
        visited.add(nodeId);

        const node = nodeMap.get(nodeId);
        if (!node) return [];

        if (node.type === 'box' || node.type === 'sphere') {
            return [node];
        }

        if (PASSTHROUGH_NODE_TYPES.has(node.type)) {
            const incoming = connections.filter(c => c.targetNodeId === nodeId);
            const results: NodeData[] = [];
            for (const c of incoming) {
                if (operationConfigs[node.type] && !operationConfigs[node.type].inputGroups[c.targetPort]) {
                    continue;
                }
                results.push(...gatherPrimitives(c.sourceNodeId, visited, nodeMap, connections));
            }
            return results;
        }

        return [];
    }, []);

    // =================================================================
    // SDF & Mesh Generation
    // =================================================================

    const getPrimitiveDistance = (item: Evaluable, p: THREE.Vector3): number => {
        const localP = p.clone().applyMatrix4(item.inverseMatrix);
        if (item.type === 'box') {
            return item.radius > 0
                ? sdRoundedBox(localP.x, localP.y, localP.z, item.dims.x, item.dims.y, item.dims.z, item.radius)
                : sdBox(localP.x, localP.y, localP.z, item.dims.x, item.dims.y, item.dims.z);
        } else if (item.type === 'sphere') {
            return sdSphere(localP.x, localP.y, localP.z, 0.5);
        }
        return Infinity;
    };

    const calculateGroupSDF = (evaluables: Evaluable[], p: THREE.Vector3, smoothness: number): number => {
        let d = Infinity;
        for (let i = 0; i < evaluables.length; i++) {
            const dist = getPrimitiveDistance(evaluables[i], p);
            d = i === 0 ? dist : smin(d, dist, smoothness);
        }
        return d;
    };

    const processInputGroup = (
        inputs: NodeData[],
        sceneObjectMap: Map<string, SceneObject>,
        currentHash: string,
        worldBounds: THREE.Box3
    ): { evaluables: Evaluable[], newHash: string } => {
        const evaluables: Evaluable[] = [];
        inputs.forEach(node => {
            const sceneObj = sceneObjectMap.get(node.id);
            if (!sceneObj?.ref.current) return;

            const mesh = sceneObj.ref.current as THREE.Mesh;
            mesh.updateMatrixWorld();

            const radius = node.type === 'box' ? (sceneObj.radius || 0) : 0;

            const m = mesh.matrixWorld.elements;
            const matrixStr = m.map(v => v.toFixed(3)).join(',');
            currentHash += `|${node.id}:${matrixStr}:r${radius}`;

            const inverseMatrix = mesh.matrixWorld.clone().invert();
            const boundingSphere = new THREE.Sphere();
            const center = new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld);
            const scale = new THREE.Vector3().setFromMatrixScale(mesh.matrixWorld);
            const radiusBound = (Math.sqrt(3) / 2) * Math.max(scale.x, scale.y, scale.z) * 2.0;

            boundingSphere.center.copy(center);
            boundingSphere.radius = radiusBound;
            worldBounds.union(boundingSphere.getBoundingBox(new THREE.Box3()));

            const dims = (node.type === 'sphere') ? { x: 0.5, y: 0, z: 0 } : { x: 0.5, y: 0.5, z: 0.5 };
            const color = sceneObj.color ? new THREE.Color(sceneObj.color) : new THREE.Color(0xf97316);

            evaluables.push({ type: node.type, inverseMatrix, dims, radius, color });
        });
        return { evaluables, newHash: currentHash };
    };

    const calculateBlendedColor = (evaluables: Evaluable[], p: THREE.Vector3): { r: number, g: number, b: number } => {
        let totalWeight = 0;
        let r = 0, g = 0, b = 0;
        let minDist = Infinity;
        let nearestColor = null;

        for (let i = 0; i < evaluables.length; i++) {
            const item = evaluables[i];
            const dist = getPrimitiveDistance(item, p);

            // Basic Inverse Distance Weighting
            // Focus on surface (dist near 0) + inside (dist < 0).
            // We want color to be driven by proximity to the surface.
            // Use 1 / (abs(d) + epsilon)

            const absDist = Math.abs(dist);
            if (absDist < minDist) {
                minDist = absDist;
                nearestColor = item.color;
            }

            const w = 1.0 / (Math.pow(absDist, 2) + 0.00001); // Standard IDW

            r += item.color.r * w;
            g += item.color.g * w;
            b += item.color.b * w;
            totalWeight += w;
        }

        if (totalWeight > 0) {
            return { r: r / totalWeight, g: g / totalWeight, b: b / totalWeight };
        }
        return nearestColor ? { r: nearestColor.r, g: nearestColor.g, b: nearestColor.b } : { r: 1, g: 1, b: 1 };
    };

    // =================================================================
    // SceneObject Management
    // =================================================================

    const createPrimitiveSceneObject = useCallback((node: NodeData): SceneObject => {
        const position = node.data.location ? [node.data.location.x, node.data.location.y, node.data.location.z] : [0, 0, 0];
        const rotation = node.data.rotation ? [node.data.rotation.x, node.data.rotation.y, node.data.rotation.z] : [0, 0, 0];
        const scale = node.data.scale ? [node.data.scale.x, node.data.scale.y, node.data.scale.z] : [1, 1, 1];
        const radius = getInputValue(node.id, 'input-corner', 0);

        return {
            id: node.id,
            type: node.type,
            ref: React.createRef(),
            position,
            rotation,
            scale,
            radius,
            isGhost: false
        };
    }, [getInputValue]);

    const ensurePrimitiveSceneObject = useCallback((node: NodeData, sceneObjectMap: Map<string, SceneObject>, newPrimitivesList: SceneObject[]): SceneObject => {
        const created = createPrimitiveSceneObject(node);
        sceneObjectMap.set(node.id, created);
        newPrimitivesList.push(created);
        return created;
    }, [createPrimitiveSceneObject]);

    // =================================================================
    // Evaluation Sub-routines (Refactored from runEvaluation)
    // =================================================================

    type FinalResults = {
        generatedObjects: Map<string, SceneObject>;
        processedBooleanIds: Set<string>;
        ghostIds: Set<string>;
        unghostableIds: Set<string>;
        fadedIds: Set<string>;
    };

    const processBooleanNodes = useCallback((
        nodes: NodeData[],
        connections: Connection[],
        nodeMap: Map<string, NodeData>,
        sceneObjectMap: Map<string, SceneObject>,
        finalResults: FinalResults
    ) => {
        for (const nodeType of Object.keys(operationConfigs)) {
            const config = operationConfigs[nodeType];
            const booleanNodes = nodes.filter(n => n.type === nodeType);

            booleanNodes.forEach(node => {
                finalResults.processedBooleanIds.add(node.id);

                const inputConnections = connections.filter(c => c.targetNodeId === node.id);
                const smoothness = getInputValue(node.id, 'S', 0.5);
                const isMeshDifferenceNode = node.type === 'mesh-difference';
                const isMeshIntersectionNode = node.type === 'mesh-intersection';

                const showMeshesB = isMeshDifferenceNode
                    ? getInputValue(node.id, 'showMeshesB', !!node.data.showMeshesB)
                    : true;

                const showMeshesAB = isMeshIntersectionNode
                    ? getInputValue(node.id, 'showMeshesAB', !!node.data.showMeshesAB)
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
                            // Protect these primitives from being ghosted later by the robust check
                            primitives.forEach(p => {
                                finalResults.unghostableIds.add(p.id);
                                // Mark as faded because it's being "Force Shown" as a reference
                                finalResults.fadedIds.add(p.id);
                            });
                        }
                    }
                }

                for (const groupName in inputGroups) {
                    inputGroups[groupName] = Array.from(new Map(inputGroups[groupName].map(n => [n.id, n])).values());
                }

                if (Object.keys(inputGroups).length === 0) return;

                let currentHash = `type:${node.type}|s:${smoothness}`;
                const worldBounds = new THREE.Box3();
                const evaluableGroups: { [groupName: string]: Evaluable[] } = {};

                for (const groupName in inputGroups) {
                    const { evaluables, newHash } = processInputGroup(inputGroups[groupName], sceneObjectMap, currentHash, worldBounds);
                    evaluableGroups[groupName] = evaluables;
                    currentHash = newHash;
                }

                if (worldBounds.isEmpty()) return;

                // Color calc setup
                const allEvaluables: Evaluable[] = [];
                for (const groupName in evaluableGroups) {
                    allEvaluables.push(...evaluableGroups[groupName]);
                }
                const colorFn = (x: number, y: number, z: number) => calculateBlendedColor(allEvaluables, new THREE.Vector3(x, y, z));

                // --- Material Blending Logic ---
                const allPrimitiveIds = new Set<string>();
                for (const groupName in inputGroups) {
                    inputGroups[groupName].forEach(p => allPrimitiveIds.add(p.id));
                }
                const primitiveIdsArray = Array.from(allPrimitiveIds);
                const blendedColor = averageColors(primitiveIdsArray, sceneObjectMap);
                const blendedParams = averageMaterialParams(primitiveIdsArray, sceneObjectMap);

                // --- Identify Pivot Position (Primary Input) ---
                let pivotPosition = new THREE.Vector3();
                let hasPivot = false;
                let primaryPrimitiveId: string | undefined;

                const primaryPort = node.type === 'mesh-union' ? 'M' : 'A';
                const primaryConn = inputConnections.find(c => c.targetPort === primaryPort);
                if (primaryConn) {
                    const primitives = gatherPrimitives(primaryConn.sourceNodeId, new Set<string>(), nodeMap, connections);
                    if (primitives.length > 0) {
                        const firstPrimitive = primitives[0];
                        const primObj = sceneObjectMap.get(firstPrimitive.id);
                        if (primObj) {
                            pivotPosition.set(primObj.position[0], primObj.position[1], primObj.position[2]);
                            hasPivot = true;
                            primaryPrimitiveId = firstPrimitive.id;
                        }
                    }
                }

                const lastHash = lastHashesRef.current.get(node.id);
                let resultObj = sceneObjectMap.get(node.id);

                if (currentHash !== lastHash || !resultObj?.customObject) {
                    lastHashesRef.current.set(node.id, currentHash);

                    const sdf = (x: number, y: number, z: number) => {
                        const p = new THREE.Vector3(x, y, z);
                        const distances: { [key: string]: number } = {};
                        for (const groupName in evaluableGroups) {
                            distances[groupName] = calculateGroupSDF(evaluableGroups[groupName], p, smoothness);
                        }
                        return config.sdf(distances, smoothness);
                    };

                    const resolution = 64;
                    let mcData = mcInstancesRef.current.get(node.id);
                    let mc = mcData?.mc;
                    let wrapper = mcData?.wrapper as THREE.Group | undefined;

                    if (!mc) {
                        const material = new THREE.MeshStandardMaterial({
                            color: new THREE.Color(0xffffff), // White base for vertex colors 
                            vertexColors: true,
                            roughness: blendedParams?.roughness ?? 0.3,
                            metalness: blendedParams?.metalness ?? 0.1
                        });
                        mc = new MarchingCubes(resolution, material, true, true, 100000); // enableColors=true
                        wrapper = new THREE.Group();
                        wrapper.add(mc);
                        mcInstancesRef.current.set(node.id, { mc, wrapper });
                    } else if (!wrapper) {
                        wrapper = new THREE.Group();
                        wrapper.add(mc);
                        mcInstancesRef.current.set(node.id, { mc, wrapper });
                    } else {
                        // Update existing material properties
                        if (mc.material instanceof THREE.MeshStandardMaterial) {
                            mc.material.vertexColors = true; // Ensure vertex colors
                            mc.material.color.setHex(0xffffff); // Reset base color
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

                    const center = new THREE.Vector3();
                    worldBounds.getCenter(center);
                    const size = new THREE.Vector3();
                    worldBounds.getSize(size);

                    if (!hasPivot) pivotPosition.copy(center);

                    // Position the MC relative to the wrapper group
                    // Local position = (World Center - Wrapper Position) / Wrapper Scale
                    // We set wrapper scale to 'size' so the SelectionBox looks correct.
                    wrapper.scale.set(size.x || 1, size.y || 1, size.z || 1);
                    wrapper.position.copy(pivotPosition);

                    // Since wrapper scale is 'size', and MC geometry is [-1, 1] (size 2),
                    // to get world size 'size', we need MC scale to be 0.5.
                    mc.position.copy(center).sub(pivotPosition);
                    // We must account for group scale if we want to use children offset easily,
                    // but it's easier to keep Group scale 1,1,1 and let SelectionBox use a custom scale logic,
                    // OR set Group scale and divide mc position by it.
                    // Let's go with: Group scale = size, MC scale = 0.5, MC pos = relative.

                    mc.position.x /= (size.x || 1);
                    mc.position.y /= (size.y || 1);
                    mc.position.z /= (size.z || 1);

                    mc.scale.set(0.5, 0.5, 0.5);
                    mc.updateMatrixWorld();

                    const virtualWorldMatrix = new THREE.Matrix4().compose(center, new THREE.Quaternion(), size.clone().multiplyScalar(0.5));
                    // Pass colorFn here
                    updateMarchingCubesField(mc, sdf, worldBounds, resolution, virtualWorldMatrix, colorFn);
                    mc.update?.();

                    const newObj: SceneObject = {
                        id: node.id,
                        type: 'custom',
                        ref: resultObj?.ref || React.createRef(),
                        position: [pivotPosition.x, pivotPosition.y, pivotPosition.z],
                        rotation: [0, 0, 0],
                        scale: [size.x, size.y, size.z],
                        color: blendedColor,
                        materialParams: blendedParams,
                        customObject: wrapper,
                        proxySelectionId: primaryPrimitiveId
                    };
                    finalResults.generatedObjects.set(node.id, newObj);
                } else if (resultObj) {
                    // Even if shape didn't change (hash matched), material might have changed
                    // So we update the color and params on the cached object
                    const updatedCachedObj = {
                        ...resultObj,
                        color: blendedColor,
                        materialParams: blendedParams
                    };

                    if (updatedCachedObj.customObject instanceof THREE.Group) {
                        const mc = updatedCachedObj.customObject.children[0] as any;
                        if (mc?.material instanceof THREE.MeshStandardMaterial) {
                            mc.material.color.setHex(0xffffff);
                            if (blendedParams) {
                                mc.material.roughness = blendedParams.roughness;
                                mc.material.metalness = blendedParams.metalness;
                            }
                        }
                    } else if (updatedCachedObj.customObject?.material instanceof THREE.MeshStandardMaterial) {
                        updatedCachedObj.customObject.material.color.setHex(0xffffff);
                        if (blendedParams) {
                            updatedCachedObj.customObject.material.roughness = blendedParams.roughness;
                            updatedCachedObj.customObject.material.metalness = blendedParams.metalness;
                        }
                    }

                    finalResults.generatedObjects.set(node.id, updatedCachedObj);
                }
            });
        }
    }, [getInputValue, gatherPrimitives, averageColors, averageMaterialParams]);

    const updateGhostStatesForConnections = useCallback((
        connections: Connection[],
        nodeMap: Map<string, NodeData>,
        finalResults: FinalResults
    ) => {
        connections.forEach(conn => {
            const sourceNode = nodeMap.get(conn.sourceNodeId);
            const targetNode = nodeMap.get(conn.targetNodeId);

            if (!sourceNode || !targetNode) return;

            // Only ghost sources that are primitives or boolean results themselves.
            const isSourceGhostable = operationConfigs[sourceNode.type] !== undefined || sourceNode.type === 'box' || sourceNode.type === 'sphere';
            if (!isSourceGhostable) return;

            // Only ghost if the target is a known consumer (boolean or passthrough).
            const isTargetConsumer = operationConfigs[targetNode.type] !== undefined || targetNode.type === 'layer-source' || targetNode.type === 'mesh-array';
            if (!isTargetConsumer) return;

            // If the target is a passthrough, ensure it's not a dead-end.
            if (targetNode.type === 'layer-source' || targetNode.type === 'mesh-array') {
                const isPassthroughActive = connections.some(c => c.sourceNodeId === targetNode.id);
                if (!isPassthroughActive) return;
            }

            // Exception: Don't ghost if 'Show Meshes B' is enabled on a mesh-difference node.
            if (targetNode.type === 'mesh-difference' && conn.targetPort === 'B') {
                const showMeshesB = getInputValue(targetNode.id, 'showMeshesB', !!targetNode.data.showMeshesB);
                if (showMeshesB) return;
            }

            // Exception: Don't ghost if 'Show Meshes A,B' is enabled on a mesh-intersection node.
            if (targetNode.type === 'mesh-intersection') {
                const showMeshesAB = getInputValue(targetNode.id, 'showMeshesAB', !!targetNode.data.showMeshesAB);
                if (showMeshesAB) return;
            }

            // If the primitive was explicitly marked as unghostable (e.g., force-shown), respect that.
            if (finalResults.unghostableIds.has(sourceNode.id)) return;

            // If all checks pass, ghost the source node.
            finalResults.ghostIds.add(sourceNode.id);
        });
    }, [getInputValue]);

    const vectorsAreEqual = (a?: number[], b?: number[]): boolean => {
        if (!a || !b) return a === b;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    };
    
    const syncPrimitiveSceneObjects = useCallback((
        nodes: NodeData[],
        sceneObjectMap: Map<string, SceneObject>
    ) => {
        const primitiveNodes = nodes.filter(n => n.type === 'box' || n.type === 'sphere');
        const updatedPrimitives = new Map<string, Partial<SceneObject>>();
        const newPrimitives: SceneObject[] = [];

        primitiveNodes.forEach(node => {
            let sceneObj = sceneObjectMap.get(node.id);
            if (!sceneObj) {
                ensurePrimitiveSceneObject(node, sceneObjectMap, newPrimitives);
                return;
            }
            if (!sceneObj.ref.current) return;

            const updates: Partial<SceneObject> = {};
            if (node.data.location) {
                const nodePos = [node.data.location.x, node.data.location.y, node.data.location.z];
                if (!vectorsAreEqual(nodePos, sceneObj.position)) {
                    updates.position = nodePos as [number, number, number];
                }
            }
            if (node.data.rotation) {
                const nodeRot = [node.data.rotation.x, node.data.rotation.y, node.data.rotation.z];
                if (!vectorsAreEqual(nodeRot, sceneObj.rotation)) {
                    updates.rotation = nodeRot as [number, number, number];
                }
            }
            if (node.data.scale) {
                const nodeScale = [node.data.scale.x, node.data.scale.y, node.data.scale.z];
                if (!vectorsAreEqual(nodeScale, sceneObj.scale)) {
                    updates.scale = nodeScale as [number, number, number];
                }
            }
            const radius = getInputValue(node.id, 'input-corner', 0);
            if (sceneObj.radius !== radius) {
                updates.radius = radius;
            }

            if (Object.keys(updates).length > 0) {
                updatedPrimitives.set(node.id, updates);
            }
        });

        return { updatedPrimitives, newPrimitives };
    }, [getInputValue, ensurePrimitiveSceneObject]);

    const processAppearanceOverrides = useCallback((
        nodes: NodeData[],
        connections: Connection[],
        sceneObjectMap: Map<string, SceneObject>,
        updatedPrimitives: Map<string, Partial<SceneObject>>,
        finalResults: FinalResults
    ) => {
        const materialNodes = nodes.filter(n => n.type === 'model-material');

        materialNodes.forEach(matNode => {
            const style = matNode.data.materialStyle || matNode.data.style;
            const matColor = extractColorFromStyle(style);
            const params = matNode.data.materialParams;

            // Find incoming connections to this material node
            const incoming = connections.filter(c => c.targetNodeId === matNode.id);

            incoming.forEach(conn => {
                const sourceId = conn.sourceNodeId;

                const materialParams = params ? {
                    roughness: params.roughness,
                    metalness: params.metalness,
                    emissive: params.emissive,
                    transparency: params.transparency
                } : undefined;

                // 1. Try updating primitive if it's already in the update map or scene object map
                const primitiveUpdate = updatedPrimitives.get(sourceId);
                if (primitiveUpdate) {
                    primitiveUpdate.color = matColor;
                    primitiveUpdate.materialParams = materialParams;
                } else {
                    const sceneObj = sceneObjectMap.get(sourceId);
                    if (sceneObj && (sceneObj.type === 'box' || sceneObj.type === 'sphere')) {
                        updatedPrimitives.set(sourceId, {
                            color: matColor,
                            materialParams: materialParams
                        });
                    }
                }

                // 2. Try updating generated boolean objects
                const generatedObj = finalResults.generatedObjects.get(sourceId);
                if (generatedObj) {
                    // Update the color and ensure we set a new reference for commitChangesToScene to detect
                    const updatedObj = {
                        ...generatedObj,
                        color: matColor,
                        materialParams: materialParams
                    };
                    finalResults.generatedObjects.set(sourceId, updatedObj);

                    // Also update the physical material on the custom object for immediate visual feedback if it exists
                    if (updatedObj.customObject?.material) {
                        const mat = updatedObj.customObject.material;
                        mat.color.set(matColor);
                        if (materialParams) {
                            if ('roughness' in mat) mat.roughness = materialParams.roughness ?? 0.5;
                            if ('metalness' in mat) mat.metalness = materialParams.metalness ?? 0.5;
                        }
                    }
                }
            });
        });
    }, []);

    const commitChangesToScene = useCallback((
        prev: SceneObject[],
        finalResults: FinalResults,
        updatedPrimitives: Map<string, Partial<SceneObject>>,
        newPrimitives: SceneObject[],
        nodeMap: Map<string, NodeData>
    ): SceneObject[] => {
        let hasChanged = false;
        let next = [...prev];

        // A. Add new primitives
        if (newPrimitives.length > 0) {
            newPrimitives.forEach(obj => {
                if (!next.some(o => o.id === obj.id)) {
                    next.push(obj);
                    hasChanged = true;
                }
            });
        }

        // B. Update primitives
        if (updatedPrimitives.size > 0) {
            updatedPrimitives.forEach((data, id) => {
                const idx = next.findIndex(o => o.id === id);
                if (idx !== -1) {
                    next[idx] = { ...next[idx], ...data };
                    hasChanged = true;
                }
            });
        }

        // C. Add/Update generated boolean objects
        if (finalResults.generatedObjects.size > 0) {
            finalResults.generatedObjects.forEach((obj, id) => {
                const idx = next.findIndex(o => o.id === id);
                if (idx !== -1) {
                    if (next[idx] !== obj) {
                        next[idx] = obj;
                        hasChanged = true;
                    }
                } else {
                    next.push(obj);
                    hasChanged = true;
                }
            });
        }

        // D. Remove stale objects
        const originalLength = next.length;
        next = next.filter(obj => {
            const isBooleanResult = Object.keys(operationConfigs).includes(obj.type) || obj.type === 'custom';

            // 1. โหนดยังอยู่ แต่ไม่สร้างผลลัพธ์ (เช่น error หรือไม่มี input)
            if (isBooleanResult && finalResults.processedBooleanIds.has(obj.id) && !finalResults.generatedObjects.has(obj.id)) {
                return false;
            }

            // 2. โหนดถูกลบออกจากกราฟไปแล้วเด็ดขาด
            if (isBooleanResult && !nodeMap.has(obj.id)) {
                return false;
            }

            const isPrimitive = obj.type === 'box' || obj.type === 'sphere';
            if (isPrimitive && !nodeMap.has(obj.id)) {
                return false; // Stale primitive (node was deleted)
            }
            return true;
        });
        if (originalLength !== next.length) hasChanged = true;

        // E. Update ghost and faded state for all objects
        let stateChanged = false;
        next = next.map(obj => {
            const shouldBeGhost = finalResults.ghostIds.has(obj.id);
            const shouldBeFaded = finalResults.fadedIds.has(obj.id);

            let updatedObj = obj;
            let currentObjChanged = false;

            if (!!obj.isGhost !== shouldBeGhost) {
                updatedObj = { ...updatedObj, isGhost: shouldBeGhost };
                currentObjChanged = true;
            }
            if (!!obj.isFaded !== shouldBeFaded) {
                updatedObj = { ...updatedObj, isFaded: shouldBeFaded };
                currentObjChanged = true;
            }

            if (currentObjChanged) stateChanged = true;
            return updatedObj;
        });
        if (stateChanged) hasChanged = true;

        return hasChanged ? next : prev;
    }, []);

    // =================================================================
    // Main Evaluation Orchestrator
    // =================================================================

    const runEvaluation = useCallback(() => {
        if (isEvaluatingRef.current) return;
        isEvaluatingRef.current = true;

        const nodes = nodesRef.current;
        const connections = connectionsRef.current;

        // --- 1. Pre-computation ---
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const sceneObjectMap = new Map(sceneObjectsRef.current.map(o => [o.id, o]));
        const finalResults: FinalResults = {
            generatedObjects: new Map(),
            processedBooleanIds: new Set(),
            ghostIds: new Set(),
            unghostableIds: new Set(),
            fadedIds: new Set()
        };

        // --- 2. Process graph to determine changes ---
        processBooleanNodes(nodes, connections, nodeMap, sceneObjectMap, finalResults);
        updateGhostStatesForConnections(connections, nodeMap, finalResults);
        const { updatedPrimitives, newPrimitives } = syncPrimitiveSceneObjects(nodes, sceneObjectMap);

        // --- 2.5 Apply Material Overrides ---
        processAppearanceOverrides(nodes, connections, sceneObjectMap, updatedPrimitives, finalResults);

        // --- 3. Commit all changes to state ---
        setSceneObjects(prev => commitChangesToScene(prev, finalResults, updatedPrimitives, newPrimitives, nodeMap));

        isEvaluatingRef.current = false;
    }, [
        setSceneObjects,
        processBooleanNodes,
        updateGhostStatesForConnections,
        syncPrimitiveSceneObjects,
        processAppearanceOverrides,
        commitChangesToScene
    ]);

    // =================================================================
    // Effects and Exposed Handlers
    // =================================================================

    useEffect(() => {
        sceneObjectsRef.current = sceneObjects;
    }, [sceneObjects]);

    useEffect(() => {
        let animationFrameId: number;
        const loop = () => {
            runEvaluation();
            animationFrameId = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(animationFrameId);
    }, [runEvaluation]);

    const handleGraphChange = useCallback((nodes: NodeData[], connections: Connection[]) => {
        nodesRef.current = nodes;
        connectionsRef.current = connections;
        runEvaluation();
    }, [runEvaluation]);

    return { evaluateGraph: handleGraphChange };
};
