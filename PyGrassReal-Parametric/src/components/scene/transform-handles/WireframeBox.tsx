import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

export function WireframeBox({ isDashed }: { isDashed: boolean }) {
  const lineRef = useRef<THREE.LineSegments>(null);

  const geometry = useMemo(() => {
    const box = new THREE.BoxGeometry(1.05, 1.05, 1.05);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, []);

  useEffect(() => {
    if (lineRef.current && isDashed) {
      lineRef.current.computeLineDistances();
    }
  }, [isDashed]);

  return (
    <lineSegments ref={lineRef} geometry={geometry} raycast={() => null}>
      {isDashed ? (
        <lineBasicMaterial color={0xffff00} />
      ) : (
        <lineBasicMaterial color={0x00bfff} />
      )}
    </lineSegments>
  );
}
