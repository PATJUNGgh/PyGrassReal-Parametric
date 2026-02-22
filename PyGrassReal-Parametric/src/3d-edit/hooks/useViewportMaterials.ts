import { useEffect } from 'react';
import * as THREE from 'three';
import type { SceneObject } from '../types/scene';

export const useViewportMaterials = (
    scene: THREE.Scene,
    viewportMode: 'wireframe' | 'depth' | 'monochrome' | 'rendered',
    sceneObjects: SceneObject[],
    sceneObjectMap: Map<string, SceneObject>
) => {
    useEffect(() => {
        const applyWireframe = (material: THREE.Material | THREE.Material[] | undefined, enabled: boolean) => {
            if (!material) return;
            if (Array.isArray(material)) {
                material.forEach((mat) => {
                    if ('wireframe' in mat) {
                        (mat as THREE.MeshStandardMaterial).wireframe = enabled;
                        mat.needsUpdate = true;
                    }
                });
            } else if ('wireframe' in material) {
                (material as THREE.MeshStandardMaterial).wireframe = enabled;
                material.needsUpdate = true;
            }
        };

        scene.traverse((obj) => {
            if (!(obj as THREE.Mesh).isMesh) return;
            const mesh = obj as THREE.Mesh;

            let contextObj: THREE.Object3D | null = mesh;
            while (contextObj && !contextObj.userData?.isSceneObject) {
                contextObj = contextObj.parent;
                if (contextObj === scene || !contextObj) {
                    contextObj = null;
                    break;
                }
            }

            if (!contextObj) return;

            const sceneId = contextObj.userData.sceneId;
            const objData = sceneId ? sceneObjectMap.get(sceneId) : null;
            const isGhost = objData ? objData.isGhost : contextObj.userData.isGhost;
            const isFaded = objData ? objData.isFaded : contextObj.userData.isFaded;

            if (!mesh.material) {
                mesh.material = new THREE.MeshStandardMaterial({ color: '#ffffff' });
            }

            if (!mesh.userData.originalMaterial) {
                if (mesh.userData.baseMaterial) {
                    mesh.userData.originalMaterial = mesh.userData.baseMaterial;
                } else {
                    mesh.userData.originalMaterial = mesh.material;
                }
            }

            let materialToApply: THREE.Material | THREE.Material[] | undefined;

            if (viewportMode === 'wireframe') {
                if (!mesh.userData.wireframeMaterial) {
                    mesh.userData.wireframeMaterial = new THREE.MeshBasicMaterial({ color: '#e5e7eb', wireframe: true });
                }
                materialToApply = mesh.userData.wireframeMaterial;
            } else {
                applyWireframe(mesh.userData.originalMaterial, false);
                if (viewportMode === 'depth') {
                    if (!mesh.userData.depthMaterial) {
                        mesh.userData.depthMaterial = new THREE.MeshDepthMaterial();
                    }
                    materialToApply = mesh.userData.depthMaterial;
                } else if (viewportMode === 'monochrome') {
                    if (!mesh.userData.monoMaterial) {
                        mesh.userData.monoMaterial = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.7, metalness: 0.05 });
                    }
                    materialToApply = mesh.userData.monoMaterial;
                } else { // 'rendered' mode
                    if (!mesh.userData.renderedMaterial || !(mesh.userData.renderedMaterial instanceof THREE.MeshStandardMaterial)) {
                        mesh.userData.renderedMaterial = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.5 });
                    }
                    const material = mesh.userData.renderedMaterial as THREE.MeshStandardMaterial;
                    const originalMaterial = mesh.userData.originalMaterial as THREE.MeshStandardMaterial;

                    const baseColor = originalMaterial?.color ? new THREE.Color(originalMaterial.color) : new THREE.Color('#ffffff');
                    const baseEmissive = originalMaterial?.emissive ? new THREE.Color(originalMaterial.emissive) : new THREE.Color('#000000');
                    const baseEmissiveIntensity = typeof mesh.userData.baseEmissiveIntensity === 'number' ? mesh.userData.baseEmissiveIntensity : 0;

                    const matParams = objData?.materialParams || {};

                    material.color.set(baseColor);
                    material.roughness = matParams.roughness ?? 0.5;
                    material.metalness = matParams.metalness ?? 0.5;

                    if (matParams.emissive) {
                        material.emissive.set(baseColor);
                        material.emissiveIntensity = matParams.emissive * 1.5;
                    } else {
                        material.emissive.set(baseEmissive);
                        material.emissiveIntensity = baseEmissiveIntensity;
                    }

                    if (isGhost) {
                        material.transparent = true;
                        material.opacity = 0;
                        material.depthWrite = false;
                    } else if (isFaded) {
                        material.transparent = true;
                        material.opacity = 0.35;
                        material.depthWrite = false;
                    } else {
                        const transparency = matParams.transparency ?? 0;
                        material.transparent = transparency > 0;
                        material.opacity = 1 - transparency;
                        material.depthWrite = transparency < 0.5;
                    }

                    materialToApply = material;
                }
            }
            if (materialToApply) {
                mesh.material = materialToApply;
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach((mat) => { mat.needsUpdate = true; });
                } else {
                    mesh.material.needsUpdate = true;
                }
            }
        });
    }, [scene, viewportMode, sceneObjects, sceneObjectMap]);
};
