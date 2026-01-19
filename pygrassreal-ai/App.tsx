
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, LogOut, MoreVertical, Plus, Share2, Box, Save, FolderOpen } from 'lucide-react';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { CommandBar } from './components/CommandBar';
import { StatusBar } from './components/StatusBar';
import { Viewport } from './components/Viewport';
import { AuthModal } from './components/AuthModal';
import { ShareModal } from './components/ShareModal';
import { ProjectsManager } from './components/ProjectsManager';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { IObject3D, ToolType, ViewportType, Layer, TransformMode, UnitType } from './types';

const App: React.FC = () => {
  // --- State ---
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [transformMode, setTransformMode] = useState<TransformMode>('translate'); // Default transform mode
  const [gumballEnabled, setGumballEnabled] = useState(true); 
  const [activeViewport, setActiveViewport] = useState<ViewportType>('Perspective');
  const [maximizedViewport, setMaximizedViewport] = useState<ViewportType | null>(null); 
  const [currentUnit, setCurrentUnit] = useState<UnitType>('mm');
  
  // Project State
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string>('Untitled');
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [projectManagerMode, setProjectManagerMode] = useState<'save' | 'load'>('save');
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  // Drawing State
  const [drawPoints, setDrawPoints] = useState<[number, number, number][]>([]);
  const [currentPointerPos, setCurrentPointerPos] = useState<[number, number, number] | null>(null);

  // Edit Point State (for moving Curve/Polyline control points)
  const [editPoint, setEditPoint] = useState<{ objectId: string; index: number } | null>(null);

  // Layers State
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'default', name: 'Default', color: '#000000', visible: true, locked: false, isCurrent: true },
    { id: 'layer01', name: 'Layer 01', color: '#ff0000', visible: true, locked: false, isCurrent: false },
  ]);

  const [objects, setObjects] = useState<IObject3D[]>([
    { id: 'Box 01', type: 'box', position: [-2, 0.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1], color: '#cccccc', selected: false, layerId: 'default' },
    { id: 'Cylinder 01', type: 'cylinder', position: [2, 0.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1], color: '#cccccc', selected: false, layerId: 'layer01' },
    { id: 'Box 02', type: 'box', position: [0, 0.5, -3], rotation: [0, 45, 0], scale: [1.5, 1, 1], color: '#cccccc', selected: false, layerId: 'default' },
  ]);
  
  // History & Clipboard
  const undoStack = useRef<IObject3D[][]>([]);
  const redoStack = useRef<IObject3D[][]>([]);
  const clipboard = useRef<IObject3D[]>([]);

  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  
  // --- Layout State ---
  const [gridSplit, setGridSplit] = useState({ x: 50, y: 50 });
  const [dragState, setDragState] = useState<{ type: 'x' | 'y' | 'center' } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // --- Auth & Modal State ---
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // --- Gizmo State Tracking for Selection Prevention ---
  const isGizmoDragging = useRef(false);
  const handleGizmoDragChange = useCallback((isDragging: boolean) => {
      isGizmoDragging.current = isDragging;
  }, []);

  // --- History Functions ---
  const saveHistory = useCallback(() => {
    // Deep clone current objects to history
    const snapshot = JSON.parse(JSON.stringify(objects));
    undoStack.current.push(snapshot);
    // Limit stack size
    if (undoStack.current.length > 50) undoStack.current.shift();
    // Clear redo stack on new action
    redoStack.current = [];
  }, [objects]);

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) {
        setCommandHistory(prev => [...prev, 'Nothing to Undo']);
        return;
    }
    
    const previousState = undoStack.current.pop();
    if (previousState) {
        // Save current state to redo stack
        const currentSnapshot = JSON.parse(JSON.stringify(objects));
        redoStack.current.push(currentSnapshot);
        
        setObjects(previousState);
        setCommandHistory(prev => [...prev, 'Undo']);
    }
  }, [objects]);

  const handleRedo = useCallback(() => {
      if (redoStack.current.length === 0) {
          setCommandHistory(prev => [...prev, 'Nothing to Redo']);
          return;
      }
      
      const nextState = redoStack.current.pop();
      if (nextState) {
          // Save current state to undo stack
          const currentSnapshot = JSON.parse(JSON.stringify(objects));
          undoStack.current.push(currentSnapshot);

          setObjects(nextState);
          setCommandHistory(prev => [...prev, 'Redo']);
      }
  }, [objects]);

  // --- Clipboard Functions ---
  const handleCopy = useCallback(() => {
      const selected = objects.filter(o => o.selected);
      if (selected.length === 0) {
          setCommandHistory(prev => [...prev, 'Copy: No objects selected']);
          return;
      }
      // Deep copy to clipboard
      clipboard.current = JSON.parse(JSON.stringify(selected));
      setCommandHistory(prev => [...prev, `Copied ${selected.length} object(s) to clipboard`]);
  }, [objects]);

  const handlePaste = useCallback(() => {
      if (clipboard.current.length === 0) {
          setCommandHistory(prev => [...prev, 'Paste: Clipboard empty']);
          return;
      }

      saveHistory();

      const newObjects = clipboard.current.map(obj => {
          // Generate new ID
          // Basic random ID generation
          const idSuffix = Math.floor(Math.random() * 10000);
          const newId = `${obj.type}_copy_${idSuffix}`;
          
          // Offset Position slightly
          const offset = 1.0;
          const newPos: [number, number, number] = [
              obj.position[0] + offset,
              obj.position[1] + offset,
              obj.position[2] + offset
          ];

          return {
              ...obj,
              id: newId,
              position: newPos,
              selected: true // Select pasted objects
          };
      });

      // Deselect current objects and add pasted ones
      setObjects(prev => {
          const deselectedCurrent = prev.map(o => ({ ...o, selected: false }));
          return [...deselectedCurrent, ...newObjects];
      });

      setCommandHistory(prev => [...prev, `Pasted ${newObjects.length} object(s)`]);
  }, [saveHistory]);


  // --- Actions (Moved up for usage in Effects) ---
  
  const handleDelete = useCallback(() => {
    const selectedCount = objects.filter(o => o.selected).length;
    if (selectedCount === 0) {
      setCommandHistory(prev => [...prev, 'Command: _Delete (0 objects selected)']);
      return; 
    }

    saveHistory();

    setObjects(prev => prev.filter(o => !o.selected));
    // Clear edit point if deleted
    setEditPoint(null);
    setCommandHistory(prev => [...prev, `Command: _Delete (${selectedCount} objects deleted)`]);
  }, [objects, saveHistory]);

  const finishDrawing = useCallback(() => {
    if (drawPoints.length < 2) {
      if (drawPoints.length > 0) {
        setCommandHistory(prev => [...prev, 'Command: Invalid curve (need at least 2 points)']);
      }
      setDrawPoints([]);
      setCurrentPointerPos(null);
      return;
    }

    saveHistory();

    const currentLayer = layers.find(l => l.isCurrent) || layers[0];
    const type = activeTool === 'curve' ? 'curve' : 'polyline'; // polyline fallback
    const newId = `${type.charAt(0).toUpperCase() + type.slice(1)} ${objects.length + 1}`;

    const newObj: IObject3D = {
      id: newId,
      // @ts-ignore
      type: type,
      position: [0, 0, 0], // World origin, points stored in world coords locally
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: currentLayer.color,
      selected: true,
      layerId: currentLayer.id,
      points: [...drawPoints]
    };

    setObjects(prev => prev.map(o => ({...o, selected: false})).concat(newObj));
    setCommandHistory(prev => [...prev, `Created ${type} with ${drawPoints.length} points`]);
    
    // Reset Drawing State
    setDrawPoints([]);
    setCurrentPointerPos(null);
    // activeTool remains active for next drawing (Rhino behavior usually repeats command)
    setCommandHistory(prev => [...prev, `Command: _${activeTool} (Start next or Esc)`]);

  }, [activeTool, drawPoints, layers, objects.length, saveHistory]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Undo / Redo / Copy / Paste
      if (e.ctrlKey || e.metaKey) {
          switch(e.key.toLowerCase()) {
              case 'z':
                  e.preventDefault();
                  if (e.shiftKey) handleRedo();
                  else handleUndo();
                  return;
              case 'y': // Standard Redo on Windows sometimes
                  e.preventDefault();
                  handleRedo();
                  return;
              case 'c':
                  e.preventDefault();
                  handleCopy();
                  return;
              case 'v':
                  e.preventDefault();
                  handlePaste();
                  return;
              case 's': // Save Shortcut
                  e.preventDefault();
                  handleTriggerSave();
                  return;
              case 'o': // Open Shortcut
                  e.preventDefault();
                  handleTriggerLoad();
                  return;
          }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDelete();
      }
      
      if (e.key === 'Escape') {
        if (drawPoints.length > 0) {
            // Cancel drawing
            setDrawPoints([]);
            setCurrentPointerPos(null);
            setCommandHistory(prev => [...prev, 'Command: _Cancel']);
        } else if (editPoint) {
             // Deselect point but keep object selected
             setEditPoint(null);
        } else {
            // Deselect all
            setObjects(prev => prev.map(o => ({...o, selected: false})));
            setEditPoint(null);
            setCommandHistory(prev => [...prev, 'Command: _Cancel']);
            setActiveTool('select');
        }
      }

      if (e.key === 'Enter') {
          if (activeTool === 'polyline' || activeTool === 'curve') {
              finishDrawing();
          }
      }

      // Shortcuts for Tools
      if (activeTool === 'select' && drawPoints.length === 0 && !(e.ctrlKey || e.metaKey)) {
        if (e.key.toLowerCase() === 'm') setTransformMode('translate');
        if (e.key.toLowerCase() === 'r') setTransformMode('rotate');
        if (e.key.toLowerCase() === 's') setTransformMode('scale');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDelete, activeTool, drawPoints, finishDrawing, editPoint, handleUndo, handleRedo, handleCopy, handlePaste]);

  // Close File Menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
            setIsFileMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Layout Effects ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState || !gridRef.current) return;
      e.preventDefault();

      const rect = gridRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const clampedX = Math.max(10, Math.min(90, x));
      const clampedY = Math.max(10, Math.min(90, y));

      setGridSplit(prev => ({
        x: (dragState.type === 'x' || dragState.type === 'center') ? clampedX : prev.x,
        y: (dragState.type === 'y' || dragState.type === 'center') ? clampedY : prev.y,
      }));
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = dragState.type === 'x' ? 'col-resize' : dragState.type === 'y' ? 'row-resize' : 'move';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [dragState]);

  // --- Auth Effects ---
  const fetchProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) setUserProfile(data);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }

    // Initial session check
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) fetchProfile(session.user.id);
      })
      .catch((err) => {
        console.warn('Auth session check failed:', err.message);
        setUser(null);
      })
      .finally(() => {
        setAuthLoading(false);
      });

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
          if (event === 'SIGNED_IN') {
             setCommandHistory(prev => [...prev, `System: Welcome back, ${session.user.email}`]);
             fetchProfile(session.user.id);
          }
      } else if (event === 'SIGNED_OUT') {
          setUserProfile(null);
          setCommandHistory(prev => [...prev, 'System: Signed out']);
          setCurrentProjectId(null);
          setCurrentProjectName('Untitled');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    // State is handled by onAuthStateChange
  };

  const handleShareClick = () => {
    if (user) {
      setIsShareModalOpen(true);
    } else {
      setCommandHistory(prev => [...prev, 'System: Please log in to share projects.']);
      setIsAuthModalOpen(true);
    }
  };

  // --- Project Management Actions ---

  const handleTriggerSave = () => {
    if (!user) {
      setCommandHistory(prev => [...prev, 'System: Please log in to save projects.']);
      setIsAuthModalOpen(true);
      return;
    }
    
    // If we already have an ID, update directly (For now, we just open dialog to keep it simple/safe)
    // Or we could implement quick save. Let's stick to "Save As" style for safety in this version
    // or check if currentProjectId exists.
    
    if (currentProjectId) {
        // Quick Save Logic could go here
        // But let's open the manager to confirm or save as new version
    }
    
    setProjectManagerMode('save');
    setIsProjectManagerOpen(true);
  };

  const handleTriggerLoad = () => {
    if (!user) {
      setCommandHistory(prev => [...prev, 'System: Please log in to open projects.']);
      setIsAuthModalOpen(true);
      return;
    }
    setProjectManagerMode('load');
    setIsProjectManagerOpen(true);
  };

  const handleProjectLoad = (data: { objects: IObject3D[], layers: Layer[] }, projectId: string) => {
     // Load Data
     setObjects(data.objects.map(o => ({...o, selected: false}))); // Deselect on load
     setLayers(data.layers);
     setCurrentProjectId(projectId);
     setCommandHistory(prev => [...prev, `System: Project loaded successfully.`]);
  };

  const handleProjectSaveSuccess = (projectId: string, name: string) => {
     setCurrentProjectId(projectId);
     setCurrentProjectName(name);
     setCommandHistory(prev => [...prev, `System: Project "${name}" saved successfully.`]);
  };

  // --- Tool Actions ---
  const handleToolSelect = (tool: ToolType) => {
    setActiveTool(tool);
    setCommandHistory(prev => [...prev, `Command: _${tool}`]);
    setDrawPoints([]); // Reset any ongoing drawing
    setCurrentPointerPos(null);
    setEditPoint(null); // Clear point editing
    
    if (['box', 'sphere', 'cylinder'].includes(tool)) {
      createNewObject(tool);
      setActiveTool('select');
    } else if (tool === 'point') {
      setCommandHistory(prev => [...prev, 'Command: Pick location for Point']);
    } else if (tool === 'polyline' || tool === 'curve') {
      setCommandHistory(prev => [...prev, `Command: Start of ${tool}... (Click to add points, Enter to finish)`]);
    }
  };

  const handleTransformModeSelect = (mode: TransformMode) => {
    setTransformMode(mode);
    setActiveTool('select'); // Ensure we are in select mode
    setCommandHistory(prev => [...prev, `Command: _${mode.charAt(0).toUpperCase() + mode.slice(1)}`]);
  };

  const createNewObject = (type: ToolType) => {
    if (type === 'select') return;

    saveHistory();

    const currentLayer = layers.find(l => l.isCurrent) || layers[0];
    const newId = `${type.charAt(0).toUpperCase() + type.slice(1)} ${objects.length + 1}`;
    
    const newObj: IObject3D = {
      id: newId,
      // @ts-ignore
      type: type,
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#cccccc',
      selected: true,
      layerId: currentLayer.id
    };
    
    setObjects(prev => prev.map(o => ({...o, selected: false})).concat(newObj));
    setCommandHistory(prev => [...prev, `Created ${type} on layer ${currentLayer.name}`]);
  };

  const snapPointToPlane = (point: [number, number, number], view: ViewportType): [number, number, number] => {
    const finalPoint = [...point] as [number, number, number];
    // Enforce Planar Constraint based on current view's construction plane
    if (view === 'Perspective' || view === 'Top' || view === 'Bottom') {
        finalPoint[1] = 0; // Snap to Ground
    } else if (view === 'Front' || view === 'Back') {
        finalPoint[2] = 0; // Snap to Wall
    } else if (view === 'Right' || view === 'Left') {
        finalPoint[0] = 0; // Snap to Side
    }
    return finalPoint;
  };

  const handleSceneClick = (point: [number, number, number]) => {
    if (activeTool === 'point') {
        saveHistory();
        const currentLayer = layers.find(l => l.isCurrent) || layers[0];
        const newId = `Point ${objects.length + 1}`;
        
        const finalPoint = snapPointToPlane(point, activeViewport);

        const newObj: IObject3D = {
          id: newId,
          type: 'point',
          position: finalPoint,
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          color: currentLayer.color, 
          selected: true,
          layerId: currentLayer.id,
          points: [finalPoint]
        };
        
        setObjects(prev => prev.map(o => ({...o, selected: false})).concat(newObj));
        setCommandHistory(prev => [...prev, `Created Point at ${finalPoint.map(n=>n.toFixed(2)).join(', ')}`]);
        setActiveTool('select'); 

    } else if (activeTool === 'polyline' || activeTool === 'curve') {
        const finalPoint = snapPointToPlane(point, activeViewport);
        setDrawPoints(prev => [...prev, finalPoint]);
        setCommandHistory(prev => [...prev, `Point added: ${finalPoint.map(n=>n.toFixed(1)).join(',')}`]);
    }
  };

  const handleSceneMouseMove = (point: [number, number, number]) => {
    if (activeTool === 'polyline' || activeTool === 'curve') {
        const finalPoint = snapPointToPlane(point, activeViewport);
        setCurrentPointerPos(finalPoint);
    }
  };

  // Updated handleObjectSelect to support multi-selection (Shift)
  const handleObjectSelect = (idOrIds: string | string[] | null, isMultiSelect: boolean = false) => {
    if (drawPoints.length > 0) return; // Don't select while drawing

    if (!idOrIds) {
      // Deselect all only if Shift is NOT held.
      if (!isMultiSelect) {
          setObjects(prev => prev.map(obj => ({ ...obj, selected: false })));
          setEditPoint(null); // Clear point editing
          setCommandHistory(prev => [...prev, 'Command: _Cancel selection']);
      }
      return;
    }

    // If we are doing a Replace (not multi), we clear editPoint
    if (!isMultiSelect) {
        setEditPoint(null);
    }

    const idsToProcess = Array.isArray(idOrIds) ? idOrIds : [idOrIds];

    setObjects(prev => {
        // 1. Shift + Click/Drag: Add/Toggle
        if (isMultiSelect) {
            if (Array.isArray(idOrIds)) {
                 // Add unique items (Union)
                 const currentSelectedIds = new Set(prev.filter(o => o.selected).map(o => o.id));
                 idsToProcess.forEach(id => currentSelectedIds.add(id));
                 
                 // Log count added
                 const newCount = currentSelectedIds.size - prev.filter(o => o.selected).length;
                 if (newCount > 0) {
                    setTimeout(() => setCommandHistory(h => [...h, `${newCount} object(s) added to selection.`]), 0);
                 }

                 return prev.map(obj => ({
                     ...obj,
                     selected: currentSelectedIds.has(obj.id)
                 }));
            } else {
                // Toggle Single
                return prev.map(obj => {
                    if (idsToProcess.includes(obj.id)) {
                         const newState = !obj.selected;
                         setTimeout(() => setCommandHistory(h => [...h, newState ? `Added to selection.` : `Removed from selection.`]), 0);
                        return { ...obj, selected: newState };
                    }
                    return obj;
                });
            }
        } 
        // 2. Normal Click/Drag: Replace
        else {
            const newSelectionCount = idsToProcess.length;
            setTimeout(() => setCommandHistory(h => [...h, `${newSelectionCount} object(s) selected.`]), 0);
            
            return prev.map(obj => ({
                ...obj,
                selected: idsToProcess.includes(obj.id)
            }));
        }
    });
  };

  const handlePointSelect = (objectId: string, index: number) => {
      setEditPoint({ objectId, index });
      setCommandHistory(prev => [...prev, `Command: _EditPoint (Index ${index})`]);
  };

  // Triggered when dragging Transform Gizmo starts - save history ONCE
  const handleTransformStart = useCallback(() => {
      saveHistory();
  }, [saveHistory]);

  // Unified Transform Handler that accepts array of updates
  const handleBatchTransform = (updates: { id: string; data: Partial<IObject3D> }[]) => {
    setObjects(prev => {
        const updatesMap = new Map(updates.map(u => [u.id, u.data]));
        return prev.map(obj => {
            if (updatesMap.has(obj.id)) {
                return { ...obj, ...updatesMap.get(obj.id) };
            }
            return obj;
        });
    });
  };

  // --- Layer Actions ---
  const handleToggleLayer = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const handleLockLayer = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, locked: !l.locked } : l));
  };

  const handleSetCurrentLayer = (id: string) => {
    setLayers(prev => prev.map(l => ({ ...l, isCurrent: l.id === id })));
    setCommandHistory(prev => [...prev, `Command: _SetCurrentLayer ${id}`]);
  };

  const handleRenameLayer = (id: string, newName: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, name: newName } : l));
    setCommandHistory(prev => [...prev, `Command: _RenameLayer`]);
  };

  const handleReorderLayers = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    setLayers(prev => {
      const newLayers = [...prev];
      const [movedLayer] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, movedLayer);
      return newLayers;
    });
  };

  const handleAddLayer = () => {
    let index = 1;
    let newName = "";
    while (true) {
      const suffix = index < 10 ? `0${index}` : `${index}`;
      newName = `Layer ${suffix}`;
      if (!layers.some(l => l.name === newName)) break;
      index++;
    }

    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
    
    const newLayer: Layer = {
      id: `layer_${Date.now()}`,
      name: newName,
      color: randomColor,
      visible: true,
      locked: false,
      isCurrent: false
    };
    setLayers(prev => [...prev, newLayer]);
    setCommandHistory(prev => [...prev, `Command: _NewLayer "${newName}"`]);
  };

  const handleDeleteLayer = (id: string) => {
    if (layers.length <= 1) {
      setCommandHistory(prev => [...prev, `Error: Cannot delete the last layer.`]);
      return;
    }

    const layerToDelete = layers.find(l => l.id === id);
    if (!layerToDelete) return;

    let newLayers = layers.filter(l => l.id !== id);
    
    if (layerToDelete.isCurrent) {
      newLayers[0].isCurrent = true;
    }

    const safeLayerId = newLayers.find(l => l.isCurrent)?.id || newLayers[0].id;
    
    setObjects(prev => prev.map(obj => 
      obj.layerId === id ? { ...obj, layerId: safeLayerId } : obj
    ));

    setLayers(newLayers);
    setCommandHistory(prev => [...prev, `Command: _DeleteLayer "${layerToDelete.name}"`]);
  };

  // --- Unit Actions ---
  const handleSetUnit = (unit: UnitType) => {
    setCurrentUnit(unit);
    setCommandHistory(prev => [...prev, `Command: _Units ${unit}`]);
  };

  const handleCommand = (cmd: string) => {
    setCommandHistory(prev => [...prev, cmd]);
    const lowerCmd = cmd.toLowerCase().trim();
    
    if (lowerCmd === 'box') createNewObject('box');
    else if (lowerCmd === 'sphere') createNewObject('sphere');
    else if (lowerCmd === 'cylinder') createNewObject('cylinder');
    else if (lowerCmd === 'point') { setActiveTool('point'); setCommandHistory(prev => [...prev, 'Pick location']); }
    else if (lowerCmd === 'polyline') { setActiveTool('polyline'); setCommandHistory(prev => [...prev, 'Start polyline (Enter to finish)']); }
    else if (lowerCmd === 'curve') { setActiveTool('curve'); setCommandHistory(prev => [...prev, 'Start curve (Enter to finish)']); }
    else if (lowerCmd === 'move') handleTransformModeSelect('translate');
    else if (lowerCmd === 'rotate') handleTransformModeSelect('rotate');
    else if (lowerCmd === 'scale') handleTransformModeSelect('scale');
    else if (lowerCmd === 'delete' || lowerCmd === 'del') handleDelete();
    else if (lowerCmd === 'clear' || lowerCmd === 'cls') setCommandHistory([]);
    else if (lowerCmd === 'help') setCommandHistory(prev => [...prev, 'Available: box, sphere, cylinder, point, polyline, curve, move, rotate, scale, delete, units, save, open']);
    else if (lowerCmd === 'undo') handleUndo();
    else if (lowerCmd === 'redo') handleRedo();
    else if (lowerCmd === 'copy') handleCopy();
    else if (lowerCmd === 'paste') handlePaste();
    else if (lowerCmd === 'save') handleTriggerSave();
    else if (lowerCmd === 'open') handleTriggerLoad();
    else if (lowerCmd.startsWith('units')) {
        const parts = lowerCmd.split(' ');
        if (parts.length > 1 && ['mm', 'cm', 'm', 'in', 'ft'].includes(parts[1])) {
            handleSetUnit(parts[1] as UnitType);
        } else {
            setCommandHistory(prev => [...prev, 'Units: mm, cm, m, in, ft']);
        }
    }
    else setCommandHistory(prev => [...prev, `Unknown command: ${cmd}`]);
  };

  const toggleMaximize = (view: ViewportType) => {
    if (maximizedViewport === view) {
      setMaximizedViewport(null);
    } else {
      setMaximizedViewport(view);
      setActiveViewport(view);
    }
  };

  const handleTabClick = (view: ViewportType) => {
    if (maximizedViewport === view) {
       setMaximizedViewport(null);
    } else {
      setMaximizedViewport(view);
      setActiveViewport(view);
    }
  };

  const selectedObject = objects.find(o => o.selected);

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] overflow-hidden text-sans">
      {/* 1. Menu Bar */}
      <div className="h-10 bg-[#2d2d2d] border-b border-[#454545] flex items-center px-3 text-xs text-gray-300 select-none relative shadow-sm z-50">
         
         {/* App Logo */}
         <div className="flex items-center gap-2 mr-4 select-none cursor-pointer hover:opacity-90 transition-opacity">
            <div className="w-7 h-7 bg-gradient-to-br from-[#0078d7] to-[#005a9e] rounded flex items-center justify-center shadow-sm border border-[#ffffff10]">
               <Box size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="hidden md:flex flex-col leading-none">
               <span className="font-bold text-white text-sm tracking-wide">PyGrass<span className="text-[#3399ff]">Real</span> AI</span>
            </div>
         </div>

         {/* Menu Items */}
         <div className="flex items-center gap-0.5 font-medium">
           <div className="relative" ref={fileMenuRef}>
             <span 
                className={`hover:text-white hover:bg-[#3a3a3a] px-3 py-1.5 rounded cursor-pointer transition-colors ${isFileMenuOpen ? 'bg-[#3a3a3a] text-white' : ''}`}
                onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
             >
               File
             </span>
             {isFileMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-[#2d2d2d] border border-[#454545] shadow-xl rounded-sm py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                   <div 
                      className="px-3 py-1.5 hover:bg-[#0078d7] hover:text-white cursor-pointer flex items-center gap-2"
                      onClick={() => { setIsFileMenuOpen(false); createNewObject('box'); }} // Just a placeholder for New
                   >
                     <Plus size={12} /> New
                   </div>
                   <div 
                      className="px-3 py-1.5 hover:bg-[#0078d7] hover:text-white cursor-pointer flex items-center gap-2"
                      onClick={() => { setIsFileMenuOpen(false); handleTriggerLoad(); }}
                   >
                     <FolderOpen size={12} /> Open...
                   </div>
                   <div 
                      className="px-3 py-1.5 hover:bg-[#0078d7] hover:text-white cursor-pointer flex items-center gap-2"
                      onClick={() => { setIsFileMenuOpen(false); handleTriggerSave(); }}
                   >
                     <Save size={12} /> Save
                   </div>
                   <div className="h-[1px] bg-[#454545] my-1"></div>
                   <div 
                      className="px-3 py-1.5 hover:bg-[#0078d7] hover:text-white cursor-pointer flex items-center gap-2"
                   >
                     Import...
                   </div>
                   <div 
                      className="px-3 py-1.5 hover:bg-[#0078d7] hover:text-white cursor-pointer flex items-center gap-2"
                   >
                     Export...
                   </div>
                </div>
             )}
           </div>

           {['Edit', 'View', 'Curve', 'Surface', 'Solid', 'Transform', 'Tools', 'Help'].map((item) => (
             <span 
                key={item} 
                className="hover:text-white hover:bg-[#3a3a3a] px-3 py-1.5 rounded cursor-pointer transition-colors"
             >
               {item}
             </span>
           ))}
         </div>

         <div className="ml-auto flex items-center border-l border-[#454545] pl-3 h-full">
            {currentProjectId && (
              <div className="mr-4 flex flex-col items-end justify-center">
                 <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Project</span>
                 <span className="text-xs text-white font-medium">{currentProjectName}</span>
              </div>
            )}

            <button 
               onClick={handleShareClick}
               className="mr-3 bg-[#0078d7] hover:bg-[#005a9e] text-white px-3 py-0.5 rounded flex items-center gap-1.5 transition-colors font-medium shadow-sm"
            >
               <Share2 size={12} />
               Share
            </button>

            {authLoading ? (
              <span className="text-gray-500 italic">Loading...</span>
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-green-400 bg-[#1a1a1a] px-2 py-1 rounded border border-[#333]">
                   <User size={12} />
                   <div className="flex flex-col leading-none">
                      <span className="font-bold text-[10px] text-gray-300">Logged in as</span>
                      <span className="max-w-[100px] truncate font-medium text-green-400">{userProfile?.full_name || user.email}</span>
                   </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[#444] transition-colors"
                  title="Log Out"
                >
                  <LogOut size={12} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1 text-[#0078d7] hover:text-[#3399ff] hover:bg-[#333] px-2 py-0.5 rounded transition-colors font-semibold"
              >
                <User size={12} />
                Log In / Sign Up
              </button>
            )}
         </div>
      </div>

      {/* 2. Command Area */}
      <CommandBar history={commandHistory} onCommand={handleCommand} />

      {/* 3. Main Workspace */}
      <div className="flex-1 flex flex-row min-w-0 bg-[#3a3a3a] relative">
        
        {/* Left Toolbar */}
        <Toolbar 
          activeTool={activeTool} 
          transformMode={transformMode}
          onSelectTool={handleToolSelect}
          onSelectTransformMode={handleTransformModeSelect}
          onDelete={handleDelete}
        />

        {/* Center Area: Viewports + Bottom Tabs */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#3a3a3a] relative">
          
          {/* Viewport Container */}
          <div 
            className="flex-1 relative overflow-hidden flex flex-col"
            style={{ cursor: (['point', 'polyline', 'curve'].includes(activeTool)) ? 'crosshair' : 'default' }}
          >
            {maximizedViewport ? (
              <div className="flex-1 w-full h-full">
                <Viewport 
                  view={maximizedViewport}
                  objects={objects}
                  layers={layers}
                  active={true}
                  onActivate={() => setActiveViewport(maximizedViewport)}
                  onObjectSelect={handleObjectSelect}
                  onBatchTransform={handleBatchTransform}
                  onTransformStart={handleTransformStart}
                  onSceneClick={handleSceneClick}
                  onSceneMouseMove={handleSceneMouseMove}
                  activeDrawPoints={drawPoints}
                  currentPointerPos={currentPointerPos}
                  activeTool={activeTool}
                  isMaximized={true}
                  onToggleMaximize={() => toggleMaximize(maximizedViewport)}
                  gumballEnabled={gumballEnabled}
                  transformMode={transformMode}
                  editPoint={editPoint}
                  onPointSelect={handlePointSelect}
                  isGizmoDragging={isGizmoDragging}
                  onGizmoDragChange={handleGizmoDragChange}
                />
              </div>
            ) : (
              <div 
                ref={gridRef}
                className="absolute inset-0 grid gap-[2px] bg-[#3a3a3a]"
                style={{ 
                  gridTemplateColumns: `${gridSplit.x}% 1fr`, 
                  gridTemplateRows: `${gridSplit.y}% 1fr` 
                }}
              >
                <Viewport 
                  view="Top" 
                  objects={objects}
                  layers={layers}
                  active={activeViewport === 'Top'} 
                  onActivate={() => setActiveViewport('Top')} 
                  onObjectSelect={handleObjectSelect}
                  onBatchTransform={handleBatchTransform}
                  onTransformStart={handleTransformStart}
                  onSceneClick={handleSceneClick}
                  onSceneMouseMove={handleSceneMouseMove}
                  activeDrawPoints={drawPoints}
                  currentPointerPos={currentPointerPos}
                  activeTool={activeTool}
                  onToggleMaximize={() => toggleMaximize('Top')}
                  gumballEnabled={gumballEnabled}
                  transformMode={transformMode}
                  editPoint={editPoint}
                  onPointSelect={handlePointSelect}
                  isGizmoDragging={isGizmoDragging}
                  onGizmoDragChange={handleGizmoDragChange}
                />
                <Viewport 
                  view="Perspective" 
                  objects={objects}
                  layers={layers}
                  active={activeViewport === 'Perspective'} 
                  onActivate={() => setActiveViewport('Perspective')} 
                  onObjectSelect={handleObjectSelect}
                  onBatchTransform={handleBatchTransform}
                  onTransformStart={handleTransformStart}
                  onSceneClick={handleSceneClick}
                  onSceneMouseMove={handleSceneMouseMove}
                  activeDrawPoints={drawPoints}
                  currentPointerPos={currentPointerPos}
                  activeTool={activeTool}
                  onToggleMaximize={() => toggleMaximize('Perspective')}
                  gumballEnabled={gumballEnabled}
                  transformMode={transformMode}
                  editPoint={editPoint}
                  onPointSelect={handlePointSelect}
                  isGizmoDragging={isGizmoDragging}
                  onGizmoDragChange={handleGizmoDragChange}
                />
                <Viewport 
                  view="Front" 
                  objects={objects}
                  layers={layers}
                  active={activeViewport === 'Front'} 
                  onActivate={() => setActiveViewport('Front')} 
                  onObjectSelect={handleObjectSelect}
                  onBatchTransform={handleBatchTransform}
                  onTransformStart={handleTransformStart}
                  onSceneClick={handleSceneClick}
                  onSceneMouseMove={handleSceneMouseMove}
                  activeDrawPoints={drawPoints}
                  currentPointerPos={currentPointerPos}
                  activeTool={activeTool}
                  onToggleMaximize={() => toggleMaximize('Front')}
                  gumballEnabled={gumballEnabled}
                  transformMode={transformMode}
                  editPoint={editPoint}
                  onPointSelect={handlePointSelect}
                  isGizmoDragging={isGizmoDragging}
                  onGizmoDragChange={handleGizmoDragChange}
                />
                <Viewport 
                  view="Right" 
                  objects={objects}
                  layers={layers}
                  active={activeViewport === 'Right'} 
                  onActivate={() => setActiveViewport('Right')} 
                  onObjectSelect={handleObjectSelect}
                  onBatchTransform={handleBatchTransform}
                  onTransformStart={handleTransformStart}
                  onSceneClick={handleSceneClick}
                  onSceneMouseMove={handleSceneMouseMove}
                  activeDrawPoints={drawPoints}
                  currentPointerPos={currentPointerPos}
                  activeTool={activeTool}
                  onToggleMaximize={() => toggleMaximize('Right')}
                  gumballEnabled={gumballEnabled}
                  transformMode={transformMode}
                  editPoint={editPoint}
                  onPointSelect={handlePointSelect}
                  isGizmoDragging={isGizmoDragging}
                  onGizmoDragChange={handleGizmoDragChange}
                />

                {/* Drag Handles */}
                <div 
                  className="absolute top-0 bottom-0 w-2 -ml-1 cursor-col-resize z-50 hover:bg-[#0078d7] opacity-0 hover:opacity-50 transition-opacity"
                  style={{ left: `${gridSplit.x}%` }}
                  onMouseDown={() => setDragState({ type: 'x' })}
                />
                <div 
                  className="absolute left-0 right-0 h-2 -mt-1 cursor-row-resize z-50 hover:bg-[#0078d7] opacity-0 hover:opacity-50 transition-opacity"
                  style={{ top: `${gridSplit.y}%` }}
                  onMouseDown={() => setDragState({ type: 'y' })}
                />
                <div 
                  className="absolute w-4 h-4 -ml-2 -mt-2 bg-white border border-gray-500 rounded-full shadow-md cursor-move z-50 flex items-center justify-center hover:scale-110 transition-transform"
                  style={{ left: `${gridSplit.x}%`, top: `${gridSplit.y}%` }}
                  onMouseDown={() => setDragState({ type: 'center' })}
                >
                  <MoreVertical size={10} className="text-black" />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Tabs */}
          <div className="h-7 bg-[#222] border-t border-[#454545] flex items-center px-0 text-xs font-medium select-none">
             <button 
               className={`px-4 h-full border-r border-[#333] flex items-center justify-center transition-colors ${maximizedViewport === 'Perspective' ? 'bg-[#0078d7] text-white' : 'text-gray-400 hover:bg-[#333] hover:text-gray-200'}`}
               onClick={() => handleTabClick('Perspective')}
             >
               Perspective
             </button>
             <button 
               className={`px-4 h-full border-r border-[#333] flex items-center justify-center transition-colors ${maximizedViewport === 'Top' ? 'bg-[#0078d7] text-white' : 'text-gray-400 hover:bg-[#333] hover:text-gray-200'}`}
               onClick={() => handleTabClick('Top')}
             >
               Top
             </button>
             <button 
               className={`px-4 h-full border-r border-[#333] flex items-center justify-center transition-colors ${maximizedViewport === 'Front' ? 'bg-[#0078d7] text-white' : 'text-gray-400 hover:bg-[#333] hover:text-gray-200'}`}
               onClick={() => handleTabClick('Front')}
             >
               Front
             </button>
             <button 
               className={`px-4 h-full border-r border-[#333] flex items-center justify-center transition-colors ${maximizedViewport === 'Right' ? 'bg-[#0078d7] text-white' : 'text-gray-400 hover:bg-[#333] hover:text-gray-200'}`}
               onClick={() => handleTabClick('Right')}
             >
               Right
             </button>
             <button 
               className="px-3 h-full border-r border-[#333] text-gray-500 hover:bg-[#333] hover:text-gray-300 flex items-center justify-center"
               onClick={() => {}}
               title="New Layout"
             >
               <Plus size={12} />
             </button>
             
             {maximizedViewport && (
               <button
                 className="ml-auto mr-2 text-gray-500 hover:text-white text-[10px] flex items-center gap-1"
                 onClick={() => setMaximizedViewport(null)}
               >
                 <GridIcon size={10} /> Restore 4-View
               </button>
             )}
          </div>

        </div>

        <Sidebar 
          selectedObject={selectedObject} 
          layers={layers}
          onToggleLayer={handleToggleLayer}
          onLockLayer={handleLockLayer}
          onSetCurrentLayer={handleSetCurrentLayer}
          onRenameLayer={handleRenameLayer}
          onAddLayer={handleAddLayer}
          onDeleteLayer={handleDeleteLayer}
          onReorderLayers={handleReorderLayers}
          currentUnit={currentUnit}
          onSetUnit={handleSetUnit}
        />
      </div>

      <StatusBar 
        gumballEnabled={gumballEnabled}
        onToggleGumball={() => setGumballEnabled(!gumballEnabled)}
        currentUnit={currentUnit}
        onCycleUnit={() => {
             const units: UnitType[] = ['mm', 'cm', 'm', 'in', 'ft'];
             const nextIndex = (units.indexOf(currentUnit) + 1) % units.length;
             handleSetUnit(units[nextIndex]);
        }}
      />

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setCommandHistory(prev => [...prev, 'System: Authentication successful'])}
      />
      <ShareModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        currentUser={user}
      />
      <ProjectsManager 
        isOpen={isProjectManagerOpen}
        mode={projectManagerMode}
        currentData={{ objects, layers }}
        onClose={() => setIsProjectManagerOpen(false)}
        onLoad={handleProjectLoad}
        onSaveSuccess={handleProjectSaveSuccess}
        user={user}
      />
    </div>
  );
};

export default App;

function GridIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
