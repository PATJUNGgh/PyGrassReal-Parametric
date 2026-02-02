import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import styles from './SelectionSnapToggle.module.css';

interface SelectionSnapToggleProps {
  targetRef: React.RefObject<THREE.Object3D | null>;
  enabled: boolean;
  setEnabled: (snap: boolean) => void;
  visible: boolean;
}

const SNAP_OFFSET = 0.25;
const NODE_SELECTOR = '.custom-node-base, .widget-window-node-base, .group-node-base';

const rectsOverlap = (a: DOMRect, b: DOMRect) =>
  !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);

function withTemporarilyDisabledPointerEvents<T>(
  startEl: HTMLElement,
  sentinelEl: HTMLElement | null,
  callback: () => T,
): T {
  const toggled: Array<{ el: HTMLElement; prev: string }> = [];
  let current: HTMLElement | null = startEl;
  while (current && current !== sentinelEl) {
    toggled.push({ el: current, prev: current.style.pointerEvents });
    current.style.pointerEvents = 'none';
    current = current.parentElement;
  }

  try {
    return callback();
  } finally {
    toggled.forEach(({ el, prev }) => {
      el.style.pointerEvents = prev;
    });
  }
}

export function SelectionSnapToggle({
  targetRef,
  enabled,
  setEnabled,
  visible,
}: SelectionSnapToggleProps) {
  const anchorRef = useRef<THREE.Group>(null);
  const snapRef = useRef<HTMLDivElement>(null);
  const tempBoxRef = useRef(new THREE.Box3());
  const tempVectorRef = useRef(new THREE.Vector3());
  const [blockedByNode, setBlockedByNode] = useState(false);
  const { camera, gl } = useThree();
  const nodeOverlay =
    typeof document !== 'undefined' ? (document.getElementById('node-overlay') as HTMLElement | null) : null;
  const nodeOverlayVisible =
    !!nodeOverlay &&
    typeof window !== 'undefined' &&
    window.getComputedStyle(nodeOverlay).display !== 'none';
  const portalTarget = nodeOverlayVisible ? nodeOverlay ?? undefined : gl.domElement.parentElement ?? undefined;
  const snapHidden = nodeOverlayVisible && blockedByNode;
  const snapZIndex = snapHidden ? 0 : nodeOverlayVisible ? 200 : 150;

  useFrame(() => {
    if (!visible || !targetRef.current || !anchorRef.current) return;

    const box = tempBoxRef.current;
    box.setFromObject(targetRef.current);

    if (box.isEmpty()) return;

    const center = box.getCenter(tempVectorRef.current);
    const topY = box.max.y + SNAP_OFFSET;
    anchorRef.current.position.set(center.x, topY, center.z);
    anchorRef.current.lookAt(camera.position);

    if (nodeOverlayVisible && nodeOverlay && snapRef.current) {
      const snapEl = snapRef.current;
      const rect = snapEl.getBoundingClientRect();
      const probeX = rect.left + rect.width / 2;
      const probeY = rect.top + rect.height / 2;
      
      let isNodeInFront = withTemporarilyDisabledPointerEvents(snapEl, nodeOverlay, () => {
        const elAtPoint = document.elementFromPoint(probeX, probeY) as HTMLElement | null;
        return !!elAtPoint?.closest(NODE_SELECTOR);
      });

      if (!isNodeInFront) {
        const nodeEls = nodeOverlay.querySelectorAll<HTMLElement>(NODE_SELECTOR);
        for (const nodeEl of nodeEls) {
          if (rectsOverlap(rect, nodeEl.getBoundingClientRect())) {
            isNodeInFront = true;
            break;
          }
        }
      }

      if (isNodeInFront !== blockedByNode) setBlockedByNode(isNodeInFront);
    } else if (blockedByNode) {
      setBlockedByNode(false);
    }
  });

  if (!visible) return null;

  return (
    <group ref={anchorRef}>
      <Html
        center
        portal={portalTarget}
        zIndexRange={[snapZIndex, snapZIndex]}
        style={{
          pointerEvents: snapHidden ? 'none' : 'auto',
          position: 'relative',
          zIndex: snapZIndex,
          opacity: snapHidden ? 0 : 1,
        }}
      >
        <div
          ref={snapRef}
          className={styles.container}
          data-no-selection="true"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className={styles.checkbox}
          />
          <span>Snap</span>
        </div>
      </Html>
    </group>
  );
}

