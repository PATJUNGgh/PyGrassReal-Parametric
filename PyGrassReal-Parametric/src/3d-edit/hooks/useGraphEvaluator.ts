import React, { useCallback, useRef, useContext } from 'react';
import * as THREE from 'three';
import { extractColorFromStyle } from '../components/MaterialPicker';
import type { NodeData, Connection } from '../types/NodeTypes';
import type { SceneObject } from '../types/scene';
import { SceneInteractionContext, type SceneInteractionState } from '../context/SceneInteractionContext';
import { extractNumber, extractBoolean } from '../utils/nodeUtils';
import { 
    OPERATION_CONFIGS, 
    PASSTHROUGH_NODE_TYPES, 
    MIN_BOOLEAN_BOUNDS_AXIS 
} from '../utils/booleanNodeUtils';
import { resolveInputValue, resolveVectorValue } from '../utils/nodeValueResolvers';
import { useBooleanProcessor } from './useBooleanProcessor';
import { useAiProcessor } from './useAiProcessor';
import { useArrayProcessor } from './useArrayProcessor';

interface UseGraphEvaluatorProps {
    sceneObjects: SceneObject[];
    setSceneObjects: React.Dispatch<React.SetStateAction<SceneObject[]>>;
}

export const useGraphEvaluator = ({ sceneObjects, setSceneObjects }: UseGraphEvaluatorProps) => {
    // --- Constants ---
    const DEFAULT_SMOOTHNESS = 0.5;
    const DEFAULT_DIFFERENCE_SMOOTHNESS = 0.15;
    const DIFFERENCE_SMOOTHNESS_SCALE_FACTOR = 0.2;
    const MARCHING_CUBES_RESOLUTION = 64;
    const MARCHING_CUBES_DRAG_RESOLUTION = 40;
    const MARCHING_CUBES_MAX_VERTICES = 100000;
    const BOOLEAN_DRAG_THROTTLE_MS = 48;
    const DEFAULT_ROUGHNESS = 0.3;
    const DEFAULT_METALNESS = 0.1;
    const DEFAULT_PRIMITIVE_COLOR = '#cccccc';
    const DEFAULT_FALLBACK_COLOR = DEFAULT_PRIMITIVE_COLOR;
    const DIRECTION_VECTOR_THRESHOLD = 1e-6;

    const interactionContext = useContext(SceneInteractionContext) as SceneInteractionState;
    const { isHandleDragging, isScalingHandle, isGumballDragging, dragJustFinishedRef } = interactionContext;
    const isScaleHandleDragActive = isHandleDragging && isScalingHandle;
    const isGumballActive = isGumballDragging || dragJustFinishedRef.current;
    const activeMarchingCubesResolution = isScaleHandleDragActive
        ? MARCHING_CUBES_DRAG_RESOLUTION
        : MARCHING_CUBES_RESOLUTION;

    const nodesRef = useRef<NodeData[]>([]);
    const connectionsRef = useRef<Connection[]>([]);
    const sceneObjectsRef = useRef<SceneObject[]>(sceneObjects);
    const mcInstancesRef = useRef<Map<string, any>>(new Map());
    const lastHashesRef = useRef<Map<string, string>>(new Map());
    const isEvaluatingRef = useRef<boolean>(false);
    const lastBooleanProcessAtRef = useRef<number>(0);

    const { processBooleanNodes } = useBooleanProcessor();
    const { processAiSculptNodes, processAiPaintNodes, processPictureOnMeshNodes } = useAiProcessor();
    const { processMeshArrayNodes } = useArrayProcessor();

    // =================================================================
    // Helper Functions
    // =================================================================

    const averageColors = useCallback((nodeIds: string[], sceneObjectMap: Map<string, SceneObject>): string => {
        if (nodeIds.length === 0) return DEFAULT_FALLBACK_COLOR;
        let r = 0, g = 0, b = 0;
        let count = 0;
        nodeIds.forEach(id => {
            const obj = sceneObjectMap.get(id);
            if (obj && obj.color) {
                const c = new THREE.Color(obj.color);
                r += c.r; g += c.g; b += c.b;
                count++;
            }
        });
        if (count === 0) return DEFAULT_FALLBACK_COLOR;
        return '#' + new THREE.Color(r / count, g / count, b / count).getHexString();
    }, [DEFAULT_FALLBACK_COLOR]);

    const averageMaterialParams = useCallback((nodeIds: string[], sceneObjectMap: Map<string, SceneObject>) => {
        if (nodeIds.length === 0) return undefined;
        let roughness = 0, metalness = 0, emissive = 0, transparency = 0;
        let count = 0;
        nodeIds.forEach(id => {
            const obj = sceneObjectMap.get(id);
            const params = obj?.materialParams;
            if (params) {
                roughness += params.roughness ?? DEFAULT_ROUGHNESS;
                metalness += params.metalness ?? DEFAULT_METALNESS;
                emissive += params.emissive ?? 0;
                transparency += params.transparency ?? 0;
                count++;
            } else if (obj) {
                roughness += DEFAULT_ROUGHNESS;
                metalness += DEFAULT_METALNESS;
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
    }, [DEFAULT_ROUGHNESS, DEFAULT_METALNESS]);

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

        if (node.type === 'box' || node.type === 'sphere' || node.type === 'cone' || node.type === 'cylinder') {
            return [node];
        }

        if (PASSTHROUGH_NODE_TYPES.has(node.type)) {
            const incoming = connections.filter(c => c.targetNodeId === nodeId);
            const results: NodeData[] = [];
            for (const c of incoming) {
                if (OPERATION_CONFIGS[node.type] && !OPERATION_CONFIGS[node.type].inputGroups[c.targetPort]) {
                    continue;
                }
                results.push(...gatherPrimitives(c.sourceNodeId, visited, nodeMap, connections));
            }
            return results;
        }

        return [];
    }, []);

    // =================================================================
    // SceneObject Management
    // =================================================================

    const createPrimitiveSceneObject = useCallback((
        node: NodeData,
        nodeMap: Map<string, NodeData>,
        connections: Connection[]
    ): SceneObject => {
        const position = node.data.location ? [node.data.location.x, node.data.location.y, node.data.location.z] : [0, 0, 0];
        const rotation = node.data.rotation ? [node.data.rotation.x, node.data.rotation.y, node.data.rotation.z] : [0, 0, 0];
        const isRadialPrimitive = node.type === 'cone' || node.type === 'cylinder';
        const radius = isRadialPrimitive
            ? extractNumber(resolveInputValue(node.id, 'input-radius', nodeMap, connections, node.data.radius || 1), 1)
            : 0;
        const height = isRadialPrimitive
            ? extractNumber(resolveInputValue(node.id, 'input-length', nodeMap, connections, node.data.length || 2), 2)
            : 0;
        const corner = node.type === 'box' || node.type === 'cylinder'
            ? extractNumber(resolveInputValue(node.id, 'input-corner', nodeMap, connections, node.data.corner || 0), node.data.corner || 0)
            : 0;

        return {
            id: node.id,
            type: node.type as any,
            ref: React.createRef(),
            position: position as [number, number, number],
            rotation: rotation as [number, number, number],
            scale: (isRadialPrimitive
                ? [
                    (node.data.scale?.x ?? 1) * (radius * 2),
                    (node.data.scale?.y ?? 1) * height,
                    (node.data.scale?.z ?? 1) * (radius * 2)
                ]
                : (node.data.scale ? [node.data.scale.x, node.data.scale.y, node.data.scale.z] : [1, 1, 1])) as [number, number, number],
            color: node.data.color || DEFAULT_PRIMITIVE_COLOR,
            radius: node.type === 'box' ? corner : radius,
            height: height,
            corner: node.type === 'cylinder' ? corner : undefined,
        };
    }, [DEFAULT_PRIMITIVE_COLOR]);

    const vectorsAreEqual = (a?: number[], b?: number[], epsilon = 1e-5): boolean => {
        if (!a || !b) return a === b;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (Math.abs((a[i] || 0) - (b[i] || 0)) > epsilon) return false;
        }
        return true;
    };

    // =================================================================
    // Main Evaluation Orchestrator
    // =================================================================

    const runEvaluation = useCallback(() => {
        if (isEvaluatingRef.current) return;
        isEvaluatingRef.current = true;

        const nodes = nodesRef.current;
        const connections = connectionsRef.current;

        if (nodes.length === 0) {
            isEvaluatingRef.current = false;
            return;
        }

        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const sceneObjectMap = new Map(sceneObjectsRef.current.map(o => [o.id, o]));
        const finalResults = {
            generatedObjects: new Map<string, SceneObject>(),
            processedBooleanIds: new Set<string>(),
            ghostIds: new Set<string>(),
            unghostableIds: new Set<string>(),
            fadedIds: new Set<string>()
        };

        const now = Date.now();
        const shouldThrottleBoolean = isScaleHandleDragActive && (now - lastBooleanProcessAtRef.current < BOOLEAN_DRAG_THROTTLE_MS);

        if (shouldThrottleBoolean) {
            nodes.forEach(node => {
                if (OPERATION_CONFIGS[node.type]) {
                    finalResults.processedBooleanIds.add(node.id);
                    const cached = sceneObjectMap.get(node.id);
                    if (cached) finalResults.generatedObjects.set(node.id, cached);
                }
            });
        } else {
            processBooleanNodes(nodes, connections, finalResults, {
                nodeMap, sceneObjectMap, mcInstancesRef, lastHashesRef, gatherPrimitives,
                averageColors, averageMaterialParams, resolution: activeMarchingCubesResolution,
                fallbackColor: DEFAULT_FALLBACK_COLOR, defaultSmoothness: DEFAULT_SMOOTHNESS,
                defaultDifferenceSmoothness: DEFAULT_DIFFERENCE_SMOOTHNESS, 
                differenceSmoothnessScaleFactor: DIFFERENCE_SMOOTHNESS_SCALE_FACTOR,
                maxVertices: MARCHING_CUBES_MAX_VERTICES, defaultRoughness: DEFAULT_ROUGHNESS,
                defaultMetalness: DEFAULT_METALNESS
            });
            lastBooleanProcessAtRef.current = now;
        }

        processAiSculptNodes(nodes, connections, nodeMap, sceneObjectMap, finalResults, lastHashesRef);
        processAiPaintNodes(nodes, connections, nodeMap, sceneObjectMap, finalResults, lastHashesRef);
        processPictureOnMeshNodes(nodes, connections, nodeMap, sceneObjectMap, finalResults, lastHashesRef);
        processMeshArrayNodes(nodes, connections, nodeMap, sceneObjectMap, finalResults, lastHashesRef, DIRECTION_VECTOR_THRESHOLD);

        // Update Ghost States
        connections.forEach(conn => {
            const source = nodeMap.get(conn.sourceNodeId);
            const target = nodeMap.get(conn.targetNodeId);
            if (!source || !target) return;

            const isSourceGhostable = OPERATION_CONFIGS[source.type] || ['box', 'sphere', 'cone', 'cylinder'].includes(source.type);
            if (!isSourceGhostable) return;

            const isTargetConsumer = OPERATION_CONFIGS[target.type] || ['layer-source', 'mesh-array', 'ai-sculpt', 'ai-paint'].includes(target.type);
            if (!isTargetConsumer) return;

            if (target.type === 'layer-source' && !connections.some(c => c.sourceNodeId === target.id)) return;
            if (target.type === 'mesh-difference' && conn.targetPort === 'B' && extractBoolean(resolveInputValue(target.id, 'showMeshesB', nodeMap, connections, !!target.data.showMeshesB), !!target.data.showMeshesB)) return;
            if (target.type === 'mesh-intersection' && extractBoolean(resolveInputValue(target.id, 'showMeshesAB', nodeMap, connections, !!target.data.showMeshesAB), !!target.data.showMeshesAB)) return;

            if (!finalResults.unghostableIds.has(source.id)) finalResults.ghostIds.add(source.id);
        });

        // Sync Primitives
        const updatedPrimitives = new Map<string, Partial<SceneObject>>();
        const newPrimitives: SceneObject[] = [];
        nodes.filter(n => ['box', 'sphere', 'cone', 'cylinder'].includes(n.type)).forEach(node => {
            let obj = sceneObjectMap.get(node.id);
            if (!obj) {
                const created = createPrimitiveSceneObject(node, nodeMap, connections);
                sceneObjectMap.set(node.id, created);
                newPrimitives.push(created);
                return;
            }
            if (!obj.ref.current) return;

            const updates: Partial<SceneObject> = {};
            const expectedColor = node.data.color || DEFAULT_PRIMITIVE_COLOR;
            if (obj.color !== expectedColor) updates.color = expectedColor;
            
            // SKIP Snapping back if Gumball or Handles are active (or just finished)
            // This prevents the "snap back" effect after a drag.
            if (!isGumballActive && !isHandleDragging) {
                if (node.data.location && !vectorsAreEqual([node.data.location.x, node.data.location.y, node.data.location.z], obj.position)) updates.position = [node.data.location.x, node.data.location.y, node.data.location.z];
                if (node.data.rotation && !vectorsAreEqual([node.data.rotation.x, node.data.rotation.y, node.data.rotation.z], obj.rotation)) updates.rotation = [node.data.rotation.x, node.data.rotation.y, node.data.rotation.z];
            }
            
            if (node.type === 'cone' || node.type === 'cylinder') {
                const r = extractNumber(resolveInputValue(node.id, 'input-radius', nodeMap, connections, node.data.radius || 1), 1);
                const h = extractNumber(resolveInputValue(node.id, 'input-length', nodeMap, connections, node.data.length || 2), 2);
                const c = node.type === 'cylinder' ? extractNumber(resolveInputValue(node.id, 'input-corner', nodeMap, connections, node.data.corner || 0), node.data.corner || 0) : 0;
                if (obj.radius !== r) updates.radius = r;
                if (obj.height !== h) updates.height = h;
                if (node.type === 'cylinder' && obj.corner !== c) updates.corner = c;
                const bs = node.data.scale ? [node.data.scale.x, node.data.scale.y, node.data.scale.z] : [1, 1, 1];
                const ts = [bs[0] * (r * 2), bs[1] * h, bs[2] * (r * 2)];
                if (!vectorsAreEqual(ts, obj.scale)) updates.scale = ts as any;
            } else if (node.data.scale && !vectorsAreEqual([node.data.scale.x, node.data.scale.y, node.data.scale.z], obj.scale)) {
                updates.scale = [node.data.scale.x, node.data.scale.y, node.data.scale.z];
            }
            if (Object.keys(updates).length > 0) updatedPrimitives.set(node.id, updates);
        });

        // Appearance Overrides
        nodes.filter(n => n.type === 'model-material').forEach(matNode => {
            const styleColor = extractColorFromStyle(matNode.data.materialStyle || matNode.data.style);
            const params = matNode.data.materialParams;
            connections.filter(c => c.targetNodeId === matNode.id).forEach(conn => {
                const sourceId = conn.sourceNodeId;
                const materialParams = params ? { roughness: params.roughness, metalness: params.metalness, emissive: params.emissive, transparency: params.transparency } : undefined;
                
                const primUpdate = updatedPrimitives.get(sourceId);
                if (primUpdate) { primUpdate.color = styleColor; primUpdate.materialParams = materialParams; }
                else {
                    const obj = sceneObjectMap.get(sourceId);
                    if (obj && ['box', 'sphere', 'cone', 'cylinder'].includes(obj.type)) {
                        updatedPrimitives.set(sourceId, { color: styleColor, materialParams });
                    }
                }

                const genObj = finalResults.generatedObjects.get(sourceId);
                if (genObj) {
                    finalResults.generatedObjects.set(sourceId, { ...genObj, color: styleColor, materialParams });
                    const mat = (genObj.customObject as any)?.material || (genObj.customObject as any)?.children?.[0]?.material;
                    if (mat) {
                        mat.color.set(styleColor);
                        if (materialParams) {
                            if ('roughness' in mat) mat.roughness = materialParams.roughness ?? DEFAULT_ROUGHNESS;
                            if ('metalness' in mat) mat.metalness = materialParams.metalness ?? DEFAULT_METALNESS;
                        }
                    }
                }
            });
        });

        // Commit to State
        setSceneObjects(prev => {
            let changed = false;
            let current = [...prev];

            newPrimitives.forEach(p => { if (!current.some(o => o.id === p.id)) { current.push(p); changed = true; } });
            finalResults.generatedObjects.forEach(p => { if (!current.some(o => o.id === p.id)) { current.push(p); changed = true; } });

            current = current.map(obj => {
                let updated = obj;
                const primUpd = updatedPrimitives.get(obj.id);
                if (primUpd) { updated = { ...updated, ...primUpd }; changed = true; }
                const genUpd = finalResults.generatedObjects.get(obj.id);
                if (genUpd && updated !== genUpd) { updated = genUpd; changed = true; }
                const isGhost = finalResults.ghostIds.has(obj.id);
                const isFaded = finalResults.fadedIds.has(obj.id);
                if (!!updated.isGhost !== isGhost) { updated = { ...updated, isGhost }; changed = true; }
                if (!!updated.isFaded !== isFaded) { updated = { ...updated, isFaded }; changed = true; }
                return updated;
            });

            const originalLen = current.length;
            current = current.filter(obj => {
                const isBoolean = OPERATION_CONFIGS[obj.type] || obj.type === 'custom';
                if (isBoolean && finalResults.processedBooleanIds.has(obj.id) && !finalResults.generatedObjects.has(obj.id)) return false;
                return nodeMap.has(obj.id);
            });
            if (current.length !== originalLen) changed = true;

            return changed ? current : prev;
        });

        isEvaluatingRef.current = false;
    }, [
        setSceneObjects, processBooleanNodes, activeMarchingCubesResolution, isScaleHandleDragActive, 
        processAiSculptNodes, processAiPaintNodes, processPictureOnMeshNodes, processMeshArrayNodes,
        gatherPrimitives, averageColors, averageMaterialParams, createPrimitiveSceneObject
    ]);

    return { nodesRef, connectionsRef, sceneObjectsRef, runEvaluation };
};
