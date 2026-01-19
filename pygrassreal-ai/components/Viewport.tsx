
import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import { ViewportType, IObject3D, DisplayMode, Layer, TransformMode, ToolType } from '../types';
import { SceneContent } from './SceneContent';
import { Check, ChevronDown, Maximize2, Minimize2, Monitor, Layers, Grid as GridIcon } from 'lucide-react';
import * as THREE from 'three';

interface ViewportProps {
  view: ViewportType;
  objects: IObject3D[];
  layers?: Layer[];
  active: boolean;
  onActivate: () => void;
  onObjectSelect: (id: string | string[] | null, isMultiSelect?: boolean) => void;
  onBatchTransform: (updates: { id: string; data: Partial<IObject3D> }[]) => void;
  onTransformStart?: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  gumballEnabled?: boolean;
  transformMode?: TransformMode;
  onSceneClick?: (point: [number, number, number]) => void;
  onSceneMouseMove?: (point: [number, number, number]) => void;
  activeDrawPoints?: [number, number, number][];
  currentPointerPos?: [number, number, number] | null;
  activeTool?: ToolType;
  editPoint?: { objectId: string; index: number } | null;
  onPointSelect?: (objectId: string, index: number) => void;
  isGizmoDragging?: React.MutableRefObject<boolean>;
  onGizmoDragChange?: (isDragging: boolean) => void;
}

// Logic component inside Canvas to calculate selection
const SelectionManager = forwardRef(({ objects, onSelect }: { objects: IObject3D[], onSelect: (ids: string[], isMultiSelect: boolean) => void }, ref) => {
  const { camera, size } = useThree();

  useImperativeHandle(ref, () => ({
    checkSelection: (start: { x: number, y: number }, end: { x: number, y: number }, isMultiSelect: boolean) => {
      const selectedIds: string[] = [];
      
      // Determine Selection Mode based on direction
      // Left -> Right = Window (Blue) = Must be fully inside
      // Right -> Left = Crossing (Green) = Inside or Touching
      const isCrossing = end.x < start.x;

      // Calculate Selection Box Bounds (Screen Space)
      const sbMinX = Math.min(start.x, end.x);
      const sbMaxX = Math.max(start.x, end.x);
      const sbMinY = Math.min(start.y, end.y);
      const sbMaxY = Math.max(start.y, end.y);

      objects.forEach(obj => {
        if (!obj.selected && obj.layerId &&  false ) return; // Skip hidden layers if needed (logic in SceneContent handles rendering, but good to check visibility here too if we had layer map)

        // 1. Create World Matrix for the object
        const position = new THREE.Vector3(...obj.position);
        const rotation = new THREE.Euler(...obj.rotation);
        const scale = new THREE.Vector3(...obj.scale);
        const quaternion = new THREE.Quaternion().setFromEuler(rotation);
        const matrix = new THREE.Matrix4().compose(position, quaternion, scale);

        // 2. Define Local Bounds based on type (Approximation)
        let min = new THREE.Vector3(-0.5, -0.5, -0.5);
        let max = new THREE.Vector3(0.5, 0.5, 0.5);

        if (obj.type === 'sphere') {
           min.set(-0.7, -0.7, -0.7); 
           max.set(0.7, 0.7, 0.7);
        } else if (obj.type === 'cylinder') {
           min.set(-0.5, -0.5, -0.5);
           max.set(0.5, 0.5, 0.5);
        } else if (obj.type === 'point') {
            min.set(-0.1, -0.1, -0.1);
            max.set(0.1, 0.1, 0.1);
        }

        // 3. Get all 8 corners of the bounding box
        const corners = [
            new THREE.Vector3(min.x, min.y, min.z),
            new THREE.Vector3(max.x, min.y, min.z),
            new THREE.Vector3(min.x, max.y, min.z),
            new THREE.Vector3(max.x, max.y, min.z),
            new THREE.Vector3(min.x, min.y, max.z),
            new THREE.Vector3(max.x, min.y, max.z),
            new THREE.Vector3(min.x, max.y, max.z),
            new THREE.Vector3(max.x, max.y, max.z),
        ];

        // 4. Project corners to Screen Space and find object's screen bounds
        let objMinX = Infinity, objMinY = Infinity;
        let objMaxX = -Infinity, objMaxY = -Infinity;

        let visiblePoints = 0;

        corners.forEach(p => {
            p.applyMatrix4(matrix); // Transform to World
            p.project(camera);      // Project to NDC (-1 to +1)

            // Check if point is somewhat in front of camera (approx)
            if (Math.abs(p.z) < 1) {
                visiblePoints++;
                // Convert NDC to Screen Pixels (0,0 is top-left)
                const sx = (p.x * 0.5 + 0.5) * size.width;
                const sy = (-(p.y * 0.5) + 0.5) * size.height;

                objMinX = Math.min(objMinX, sx);
                objMaxX = Math.max(objMaxX, sx);
                objMinY = Math.min(objMinY, sy);
                objMaxY = Math.max(objMaxY, sy);
            }
        });

        if (visiblePoints > 0) {
            // 5. Check Intersection based on Mode
            
            // Check if Object is Fully Inside Box
            const isFullyInside = (
                objMinX >= sbMinX && 
                objMaxX <= sbMaxX && 
                objMinY >= sbMinY && 
                objMaxY <= sbMaxY
            );

            // Check for Overlap (Crossing)
            const isOverlapping = !(
                objMinX > sbMaxX || 
                objMaxX < sbMinX || 
                objMinY > sbMaxY || 
                objMaxY < sbMinY
            );

            if (isCrossing) {
                // Crossing Selection (Green): Select if touching or inside
                if (isOverlapping) {
                    selectedIds.push(obj.id);
                }
            } else {
                // Window Selection (Blue): Select only if fully inside
                if (isFullyInside) {
                    selectedIds.push(obj.id);
                }
            }
        }
      });

      onSelect(selectedIds, isMultiSelect);
    }
  }), [objects, camera, size, onSelect]); 

  return null;
});


export const Viewport: React.FC<ViewportProps> = ({ 
  view, 
  objects,
  layers = [],
  active, 
  onActivate, 
  onObjectSelect,
  onBatchTransform,
  onTransformStart,
  isMaximized = false,
  onToggleMaximize,
  gumballEnabled = false,
  transformMode = 'translate',
  onSceneClick,
  onSceneMouseMove,
  activeDrawPoints,
  currentPointerPos,
  activeTool,
  editPoint,
  onPointSelect,
  isGizmoDragging,
  onGizmoDragChange
}) => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('Shaded');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number, y: number }, current: { x: number, y: number }, isSelecting: boolean } | null>(null);
  const selectionManagerRef = useRef<any>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  
  // We store detailed interaction state here to separate "Click" from "Drag"
  const pointerInteraction = useRef<{
      startX: number,
      startY: number,
      point: [number, number, number],
      isDragging: boolean,
      shiftKey: boolean
  } | null>(null);

  const isPerspective = view === 'Perspective';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleObjectClick = (id: string, e: any) => {
    e.stopPropagation();
    onActivate();
    // Pass shift key status to parent handler
    onObjectSelect(id, e.shiftKey);
  };

  const handleMenuOption = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setIsMenuOpen(false);
  };

  const viewTitle: Record<ViewportType, string> = {
    'Top': 'Top',
    'Bottom': 'Bottom',
    'Front': 'Front',
    'Back': 'Back',
    'Left': 'Left',
    'Right': 'Right',
    'Perspective': 'Perspective'
  };

  const getCameraConfig = () => {
    switch (view) {
      case 'Top': return { position: [0, 20, 0], up: [0, 0, -1], zoom: 40 };
      case 'Front': return { position: [0, 0, 20], up: [0, 1, 0], zoom: 40 };
      case 'Right': return { position: [20, 0, 0], up: [0, 1, 0], zoom: 40 };
      default: return { position: [10, 10, 10], up: [0, 1, 0] };
    }
  };

  const camConfig = getCameraConfig();

  const MenuSeparator = () => <div className="h-[1px] bg-[#454545] my-1 mx-2" />;
  
  const MenuItem = ({ label, icon: Icon, title, checked, onClick }: { label: string, icon?: any, title?: string, checked?: boolean, onClick: () => void }) => (
    <div 
      className="flex items-center px-3 py-1.5 text-xs text-gray-200 hover:bg-[#0078d7] hover:text-white cursor-pointer gap-2"
      onClick={(e) => handleMenuOption(e, onClick)}
      title={title}
    >
      <div className="w-4 flex justify-center">
        {checked && <Check size={12} />}
        {!checked && Icon && <Icon size={12} className="text-gray-400" />}
      </div>
      <span>{label}</span>
    </div>
  );

  // --- FUNCTION 1: Box Selection Logic ---
  const updateBoxSelection = (relStartX: number, relStartY: number, x: number, y: number) => {
     if (activeTool === 'select' && !editPoint) {
         setSelectionBox({ 
             start: { x: relStartX, y: relStartY }, 
             current: { x, y }, 
             isSelecting: true 
         });
     }
  };

  // --- FUNCTION 2: Single Click Logic ---
  const processSingleClick = (point: [number, number, number], shiftKey: boolean) => {
     // 1. If Select Tool -> Deselect All (or specific logic if needed)
     if (activeTool === 'select' && !editPoint) {
         onObjectSelect(null, shiftKey);
     }

     // 2. Trigger Scene Click (Place Point, Curve Point, etc.)
     if (onSceneClick) onSceneClick(point);
  };


  // --- Interaction Handlers ---
  
  // Triggered by InteractionPlane (Background)
  const handleBgDown = (e: ThreeEvent<PointerEvent>) => {
    onActivate();
    
    // CRITICAL: If Gizmo is active, DO NOT start a background interaction.
    if (isGizmoDragging?.current) return;

    pointerInteraction.current = {
        startX: e.clientX,
        startY: e.clientY,
        point: [e.point.x, e.point.y, e.point.z],
        isDragging: false,
        shiftKey: e.shiftKey
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerInteraction.current) return;

    // SAFETY CHECK: If Gizmo started dragging mid-interaction, cancel everything.
    if (isGizmoDragging?.current) {
        setSelectionBox(null);
        pointerInteraction.current = null;
        return;
    }

    // Update Shift Key state during drag (allows adding to selection mid-drag)
    pointerInteraction.current.shiftKey = e.shiftKey;

    const { startX, startY, isDragging } = pointerInteraction.current;
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);

    // Determine if we are "Dragging" vs "Clicking"
    if (!isDragging && (dx > 5 || dy > 5)) {
        pointerInteraction.current.isDragging = true;
    }

    if (pointerInteraction.current.isDragging) {
        // MODIFIED: Only Box Select if Left Mouse Button (1) AND Ctrl Key are held.
        // This matches the requirement: "Ctrl + Left Click" to drag select.
        if (e.buttons === 1 && e.ctrlKey) {
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const relStartX = startX - rect.left;
            const relStartY = startY - rect.top;
            
            updateBoxSelection(relStartX, relStartY, x, y);
        } else {
            // If dragging but condition not met (e.g. Ctrl released), stop box selection
            setSelectionBox(null);
        }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerInteraction.current) {
        const { isDragging, point, shiftKey } = pointerInteraction.current;

        // FUNCTION 1: Drag Finish
        if (isDragging && selectionBox?.isSelecting) {
             if (selectionManagerRef.current) {
                 selectionManagerRef.current.checkSelection(selectionBox.start, selectionBox.current, shiftKey);
             }
        } 
        // FUNCTION 2: Click Finish (Background Click)
        else if (!isDragging) {
             // Only process click if Gizmo wasn't dragging during this time
             if (!isGizmoDragging?.current) {
                 processSingleClick(point, shiftKey);
             }
        }
    }

    setSelectionBox(null);
    pointerInteraction.current = null;
  };

  // Helper to determine box style
  const isCrossingSelection = selectionBox && selectionBox.current.x < selectionBox.start.x;
  const boxBgColor = isCrossingSelection ? 'rgba(46, 204, 113, 0.2)' : 'rgba(0, 120, 215, 0.2)'; // Green vs Blue
  const boxBorderColor = isCrossingSelection ? 'rgba(46, 204, 113, 0.8)' : 'rgba(0, 120, 215, 0.8)';
  const boxBorderStyle = isCrossingSelection ? 'dashed' : 'solid';

  return (
    <div 
      ref={viewportRef}
      className={`relative w-full h-full overflow-hidden bg-[#252525] ${active ? 'ring-2 ring-[#0078d7] z-10' : 'ring-0'}`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
          setSelectionBox(null);
          pointerInteraction.current = null;
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Selection Box Overlay */}
      {selectionBox && selectionBox.isSelecting && (
        <div 
            style={{
                position: 'absolute',
                left: Math.min(selectionBox.start.x, selectionBox.current.x),
                top: Math.min(selectionBox.start.y, selectionBox.current.y),
                width: Math.abs(selectionBox.current.x - selectionBox.start.x),
                height: Math.abs(selectionBox.current.y - selectionBox.start.y),
                backgroundColor: boxBgColor,
                border: `1px ${boxBorderStyle} ${boxBorderColor}`,
                pointerEvents: 'none',
                zIndex: 50
            }}
        />
      )}

      {/* Viewport Dropdown Button */}
      <div 
        ref={menuRef}
        className="absolute top-2 left-2 z-30"
      >
        <button
          onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); onActivate(); }}
          onDoubleClick={(e) => { e.stopPropagation(); onToggleMaximize?.(); }}
          className={`px-2 py-1 text-xs font-semibold rounded flex items-center gap-1 select-none transition-colors
            ${active ? 'bg-[#0078d7] text-white shadow-sm' : 'bg-[#333] text-gray-400 hover:text-white'}`}
        >
          {viewTitle[view]} 
          <ChevronDown size={10} />
        </button>

        {isMenuOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-[#1b1b1b] border border-[#454545] shadow-xl rounded-sm py-1 z-40">
            <MenuItem 
              label={isMaximized ? "Restore" : "Maximize"} 
              icon={isMaximized ? Minimize2 : Maximize2} 
              onClick={() => onToggleMaximize?.()} 
            />
            <MenuSeparator />
            <MenuItem 
              label="Wireframe" 
              checked={displayMode === 'Wireframe'} 
              onClick={() => setDisplayMode('Wireframe')} 
            />
            <MenuItem 
              label="Shaded" 
              checked={displayMode === 'Shaded'} 
              onClick={() => setDisplayMode('Shaded')} 
            />
            <MenuItem 
              label="Rendered" 
              checked={displayMode === 'Rendered'} 
              onClick={() => setDisplayMode('Rendered')} 
            />
            <MenuItem 
              label="Ghosted" 
              checked={displayMode === 'Ghosted'} 
              onClick={() => setDisplayMode('Ghosted')} 
            />
            <MenuItem 
              label="X-Ray" 
              checked={displayMode === 'X-Ray'} 
              onClick={() => setDisplayMode('X-Ray')} 
            />
            <MenuSeparator />
            <MenuItem label="Set View" icon={Monitor} onClick={() => {}} />
            <MenuItem label="Properties" icon={Layers} onClick={() => {}} />
            <MenuItem label="Close" onClick={() => {}} />
          </div>
        )}
      </div>

      <Canvas
        shadows
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
        className="w-full h-full block"
        onPointerMissed={() => {
            // We handle misses via the InteractionPlane onBgDown logic now.
        }}
      >
        {!isPerspective ? (
            // @ts-ignore
          <OrthographicCamera 
            makeDefault 
            position={camConfig.position as [number, number, number]} 
            zoom={camConfig.zoom} 
            up={camConfig.up as [number, number, number]}
            near={-100}
            far={100}
            onUpdate={c => c.lookAt(0, 0, 0)}
          />
        ) : (
          <PerspectiveCamera 
            makeDefault 
            position={camConfig.position as [number, number, number]} 
            fov={45}
            near={0.1}
            far={1000}
          />
        )}

        <SelectionManager 
            ref={selectionManagerRef} 
            objects={objects} 
            onSelect={onObjectSelect} 
        />

        <SceneContent 
          view={view} 
          objects={objects} 
          layers={layers}
          displayMode={displayMode}
          onObjectClick={handleObjectClick} 
          onBatchTransform={onBatchTransform}
          onTransformStart={onTransformStart}
          gumballEnabled={gumballEnabled}
          transformMode={transformMode}
          onBgDown={handleBgDown} // Pass the background handler
          onSceneMouseMove={onSceneMouseMove}
          activeDrawPoints={activeDrawPoints}
          currentPointerPos={currentPointerPos}
          activeTool={activeTool}
          editPoint={editPoint}
          onPointSelect={onPointSelect}
          onGizmoDragChange={onGizmoDragChange}
        />
        
        <OrbitControls 
          makeDefault
          enableRotate={true}
          enableZoom={true} 
          enablePan={true}
          maxPolarAngle={isPerspective ? Math.PI : Math.PI / 2}
          minPolarAngle={isPerspective ? 0 : Math.PI / 2}
          mouseButtons={{
            LEFT: -1 as unknown as THREE.MOUSE, // Disable Left Click for Camera (Used for Select)
            MIDDLE: THREE.MOUSE.PAN,            // Middle Click Pan
            RIGHT: THREE.MOUSE.ROTATE           // Right Click Rotate
          }}
        />
      </Canvas>
    </div>
  );
};
