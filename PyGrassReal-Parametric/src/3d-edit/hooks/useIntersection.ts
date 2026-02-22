import { useThree } from '@react-three/fiber';
import { useCallback } from 'react';
import * as THREE from 'three';

export function useIntersection() {
  const { camera, raycaster, gl } = useThree();

  const getIntersection = useCallback(
    (clientX: number, clientY: number, plane: THREE.Plane) => {
      const mouse = new THREE.Vector2(
        (clientX / gl.domElement.clientWidth) * 2 - 1,
        -(clientY / gl.domElement.clientHeight) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);
      const target = new THREE.Vector3();
      return raycaster.ray.intersectPlane(plane, target);
    },
    [camera, raycaster, gl]
  );

  return { getIntersection };
}
