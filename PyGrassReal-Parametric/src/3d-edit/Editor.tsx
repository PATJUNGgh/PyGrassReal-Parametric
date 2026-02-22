import { Canvas } from '@react-three/fiber';
import '@react-three/drei'; // Explicitly import for type augmentation
import { useState, useRef, useCallback, useMemo, useEffect, createRef, useContext } from 'react';
import * as THREE from 'three';
import '../index.css';
import { NodeCanvas } from './components/NodeCanvas';
import { UIToolbar } from './components/ui/UIToolbar';
import { DragOverlay } from './components/ui/DragOverlay';
import LayersSidebar from './components/ui/LayersSidebar';
import type { SceneObject } from './types/scene';
import type { NodeData, NodeCanvasHandle, PicturePlacement } from './types/NodeTypes';
import type { LayerInputData } from './utils/computeLayerData';
import { useTextureUploader } from './hooks/useTextureUploader';
import { SceneSelectionOverlay } from './components/scene/SceneSelectionOverlay';
import { useGraphEvaluator } from './hooks/useGraphEvaluator';
import { SceneInner } from './components/scene/SceneInner';
import { SceneInteractionContext, SceneInteractionProvider } from './context/SceneInteractionContext';
import { NodeGraphProvider } from './context/NodeGraphContext';

// This component acts as a bridge to synchronize specific context states
// into refs held by a parent component that shouldn't re-render frequently.
// NOTE: This is a workaround for a complex state interaction pattern.
const InteractionRefBridge = ({
  gumballHoveredRef,
  handlesHoveredRef,
  isGumballDraggingRef,
  isHandleDraggingRef,
}: {
  gumballHoveredRef: React.MutableRefObject<boolean>;
  handlesHoveredRef: React.MutableRefObject<boolean>;
  isGumballDraggingRef: React.MutableRefObject<boolean>;
  isHandleDraggingRef: React.MutableRefObject<boolean>;
}) => {
  const ctx = useContext(SceneInteractionContext);

  // This effect's job is to update the refs in the parent component
  // with the latest values from the context.
  useEffect(() => {
    if (!ctx) return;
    // Sync ref states
    gumballHoveredRef.current = ctx.gumballHoveredRef.current;
    handlesHoveredRef.current = ctx.handlesHoveredRef.current;
    // Sync state values
    isGumballDraggingRef.current = ctx.isGumballDragging;
    isHandleDraggingRef.current = ctx.isHandleDragging;
  }, [
    ctx, // The entire context object
    gumballHoveredRef,
    handlesHoveredRef,
    isGumballDraggingRef,
    isHandleDraggingRef,
  ]);

  return null;
};

const AppContent = () => {
  const controlsContainerRef = useRef<HTMLDivElement>(null);
  const nodeCanvasRef = useRef<NodeCanvasHandle>(null);
  const snapUiEnabled = false;
  const NODE_EDITOR_TYPES: NodeData['type'][] = [
    'box', 'sphere', 'cone', 'cylinder', 'vector-xyz', 'transform', 'build-3d-ai', 'vertex-mask', 'ai-sculpt', 'ai-paint', 'picture-on-mesh', 'mesh-union', 'mesh-difference', 'mesh-intersection', 'model-material',
    'text-on-mesh', 'mesh-array', 'mesh-eval', 'face-normals', 'node-prompt', 'layer-source', 'layer-bridge', 'custom', 'antivirus', 'input', 'output', 'number-slider',
    'series', 'panel', 'group'
  ];

  const WIDGET_EDITOR_TYPES: NodeData['type'][] = [
    'widget-window', 'ai-assistant', 'prompt', 'background-color', 'viewport', 'layer-source', 'layer-bridge', 'layer-view', 'antivirus', 'custom',
    'input', 'output', 'number-slider', 'panel', 'group'
  ];

  const sceneInteraction = useContext(SceneInteractionContext);

  // *** STATES MOVED TO SceneInteractionProvider ***
  // gumballHovered, handlesHovered, dragJustFinished, isGumballActiveRef
  // selectedIds, setSelectedIds, selectionSource, setSelectionSource
  // isHandleDragging, setIsHandleDragging, etc.

  // Object management
  const [sceneObjects, setSceneObjects] = useState<SceneObject[]>(() => [
    {
      id: 'box-1',
      type: 'box',
      ref: createRef(),
      position: [-2, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#cccccc',
      isFaded: false,
      ownerNodeId: 'box-1'
    },
    {
      id: 'sphere-1',
      type: 'sphere',
      ref: createRef(),
      position: [2, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#cccccc',
      isFaded: false,
      ownerNodeId: 'sphere-1'
    }
  ]);

  const { evaluateGraph } = useGraphEvaluator({ sceneObjects, setSceneObjects });

  const [backgroundStyle, setBackgroundStyle] = useState({
    cssBackground: '#1e1e1e',
    sceneColor: '#1e1e1e',
    isGradient: false,
  });
  const [viewportMode, setViewportMode] = useState<'wireframe' | 'depth' | 'monochrome' | 'rendered'>('rendered');
  const [activeLayerData, setActiveLayerData] = useState<LayerInputData[]>([]);

  const nodeObjectRefs = useRef(new Map<string, React.RefObject<THREE.Object3D>>());

  const [mode, _setMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [activeDragNode, setActiveDragNode] = useState<{ type: NodeData['type'], x: number, y: number } | null>(null);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [showWidgetEditor, setShowWidgetEditor] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'3d' | 'node' | 'wire'>('3d');
  const nodeOverlayRef = useRef<HTMLDivElement | null>(null);
  const nodeOverlayHoverRef = useRef(false);

  // NOTE: A few refs for the 2D selection logic remain here as they are specific to App's 2D canvas logic
  const gumballHoveredFor2D = useRef<boolean>(false);
  const handlesHoveredFor2D = useRef<boolean>(false);
  const isGumballDraggingRef = useRef(false);
  const isHandleDraggingRef = useRef(false);
  const isHandlingControlsUpRef = useRef(false);

  const handleNodeDelete = useCallback((nodeId: string) => {
    setSceneObjects((prev) => prev.filter((obj) => obj.id !== nodeId));
    nodeObjectRefs.current.delete(nodeId);
  }, []);

  const handleBackgroundStyleChange = useCallback((style: { cssBackground: string; sceneColor: string; isGradient: boolean }) => {
    setBackgroundStyle((prev) => {
      if (
        prev.cssBackground === style.cssBackground &&
        prev.sceneColor === style.sceneColor &&
        prev.isGradient === style.isGradient
      ) {
        return prev;
      }
      return style;
    });
  }, [nodeCanvasRef]);

  const handleNodeCreate = useCallback((node: NodeData) => {
    if (node.type !== 'box' && node.type !== 'sphere' && node.type !== 'cone' && node.type !== 'cylinder') return;

    const ref = createRef<THREE.Object3D>();
    nodeObjectRefs.current.set(node.id, ref);

    setSceneObjects((prev) => [
      ...prev,
      {
        id: node.id,
        type: node.type,
        ref,
        position: [0, 0.5, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        color: '#cccccc',
        isFaded: false
      }
    ]);
  }, []);

  const lastUndoTime = useRef(0);
  const lastRedoTime = useRef(0);

  const handleZoomToFit = useCallback(() => {
    nodeCanvasRef.current?.zoomToFit();
  }, []);

  const handleUndo = useCallback(() => {
    const now = Date.now();
    if (now - lastUndoTime.current < 200) { // Increased debounce time
      console.log('Undo call debounced');
      return;
    }
    lastUndoTime.current = now;
    console.log('handleUndo in App.tsx called');
    nodeCanvasRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    const now = Date.now();
    if (now - lastRedoTime.current < 200) { // Increased debounce time
      console.log('Redo call debounced');
      return;
    }
    lastRedoTime.current = now;
    console.log('handleRedo in App.tsx called');
    nodeCanvasRef.current?.redo();
  }, []);

  const handleInteractionStart = useCallback(() => {
    nodeCanvasRef.current?.startAction();
    nodeCanvasRef.current?.hideSearchBox();
  }, [nodeCanvasRef]);

  const handleInteractionEnd = useCallback(() => {
    // Force immediate end of action to ensure state is committed to history/state
    nodeCanvasRef.current?.endAction();
  }, [nodeCanvasRef]);

  const handleBackgroundDoubleClick = useCallback((clientX: number, clientY: number) => {
    const isEditorVisible = showNodeEditor || showWidgetEditor;
    if (interactionMode !== '3d' || !isEditorVisible) return;
    const overlayRect = nodeOverlayRef.current?.getBoundingClientRect();
    if (!overlayRect) return;
    nodeCanvasRef.current?.showSearchBox(clientX - overlayRect.left, clientY - overlayRect.top);
  }, [interactionMode, showNodeEditor, showWidgetEditor]);

  useEffect(() => {
    if (interactionMode === '3d' && !showNodeEditor && !showWidgetEditor) {
      nodeCanvasRef.current?.hideSearchBox();
    }
  }, [interactionMode, showNodeEditor, showWidgetEditor]);

  const handleSceneTransformChange = useCallback((id: string, updates: { position?: number[]; rotation?: number[]; scale?: number[] }) => {
    const pictureTransformTarget = sceneInteraction?.pictureLayerTransformTarget;
    if (pictureTransformTarget && pictureTransformTarget.renderableNodeId === id) {
      const picturePatch: Partial<PicturePlacement> = {};
      if (updates.position) {
        const [x, y, z] = updates.position;
        picturePatch.worldPos = { x, y, z };
      }
      if (updates.rotation) {
        picturePatch.rotation = updates.rotation[2];
      }
      if (updates.scale) {
        const [sx, sy, sz] = updates.scale;
        picturePatch.scale = (sx + sy + sz) / 3;
      }
      if (Object.keys(picturePatch).length > 0) {
        nodeCanvasRef.current?.updateNodeData(pictureTransformTarget.pictureNodeId, {
          pictureLayerId: pictureTransformTarget.layerId,
          pictureTransformPatch: picturePatch,
          pictureTransformToken: Date.now(),
        });
      }
      return;
    }

    const normalized: Partial<NodeData['data']> = {};
    if (updates.position) {
      const [x, y, z] = updates.position;
      normalized.location = { x, y, z };
    }
    if (updates.rotation) {
      const [x, y, z] = updates.rotation;
      normalized.rotation = { x, y, z };
    }
    if (updates.scale) {
      const [x, y, z] = updates.scale;
      normalized.scale = { x, y, z };
    }
    if (Object.keys(normalized).length === 0) {
      return;
    }

    // OPTIMISTIC UPDATE: Update sceneObjects immediately so evaluator doesn't snap back
    setSceneObjects((prev) =>
      prev.map((obj) => {
        if (obj.id !== id) return obj;
        return {
          ...obj,
          position: updates.position ?? obj.position,
          rotation: updates.rotation ?? obj.rotation,
          scale: updates.scale ?? obj.scale,
        };
      })
    );

    nodeCanvasRef.current?.updateNodeData(id, normalized);
  }, [nodeCanvasRef, sceneInteraction]);

  const {
    setHandleTextureTarget,
    fileInputRef,
    handleImageButtonClick,
    handleImageChange,
  } = useTextureUploader();

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (interactionMode === '3d' || interactionMode === 'node' || interactionMode === 'wire') {
        e.preventDefault();
      }
    };
    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    return () => window.removeEventListener('contextmenu', handleContextMenu, { capture: true } as AddEventListenerOptions);
  }, [interactionMode]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const isNodeElement = !!target?.closest(
        '.custom-node-base, .widget-window-node-base, .group-node-base, .node-port, button, input, select, textarea'
      );
      nodeOverlayHoverRef.current = isNodeElement;
      const controlsEl = controlsContainerRef.current;
      if (controlsEl) {
        const controlsEvt = new PointerEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          clientX: e.clientX,
          clientY: e.clientY,
          buttons: (e as any).buttons ?? 0,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
        });
        controlsEl.dispatchEvent(controlsEvt);
      }
      if (!isNodeElement) {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const evt = new PointerEvent('pointermove', {
            bubbles: true,
            cancelable: true,
            clientX: e.clientX,
            clientY: e.clientY,
            buttons: (e as any).buttons ?? 0,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            metaKey: e.metaKey,
          });
          canvas.dispatchEvent(evt);
        }
      }
    };
    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, [interactionMode]);

  const isHandlingUpRef = useRef(false);

  const gizmoBackdropTexture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.65);
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

  const isNodeOverlayVisible = ((showNodeEditor || showWidgetEditor) || interactionMode === 'node' || interactionMode === 'wire') && interactionMode !== '3d';

  return (
    <>
      <InteractionRefBridge
        gumballHoveredRef={gumballHoveredFor2D}
        handlesHoveredRef={handlesHoveredFor2D}
        isGumballDraggingRef={isGumballDraggingRef}
        isHandleDraggingRef={isHandleDraggingRef}
      />
      <SceneSelectionOverlay interactionMode={interactionMode} />
      <div
        ref={controlsContainerRef}
        style={{ width: '100vw', height: '100vh', background: backgroundStyle.cssBackground, position: 'relative' }}
      >
        {/* Unified Toolbar */}
        <div style={{ position: 'relative', zIndex: 200 }}>
          <UIToolbar
            showNodeEditor={showNodeEditor}
            setShowNodeEditor={setShowNodeEditor}
            showWidgetEditor={showWidgetEditor}
            setShowWidgetEditor={setShowWidgetEditor}
            interactionMode={interactionMode}
            setInteractionMode={setInteractionMode}
            setHandleTextureTarget={setHandleTextureTarget}
            handleImageButtonClick={handleImageButtonClick}
            setActiveDragNode={setActiveDragNode}
            activeDragNode={activeDragNode}
            fileInputRef={fileInputRef}
            handleImageChange={handleImageChange}
            onZoomToFit={handleZoomToFit}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        </div>
        {/* 3D Canvas */}
        <Canvas
          camera={{ position: [5, 5, 5], fov: 50 }}
          gl={{ alpha: false }}
          onPointerMissed={() => {
            // This logic will be moved inside a component that consumes the context
          }}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            opacity: interactionMode === '3d' ? 1 : 0,
            pointerEvents: interactionMode === '3d' ? 'auto' : 'none',
          }}
        >
          <SceneInner
            controlsContainerRef={controlsContainerRef}
            sceneObjects={sceneObjects}
            // onSelectionCalculated is now handled inside SceneInner via context
            gizmoBackdropTexture={gizmoBackdropTexture}
            backgroundColor={backgroundStyle.sceneColor}
            isGradientBackground={false}
            viewportMode={viewportMode}
            interactionMode={interactionMode}
            onTransformChange={handleSceneTransformChange}
            onBackgroundDoubleClick={(showNodeEditor || showWidgetEditor) ? handleBackgroundDoubleClick : undefined}
            onInteractionStart={handleInteractionStart}
            onInteractionEnd={handleInteractionEnd}
            onDeselectAll={() => {
              nodeCanvasRef.current?.clearSelection();
              nodeCanvasRef.current?.hideSearchBox();
            }}
          // All other props are removed and will be accessed from context
          />
        </Canvas>
        <div
          id="snap-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
        {/* Snap UI and Info panels would also be refactored to use the context */}

        {/* Node Editor Canvas */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 100,
          opacity: (showNodeEditor || showWidgetEditor || (interactionMode === '3d' && !showNodeEditor && !showWidgetEditor)) ? 1 : 0,
          pointerEvents: 'none',
          display: (showNodeEditor || showWidgetEditor || (interactionMode === '3d' && !showNodeEditor && !showWidgetEditor)) ? 'block' : 'none',
        }}
          id="node-overlay"
          ref={nodeOverlayRef}
          onPointerDownCapture={(e) => {
            if (interactionMode !== '3d') return;
            const target = e.target as HTMLElement | null;
            const isNodeElement = !!target?.closest(
              '.custom-node-base, [data-no-selection], .widget-window-node-base, .group-node-base, .node-port, button, input, select, textarea, .node-search-box'
            );
            nodeOverlayHoverRef.current = isNodeElement;

            if (e.button !== 0) {
              const controlsEl = controlsContainerRef.current;
              if (!controlsEl) return;
              let forwardedControls = false;
              const downEvt = new PointerEvent('pointerdown', {
                bubbles: true,
                cancelable: true,
                clientX: e.clientX,
                clientY: e.clientY,
                button: e.button,
                buttons: (e as any).buttons,
                ctrlKey: e.ctrlKey,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                metaKey: e.metaKey,
                pointerId: e.pointerId,
                pointerType: e.pointerType,
                isPrimary: e.isPrimary,
              });
              forwardedControls = controlsEl.dispatchEvent(downEvt);

              const handleUpControls = (upEvent: PointerEvent) => {
                if (upEvent.button !== e.button) return;
                if (isHandlingControlsUpRef.current) return;
                isHandlingControlsUpRef.current = true;

                const upEvt = new PointerEvent('pointerup', {
                  bubbles: true,
                  cancelable: true,
                  clientX: upEvent.clientX,
                  clientY: upEvent.clientY,
                  button: upEvent.button,
                  buttons: upEvent.buttons,
                  ctrlKey: upEvent.ctrlKey,
                  shiftKey: upEvent.shiftKey,
                  altKey: upEvent.altKey,
                  metaKey: upEvent.metaKey,
                  pointerId: upEvent.pointerId,
                  pointerType: upEvent.pointerType,
                  isPrimary: upEvent.isPrimary,
                });
                try {
                  if (forwardedControls) {
                    controlsEl.dispatchEvent(upEvt);
                  }
                } catch (err) {
                  // ignore pointer capture errors
                }
                window.removeEventListener('pointerup', handleUpControls, { capture: true });
                setTimeout(() => {
                  isHandlingControlsUpRef.current = false;
                }, 0);
              };
              window.addEventListener('pointerup', handleUpControls, { capture: true });
              e.preventDefault();
              return;
            }

            if (isNodeElement) return;
            const canvas = document.querySelector('canvas');
            if (!canvas) return;
            let forwarded = false;
            const evt = new PointerEvent('pointerdown', {
              bubbles: true,
              cancelable: true,
              clientX: e.clientX,
              clientY: e.clientY,
              button: e.button,
              buttons: (e as any).buttons,
              ctrlKey: e.ctrlKey,
              shiftKey: e.shiftKey,
              altKey: e.altKey,
              metaKey: e.metaKey,
            });
            forwarded = canvas.dispatchEvent(evt);
            const handleUp = (upEvent: PointerEvent) => {
              if (upEvent.button !== 0) return;
              if (isHandlingUpRef.current) return;
              isHandlingUpRef.current = true;

              if (!forwarded) {
                window.removeEventListener('pointerup', handleUp, { capture: true });
                setTimeout(() => {
                  isHandlingUpRef.current = false;
                }, 0);
                return;
              }

              const upEvt = new PointerEvent('pointerup', {
                bubbles: true,
                cancelable: true,
                clientX: upEvent.clientX,
                clientY: upEvent.clientY,
                button: upEvent.button,
                buttons: upEvent.buttons,
                ctrlKey: upEvent.ctrlKey,
                shiftKey: upEvent.shiftKey,
                altKey: upEvent.altKey,
                metaKey: upEvent.metaKey,
              });
              try {
                canvas.dispatchEvent(upEvt);
              } catch (err) {
                // ignore pointer capture errors
              }
              window.removeEventListener('pointerup', handleUp, { capture: true });

              setTimeout(() => {
                isHandlingUpRef.current = false;
              }, 0);
            };
            window.addEventListener('pointerup', handleUp, { capture: true });
            e.preventDefault();
          }}
        >
          <NodeCanvas
            ref={nodeCanvasRef}
            interactive={(showNodeEditor || showWidgetEditor || interactionMode === 'node' || interactionMode === 'wire')}
            isDraggingNode={!!activeDragNode}
            activeDragNode={activeDragNode}
            setActiveDragNode={setActiveDragNode}
            interactionMode={interactionMode}
            allow3dNodeDrop={interactionMode === '3d' || showWidgetEditor}
            sceneObjects={sceneObjects}
            onNodeDelete={handleNodeDelete}
            onNodeCreate={handleNodeCreate}
            onBackgroundStyleChange={handleBackgroundStyleChange}
            newNodeCategory={showNodeEditor && !showWidgetEditor ? 'nodes' : showWidgetEditor && !showNodeEditor ? 'widget' : undefined}
            visibleNodeTypes={
              showNodeEditor && !showWidgetEditor
                ? NODE_EDITOR_TYPES
                : showWidgetEditor && !showNodeEditor
                  ? WIDGET_EDITOR_TYPES
                  : undefined
            }
            visibleNodeCategory={
              showNodeEditor && !showWidgetEditor
                ? 'nodes'
                : showWidgetEditor && !showNodeEditor
                  ? 'widget'
                  : undefined
            }
            onSceneNodeSelect={() => {
              // This will also be updated to use context
            }}
            onViewportModeChange={setViewportMode}
            onLayerDataChange={setActiveLayerData}
            onGraphChange={evaluateGraph}
            uiEnabled={(showNodeEditor || showWidgetEditor)}
          />
        </div>
        {interactionMode === '3d' && activeLayerData.length > 0 && (
          <LayersSidebar layers={activeLayerData} />
        )}
      </div>
      {activeDragNode && <DragOverlay activeDragNode={activeDragNode} />}
    </>
  );
}

function Editor() {

  const initialNodes: NodeData[] = [
    {
      id: 'box-1',
      type: 'box',
      position: { x: 300, y: 200 },
      data: {
        label: 'Legacy Box', // Old data didn't have version
        location: { x: -2, y: 0.5, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        rotation: { x: 0, y: 0, z: 0 },
        color: '#cccccc',
        inputs: [{ id: 'input-transform', label: 'Transform', type: 'Matrix' }] // Old box had only transform input
      }
    },
    {
      id: 'sphere-1',
      type: 'sphere',
      position: { x: 600, y: 200 },
      data: {
        label: 'Initial Sphere',
        location: { x: 2, y: 0.5, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        rotation: { x: 0, y: 0, z: 0 },
        color: '#cccccc'
      }
    }
  ];

  return (
    <SceneInteractionProvider>
      <NodeGraphProvider initialNodes={initialNodes}>
        <AppContent />
      </NodeGraphProvider>
    </SceneInteractionProvider>
  );
}

export default Editor;
