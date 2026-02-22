import type { NodeData } from '../types/NodeTypes';
import { NODE_DEFINITIONS } from '../definitions/nodeDefinitions';
import * as THREE from 'three';

/**
 * Checks if a given port on a node is an input port.
 * @param nodes - The array of all nodes.
 * @param nodeId - The ID of the node to check.
 * @param portId - The ID of the port to check.
 * @returns `true` if the port is an input, `false` otherwise.
 */
export const isInputPort = (nodes: NodeData[], nodeId: string, portId: string): boolean => {
    const node = nodes.find((n) => n.id === nodeId);

    // If node is found in current state, check its actual data
    if (node) {
        const inputs = node.data.inputs || [];
        return inputs.some((p) => p.id === portId);
    }

    // Fallback: Check all definitions to see if this port ID is strictly an input or output.
    const lowerId = portId.toLowerCase();
    if (lowerId.startsWith('input-')) return true;
    if (lowerId.startsWith('output-')) return false;

    // Hardcoded rules for common standard ports to be fast and safe
    if (portId === 'F') return true; // Factor is always input in Unit nodes
    if (portId === 'V') return false; // Vector/Value is often output

    let foundAsInput = false;
    let foundAsOutput = false;

    for (const def of Object.values(NODE_DEFINITIONS)) {
        if (def.initialData.inputs?.some(p => p.id === portId)) foundAsInput = true;
        if (def.initialData.outputs?.some(p => p.id === portId)) foundAsOutput = true;
    }

    // If it's only found as an input across all definitions, trust it's an input.
    if (foundAsInput && !foundAsOutput) return true;
    if (foundAsOutput && !foundAsInput) return false;

    // Default to false if ambiguous or not found (safer than true which might cause swaps)
    return false;
};

export const extractNumber = (value: unknown, fallback: number): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (Array.isArray(value)) {
        const firstNumeric = value.find((item): item is number => typeof item === 'number' && Number.isFinite(item));
        if (firstNumeric !== undefined) return firstNumeric;
    }
    return fallback;
};

export const extractBoolean = (value: unknown, fallback = false): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (typeof first === 'boolean') return first;
        if (typeof first === 'number') return first !== 0;
    }
    return fallback;
};

export const extractVector3 = (value: unknown, fallback: THREE.Vector3): THREE.Vector3 => {
    if (value instanceof THREE.Vector3) return value.clone();

    if (Array.isArray(value)) {
        return new THREE.Vector3(
            extractNumber(value[0], fallback.x),
            extractNumber(value[1], fallback.y),
            extractNumber(value[2], fallback.z)
        );
    }

    if (value && typeof value === 'object') {
        const maybeVector = value as { x?: unknown; y?: unknown; z?: unknown };
        return new THREE.Vector3(
            extractNumber(maybeVector.x, fallback.x),
            extractNumber(maybeVector.y, fallback.y),
            extractNumber(maybeVector.z, fallback.z)
        );
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return new THREE.Vector3(value, value, value);
    }

    return fallback.clone();
};

export const resetClonedMeshProperties = (clone: THREE.Object3D, meshArrayNodeId: string) => {
    clone.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!(mesh as any).isMesh) return;

        if (mesh.userData) {
            delete mesh.userData.isSceneObject;
            delete mesh.userData.sceneId;
            delete mesh.userData.ownerNodeId;
            delete mesh.userData.isGhost;
            delete mesh.userData.isFaded;
            delete mesh.userData.originalMaterial;
            delete mesh.userData.baseMaterial;
            delete mesh.userData.renderedMaterial;
            delete mesh.userData.monoMaterial;
            delete mesh.userData.depthMaterial;
            delete mesh.userData.wireframeMaterial;
        }

        const resetMaterial = (mat: THREE.Material) => {
            const cloned = mat.clone();
            if ('opacity' in cloned) {
                (cloned as THREE.Material & { opacity: number }).opacity = 1;
            }
            if ('transparent' in cloned) {
                (cloned as THREE.Material & { transparent: boolean }).transparent = false;
            }
            if ('depthWrite' in cloned) {
                (cloned as THREE.Material & { depthWrite: boolean }).depthWrite = true;
            }
            return cloned;
        };

        if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map(m => resetMaterial(m));
        } else if (mesh.material) {
            mesh.material = resetMaterial(mesh.material);
        }

        mesh.visible = true;
    });

    if (clone.userData) {
        clone.userData.sceneId = meshArrayNodeId;
        delete clone.userData.isSceneObject;
        delete clone.userData.originalMaterial;
        delete clone.userData.baseMaterial;
    }
};

