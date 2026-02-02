import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

const AXIS_COLORS = {
  x: '#ff3333',
  y: '#33ff33',
  z: '#3388ff'
} as const;

type Axis = keyof typeof AXIS_COLORS;

export interface RotationRingFeedbackProps {
  axis: Axis;
  startAngle: number;
  angle: number;
  invertAngle?: boolean;
  radius?: number;
  thickness?: number;
  visible?: boolean;
  showLabels?: boolean;
}

export function RotationRingFeedback({
  axis,
  startAngle,
  angle,
  invertAngle = false,
  radius = 0.72,
  thickness = 0.045,
  visible = true,
  showLabels = true
}: RotationRingFeedbackProps) {
  const glowRef = useRef<THREE.Mesh>(null);
  const endCapRef = useRef<THREE.Mesh>(null);
  const axisColor = AXIS_COLORS[axis];

  const rotation = useMemo(() => {
    if (axis === 'y') return new THREE.Euler(Math.PI / 2, 0, 0);
    if (axis === 'x') return new THREE.Euler(0, Math.PI / 2, 0);
    return new THREE.Euler(0, 0, 0);
  }, [axis]);

  const signedAngle = invertAngle ? -angle : angle;

  const { thetaStart, thetaLength } = useMemo(() => {
    const minAngle = 0.001;
    let length = signedAngle;
    if (Math.abs(length) < minAngle) {
      length = length >= 0 ? minAngle : -minAngle;
    }
    if (length < 0) {
      return { thetaStart: startAngle + length, thetaLength: -length };
    }
    return { thetaStart: startAngle, thetaLength: length };
  }, [startAngle, signedAngle]);

  const startCapPos = useMemo<[number, number, number]>(() => {
    return [Math.cos(startAngle) * radius, Math.sin(startAngle) * radius, 0];
  }, [startAngle, radius]);

  const endCapPos = useMemo<[number, number, number]>(() => {
    const endAngle = startAngle + signedAngle;
    return [Math.cos(endAngle) * radius, Math.sin(endAngle) * radius, 0];
  }, [startAngle, signedAngle, radius]);

  useFrame(({ clock }) => {
    if (!visible) return;
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 6) * 0.04;
    if (glowRef.current) glowRef.current.scale.setScalar(pulse);
    if (endCapRef.current) {
      endCapRef.current.scale.setScalar(0.9 + Math.sin(t * 10) * 0.12);
    }
  });

  const baseInner = radius - thickness * 0.5;
  const baseOuter = radius + thickness * 0.5;
  const sweepInner = radius - thickness;
  const sweepOuter = radius + thickness;
  const glowInner = radius + thickness * 0.4;
  const glowOuter = radius + thickness * 2;
  const labelRadius = radius + thickness * 2.2;
  const labelAngles = useMemo(() => {
    const step = Math.PI / 4;
    return [
      { label: '1', angle: 0 * step },
      { label: '2', angle: 1 * step },
      { label: '3', angle: 2 * step },
      { label: '4', angle: 3 * step },
      { label: '5', angle: 4 * step },
      { label: '6', angle: 5 * step },
      { label: '7', angle: 6 * step },
      { label: '8', angle: 7 * step },
    ];
  }, []);

  return (
    <group rotation={rotation} visible={visible}>
      <mesh raycast={() => null} renderOrder={10}>
        <ringGeometry args={[baseInner, baseOuter, 64]} />
        <meshBasicMaterial
          color={axisColor}
          transparent
          opacity={0.25}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh raycast={() => null} renderOrder={11}>
        <ringGeometry args={[sweepInner, sweepOuter, 64, 1, thetaStart, thetaLength]} />
        <meshBasicMaterial
          color={axisColor}
          transparent
          opacity={0.65}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={glowRef} raycast={() => null} renderOrder={12}>
        <ringGeometry args={[glowInner, glowOuter, 64, 1, thetaStart, thetaLength]} />
        <meshBasicMaterial
          color={axisColor}
          transparent
          opacity={0.35}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={startCapPos} raycast={() => null} renderOrder={13}>
        <circleGeometry args={[thickness * 0.45, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={endCapRef} position={endCapPos} raycast={() => null} renderOrder={14}>
        <circleGeometry args={[thickness * 0.55, 16]} />
        <meshBasicMaterial
          color={axisColor}
          transparent
          opacity={0.95}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {showLabels &&
        labelAngles.map((item) => (
          <Html
            key={item.label}
            position={[Math.cos(item.angle) * labelRadius, Math.sin(item.angle) * labelRadius, 0]}
            center
            transform
            style={{
              pointerEvents: 'none',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              textShadow: '0 0 4px rgba(0,0,0,0.8)'
            }}
          >
            {item.label}
          </Html>
        ))}
    </group>
  );
}
