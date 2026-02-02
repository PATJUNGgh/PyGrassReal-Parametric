
import React, { useCallback, useRef, useEffect, useContext } from 'react';
import * as THREE from 'three';
import { sdBox, sdSphere, smin, smax, sdRoundedBox } from '../utils/sdfUtils';
import { updateMarchingCubesField } from '../utils/marchingCubes';
import { MarchingCubes } from '../utils/marchingCubesWrapper';
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
        sdf: (distances, smoothness) => smax(distances.A, -distances.B, smoothness),
        color: '#f59e0b',
        inputGroups: { 'A': 'A', 'B': 'B' },
    }
};

const PASSTHROUGH_NODE_TYPES = new Set(['layer-source', ...Object.keys(operationConfigs)]);

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
    // Refactored Helper Functions
    // =================================================================

    const getInputValue = useCallback((nodeId: string, portId: string, defaultValue: number = 0): number => {
        const conn = connectionsRef.current.find(c => c.targetNodeId === nodeId && c.targetPort === portId);
        if (!conn) return defaultValue;
        const source = nodesRef.current.find(n => n.id === conn.sourceNodeId);
        if (!source) return defaultValue;

        if (source.type === 'number-slider') {
            return source.data.value ?? defaultValue;
        }
        return defaultValue;
    }, []);

    const gatherPrimitives = useCallback((nodeId: string, visited: Set<string>, nodeMap: Map<string, NodeData>, connections: Connection[]): NodeData[] => {
        if (visited.has(nodeId)) return [];
        visited.add(nodeId);

        const node = nodeMap.get(nodeId);
        if (!node) return [];

        // Base case: Node is a primitive
        if (node.type === 'box' || node.type === 'sphere') {
            return [node];
        }

        // Recursive case: Node is a passthrough type
        if (PASSTHROUGH_NODE_TYPES.has(node.type)) {
            const incoming = connections.filter(c => c.targetNodeId === nodeId);
            const results: NodeData[] = [];
            for (const c of incoming) {
                // For boolean nodes, only consider main input ports for passthrough
                if (operationConfigs[node.type] && !operationConfigs[node.type].inputGroups[c.targetPort]) {
                    continue;
                }
                results.push(...gatherPrimitives(c.sourceNodeId, visited, nodeMap, connections));
            }
            return results;
        }

        return [];
    }, []);

    // Calculates the SDF for a group of evaluable primitives
    const calculateGroupSDF = (evaluables: Evaluable[], p: THREE.Vector3, smoothness: number): number => {
        let d = Infinity;
        for (let i = 0; i < evaluables.length; i++) {
            const item = evaluables[i];
            const localP = p.clone().applyMatrix4(item.inverseMatrix);
            let dist = Infinity;

            if (item.type === 'box') {
                dist = item.radius > 0
                    ? sdRoundedBox(localP.x, localP.y, localP.z, item.dims.x, item.dims.y, item.dims.z, item.radius)
                    : sdBox(localP.x, localP.y, localP.z, item.dims.x, item.dims.y, item.dims.z);
            } else if (item.type === 'sphere') {
                dist = sdSphere(localP.x, localP.y, localP.z, 0.5);
            }

            d = i === 0 ? dist : smin(d, dist, smoothness);
        }
        return d;
    };

    // Processes a list of input nodes to produce evaluable objects and update hash/bounds
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

            evaluables.push({ type: node.type, inverseMatrix, dims, radius });
        });
        return { evaluables, newHash: currentHash };
    };


    // =================================================================
    // Helper Function to Create Primitive SceneObject
    // =================================================================

    const createPrimitiveSceneObject = useCallback((node: NodeData): SceneObject => {
        const position = node.data.location
            ? [node.data.location.x, node.data.location.y, node.data.location.z]
            : [0, 0, 0];
        const rotation = node.data.rotation
            ? [node.data.rotation.x, node.data.rotation.y, node.data.rotation.z]
            : [0, 0, 0];
        const scale = node.data.scale
            ? [node.data.scale.x, node.data.scale.y, node.data.scale.z]
            : [1, 1, 1];
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
    // Main Evaluation Logic (Heavily Refactored)
    // =================================================================

    const runEvaluation = useCallback(() => {
        if (isEvaluatingRef.current) return;
        isEvaluatingRef.current = true;

        const nodes = nodesRef.current;
        const connections = connectionsRef.current;


        // --- Pre-computation ---
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const sceneObjectMap = new Map(sceneObjectsRef.current.map(o => [o.id, o]));

        const finalResults = {
            generatedObjects: new Map<string, SceneObject>(),
            processedBooleanIds: new Set<string>(),
            ghostIds: new Set<string>()
        };

        // --- 1. Process all boolean operations ---
        for (const nodeType of Object.keys(operationConfigs)) {
            const config = operationConfigs[nodeType];
            const booleanNodes = nodes.filter(n => n.type === nodeType);

            booleanNodes.forEach(node => {
                finalResults.processedBooleanIds.add(node.id);

            const inputConnections = connections.filter(c => c.targetNodeId === node.id);
            const smoothness = getInputValue(node.id, 'S', 0.5);
            const isMeshDifferenceNode = node.type === 'mesh-difference';
            const showMeshesB = isMeshDifferenceNode ? node.data.showMeshesB !== false : true;

                // Gather input nodes for each logical group ('A', 'B', 'main')
                const inputGroups: { [groupName: string]: NodeData[] } = {};
                for (const conn of inputConnections) {
                    const groupName = config.inputGroups[conn.targetPort];
                if (groupName) {
                    if (!inputGroups[groupName]) inputGroups[groupName] = [];
                    const visited = new Set<string>();
                    const primitives = gatherPrimitives(conn.sourceNodeId, visited, nodeMap, connections);
                    inputGroups[groupName].push(...primitives);
                    const isBGroup = groupName === 'B';
                    const shouldGhost = !(isMeshDifferenceNode && isBGroup && showMeshesB);
                    if (shouldGhost) {
                        primitives.forEach(p => finalResults.ghostIds.add(p.id));
                    }
                }
                }

                // Deduplicate inputs within each group
                for (const groupName in inputGroups) {
                    inputGroups[groupName] = Array.from(new Map(inputGroups[groupName].map(n => [n.id, n])).values());
                }

                if (Object.keys(inputGroups).length === 0) return;

                // --- Hashing ---
                let currentHash = `type:${node.type}|s:${smoothness}`;
                const worldBounds = new THREE.Box3();
                const evaluableGroups: { [groupName: string]: Evaluable[] } = {};

                for (const groupName in inputGroups) {
                    const { evaluables, newHash } = processInputGroup(inputGroups[groupName], sceneObjectMap, currentHash, worldBounds);
                    evaluableGroups[groupName] = evaluables;
                    currentHash = newHash;
                }

                if (worldBounds.isEmpty()) return;

                // --- Check Hash and Recompute if Needed ---
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
                    let mc = mcInstancesRef.current.get(node.id);
                    if (!mc) {
                        const material = new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.3, metalness: 0.1 });
                        mc = new MarchingCubes(resolution, material, false, false, 100000);
                        mcInstancesRef.current.set(node.id, mc);
                    }

                    const center = new THREE.Vector3();
                    worldBounds.getCenter(center);
                    const size = new THREE.Vector3();
                    worldBounds.getSize(size);

                    mc.position.copy(center);
                    mc.scale.copy(size).multiplyScalar(0.5);
                    mc.updateMatrixWorld();

                    const virtualWorldMatrix = new THREE.Matrix4().compose(center, new THREE.Quaternion(), size.clone().multiplyScalar(0.5));
                    updateMarchingCubesField(mc, sdf, worldBounds, resolution, virtualWorldMatrix);

                    mc.update?.();

                    const newObj: SceneObject = {
                        id: node.id,
                        type: 'custom',
                        ref: resultObj?.ref || React.createRef(),
                        position: [center.x, center.y, center.z],
                        rotation: [0, 0, 0],
                        scale: [size.x / 2, size.y / 2, size.z / 2],
                        color: config.color,
                        customObject: mc
                    };
                    finalResults.generatedObjects.set(node.id, newObj);
                } else if (resultObj) {
                    finalResults.generatedObjects.set(node.id, resultObj);
                }
            });
        }

        // --- 2. Update Primitive Properties (Sync Node -> SceneObject) ---
        const primitiveNodes = nodes.filter(n => n.type === 'box' || n.type === 'sphere');
        const updatedPrimitives = new Map<string, Partial<SceneObject>>();
        const newPrimitives: SceneObject[] = [];

        primitiveNodes.forEach(node => {
            let sceneObj = sceneObjectMap.get(node.id);

            // สร้าง SceneObject ถ้าไม่มี
            if (!sceneObj) {
                ensurePrimitiveSceneObject(node, sceneObjectMap, newPrimitives);
                return;
            }

            if (!sceneObj.ref.current) {
                return;
            }

            const updates: Partial<SceneObject> = {};

            // 1. Position/Location
            if (node.data.location) {
                const nodePos = [node.data.location.x, node.data.location.y, node.data.location.z];
                if (JSON.stringify(nodePos) !== JSON.stringify(sceneObj.position)) {
                    updates.position = nodePos as [number, number, number];
                }
            }

            // 2. Rotation
            if (node.data.rotation) {
                const nodeRot = [node.data.rotation.x, node.data.rotation.y, node.data.rotation.z];
                if (JSON.stringify(nodeRot) !== JSON.stringify(sceneObj.rotation)) {
                    updates.rotation = nodeRot as [number, number, number];
                }
            }

            // 3. Scale
            if (node.data.scale) {
                const nodeScale = [node.data.scale.x, node.data.scale.y, node.data.scale.z];
                if (JSON.stringify(nodeScale) !== JSON.stringify(sceneObj.scale)) {
                    updates.scale = nodeScale as [number, number, number];
                }
            }

            // 4. Radius (Corners)
            const radius = getInputValue(node.id, 'input-corner', 0);
            if (sceneObj.radius !== radius) {
                updates.radius = radius;
            }

            if (Object.keys(updates).length > 0) {
                updatedPrimitives.set(node.id, updates);
            }
        });

        // --- 3. Commit all changes to state ---
        setSceneObjects(prev => {
            let hasChanged = false;
            const next = [...prev];

            // A. Add new primitives
            newPrimitives.forEach(obj => {
                const idx = next.findIndex(o => o.id === obj.id);
                if (idx === -1) {
                    next.push(obj);
                    hasChanged = true;
                }
            });

            // B. Update primitives
            updatedPrimitives.forEach((data, id) => {
                const idx = next.findIndex(o => o.id === id);
                // The `updatedPrimitives` map is pre-filtered to only contain objects
                // with actual changes. This check ensures we apply any detected update
                // for position, rotation, scale, or radius.
                if (idx !== -1) {
                    next[idx] = { ...next[idx], ...data };
                    hasChanged = true;
                }
            });

            // B. Add/Update generated boolean objects
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

            // C. Remove stale boolean objects
            const originalLength = next.length;
            const filtered = next.filter(obj => {
                if (Object.keys(operationConfigs).includes(obj.type) || obj.type === 'custom') {
                    // It's a boolean result object
                    if (finalResults.processedBooleanIds.has(obj.id) && !finalResults.generatedObjects.has(obj.id)) {
                        return false; // Stale, should be removed
                    }
                }
                // Fix Redo Object Deletion
                if ((obj.type === 'box' || obj.type === 'sphere') && !nodeMap.has(obj.id)) {
                    return false;
                }
                return true;
            });
            if (originalLength !== filtered.length) hasChanged = true;

            // D. Update ghost state for all objects
            const finalNext = filtered.map(obj => {
                const shouldBeGhost = finalResults.ghostIds.has(obj.id);
                if (!!obj.isGhost !== shouldBeGhost) {
                    hasChanged = true;
                    return { ...obj, isGhost: shouldBeGhost };
                }
                return obj;
            });

            return hasChanged ? finalNext : prev;
        });

        isEvaluatingRef.current = false;
    }, [setSceneObjects, getInputValue, gatherPrimitives]);

    // Sync refs remains the same
    useEffect(() => {
        sceneObjectsRef.current = sceneObjects;
    }, [sceneObjects]);

    // Polling loop remains the same
    useEffect(() => {
        let animationFrameId: number;
        const loop = () => {
            runEvaluation();
            animationFrameId = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(animationFrameId);
    }, [runEvaluation]);

    // Graph change handler remains the same
    const handleGraphChange = useCallback((nodes: NodeData[], connections: Connection[]) => {
        nodesRef.current = nodes;
        connectionsRef.current = connections;
        // The loop will pick up the changes, but we can run it once immediately
        runEvaluation();
    }, [runEvaluation]);

    return { evaluateGraph: handleGraphChange };
};
