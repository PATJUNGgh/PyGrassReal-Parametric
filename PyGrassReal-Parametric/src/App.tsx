import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Box, Sphere, TransformControls, GizmoHelper, GizmoViewcube } from '@react-three/drei';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import './index.css';
import { NodeCanvas } from './components/NodeCanvas';
import { SelectionLogic } from './hooks/useSelection3D';
import { UIToolbar } from './components/ui/UIToolbar';

const ROTATION_SNAP_DEG = 30;
const HANDLE_UPLOAD_ENDPOINT = 'http://localhost:5174/upload-handle';
const AXIS_HANDLE_COLORS = {
  x: '#ff3333',
  y: '#33ff33',
  z: '#3388ff'
} as const;
const axisHandleTextureCache: Partial<Record<'x' | 'y' | 'z', THREE.Texture>> = {};

const getAxisHandleTexture = (axis: 'x' | 'y' | 'z') => {
  if (axisHandleTextureCache[axis]) {
    return axisHandleTextureCache[axis] as THREE.Texture;
  }

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = AXIS_HANDLE_COLORS[axis];
    ctx.fillRect(4, 4, size - 8, size - 8);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, size - 8, size - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(8, 8, size - 16, (size - 16) * 0.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  axisHandleTextureCache[axis] = texture;
  return texture;
};

// Helper component to observe Gumball dragging state
const GumballObserver = ({ controlsRef, onDraggingChange }: { controlsRef: any, onDraggingChange: (isDragging: boolean) => void }) => {
  const wasDragging = useRef(false);

  useFrame(() => {
    if (controlsRef.current) {
      const isDragging = controlsRef.current.dragging;
      // If state changed
      if (wasDragging.current !== isDragging) {
        onDraggingChange(isDragging);
      }
      wasDragging.current = isDragging;
    }
  });

  return null;
};

// Selection Box Component
// Corner Handle Component with Plane Handles
function CornerHandle({
  position,
  onPointerDown,
  onInteract = () => { },
  onHover = () => { },
  visible = true,
  handleTextures
}: {
  position: [number, number, number];
  onPointerDown: (e: any, axis: 'x' | 'y' | 'z') => void;
  onInteract?: (active: boolean) => void;
  onHover?: (hovering: boolean) => void;
  visible?: boolean;
  handleTextures?: Partial<Record<'x' | 'y' | 'z', THREE.Texture>>;
}) {
  const [activePlane, setActivePlane] = useState<'x' | 'y' | 'z' | null>(null);
  const [hoveredPlane, setHoveredPlane] = useState<'x' | 'y' | 'z' | null>(null);
  const xTexture = handleTextures?.x ?? getAxisHandleTexture('x');
  const yTexture = handleTextures?.y ?? getAxisHandleTexture('y');
  const zTexture = handleTextures?.z ?? getAxisHandleTexture('z');
  // When dragging (activePlane set), only highlight the active plane, ignore hover
  const isXActive = activePlane === 'x' || (!activePlane && hoveredPlane === 'x');
  const isYActive = activePlane === 'y' || (!activePlane && hoveredPlane === 'y');
  const isZActive = activePlane === 'z' || (!activePlane && hoveredPlane === 'z');

  const handlePointerDown = (e: any, plane: 'x' | 'y' | 'z') => {
    // Only allow left click (button 0)
    if (e.button !== 0) return;

    e.stopPropagation();
    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
    setActivePlane(plane);
    onInteract(true);
    onPointerDown(e, plane);
  };

  const handlePointerUp = () => {
    setActivePlane(null);
    onInteract(false);
  };

  // Add global pointer up listener to catch releases outside the mesh
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (activePlane) {
        setActivePlane(null);
        onInteract(false);

        // FIX: Reset hover state on drag end to prevent stuck "hidden Gumball"
        // Force reset hover state via prop
        onHover(false);
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [activePlane, onInteract]);


  const xSign = position[0] > 0 ? 1 : -1;
  const ySign = position[1] > 0 ? 1 : -1;
  const zSign = position[2] > 0 ? 1 : -1;

  const size = 0.15;
  const offset = size / 2; // Offset to center planes to form the L-bracket
  const gap = size * 0.2; // Extra distance to float the bracket OUTSIDE the box

  // Base Logic: Start with an Inward-Facing L-Bracket at (0,0,0) [Step 553 logic]
  // Then Apply Shift: Move the entire bracket outward by 'gap' in all dimensions

  return (
    <group position={position} onPointerUp={handlePointerUp} visible={visible}>
      {/* 3 Intersecting Planes for Corner Geometry - Axis Colors */}

      {/* Red Plane (YZ Plane) - Perpendicular to X axis - Rotates around X */}
      <mesh
        rotation={[0, Math.PI / 2, 0]}
        position={[
          0 + (xSign * gap),
          (ySign * offset) + (ySign * gap),
          (zSign * offset) + (zSign * gap)
        ]}
        onPointerDown={(e) => handlePointerDown(e, 'x')}
        onPointerEnter={(e) => { e.stopPropagation(); setHoveredPlane('x'); onHover(true); }}
        onPointerLeave={() => { setHoveredPlane(null); if (!activePlane) onHover(false); }}
      >
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          map={xTexture}
          color={isXActive ? "orange" : "#ffffff"}
          side={THREE.DoubleSide}
          transparent
          alphaTest={0.1}
        />
      </mesh>

      {/* Green Plane (XZ Plane) - Perpendicular to Y axis - Rotates around Y */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[
          (xSign * offset) + (xSign * gap),
          0 + (ySign * gap),
          (zSign * offset) + (zSign * gap)
        ]}
        onPointerDown={(e) => handlePointerDown(e, 'y')}
        onPointerEnter={(e) => { e.stopPropagation(); setHoveredPlane('y'); onHover(true); }}
        onPointerLeave={() => { setHoveredPlane(null); if (!activePlane) onHover(false); }}
      >
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          map={yTexture}
          color={isYActive ? "orange" : "#ffffff"}
          side={THREE.DoubleSide}
          transparent
          alphaTest={0.1}
        />
      </mesh>

      {/* Blue Plane (XY Plane) - Perpendicular to Z axis - Rotates around Z */}
      <mesh
        rotation={[0, 0, 0]}
        position={[
          (xSign * offset) + (xSign * gap),
          (ySign * offset) + (ySign * gap),
          0 + (zSign * gap)
        ]}
        onPointerDown={(e) => handlePointerDown(e, 'z')}
        onPointerEnter={(e) => { e.stopPropagation(); setHoveredPlane('z'); onHover(true); }}
        onPointerLeave={() => { setHoveredPlane(null); if (!activePlane) onHover(false); }}
      >
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          map={zTexture}
          color={isZActive ? "orange" : "#ffffff"}
          side={THREE.DoubleSide}
          transparent
          alphaTest={0.1}
        />
      </mesh>


    </group>
  );
}

// Perfect Circle Billboard Component (Always faces camera)
function PerfectCircle({
  visible,
  color,
  radius = 1.6,
  position = [0, 0, 0] as [number, number, number]
}: {
  visible: boolean;
  color: string;
  radius?: number;
  position?: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ camera }) => {
    if (meshRef.current && visible) {
      // Make the ring always face the camera (billboard effect)
      meshRef.current.lookAt(camera.position);
    }
  });

  return (
    <mesh ref={meshRef} position={position} visible={visible}>
      <ringGeometry args={[radius * 0.95, radius, 64]} />
      <meshBasicMaterial
        color={color}
        side={THREE.DoubleSide}
        depthTest={false}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

// Face Scale Handle Component
function FaceScaleHandle({
  position,
  axis,
  onPointerDown,
  onInteract = () => { },
  onHover = () => { },
  visible = true,
  isActive = false
}: {
  position: [number, number, number];
  axis: 'x' | 'y' | 'z';
  onPointerDown: (e: any, axis: 'x' | 'y' | 'z') => void;
  onInteract?: (active: boolean) => void;
  onHover?: (hovering: boolean) => void;
  visible?: boolean;
  isActive?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const size = 0.04; // Reduced size for less obstruction

  // Determine color: Active (Dragging) -> Yellow, Hovered -> Yellow, Idle -> White
  const color = isActive || hovered ? "yellow" : "white";

  return (
    <mesh
      position={position}
      visible={visible}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
        onInteract(true);
        onPointerDown(e, axis);
      }}
      onPointerUp={() => onInteract(false)}
      onPointerEnter={() => { setHovered(true); onHover(true); }}
      onPointerLeave={() => { setHovered(false); onHover(false); }}
    >
      <boxGeometry args={[size, size, size]} />
      <meshBasicMaterial
        color={color}
        depthTest={true} // Enable depth testing for occlusion
      />
    </mesh>
  );
}

// Corner Scale Handle Component (Cube at corners)
function CornerScaleHandle({
  position,
  onPointerDown,
  onInteract = () => { },
  onHover = () => { },
  visible = true,
  isActive = false
}: {
  position: [number, number, number];
  onPointerDown: (e: any) => void;
  onInteract?: (active: boolean) => void;
  onHover?: (hovering: boolean) => void;
  visible?: boolean;
  isActive?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const size = 0.04; // Very small to fit in the gap between L-bracket planes

  // Color logic
  const color = isActive || hovered ? "yellow" : "white"; // distinct from axis colors

  return (
    <mesh
      position={position}
      visible={visible}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
        onInteract(true);
        onPointerDown(e);
      }}
      onPointerUp={() => onInteract(false)}
      onPointerEnter={() => { setHovered(true); onHover(true); }}
      onPointerLeave={() => { setHovered(false); onHover(false); }}
    >
      <boxGeometry args={[size, size, size]} />
      <meshBasicMaterial
        color={color}
        depthTest={true} // Enable depth testing for occlusion
      />
    </mesh>
  );
}

// Wireframe Box Component for SelectionBox
function WireframeBox({ isDashed }: { isDashed: boolean }) {
  const lineRef = useRef<THREE.LineSegments>(null);

  // Create geometry once
  const geometry = useMemo(() => {
    const box = new THREE.BoxGeometry(1.05, 1.05, 1.05);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose(); // Cleanup box geometry immediately
    return edges;
  }, []);

  // Compute line distances only when needed (for dashed lines)
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

// Selection Box Component
function SelectionBox({
  targetRef,
  onHandleInteract = () => { },
  onHandleHover = () => { }, // New callback for hover tracking
  rotationSnapEnabled = false,
  handleTextures,
  isDashed = false,
  isVisible = true // New prop to control visibility
}: {
  targetRef: React.RefObject<any>,
  onHandleInteract?: (active: boolean) => void,
  onHandleHover?: (hovering: boolean) => void, // New prop type
  rotationSnapEnabled?: boolean,
  handleTextures?: Partial<Record<'x' | 'y' | 'z', THREE.Texture>>,
  isDashed?: boolean,
  isVisible?: boolean
}) {

  const meshRef = useRef<THREE.Group>(null);
  const handlesRef = useRef<THREE.Group>(null); // Ref for the handles group (separate form wireframe)
  const { camera, gl, raycaster } = useThree();

  // Hover tracking callback
  const safeOnHover = useCallback((hovering: boolean) => {
    if (onHandleHover) {
      onHandleHover(hovering);
    }
  }, [onHandleHover]);

  // Scaling State
  const scalingState = useRef<{
    isScaling: boolean;
    axis: 'x' | 'y' | 'z' | null;
    activeHandleId: number | null; // Track specific handle being dragged
    initialScale: THREE.Vector3;
    initialPosition: THREE.Vector3; // For unidirectional scaling
    initialQuaternion: THREE.Quaternion; // For transforming shift
    initialDistance: number;
    rotationMatrix: THREE.Matrix4; // To project mouse onto local axis

    // Add missing property to interface
    cornerStartPoint: THREE.Vector3;
    initialMouseX: number;
    initialMouseY: number;
  }>({
    isScaling: false,
    axis: null, // For uniform scaling, axis is null? or we use a special flag? Let's keep axis null for uniform.
    activeHandleId: null,
    cornerStartPoint: new THREE.Vector3(), // For corner scaling logic
    initialMouseX: 0,
    initialMouseY: 0,
    initialScale: new THREE.Vector3(1, 1, 1),
    initialPosition: new THREE.Vector3(),
    initialQuaternion: new THREE.Quaternion(),
    initialDistance: 0,
    rotationMatrix: new THREE.Matrix4(),
  });

  // Ref for rotation state
  const rotationState = useRef<{
    isDragging: boolean;
    axis: 'x' | 'y' | 'z' | null;
    startVector: THREE.Vector3;
    initialQuaternion: THREE.Quaternion;
    plane: THREE.Plane;
  }>({
    isDragging: false,
    axis: null,
    startVector: new THREE.Vector3(),
    initialQuaternion: new THREE.Quaternion(),
    plane: new THREE.Plane()
  });

  // State for Ring Feedback
  const [draggingAxis, setDraggingAxis] = useState<'x' | 'y' | 'z' | null>(null);
  const [sectorState, setSectorState] = useState({ startAngle: 0, angle: 0, isFlipped: false });
  // Explicit State for Handle Active Color (Fix for Ref not re-rendering)
  const [activeScaleHandleId, setActiveScaleHandleId] = useState<number | null>(null);

  // Safe Interactor: Prevents flickering when mouse leaves handle during rapid drag
  const safeOnInteract = (active: boolean) => {
    // If we are currently rotating or scaling, we do NOT want to set active to false
    // just because the mouse left the handle geometry.
    const isBusy = rotationState.current.isDragging || scalingState.current.isScaling;
    if (isBusy && !active) {
      return;
    }
    onHandleInteract(active);
  };

  useFrame(() => {
    if (targetRef.current && meshRef.current && handlesRef.current) {
      const target = targetRef.current;

      // Determine effective scale based on whether target is a Group (multi-select) or Mesh (single)
      let effectiveScale = target.scale.clone();

      // If dashing is enabled (multi-selection), we need to calculate the bounding box size
      // relative to the group's local space (which is unscaled 1,1,1 at initiation)
      if (isDashed) {
        if (target.children.length > 0) {
          // Calculate bounding box of all children in LOCAL space of the group
          const box = new THREE.Box3();
          const tempBox = new THREE.Box3();

          target.children.forEach((child: THREE.Object3D) => {
            // For each child, get its bounding box in parent (Group) space
            // Since children are attached to group, their position/rotation/scale are relative to group
            // We can approximate by using world transforms relative to group inverse?
            // Actually, since we used `attach`, child transformation is relative to Group.
            // We need AABB in Group Space.

            // Simplest: Get AABB of geometry transformed by child matrix
            // But child might be complex.

            // Alternative: Box3.setFromObject(child) gets World AABB.
            // Transform World AABB corners to Group Local Space.

            tempBox.setFromObject(child);

            // To local space: apply group world matrix inverse
            // This corresponds to an AABB in Local Space (which aligns with our Wireframe Box)
            // However, strictly, an AABB in local space might be rotated if we rotate the group.
            // But WireframeBox is also rotated by group rotation. So we need AABB in "Group Local Axis Aligned Space".

            // Since we just want to fit the box:
            // 1. Get Box3 in World Space
            // 2. Transform Box3 corners to Group Local Space
            // 3. Encapsulate corners

            if (!tempBox.isEmpty()) {
              const corners = [
                new THREE.Vector3(tempBox.min.x, tempBox.min.y, tempBox.min.z),
                new THREE.Vector3(tempBox.min.x, tempBox.min.y, tempBox.max.z),
                new THREE.Vector3(tempBox.min.x, tempBox.max.y, tempBox.min.z),
                new THREE.Vector3(tempBox.min.x, tempBox.max.y, tempBox.max.z),
                new THREE.Vector3(tempBox.max.x, tempBox.min.y, tempBox.min.z),
                new THREE.Vector3(tempBox.max.x, tempBox.min.y, tempBox.max.z),
                new THREE.Vector3(tempBox.max.x, tempBox.max.y, tempBox.min.z),
                new THREE.Vector3(tempBox.max.x, tempBox.max.y, tempBox.max.z),
              ];

              const inverseMatrix = target.matrixWorld.clone().invert();
              corners.forEach(c => {
                c.applyMatrix4(inverseMatrix);
                box.expandByPoint(c);
              });
            }
          });

          if (!box.isEmpty()) {
            const size = new THREE.Vector3();
            box.getSize(size);
            // Used calculated size as scale, relative to our 1x1x1 unit wireframe
            effectiveScale.copy(size);
          }
        } else {
          // Group is empty but we are in multi-select mode? 
          // This happens during deselection transition.
          // Hide the box to prevent "collapse to 1x1x1" artifact.
          effectiveScale.set(0, 0, 0);
        }
      }

      // 1. Update Wireframe (meshRef) - Follows EVERYTHING (Position, Rotation, Scale)
      meshRef.current.position.copy(target.position);
      meshRef.current.rotation.copy(target.rotation);
      meshRef.current.scale.copy(effectiveScale);
      meshRef.current.visible = isVisible; // Force visibility control

      // 2. Update Handles Group - SCALE to position handles, then counter-scale children
      handlesRef.current.position.copy(target.position);
      handlesRef.current.rotation.copy(target.rotation);
      handlesRef.current.scale.copy(effectiveScale); // Scale group to spread handles to corners

      // Hide handles if scale is effectively zero OR if manually hidden via props
      handlesRef.current.visible = isVisible && effectiveScale.lengthSq() > 0.001;

      // 3. Counter-scale each child to maintain original size
      // When parent is scaled by (10, 10, 10), child scaled by (0.1, 0.1, 0.1) stays size 1
      const inverseScale = new THREE.Vector3(
        effectiveScale.x !== 0 ? 1 / effectiveScale.x : 1,
        effectiveScale.y !== 0 ? 1 / effectiveScale.y : 1,
        effectiveScale.z !== 0 ? 1 / effectiveScale.z : 1
      );

      handlesRef.current.children.forEach((child: any) => {
        child.scale.copy(inverseScale);
      });
    }
  });

  const getIntersection = (clientX: number, clientY: number, plane: THREE.Plane) => {
    const mouse = new THREE.Vector2(
      (clientX / gl.domElement.clientWidth) * 2 - 1,
      -(clientY / gl.domElement.clientHeight) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);
    const target = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, target);
  };

  const handlePointerDown = (e: any, axis: 'x' | 'y' | 'z') => {
    // Only allow left click
    if (e.button !== 0 || !targetRef.current) return;

    e.stopPropagation(); // Stop propagation to scene

    setDraggingAxis(axis);

    const state = rotationState.current;
    state.isDragging = true;
    state.axis = axis;
    state.initialQuaternion.copy(targetRef.current.quaternion);


    // Determine Plane Normal in World Space
    const normal = new THREE.Vector3();
    const objectQuaternion = targetRef.current.quaternion;

    // Axis mapping: Red(X) -> Rotate around X -> Plane Normal is (1,0,0) (rotated)
    if (axis === 'x') normal.set(1, 0, 0);
    else if (axis === 'y') normal.set(0, 1, 0);
    else if (axis === 'z') normal.set(0, 0, 1);

    // Transform normal to world space
    normal.applyQuaternion(objectQuaternion).normalize();

    // Plane passes through object center
    const center = targetRef.current.position.clone();
    state.plane.setFromNormalAndCoplanarPoint(normal, center);

    // Find intersection using native event coordinates
    const intersection = getIntersection(e.nativeEvent.clientX, e.nativeEvent.clientY, state.plane);

    if (intersection) {
      // Vector from center to intersection (World Space)
      state.startVector.subVectors(intersection, center);

      // --- Calculate Visual Start Angle for Sector ---
      // 1. Convert startVector (World) to Object Local Space
      const localStart = state.startVector.clone().applyQuaternion(objectQuaternion.clone().invert());

      // 2. Define Ring Rotation (Must match the Render Logic below)
      const ringEuler = new THREE.Euler(
        axis === 'y' ? Math.PI / 2 : 0,
        axis === 'x' ? Math.PI / 2 : 0,
        0
      );
      const ringQuat = new THREE.Quaternion().setFromEuler(ringEuler);

      // 3. Project to Ring Space (XY Plane of the Gizmo mesh)
      const ringSpacePos = localStart.clone().applyQuaternion(ringQuat.invert());

      // 4. Calculate Angle
      const startAngle = Math.atan2(ringSpacePos.y, ringSpacePos.x);
      setSectorState({ startAngle, angle: 0 });
    }

    onHandleInteract(true);
  };

  const handleCornerScalePointerDown = (e: any, index: number) => {
    if (e.button !== 0 || !targetRef.current) return;
    e.stopPropagation();

    const state = scalingState.current;
    state.isScaling = true;
    state.axis = null; // Indicates Uniform Scale
    state.activeHandleId = index;
    setActiveScaleHandleId(index);

    state.initialScale.copy(targetRef.current.scale);
    state.initialPosition.copy(targetRef.current.position);
    state.initialQuaternion.copy(targetRef.current.quaternion);

    // For Uniform Scale: Create a plane for raycasting
    // Plane: Perpendicular to Camera View, passing through the corner handle
    const center = targetRef.current.position.clone();
    const cornerPos = new THREE.Vector3().fromArray(corners[index]);

    // Calculate world position of the corner handle using INITIAL rotation and scale
    const initialCornerWorld = cornerPos.clone()
      .multiply(state.initialScale)
      .applyQuaternion(state.initialQuaternion)
      .add(center);

    // Plane Logic: Perpendicular to Camera View, passing through corner handle
    const normal = new THREE.Vector3().subVectors(camera.position, initialCornerWorld).normalize();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, initialCornerWorld);

    // Store plane for drag
    rotationState.current.plane.copy(plane);

    const intersection = getIntersection(e.nativeEvent.clientX, e.nativeEvent.clientY, plane);

    if (intersection) {
      // Store initial intersection point for free/directional scaling
      state.cornerStartPoint.copy(intersection);
      // Store initial mouse position for screen-space calculation
      state.initialMouseX = e.nativeEvent.clientX;
      state.initialMouseY = e.nativeEvent.clientY;
      // Distance from Center to Intersection
      // actually, distance from Center is good for uniform ratio
      state.initialDistance = intersection.distanceTo(center);
    } else {
      // Fallback if intersection fails
      state.cornerStartPoint.copy(center);
      state.initialMouseX = e.nativeEvent.clientX;
      state.initialMouseY = e.nativeEvent.clientY;
      state.initialDistance = 1.0;
    }

    onHandleInteract(true);
  };

  const handleScalePointerDown = (e: any, axis: 'x' | 'y' | 'z', index: number) => {
    if (e.button !== 0 || !targetRef.current) return;
    e.stopPropagation();

    const state = scalingState.current;
    state.isScaling = true;
    state.axis = axis;
    state.activeHandleId = index;
    setActiveScaleHandleId(index); // Trigger Re-render for color update
    state.initialScale.copy(targetRef.current.scale);
    state.initialPosition.copy(targetRef.current.position);
    state.initialQuaternion.copy(targetRef.current.quaternion);

    // Calculate initial projection/distance on the local axis
    // We need to project the mouse ray onto the specific local axis line
    // Simplified Approach: Use simple distance from object center to mouse plane intersection
    // 1. Define a plane passing through object center, facing the camera (or perpendicular to axis)
    // For scaling, simple 2D screen distance often feels disconnected. 
    // Better: Project mouse onto the axis line in 3D.

    // Let's use the same Plane intersection logic to find a 3D point
    const normal = new THREE.Vector3();
    const objectQuaternion = targetRef.current.quaternion;

    // Choose a plane that contains the axis line and is roughly facing camera
    // Actually, getting the intersection on a plane perpendicular to the View Direction 
    // passing through the handle position is robust.

    // But re-using the 'rotation plane' logic is easiest:
    // Define plane passing through object center

    // For Scale X, we want a plane that includes X axis.
    if (axis === 'x') normal.set(0, 0, 1); // Default, can be refined
    else if (axis === 'y') normal.set(0, 0, 1);
    else if (axis === 'z') normal.set(0, 1, 0);

    normal.applyQuaternion(objectQuaternion).normalize();

    // Adjust normal if strictly perpendicular to camera view to avoid singularity?
    // Not strictly needed for basic interaction usually.

    const center = targetRef.current.position.clone();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, center);

    // We store this plane for dragging to be consistent
    rotationState.current.plane.copy(plane); // Reuse rotation state plane for convenience or add to scale state

    const intersection = getIntersection(e.nativeEvent.clientX, e.nativeEvent.clientY, plane);
    if (intersection) {
      // Project intersection onto the local axis vector
      const localAxis = new THREE.Vector3(
        axis === 'x' ? 1 : 0,
        axis === 'y' ? 1 : 0,
        axis === 'z' ? 1 : 0
      ).applyQuaternion(objectQuaternion).normalize();

      const centerToPoint = new THREE.Vector3().subVectors(intersection, center);

      // Initial distance is the projection length along the axis
      state.initialDistance = centerToPoint.dot(localAxis);

      // If distance is near zero (unlikely for handle click), handle gracefully
      if (Math.abs(state.initialDistance) < 0.001) state.initialDistance = 0.001;
    }

    onHandleInteract(true);
  };

  // Global listeners for smooth dragging
  useEffect(() => {
    const onGlobalMove = (e: PointerEvent) => {
      const rotState = rotationState.current;
      const sclState = scalingState.current;

      // --- ROTATION LOGIC ---
      if (rotState.isDragging && rotState.axis && targetRef.current) {

        const intersection = getIntersection(e.clientX, e.clientY, rotState.plane);

        if (intersection) {
          const center = targetRef.current.position.clone();
          const currentVector = new THREE.Vector3().subVectors(intersection, center);

          // Calculate signed angle
          let normal = rotState.plane.normal.clone();

          // View-dependent normal adjustment:
          // If eye-to-center vector is opposing the normal, flip the normal.
          const eyeVector = new THREE.Vector3().subVectors(camera.position, targetRef.current.position);
          let isFlipped = false;
          if (eyeVector.dot(normal) < 0) {
            normal.negate();
            isFlipped = true;
          }

          // Project vectors onto the plane to ensure accurate angle calculation
          const v1 = rotState.startVector.clone().projectOnPlane(normal).normalize();
          const v2 = currentVector.clone().projectOnPlane(normal).normalize();

          // Calculate signed angle
          let angle = v1.angleTo(v2);
          if (normal.dot(v1.cross(v2)) < 0) {
            angle = -angle;
          }

          if (rotationSnapEnabled) {
            const step = THREE.MathUtils.degToRad(ROTATION_SNAP_DEG);
            if (step > 0) {
              angle = Math.round(angle / step) * step;
            }
          }

          // Update Visuals and Physics
          setSectorState(prev => ({ ...prev, angle, isFlipped }));

          const q = new THREE.Quaternion().setFromAxisAngle(normal, angle);
          const newQuat = rotState.initialQuaternion.clone().premultiply(q);

          targetRef.current.quaternion.copy(newQuat);
          targetRef.current.updateMatrixWorld();

        }
      }

      // --- SCALING LOGIC ---
      if (sclState.isScaling && sclState.axis && targetRef.current) {
        const axis = sclState.axis;
        const objectQuaternion = targetRef.current.quaternion;

        // 1. Calculate Plane Normal (View Dependent or Axis Aligned)
        // We use a plane perpendicular to the View Direction for robust intersection, 
        // OR a plane aligned with the other two axes. 
        // Let's use the same 'simple' plane strategy as rotation for consistency in this context,
        // or the specific one derived in Plan.

        const normal = new THREE.Vector3();
        // Plane normal perpendicular to the scaling axis (e.g. for X scale, use Z normal plane? or Y?)
        // Ideally we want the plane to be roughly facing the camera.
        // Simple heuristic:
        if (axis === 'x') normal.set(0, 0, 1);
        else if (axis === 'y') normal.set(0, 0, 1);
        else if (axis === 'z') normal.set(0, 1, 0);

        normal.applyQuaternion(objectQuaternion).normalize();

        // 2. Find Intersection
        const center = targetRef.current.position.clone();
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, center);
        const intersection = getIntersection(e.clientX, e.clientY, plane);

        if (intersection) {
          // 3. Project to Local Axis
          const localAxis = new THREE.Vector3(
            axis === 'x' ? 1 : 0,
            axis === 'y' ? 1 : 0,
            axis === 'z' ? 1 : 0
          ).applyQuaternion(objectQuaternion).normalize();

          const centerToPoint = new THREE.Vector3().subVectors(intersection, center);
          const currentDistance = centerToPoint.dot(localAxis);

          // 4. Calculate Ratio & Apply
          if (Math.abs(sclState.initialDistance) > 0.0001) {
            const ratio = currentDistance / sclState.initialDistance;
            const newScale = sclState.initialScale.clone();

            if (axis === 'x') newScale.x *= ratio;
            if (axis === 'y') newScale.y *= ratio;
            if (axis === 'z') newScale.z *= ratio;

            targetRef.current.scale.copy(newScale);

            // --- Unidirectional Scaling Logic ---
            // Calculate how much the scale has changed *from the start*
            const deltaScale = newScale.clone().sub(sclState.initialScale);

            // Shift Calculation:
            // We want the OPPOSITE face to stay in place.
            // Center moves by: (DeltaScale * 0.5 * Sign) in local direction

            // 1. Find which handle (positive or negative) was dragged
            // We need to know if we are dragging the 'positive' or 'negative' side handle.
            // We can determine this by checking the initial interaction or simply checking 
            // relative position of intersection to center, OR simpler:
            // We iterate faceHandles below, let's just find the one matching the current axis closest to intersection?
            // Actually, we can assume the 'Sign' based on the ratio? No.
            // Let's deduce Sign from the relationship between (StartIntersection - Center) and LocalAxis.
            // If dot product > 0, it's positive side.

            // Re-calculate local direction to intersection from center
            const localDir = centerToPoint.clone().applyQuaternion(objectQuaternion.clone().invert()).normalize();

            // Simple Sign Check on the active axis
            let sign = 0;
            if (axis === 'x') sign = Math.sign(localDir.x);
            if (axis === 'y') sign = Math.sign(localDir.y);
            if (axis === 'z') sign = Math.sign(localDir.z);

            // Force sign to be +/- 1 (handle 0 case guard)
            if (sign === 0) sign = 1;

            // 2. Calculate Local Shift Vector
            const localShift = new THREE.Vector3();
            if (axis === 'x') localShift.x = deltaScale.x * 0.5 * sign;
            if (axis === 'y') localShift.y = deltaScale.y * 0.5 * sign;
            if (axis === 'z') localShift.z = deltaScale.z * 0.5 * sign;

            // 3. Rotate Shift to World Space
            const worldShift = localShift.applyQuaternion(sclState.initialQuaternion);

            // 4. Apply New Position
            targetRef.current.position.copy(sclState.initialPosition.clone().add(worldShift));


            targetRef.current.updateMatrixWorld();
          }
        }
      }

      // --- UNIFORM SCALING LOGIC (Corner) ---
      if (sclState.isScaling && sclState.axis === null && sclState.activeHandleId !== null &&
        sclState.activeHandleId >= 0 && sclState.activeHandleId <= 7 && targetRef.current) {
        // Active Handle ID 0-7 (CornerScale)
        const cornerIndex = sclState.activeHandleId;

        // Validate cornerIndex
        if (cornerIndex >= 0 && cornerIndex < 8) {
          // Use the same plane that was defined at drag start (rotationState.current.plane)
          // This ensures the initial intersection matches cornerStartPoint, preventing jumps.
          const intersection = getIntersection(e.clientX, e.clientY, rotationState.current.plane);

          if (intersection) {
            // === WORLD-SPACE PROJECTION APPROACH (UNIFORM SCALING) ===
            // 1. Calculate world-space delta (how far we've dragged in 3D)
            const worldDelta = new THREE.Vector3().subVectors(intersection, sclState.cornerStartPoint);

            // 2. Transform to object's local space using INITIAL quaternion
            const localDelta = worldDelta.clone().applyQuaternion(sclState.initialQuaternion.clone().invert());

            // 3. Get corner's initial position in local space directly from corners array
            const rawCorner = corners[cornerIndex];
            const localCornerStart = new THREE.Vector3(
              rawCorner[0] * sclState.initialScale.x,
              rawCorner[1] * sclState.initialScale.y,
              rawCorner[2] * sclState.initialScale.z
            );

            // 4. Calculate initial distance from center
            const initialDist = localCornerStart.length();

            // 5. Project drag onto corner direction (diagonal)
            const cornerDir = localCornerStart.clone().normalize();
            let projDist = localDelta.dot(cornerDir);

            // Apply sensitivity
            const sensitivity = 0.5;
            projDist *= sensitivity;

            // 6. Calculate uniform scaling ratio
            const ratio = (initialDist + projDist) / initialDist;

            // 7. Apply uniform scale (maintains aspect ratio)
            const newScale = sclState.initialScale.clone().multiplyScalar(Math.max(0.1, ratio));
            targetRef.current.scale.copy(newScale);

            // --- Anchor Opposite Corner Logic ---
            // Delta Scale
            const deltaScale = newScale.clone().sub(sclState.initialScale);

            // Corner Sign (Direction from center)
            // rawCorner is already defined above
            const sign = new THREE.Vector3(
              Math.sign(rawCorner[0]),
              Math.sign(rawCorner[1]),
              Math.sign(rawCorner[2])
            );

            // Shift = Delta * 0.5 * Sign (moves center AWAY from fixed opposite corner)
            const localShift = deltaScale.clone().multiplyScalar(0.5).multiply(sign);

            const worldShift = localShift.applyQuaternion(sclState.initialQuaternion);
            targetRef.current.position.copy(sclState.initialPosition.clone().add(worldShift));
            targetRef.current.updateMatrixWorld();
          }
        }
      }

    };

    const onGlobalUp = () => {
      if (rotationState.current.isDragging) {
        rotationState.current.isDragging = false;
        setDraggingAxis(null);
        setSectorState({ startAngle: 0, angle: 0 }); // Reset
        onHandleInteract(false);
      }
      if (scalingState.current.isScaling) {
        scalingState.current.isScaling = false;
        setActiveScaleHandleId(null); // Clear Active State
        onHandleInteract(false);
      }
    };

    window.addEventListener('pointermove', onGlobalMove);
    window.addEventListener('pointerup', onGlobalUp);

    return () => {
      window.removeEventListener('pointermove', onGlobalMove);
      window.removeEventListener('pointerup', onGlobalUp);
    };
  }, [
    camera,
    gl,
    raycaster,
    targetRef,
    onHandleInteract,
    rotationSnapEnabled
  ]);



  // 8 corner positions for rotation handles (outer)
  const corners = [
    [-0.525, -0.525, -0.525], [0.525, -0.525, -0.525],
    [-0.525, 0.525, -0.525], [0.525, 0.525, -0.525],
    [-0.525, -0.525, 0.525], [0.525, -0.525, 0.525],
    [-0.525, 0.525, 0.525], [0.525, 0.525, 0.525],
  ];

  // Face centers for scaling handles
  const faceHandles = [
    { pos: [0.525, 0, 0], axis: 'x' },   // Right (+X)
    { pos: [-0.525, 0, 0], axis: 'x' },  // Left (-X)
    { pos: [0, 0.525, 0], axis: 'y' },   // Top (+Y)
    { pos: [0, -0.525, 0], axis: 'y' },  // Bottom (-Y)
    { pos: [0, 0, 0.525], axis: 'z' },   // Front (+Z)
    { pos: [0, 0, -0.525], axis: 'z' },  // Back (-Z)
  ];

  return (

    <>
      {/* Wireframe Group - Scales with object */}
      {/* Wireframe Group - Scales with object */}
      <group ref={meshRef}>
        <WireframeBox isDashed={isDashed} />
      </group>

      {/* Rotation Ring Feedback - Separate group that does NOT scale */}
      {draggingAxis && targetRef.current && (() => {
        // Calculate uniform scale based on max dimension
        const objScale = targetRef.current.scale;
        const uniformScale = Math.max(objScale.x, objScale.y, objScale.z) * 1.2;

        return (
          <group
            position={targetRef.current.position}
            rotation={targetRef.current.rotation}
          >
            <group
              rotation={[
                draggingAxis === 'y' ? Math.PI / 2 : 0,
                draggingAxis === 'x' ? Math.PI / 2 : 0,
                0
              ]}
            >
              {/* Torus - The Frame */}
              <mesh>
                <torusGeometry args={[uniformScale, 0.02 * uniformScale, 32, 100]} />
                <meshBasicMaterial
                  color={draggingAxis === 'x' ? "#FF3333" : draggingAxis === 'y' ? "#33FF33" : "#3388FF"}
                  transparent
                  opacity={0.8}
                  depthTest={false}
                />
              </mesh>

              {/* Sector - The Swept Area */}
              <mesh>
                {/* RingGeometry(innerRadius, outerRadius, thetaSegments, phiSegments, thetaStart, thetaLength) */}
                <ringGeometry
                  args={[
                    0, uniformScale, 32, 1,
                    sectorState.startAngle,
                    // Y (green) uses negative, X/Z (red/blue) use positive.
                    // If isFlipped (viewed from behind), we must invert the visual angle direction.
                    (draggingAxis === 'y' ? -1 : 1) * (sectorState.isFlipped ? -1 : 1) * sectorState.angle
                  ]}
                />
                <meshBasicMaterial
                  color={draggingAxis === 'x' ? "#FF3333" : draggingAxis === 'y' ? "#33FF33" : "#3388FF"}
                  transparent
                  opacity={0.2}
                  side={THREE.DoubleSide}
                  depthTest={false}
                />
              </mesh>
            </group>
          </group>
        );
      })()}

      {/* Handles Group - Does NOT scale (prevents distortion) */}
      <group ref={handlesRef}>
        {/* 1. Corner Scale Handles FIRST (Uniform Scale - White Dots/Cubes) */}
        {corners.map((pos, i) => (
          <CornerScaleHandle
            key={`corner-scale-${i}`}
            name={`corner-scale-${i}`}
            userData={{ handleType: 'corner-scale', index: i }}
            position={pos as [number, number, number]}
            onPointerDown={(e) => handleCornerScalePointerDown(e, i)}
            onInteract={safeOnInteract}
            onHover={safeOnHover}
            visible={!rotationState.current.isDragging && (!scalingState.current.isScaling || activeScaleHandleId === i)}
            isActive={activeScaleHandleId === i}
          />
        ))}

        {/* 2. Face Scale Handles (Push Scale) - ONLY for Single Selection */}
        {!isDashed && faceHandles.map((handle, i) => (
          <FaceScaleHandle
            key={`face-${i}`}
            name={`face-${i}`}
            userData={{ handleType: 'face-scale', index: i }}
            position={handle.pos as [number, number, number]}
            axis={handle.axis as 'x' | 'y' | 'z'}
            onPointerDown={(e, axis) => handleScalePointerDown(e, axis, 8 + i)}
            onInteract={safeOnInteract}
            onHover={safeOnHover}
            visible={!rotationState.current.isDragging && (!scalingState.current.isScaling || activeScaleHandleId === (8 + i))}
            isActive={activeScaleHandleId === (8 + i)}
          />
        ))}

        {/* 3. Corner Rotation Handles LAST (L-Brackets) - ALWAYS Visible */}
        {corners.map((pos, i) => (
          <CornerHandle
            key={`corner-rotate-${i}`}
            name={`corner-rotate-${i}`}
            userData={{ handleType: 'corner-rotate', index: i }}
            position={pos as [number, number, number]}
            onPointerDown={handlePointerDown}
            onInteract={safeOnInteract}
            onHover={safeOnHover}
            visible={!draggingAxis && !scalingState.current.isScaling}
            handleTextures={handleTextures}
          />
        ))}
      </group>
    </>
  );
}

interface SceneObjectData {
  id: string;
  type: 'box' | 'sphere';
  ref: React.RefObject<any>;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

function App() {
  // Create refs first
  const boxRef = useRef<any>(null);
  const sphereRef = useRef<any>(null);

  // Object management
  const sceneObjects: SceneObjectData[] = [
    {
      id: 'box-1',
      type: 'box',
      ref: boxRef,
      position: [-2, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    },
    {
      id: 'sphere-1',
      type: 'sphere',
      ref: sphereRef,
      position: [2, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    }
  ];

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [processingRect, setProcessingRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [mode, setMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [isHandleDragging, setIsHandleDragging] = useState(false);
  const [isHandleHovered, setIsHandleHovered] = useState(false); // Track if hovering any handle
  const [isGumballDragging, setIsGumballDragging] = useState(false); // Gumball dragging state
  const [isDraggingNode, setIsDraggingNode] = useState(false); // Track if dragging a new node from toolbar to track Gumball drag
  const [handleTextures, setHandleTextures] = useState<Partial<Record<'x' | 'y' | 'z', THREE.Texture>>>({});
  const [handleTextureTarget, setHandleTextureTarget] = useState<'x' | 'y' | 'z' | null>(null);
  const [rotationSnapEnabled, setRotationSnapEnabled] = useState(false);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [showWidgetEditor, setShowWidgetEditor] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'3d' | 'node' | 'wire'>('3d');

  const gizmoBackdropTexture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(
        size * 0.5,
        size * 0.5,
        size * 0.1,
        size * 0.5,
        size * 0.5,
        size * 0.65
      );
      gradient.addColorStop(0, 'rgba(18, 38, 64, 0.95)');
      gradient.addColorStop(0.5, 'rgba(30, 70, 120, 0.7)');
      gradient.addColorStop(1, 'rgba(10, 20, 35, 0.35)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, []);

  const selectionGroupRef = useRef<THREE.Group>(null);
  const transformControlsRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gumballHovered = useRef<boolean>(false); // Track if mouse is over Gumball (TransformControls)
  const handlesHovered = useRef<boolean>(false); // Track if mouse is over Rotate/Scale handles
  const dragJustFinished = useRef<boolean>(false); // Track if drag just ended (cooldown)
  const isGumballActiveRef = useRef<boolean>(false); // Track if actively dragging Gumball


  // Reset hover states/refs when selection is cleared
  // This blocks interaction bugs where handlesHovered remains true after SelectionBox unmounts
  useEffect(() => {
    if (selectedIds.size === 0) {
      handlesHovered.current = false;
      gumballHovered.current = false;
      setIsHandleHovered(false);
      setIsHandleDragging(false);
    }
  }, [selectedIds]);

  useEffect(() => {
    const controls = transformControlsRef.current;
    if (!controls) return;

    const handleDraggingChanged = (event: any) => {
      console.log('dragging-changed event fired, value:', event.value);
      setIsGumballDragging(event.value);

      // When drag ends, set cooldown flag
      if (!event.value) {
        console.log('Gumball drag ended (via event listener), setting cooldown');
        dragJustFinished.current = true;
        setTimeout(() => {
          dragJustFinished.current = false;
          console.log('Cooldown cleared');
        }, 200);
      }
    };

    controls.addEventListener('dragging-changed', handleDraggingChanged);

    return () => {
      controls.removeEventListener('dragging-changed', handleDraggingChanged);
    };
  }, [selectedIds.size]);

  // Global pointer event listeners for manual drag tracking
  useEffect(() => {
    const handleGlobalPointerDown = () => {
      // If pointer down on Gumball, mark as active
      if (gumballHovered.current) {
        isGumballActiveRef.current = true;
      }
    };

    const handleGlobalPointerUp = () => {
      // If we were dragging Gumball or Handle, set cooldown
      if (isGumballActiveRef.current || isHandleDragging) {
        dragJustFinished.current = true;
        setTimeout(() => {
          dragJustFinished.current = false;
        }, 200);
      }
      // Reset Gumball active state
      isGumballActiveRef.current = false;
    };

    window.addEventListener('pointerdown', handleGlobalPointerDown, true); // Capture phase
    window.addEventListener('pointerup', handleGlobalPointerUp, true); // Capture phase

    return () => {
      window.removeEventListener('pointerdown', handleGlobalPointerDown, true);
      window.removeEventListener('pointerup', handleGlobalPointerUp, true);
    };
  }, [isHandleDragging]); // Re-create listener when isHandleDragging changes



  const loadTextureFromUrl = (url: string, onLoad: (texture: THREE.Texture) => void) => {
    const loader = new THREE.TextureLoader();
    loader.load(url, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      onLoad(texture);
    });
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: any) => {
    const file = e.target.files?.[0];
    const target = handleTextureTarget;
    if (!file || !target) {
      if (e.target) e.target.value = '';
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('axis', target);
      const response = await fetch(HANDLE_UPLOAD_ENDPOINT, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const url = `${data.url}?t=${Date.now()}`;
      loadTextureFromUrl(url, (texture) => {
        setHandleTextures((prev) => {
          prev[target]?.dispose();
          return { ...prev, [target]: texture };
        });
      });
    } catch (error) {
      console.error('Failed to upload handle image', error);
    }

    if (e.target) e.target.value = '';
  };

  // Handle selection calc
  const onSelectionCalculated = useCallback((ids: Set<string>) => {
    setSelectedIds(ids);
    setSelectionRect(null);
    setProcessingRect(null);
  }, []);

  // e.g. handle calculation
  const handleSelectionComplete = useCallback((rect: { x: number; y: number; width: number; height: number }) => {
    setSelectionRect(rect);
  }, []);


  // Manage SelectionGroup: Attach/Detach objects based on selectedIds
  useEffect(() => {
    if (!selectionGroupRef.current) return;

    const group = selectionGroupRef.current;

    // Clear group first - RE-ATTACH to scene (parent)
    // Important: We must move them back to the scene, otherwise they disappear!
    while (group.children.length > 0) {
      const child = group.children[0];
      if (group.parent) {
        group.parent.attach(child);
      } else {
        // Fallback if group is not attached? Should not happen in R3F
        group.remove(child);
      }
    }

    // Only use group for MULTIPLE selection
    if (selectedIds.size <= 1) {
      // Single or no selection - don't use group
      group.position.set(0, 0, 0);
      group.rotation.set(0, 0, 0);
      group.scale.set(1, 1, 1);
      return;
    }

    // Multiple selection - attach to group
    const selectedObjects = sceneObjects.filter(obj => selectedIds.has(obj.id));
    if (selectedObjects.length === 0) return;

    const center = new THREE.Vector3();
    selectedObjects.forEach(obj => {
      if (obj.ref.current) {
        center.add(obj.ref.current.position);
      }
    });
    center.divideScalar(selectedObjects.length);

    // Position group at center
    group.position.copy(center);
    group.rotation.set(0, 0, 0);
    group.scale.set(1, 1, 1);

    // Attach objects to group
    selectedObjects.forEach(obj => {
      if (obj.ref.current) {
        group.attach(obj.ref.current);
      }
    });

  }, [selectedIds, sceneObjects]);

  return (
    <div
      style={{ width: '100vw', height: '100vh', background: '#1a1a1a', position: 'relative' }}
      onPointerDown={(e) => {
        // Only Left Click and 3D Mode
        if (e.button !== 0 || interactionMode !== '3d') return;

        // Ignore if clicking on UI elements (Toolbar, Buttons, Labels, etc.)
        const target = e.target as HTMLElement;
        const isUIElement =
          target.tagName === 'BUTTON' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'LABEL' ||
          target.closest('button') !== null || // Clicked inside a button
          target.closest('label') !== null ||  // Clicked inside a label
          target.draggable === true ||         // Draggable elements (Box/Sphere/Custom buttons)
          target.closest('[draggable="true"]') !== null || // Inside draggable element
          target.closest('[data-no-selection="true"]') !== null; // Explicitly marked NO SELECTION elements (Nodes, Toolbar)

        if (isUIElement) return;

        // Don't start 2D selection if clicking on Gumball (TransformControls)
        // Check if the Gumball is being hovered (axis will be set to 'X', 'Y', 'Z', etc.)
        if ((transformControlsRef.current && transformControlsRef.current.axis) || isGumballDragging) {
          return;
        }

        // Don't start 2D selection if clicking on Rotate/Scale handles
        if (handlesHovered.current) {
          return;
        }

        // Start Drag Logic
        const startX = e.clientX;
        const startY = e.clientY;
        let isDrag = false;
        let currentRect: { x: number; y: number; width: number; height: number; } | null = null;

        const onMove = (mv: PointerEvent) => {
          const dist = Math.sqrt(Math.pow(mv.clientX - startX, 2) + Math.pow(mv.clientY - startY, 2));
          // Threshold 10px to distinguish click from drag
          if (!isDrag && dist > 10) {
            isDrag = true;
            // Clear existing selection on drag start (unless holding Shift)
            if (!mv.shiftKey) {
              setSelectedIds(new Set());
            }
          }

          if (isDrag) {
            currentRect = {
              x: Math.min(startX, mv.clientX),
              y: Math.min(startY, mv.clientY),
              width: Math.abs(mv.clientX - startX),
              height: Math.abs(mv.clientY - startY)
            };
            setSelectionRect(currentRect);
          }
        };

        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);

          if (isGumballDragging) {
            return;
          }

          if (isDrag && currentRect) {
            // Trigger selection calculation ONLY on mouse up
            setProcessingRect(currentRect);
          }
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      }}
    >

      {/* Visual Selection Rectangle */}
      {selectionRect && (
        <div
          style={{
            position: 'absolute',
            left: selectionRect.x,
            top: selectionRect.y,
            width: selectionRect.width,
            height: selectionRect.height,
            border: '2px dashed rgba(0, 191, 255, 0.8)',
            backgroundColor: 'rgba(0, 191, 255, 0.1)',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        />
      )}
      {/* Unified Toolbar */}
      <UIToolbar
        showNodeEditor={showNodeEditor}
        setShowNodeEditor={setShowNodeEditor}
        showWidgetEditor={showWidgetEditor}
        setShowWidgetEditor={setShowWidgetEditor}
        interactionMode={interactionMode}
        setInteractionMode={setInteractionMode}
        snapEnabled={rotationSnapEnabled}
        setSnapEnabled={setRotationSnapEnabled}
        setHandleTextureTarget={setHandleTextureTarget}
        handleImageButtonClick={handleImageButtonClick}
        setIsDraggingNode={setIsDraggingNode}
        fileInputRef={fileInputRef}
        handleImageChange={handleImageChange}
      />
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50 }}
        onPointerMissed={() => setSelectedIds(new Set())}
      >
        <SelectionLogic
          selectionRect={processingRect}
          sceneObjects={sceneObjects}
          onSelectionCalculated={onSelectionCalculated}
        />
        <GumballObserver
          controlsRef={transformControlsRef}
          onDraggingChange={(isDragging) => {
            // Update UI state
            setIsGumballDragging(isDragging);

            if (isDragging) {
              dragJustFinished.current = true;
            } else {
              // Keep blocking for a short duration after release to catch the click
              setTimeout(() => {
                dragJustFinished.current = false;
              }, 200);
            }
          }}
        />
        <color attach="background" args={['#1e1e1e']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <gridHelper args={[20, 20]} />

        <OrbitControls
          makeDefault
          mouseButtons={{
            LEFT: undefined,
            MIDDLE: 2, // Pan
            RIGHT: 0   // Rotate
          }}
          enabled={!isHandleDragging} // Disable OrbitControls when a handle is being dragged
        />

        {/* Selection Group - Hidden container for multi-select */}
        <group ref={selectionGroupRef} />

        {/* Selection Box - Show when objects are selected */}
        {selectedIds.size > 0 && (() => {
          const selectedObjects = sceneObjects.filter(obj => selectedIds.has(obj.id));
          const targetRef = selectedIds.size === 1 && selectedObjects[0]?.ref
            ? selectedObjects[0].ref
            : selectionGroupRef;

          return (
            <>
              {/* TransformControls for Move (Translate) */}
              {!isHandleDragging && !isHandleHovered && (
                <TransformControls
                  ref={transformControlsRef}
                  object={targetRef.current}
                  mode="translate"
                  space={selectedIds.size === 1 ? "local" : "world"}
                  onDraggingChanged={(e) => {
                    setIsGumballDragging(e.value);
                    // When drag ends, set cooldown flag
                    if (!e.value) {
                      dragJustFinished.current = true;
                      setTimeout(() => {
                        dragJustFinished.current = false;
                      }, 200);
                    }
                  }}
                  onPointerOver={() => {
                    gumballHovered.current = true;
                  }}
                  onPointerOut={() => {
                    gumballHovered.current = false;
                  }}
                />
              )}

              {/* SelectionBox for Rotate/Scale Handles */}
              {/* Hide SelectionBox via PROP when Gumball is dragging for smoother transition */}
              <SelectionBox
                targetRef={targetRef}
                onHandleInteract={(dragging) => {
                  setIsHandleDragging(dragging);
                  // When drag ends, set cooldown flag
                  if (!dragging) {
                    console.log('Handle drag ended, setting cooldown');
                    dragJustFinished.current = true;
                    setTimeout(() => {
                      dragJustFinished.current = false;
                      console.log('Cooldown cleared');
                    }, 200); // 200ms cooldown
                  }
                }}
                onHandleHover={(hovering) => {
                  handlesHovered.current = hovering;
                  setIsHandleHovered(hovering);
                }}
                rotationSnapEnabled={rotationSnapEnabled}
                handleTextures={handleTextures}
                isDashed={selectedIds.size > 1}
              />
            </>
          );
        })()}

        {/* Render Scene Objects */}
        {sceneObjects.map((obj) => {
          const Component = obj.type === 'box' ? Box : Sphere;
          const args = obj.type === 'box' ? [1, 1, 1] : [0.5, 32, 32];
          const isSelected = selectedIds.has(obj.id);
          const color = obj.type === 'box' ? "#4caf50" : "#2196f3";

          return (
            <Component
              key={obj.id}
              ref={obj.ref}
              position={obj.position}
              args={args}
              onClick={(e) => {
                e.stopPropagation();
                // Prevent selection if drag just finished
                if (dragJustFinished.current) {
                  return;
                }
                setSelectedIds(new Set([obj.id]));
              }}
            >
              <meshStandardMaterial color={color} />
            </Component>
          );
        })}



        {/* View Cube Gizmo */}
        <GizmoHelper
          alignment="bottom-right"
          margin={[80, 80]}
        >
          <mesh position={[0, 0, -0.4]} raycast={() => null}>
            <planeGeometry args={[2.2, 2.2]} />
            <meshBasicMaterial
              map={gizmoBackdropTexture}
              transparent
              opacity={0.9}
              depthWrite={false}
              depthTest={false}
            />
          </mesh>
          <GizmoViewcube
            font="18px Inter, sans-serif"
            opacity={0.98}
            color="#2c5fa0"          // Deeper blue base
            hoverColor="#ffffff"     // White hover
            textColor="#ffffff"      // Strong white text
            strokeColor="#0f1e33"    // Dark border for contrast
          />
        </GizmoHelper>
      </Canvas>

      {/* Info */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        color: 'white',
        opacity: 0.7
      }}>
        <p>Selected: {Array.from(selectedIds).join(', ') || 'None'}</p>
        <p>Mode: {mode}</p>
      </div>

      {/* Node Editor Canvas - Full Screen Overlay */}
      {(showNodeEditor || showWidgetEditor) && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 5,
          pointerEvents: 'none', // Let NodeCanvas handle interactivity
        }}>
          <NodeCanvas
            interactive={interactionMode === 'node' || interactionMode === 'wire'}
            isDraggingNode={isDraggingNode}
            interactionMode={interactionMode}
          />
        </div>
      )}

    </div>
  );
}

export default App;
