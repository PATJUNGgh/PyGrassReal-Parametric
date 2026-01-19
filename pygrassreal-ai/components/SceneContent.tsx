// @ts-nocheck
import React, { useRef, useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { Grid, GizmoHelper, GizmoViewport, Edges, TransformControls, Line } from '@react-three/drei';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { IObject3D, ViewportType, DisplayMode, Layer, TransformMode, ToolType } from '../types';

interface SceneContentProps {
  view: ViewportType;
  objects: IObject3D[];
  layers: Layer[];
  displayMode: DisplayMode;
  onObjectClick: (id: string, e: any) => void;
  onBatchTransform: (updates: { id: string; data: Partial<IObject3D> }[]) => void;
  onTransformStart?: () => void; // New Prop for Undo
  gumballEnabled?: boolean;
  transformMode?: TransformMode;
  onBgDown?: (e: ThreeEvent<PointerEvent>) => void;
  onSceneMouseMove?: (point: [number, number, number]) => void;
  activeDrawPoints?: [number, number, number][];
  currentPointerPos?: [number, number, number] | null;
  activeTool?: ToolType;
  editPoint?: { objectId: string; index: number } | null;
  onPointSelect?: (objectId: string, index: number) => void;
  onGizmoDragChange?: (isDragging: boolean) => void;
}

interface SceneObjectProps {
  obj: IObject3D;
  layer: Layer;
  displayMode: DisplayMode;
  onObjectClick: (id: string, e: any) => void;
  onBatchTransform: (updates: { id: string; data: Partial<IObject3D> }[]) => void;
  gumballEnabled?: boolean;
  transformMode?: TransformMode;
  editPoint?: { objectId: string; index: number } | null;
  onPointSelect?: (objectId: string, index: number) => void;
  onTransformStart?: () => void;
  onGizmoDragChange?: (isDragging: boolean) => void;
}

const SceneObject: React.FC<SceneObjectProps> = ({ 
  obj, 
  layer, 
  displayMode, 
  onObjectClick, 
  onBatchTransform,
  gumballEnabled,
  transformMode = 'translate',
  editPoint,
  onPointSelect,
  onTransformStart,
  onGizmoDragChange
}) => {
  // Use state for the proxy mesh to ensure TransformControls re-renders when mesh is ready
  const [pointProxyMesh, setPointProxyMesh] = useState<THREE.Mesh | null>(null);
  const isSelected = obj.selected;

  // Check if we are editing a specific point on this object
  const isPointEditing = editPoint?.objectId === obj.id;
  const activePointIndex = isPointEditing ? editPoint!.index : -1;

  // Determine material props
  const isWireframe = displayMode === 'Wireframe';
  const isGhosted = displayMode === 'Ghosted';
  const isXRay = displayMode === 'X-Ray';
  const materialColor = isSelected ? "#f6e05e" : obj.color;

  // --- Geometry Calculation for Curves ---
  const { curveObject, curvePoints } = useMemo(() => {
    if (obj.type === 'curve' && obj.points && obj.points.length > 1) {
        const vecs = obj.points.map(p => new THREE.Vector3(...p));
        const c = new THREE.CatmullRomCurve3(vecs, false, 'catmullrom', 0.5);
        return { curveObject: c, curvePoints: c.getPoints(64) };
    }
    return { curveObject: null, curvePoints: null };
  }, [obj.type, obj.points]);

  // --- Geometry Calculation for Polyline Hit Volume ---
  const polylinePath = useMemo(() => {
      if (obj.type === 'polyline' && obj.points && obj.points.length > 1) {
          const path = new THREE.CurvePath<THREE.Vector3>();
          for (let i = 0; i < obj.points.length - 1; i++) {
             path.add(new THREE.LineCurve3(
                 new THREE.Vector3(...obj.points[i]), 
                 new THREE.Vector3(...obj.points[i+1])
             ));
          }
          return path;
      }
      return null;
  }, [obj.type, obj.points]);

  // --------------------------------------------------------------------------
  // POINT EDIT HANDLER
  // --------------------------------------------------------------------------
  const handlePointTransformChange = () => {
      if (pointProxyMesh && obj.points && activePointIndex !== -1) {
          const newLocalPos = pointProxyMesh.position;
          const newPoints = [...obj.points];
          newPoints[activePointIndex] = [newLocalPos.x, newLocalPos.y, newLocalPos.z];
          
          onBatchTransform([{ id: obj.id, data: { points: newPoints } }]);
      }
  };

  const handlePointMouseDown = () => {
      if (onTransformStart) onTransformStart();
      if (onGizmoDragChange) onGizmoDragChange(true);
  };

  const handlePointMouseUp = () => {
      if (onGizmoDragChange) onGizmoDragChange(false);
  };

  // Render different geometries based on type (Solids)
  const renderSolidGeometry = () => {
      switch (obj.type) {
          case 'box': return <boxGeometry />;
          case 'sphere': return <sphereGeometry args={[0.7, 32, 32]} />;
          case 'cylinder': return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
          case 'point': return <sphereGeometry args={[0.1, 16, 16]} />;
          default: return null;
      }
  };

  const isSolid = ['box', 'sphere', 'cylinder', 'point'].includes(obj.type);

  return (
    <group
      position={obj.position}
      rotation={obj.rotation as any}
      scale={obj.scale}
      onClick={(e) => {
          // Prevent accidental selection/deselection when finishing a drag
          if (e.delta > 2) return;
          onObjectClick(obj.id, e);
      }}
      onPointerDown={(e) => e.stopPropagation()} // Stop propagation so background drag doesn't start
    >
        {/* --- SOLIDS --- */}
        {isSolid && (
            <mesh>
                {renderSolidGeometry()}
                <meshStandardMaterial
                    color={materialColor}
                    roughness={displayMode === 'Rendered' ? 0.2 : 0.4}
                    metalness={displayMode === 'Rendered' ? 0.3 : 0.1}
                    emissive={isSelected ? "#554400" : "#000000"}
                    wireframe={isWireframe}
                    transparent={isGhosted || isXRay}
                    opacity={isGhosted ? 0.4 : (isXRay ? 0.25 : 1.0)}
                    depthTest={!isXRay}
                    side={THREE.DoubleSide}
                />
                {!isWireframe && displayMode !== 'Rendered' && (
                    <Edges threshold={15} color={isSelected ? "#b7791f" : "#000"} />
                )}
            </mesh>
        )}

        {/* --- POLYLINE --- */}
        {obj.type === 'polyline' && obj.points && (
             <>
                {/* Visual Line */}
                <Line 
                    points={obj.points as any} 
                    color={materialColor} 
                    lineWidth={isSelected ? 3 : 1.5} 
                    dashed={false}
                />
                {/* Hit Target: Thick Invisible Tube */}
                {polylinePath && (
                    <mesh>
                        <tubeGeometry args={[polylinePath, obj.points.length, 0.4, 6, false]} />
                        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
                    </mesh>
                )}
             </>
        )}

        {/* --- CURVE --- */}
        {obj.type === 'curve' && curvePoints && (
             <>
                {/* Visual Line */}
                <Line 
                    points={curvePoints} 
                    color={materialColor} 
                    lineWidth={isSelected ? 3 : 1.5} 
                    dashed={false}
                />
                {/* Hit Target: Thick Invisible Tube */}
                {curveObject && (
                    <mesh>
                        <tubeGeometry args={[curveObject, 64, 0.4, 8, false]} />
                        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
                    </mesh>
                )}
             </>
        )}

        {/* --- CONTROL POINTS (Edit Mode) --- */}
        {isSelected && (obj.type === 'polyline' || obj.type === 'curve') && obj.points && obj.points.map((p, i) => (
             <group key={i} position={p}>
                {/* Large Invisible Hit Target (R=0.5) > Line Hit Tube (R=0.4) */}
                <mesh 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onPointSelect) onPointSelect(obj.id, i);
                    }}
                >
                    <sphereGeometry args={[0.5, 8, 8]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>

                {/* Visible Control Point */}
                <mesh pointerEvents="none">
                    <sphereGeometry args={[0.12, 16, 16]} />
                    <meshBasicMaterial color={activePointIndex === i ? "#ffff00" : "#ffffff"} depthTest={false} />
                </mesh>
             </group>
        ))}

        {/* --- ACTIVE POINT PROXY --- */}
        {isPointEditing && activePointIndex !== -1 && obj.points && (
             <mesh 
                ref={setPointProxyMesh}
                position={obj.points[activePointIndex]}
                visible={false}
             >
                <sphereGeometry args={[0.1]} />
             </mesh>
        )}

        {/* --- POINT EDIT GIZMO --- */}
        {isSelected && gumballEnabled && isPointEditing && pointProxyMesh && (
            <TransformControls
                object={pointProxyMesh}
                mode="translate"
                space="world"
                size={0.8}
                onMouseDown={handlePointMouseDown}
                onMouseUp={handlePointMouseUp}
                onChange={handlePointTransformChange}
            />
        )}
    </group>
  );
};

// --- SELECTION GIZMO ---
// Handles Multi-Object Selection & Transformation "Group" Style
const SelectionGizmo: React.FC<{
    selectedObjects: IObject3D[];
    onBatchTransform: (updates: { id: string; data: Partial<IObject3D> }[]) => void;
    onTransformStart?: () => void;
    mode: TransformMode;
    enabled: boolean;
    onGizmoDragChange?: (isDragging: boolean) => void;
}> = ({ selectedObjects, onBatchTransform, onTransformStart, mode, enabled, onGizmoDragChange }) => {
    const proxyRef = useRef<THREE.Mesh>(null);
    const initialStates = useRef<Map<string, { position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3 }>>(new Map());
    const initialProxyState = useRef<{ position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3 } | null>(null);
    const isDragging = useRef(false); // Use ref for sync access in onChange
    const [active, setActive] = useState(false);

    // Calculate Centroid
    const centroid = useMemo(() => {
        if (selectedObjects.length === 0) return new THREE.Vector3(0,0,0);
        
        const centerSum = new THREE.Vector3(0,0,0);
        let count = 0;

        selectedObjects.forEach(obj => {
            // Check if object is curve-like and has points
            if ((obj.type === 'polyline' || obj.type === 'curve') && obj.points && obj.points.length > 0) {
                 const min = new THREE.Vector3(Infinity, Infinity, Infinity);
                 const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
                 
                 const pos = new THREE.Vector3(...obj.position);
                 const rot = new THREE.Euler(...obj.rotation);
                 const scale = new THREE.Vector3(...obj.scale);
                 
                 const matrix = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(rot), scale);
                 
                 obj.points.forEach(pArr => {
                     const p = new THREE.Vector3(...pArr);
                     p.applyMatrix4(matrix);
                     min.min(p);
                     max.max(p);
                 });
                 
                 // Bounding Box Center
                 if (min.x !== Infinity) {
                     const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
                     centerSum.add(center);
                     count++;
                 }
            } else {
                 // Standard Object Center (Position)
                 centerSum.add(new THREE.Vector3(...obj.position));
                 count++;
            }
        });
        
        if (count > 0) centerSum.divideScalar(count);
        return centerSum;
    }, [selectedObjects]);

    // Sync Proxy to Centroid when not dragging
    useLayoutEffect(() => {
        if (proxyRef.current && !active) {
            proxyRef.current.position.copy(centroid);
            proxyRef.current.rotation.set(0,0,0);
            proxyRef.current.scale.set(1,1,1);
        }
    }, [centroid, active]);

    const onMouseDown = () => {
        isDragging.current = true;
        if (onTransformStart) onTransformStart();
        if (onGizmoDragChange) onGizmoDragChange(true);
        setActive(true);
        
        initialStates.current.clear();
        
        // Store initial states of all selected objects
        selectedObjects.forEach(obj => {
            initialStates.current.set(obj.id, {
                position: new THREE.Vector3(...obj.position),
                rotation: new THREE.Euler(...obj.rotation),
                scale: new THREE.Vector3(...obj.scale)
            });
        });

        // Store initial proxy state
        if (proxyRef.current) {
            initialProxyState.current = {
                position: proxyRef.current.position.clone(),
                rotation: proxyRef.current.rotation.clone(),
                scale: proxyRef.current.scale.clone()
            };
        }
    };

    const onMouseUp = () => {
        isDragging.current = false;
        setActive(false);
        if (onGizmoDragChange) onGizmoDragChange(false);
        // Clear states to prevent ghost movements
        initialStates.current.clear();
        initialProxyState.current = null;
    };

    const onChange = () => {
        // Strict check: if not actively dragging, do nothing.
        if (!isDragging.current || !proxyRef.current || !initialProxyState.current || initialStates.current.size === 0) return;

        const updates: { id: string; data: Partial<IObject3D> }[] = [];
        
        // Proxy Current State
        const P_pos = proxyRef.current.position;
        const P_rot = proxyRef.current.rotation;
        const P_scale = proxyRef.current.scale;

        // Proxy Initial State
        const Pi_pos = initialProxyState.current.position;
        const Pi_scale = initialProxyState.current.scale;

        // Calculate Deltas
        const deltaPos = new THREE.Vector3().subVectors(P_pos, Pi_pos);
        
        // Rotation is complex, we use Quaternions
        const Q_current = new THREE.Quaternion().setFromEuler(P_rot);
        const Q_initial = new THREE.Quaternion().setFromEuler(initialProxyState.current.rotation);
        const Q_delta = Q_current.clone().multiply(Q_initial.invert());

        const scaleFactor = new THREE.Vector3(
            P_scale.x / Pi_scale.x,
            P_scale.y / Pi_scale.y,
            P_scale.z / Pi_scale.z
        );

        selectedObjects.forEach(obj => {
            const init = initialStates.current.get(obj.id);
            if (!init) return;

            const newData: Partial<IObject3D> = {};

            // 1. Apply Scale (relative to centroid/proxy position)
            // Current Pos relative to Centroid
            let relPos = new THREE.Vector3().subVectors(init.position, Pi_pos);
            relPos.multiply(scaleFactor); // Scale the distance from center

            // 2. Apply Rotation (relative to centroid)
            relPos.applyQuaternion(Q_delta);

            // 3. Apply Translation
            const finalPos = new THREE.Vector3().addVectors(Pi_pos, relPos).add(deltaPos);

            newData.position = [finalPos.x, finalPos.y, finalPos.z];

            // Update Object Rotation
            const objQ = new THREE.Quaternion().setFromEuler(init.rotation);
            const newObjQ = Q_delta.clone().multiply(objQ);
            const newObjEuler = new THREE.Euler().setFromQuaternion(newObjQ);
            newData.rotation = [newObjEuler.x, newObjEuler.y, newObjEuler.z];

            // Update Object Scale
            newData.scale = [
                init.scale.x * scaleFactor.x,
                init.scale.y * scaleFactor.y,
                init.scale.z * scaleFactor.z
            ];

            updates.push({ id: obj.id, data: newData });
        });

        onBatchTransform(updates);
    };

    if (selectedObjects.length === 0 || !enabled) return null;

    return (
        <>
            <mesh ref={proxyRef} visible={false}>
                <boxGeometry args={[0.5, 0.5, 0.5]} />
            </mesh>
            <TransformControls 
                object={proxyRef}
                mode={mode}
                space="world"
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onChange={onChange}
            />
        </>
    );
};

// Component for drawing the live preview line
const DrawPreview: React.FC<{ points: [number, number, number][], currentPos: [number, number, number] | null, type: ToolType }> = ({ points, currentPos, type }) => {
    const previewGeometry = useMemo(() => {
        if (!currentPos) return null;
        if (points.length === 0) return null;

        const allPoints = [...points, currentPos];

        if (type === 'polyline') {
            return allPoints;
        } else if (type === 'curve') {
            if (allPoints.length < 2) return allPoints;
            const vecs = allPoints.map(p => new THREE.Vector3(...p));
            const curve = new THREE.CatmullRomCurve3(vecs, false, 'catmullrom', 0.5);
            return curve.getPoints(50);
        }
        return null;
    }, [points, currentPos, type]);

    if (!previewGeometry) return null;

    return (
        <>
            {points.map((p, i) => (
                <mesh key={i} position={p}>
                    <sphereGeometry args={[0.1, 8, 8]} />
                    <meshBasicMaterial color="#00ff00" />
                </mesh>
            ))}
            {currentPos && (
                 <mesh position={currentPos}>
                    <sphereGeometry args={[0.08, 8, 8]} />
                    <meshBasicMaterial color="#ffff00" />
                </mesh>
            )}
            <Line 
                points={previewGeometry as any} 
                color="#ffffff" 
                lineWidth={1} 
                dashed={true}
                dashScale={2}
            />
        </>
    );
};

export const SceneContent: React.FC<SceneContentProps> = ({ 
    view, 
    objects, 
    layers, 
    displayMode, 
    onObjectClick, 
    onBatchTransform, 
    onTransformStart,
    gumballEnabled, 
    transformMode, 
    onBgDown,
    onSceneMouseMove,
    activeDrawPoints,
    currentPointerPos,
    activeTool,
    editPoint,
    onPointSelect,
    onGizmoDragChange
}) => {
  const isPerspective = view === 'Perspective';
  // Modified axisColors for Z-Up visual simulation
  const axisColors: [string, string, string] = ['#9d4b4b', '#3b5b8c', '#2f7f4f'];
  const showGrid = displayMode !== 'Rendered';

  let gridRotation: [number, number, number] = [0, 0, 0];
  let planeRotation: [number, number, number] = [-Math.PI / 2, 0, 0]; 
  let gridPosition: [number, number, number] = [0, -0.01, 0];

  if (view === 'Front') {
    gridRotation = [Math.PI / 2, 0, 0];
    planeRotation = [0, 0, 0]; 
    gridPosition = [0, 0, -0.01]; 
  } else if (view === 'Back') {
    gridRotation = [-Math.PI / 2, 0, 0];
    planeRotation = [0, Math.PI, 0];
    gridPosition = [0, 0, 0.01];
  } else if (view === 'Right') {
    gridRotation = [0, 0, -Math.PI / 2];
    planeRotation = [0, Math.PI / 2, 0];
    gridPosition = [-0.01, 0, 0];
  } else if (view === 'Left') {
    gridRotation = [0, 0, Math.PI / 2];
    planeRotation = [0, -Math.PI / 2, 0];
    gridPosition = [0.01, 0, 0];
  }

  // Filter selected objects for the Gizmo (excluding points for now)
  const selectedObjects = objects.filter(o => o.selected && (!editPoint || editPoint.objectId !== o.id));

  return (
    <>
      <ambientLight intensity={displayMode === 'Rendered' ? 1.0 : 0.7} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <directionalLight position={[-10, 20, 5]} intensity={0.5} />
      
      {/* Interaction Plane */}
      <mesh 
        rotation={planeRotation as any} 
        position={gridPosition}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (onBgDown) onBgDown(e);
        }}
        onPointerMove={(e) => {
            e.stopPropagation();
            if (onSceneMouseMove) {
                onSceneMouseMove([e.point.x, e.point.y, e.point.z]);
            }
        }}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {showGrid && (
        <Grid
          position={gridPosition}
          rotation={gridRotation as any}
          args={[20, 20]}
          cellColor={isPerspective ? "#555" : "#666"}
          sectionColor={isPerspective ? "#777" : "#999"}
          sectionThickness={1}
          cellThickness={0.5}
          fadeDistance={isPerspective ? 40 : 100}
          infiniteGrid
        />
      )}

      {/* Live Drawing Preview */}
      {activeDrawPoints && (activeTool === 'polyline' || activeTool === 'curve') && (
          <DrawPreview points={activeDrawPoints} currentPos={currentPointerPos || null} type={activeTool} />
      )}

      {objects.map((obj) => {
        const layer = layers.find(l => l.id === obj.layerId);
        if (layer && !layer.visible) return null;

        return (
          <SceneObject 
            key={obj.id}
            obj={obj}
            layer={layer!} 
            displayMode={displayMode}
            onObjectClick={onObjectClick}
            onBatchTransform={onBatchTransform}
            onTransformStart={onTransformStart}
            gumballEnabled={gumballEnabled}
            transformMode={transformMode}
            editPoint={editPoint}
            onPointSelect={onPointSelect}
            onGizmoDragChange={onGizmoDragChange}
          />
        );
      })}

      {/* GROUP SELECTION GIZMO */}
      <SelectionGizmo 
        selectedObjects={selectedObjects}
        onBatchTransform={onBatchTransform}
        onTransformStart={onTransformStart}
        mode={transformMode || 'translate'}
        enabled={gumballEnabled || false}
        onGizmoDragChange={onGizmoDragChange}
      />

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={axisColors} labelColor="white" labels={['X', 'Z', 'Y']} />
      </GizmoHelper>

      {showGrid && <axesHelper args={[1]} />}
    </>
  );
};