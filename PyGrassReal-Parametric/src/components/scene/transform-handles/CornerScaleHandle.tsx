import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber/dist/declarations/src/core/events';
import { useTransformHandle } from '../../../hooks/useTransformHandle';

export function CornerScaleHandle({
  position,
  onPointerDown,
  onInteract = () => {},
  onHover = () => {},
  visible = true,
  isActive = false,
  isGumballDragging = false,
}: {
  name: string;
  position: [number, number, number];
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onInteract?: (active: boolean) => void;
  onHover?: (hovering: boolean) => void;
  visible?: boolean;
  isActive?: boolean;
  isGumballDragging?: boolean;
}) {
  const { hovered, interacting, handlers, ref } = useTransformHandle({
    onPointerDown,
    onInteract,
    onHover,
    isGumballDragging,
  });

  const size = 0.04;
  const color = isActive || hovered || interacting ? 'yellow' : 'white';
  const visualScale = isActive || hovered || interacting ? 1.35 : 1;

  return (
    <mesh ref={ref} position={position} visible={visible} {...handlers}>
      <boxGeometry args={[size * visualScale, size * visualScale, size * visualScale]} />
      <meshBasicMaterial color={color} depthTest={true} />
    </mesh>
  );
}
