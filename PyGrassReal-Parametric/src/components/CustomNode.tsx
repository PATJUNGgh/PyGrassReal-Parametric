import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { MaterialPreviewSphere, extractColorFromStyle, normalizeParams, type MaterialParams } from './MaterialPicker';
import './CustomNode.css';
import './CustomNodeMenu.css';
import { NodeActionBar } from './NodeActionBar';
import { useNodeDragV2 } from '../hooks/useNodeDragV2';
import { useNodeResizeV2 } from '../hooks/useNodeResizeV2';

interface CustomNodeProps {
    id: string;
    data: {
        customName?: string;
        inputs?: Array<{ id: string; label: string }>;
        outputs?: Array<{ id: string; label: string }>;
        width?: number;
        minWidth?: number; // Added minWidth
        height?: number;
        isGroup?: boolean;
        componentId?: string;
        showMaterialPreview?: boolean;
        materialStyle?: string;
        style?: string;
        materialParams?: MaterialParams;
        hideInputs?: boolean;
        hideInputsHeader?: boolean;
        hideInputsAdd?: boolean;
        hideOutputsHeader?: boolean;
        hidePortLabels?: boolean;
        hideOutputsAdd?: boolean;
        hidePortControls?: boolean;
        hideModifierMenu?: boolean;
        materialPreviewUrl?: string;
        isPaused?: boolean;
        type?: string;
        bodyPadding?: string;
        outputsAreaWidth?: number;
        outputPortOffsetRight?: number;
        bodyMinHeight?: number;
        resizable?: boolean; // Added resizable
    };
    position: { x: number; y: number };
    selected: boolean;
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    onDataChange: (id: string, data: any) => void;
    onDelete: (id: string) => void;
    onConnectionStart: (nodeId: string, portId: string, position: { x: number; y: number }) => void;
    onConnectionComplete: (nodeId: string, portId: string) => void;
    connections?: Array<{ id: string; sourceNodeId: string; targetNodeId: string; sourcePort: string; targetPort: string }>;
    onDeleteConnection?: (connectionId: string) => void;
    isShaking?: boolean;
    onSelect?: () => void;
    onCluster?: (nodeId: string) => void;
    parentGroupId?: string;
    overlappingGroupId?: string;
    onJoinGroup?: (nodeId: string, groupId: string) => void;
    onLeaveGroup?: (nodeId: string) => void;
    scale?: number;
    isInfected?: boolean;
    onDuplicate?: (id: string) => void;
    children?: React.ReactNode;
    onEditMaterial?: (id: string) => void;
    nodeType?: string;
}

export const CustomNode: React.FC<CustomNodeProps> = ({
    id,
    data,
    position,
    selected,
    onPositionChange,
    onDataChange,
    onDelete,
    onConnectionStart,
    onConnectionComplete,
    connections = [],
    onDeleteConnection,
    isShaking,
    onSelect,
    onCluster,
    parentGroupId,
    overlappingGroupId,
    onJoinGroup,
    onLeaveGroup,
    scale = 1, // Default scale to 1
    isInfected,
    onDuplicate,
    children,
    onEditMaterial,
    nodeType,
}) => {
    // State and Refs
    const [isEditingName, setIsEditingName] = useState(false);
    const [showErrorDetails, setShowErrorDetails] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [hoveredPortId, setHoveredPortId] = useState<string | null>(null);
    const [editingPortId, setEditingPortId] = useState<string | null>(null);
    const [tempPortLabel, setTempPortLabel] = useState("");
    const [hasMounted, setHasMounted] = useState(false);
    const nodeRef = useRef<HTMLDivElement>(null);

    // Derived State and Constants
    const isNodePaused = data.isPaused ?? false;
    const customName = data.customName ?? 'Custom Node';
    const inputs = data.inputs || [];
    const outputs = data.outputs || [];
    const showMaterialPreview = Boolean(data.showMaterialPreview || data.type === 'model-material');
    const computedWidth = data.width
        ? data.width
        : data.componentId
            ? Math.min(620, Math.max(320, (customName.length * 8) + 180))
            : 320;
    const previewColor = extractColorFromStyle(data.materialStyle ?? data.style);
    const previewParams = normalizeParams(data.materialParams);


    // --- REFACTORED DRAG AND RESIZE LOGIC ---
    // Extracting dragging and resizing logic into custom hooks significantly cleans up the component.
    // The `useCallback` for `handlePositionChange` is crucial to prevent unnecessary re-renders of the drag/resize hooks.
    const handlePositionChange = useCallback((newPosition: { x: number, y: number }) => {
        onPositionChange(id, newPosition);
    }, [id, onPositionChange]);

    const { isDragging, handleMouseDown: handleDragMouseDown } = useNodeDragV2({
        onPositionChange: handlePositionChange,
        initialPosition: position,
        scale: scale,
        disabled: isNodePaused,
    });

    const { handleResizeMouseDown } = useNodeResizeV2({
        id,
        data,
        position,
        scale: scale,
        onDataChange,
        onPositionChange,
        initialWidth: computedWidth,
        disabled: isNodePaused,
    });
    // --- END REFACTORED LOGIC ---

    // Effects
    useEffect(() => {
        const timer = setTimeout(() => setHasMounted(true), 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!hasMounted) return;
        const timer = setTimeout(() => {
            onDataChange(id, { ...data, _structureChanged: Date.now() });
        }, 150);
        return () => clearTimeout(timer);
    }, [inputs.length, outputs.length, hasMounted, onDataChange, id, data]);

    // Handlers
    const handleNameChange = (newName: string) => {
        onDataChange(id, { ...data, customName: newName });
    };

    const handleAddInput = () => {
        onDataChange(id, { ...data, inputs: [...inputs, { id: `input-${Date.now()}`, label: `Input ${inputs.length + 1}` }] });
    };

    const handleAddOutput = () => {
        onDataChange(id, { ...data, outputs: [...outputs, { id: `output-${Date.now()}`, label: `Output ${outputs.length + 1}` }] });
    };

    const handleRemoveInput = (inputId: string) => {
        onDataChange(id, { ...data, inputs: inputs.filter((inp) => inp.id !== inputId) });
    };

    const handleRemoveOutput = (outputId: string) => {
        onDataChange(id, { ...data, outputs: outputs.filter((out) => out.id !== outputId) });
    };

    const handlePortMouseDown = (e: React.MouseEvent, portId: string) => {
        e.stopPropagation();
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        onConnectionStart(id, portId, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    };

    const handlePortMouseUp = (e: React.MouseEvent, portId: string) => {
        e.stopPropagation();
        onConnectionComplete(id, portId);
    };

    const handleStartEdit = (portId: string, currentLabel: string) => {
        if (nodeType && !['custom', 'input', 'output', 'layer-source', 'layer-bridge'].includes(nodeType)) return;
        setEditingPortId(portId);
        setTempPortLabel(currentLabel);
    };

    const handleCancelEdit = () => {
        setEditingPortId(null);
        setTempPortLabel("");
    };

    const handleSavePortEdit = (portId: string, isInput: boolean) => {
        if (!tempPortLabel.trim()) {
            setEditingPortId(null);
            return;
        }
        const newData = { ...data };
        if (isInput) {
            newData.inputs = (data.inputs || []).map(p => p.id === portId ? { ...p, label: tempPortLabel } : p);
        } else {
            newData.outputs = (data.outputs || []).map(p => p.id === portId ? { ...p, label: tempPortLabel } : p);
        }
        onDataChange(id, newData);
        setEditingPortId(null);
    };

    // Styles & Memoized Values
    const canAddInput = !data.componentId && !data.hideInputs && !data.hideInputsAdd;
    const canAddOutput = !data.componentId && !data.hideOutputsAdd;

    const animationStyle = isShaking
        ? 'shake 0.3s ease-in-out'
        : !hasMounted
            ? 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            : 'none';

    const cursorStyle = isNodePaused ? 'not-allowed' : isDragging ? 'grabbing' : 'grab';

    const pausedStyle = { filter: 'grayscale(80%)', opacity: 0.7 };

    const containerStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${computedWidth}px`,
        background: isInfected
            ? 'linear-gradient(165deg, rgba(220, 38, 38, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%)'
            : 'linear-gradient(180deg, rgba(56, 189, 248, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%)',
        border: isInfected
            ? '3px solid #ff0000'
            : selected ? '3px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        boxShadow: isInfected
            ? '0 0 0 4px rgba(255, 0, 0, 0.4), 0 0 30px 5px rgba(255, 0, 0, 0.8), 0 10px 30px -5px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 0, 0, 0.3)'
            : selected
                ? '0 0 0 4px rgba(56, 189, 248, 0.4), 0 0 30px 5px rgba(56, 189, 248, 0.6), 0 10px 30px -5px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(56, 189, 248, 0.3)'
                : '0 10px 30px -5px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
        cursor: cursorStyle,
        userSelect: 'none',
        backdropFilter: isInfected ? 'blur(4px) saturate(180%)' : 'blur(6px) saturate(180%)',
        WebkitBackdropFilter: isInfected ? 'blur(4px) saturate(180%)' : 'blur(6px) saturate(180%)',
        color: '#fff',
        fontFamily: "'Inter', sans-serif",
        animation: (isInfected && !isShaking) ? 'criticalBorderPulse 1.5s infinite ease-in-out' : animationStyle,
        zIndex: selected ? 100 : 1,
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto',
        ...(isNodePaused ? pausedStyle : {}),
    };

    return (
        <div
            id={id}
            ref={nodeRef}
            className="custom-node-base"
            data-no-selection="true"
            onMouseDown={(e) => {
                e.stopPropagation(); // Prevent selection box in App
                onSelect?.(); // Select this node
                handleDragMouseDown(e);
            }}
            style={containerStyle}
            onContextMenu={(e) => e.stopPropagation()} // Prevent canvas context menu
            onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header */}
            <div className="node-header">
                {isEditingName ? (
                    <input
                        type="text"
                        value={customName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        onBlur={() => setIsEditingName(false)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') setIsEditingName(false);
                        }}
                        autoFocus
                        className="node-header-input"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div
                        className="node-header-title"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingName(true);
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>⚙️</span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff', whiteSpace: 'normal', lineHeight: 1.2 }}>
                            {customName}
                        </span>
                    </div>
                )}
                <NodeActionBar
                    selected={selected}
                    isPaused={isNodePaused}
                    onTogglePause={() => onDataChange(id, { ...data, isPaused: !isNodePaused })}
                    onDuplicate={onDuplicate ? () => onDuplicate(id) : undefined}
                    onInfo={() => {
                        alert(`Node ID: ${id}\nName: ${customName}`);
                    }}
                    onDelete={() => onDelete(id)}
                    canJoinGroup={!!(overlappingGroupId && !parentGroupId && onJoinGroup)}
                    onJoinGroup={() => onJoinGroup?.(id, overlappingGroupId!)}
                    canLeaveGroup={!!(parentGroupId && onLeaveGroup)}
                    onLeaveGroup={() => onLeaveGroup?.(id)}
                    onCluster={onCluster ? () => onCluster(id) : undefined}
                />
            </div>

            {/* Body Area */}
            <div className="custom-node-body">
                {/* Headers Row (Pinned Top) */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 20px 0 20px',
                    zIndex: 10,
                    pointerEvents: 'none'
                }}>
                    {!data.hideInputs && !data.hideInputsHeader && (
                        <div style={{ fontSize: '10px', fontWeight: 900, color: '#fff', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.5 }}>
                            INPUTS
                        </div>
                    )}
                    {!data.hideOutputsHeader && (
                        <div style={{ fontSize: '10px', fontWeight: 900, color: '#fff', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.5, marginLeft: 'auto' }}>
                            OUTPUTS
                        </div>
                    )}
                </div>

                <div
                    style={{
                        padding: data.bodyPadding ?? '36px 20px 16px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '10px',
                        width: '100%',
                        minHeight: data.bodyMinHeight !== undefined ? `${data.bodyMinHeight}px` : '100px',
                        position: 'relative',
                        zIndex: 1
                    }}
                >
                    {/* INPUTS Area */}
                    {(inputs.length > 0 || (!data.hideInputs && !data.componentId && !data.hideInputsAdd)) && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0px', minWidth: 0 }}>
                            {inputs.map((input) => {
                                const isConnectedInput = connections.some(
                                    conn => conn.targetNodeId === id && conn.targetPort === input.id
                                );

                                return (
                                    <div
                                        key={input.id}
                                        style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: '24px', padding: '2px 0', width: 'calc(100% + 15px)', marginRight: '-15px', background: 'rgba(255,255,255,0.001)', cursor: 'default' }}
                                        onMouseEnter={() => setHoveredPortId(input.id)}
                                        onMouseLeave={() => setHoveredPortId(null)}
                                    >
                                        <div style={{
                                            position: 'absolute',
                                            left: '-37px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            zIndex: 100
                                        }}>
                                            {!data.componentId && isConnectedInput && onDeleteConnection && (
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const connToDelete = connections.find(c => c.targetNodeId === id && c.targetPort === input.id);
                                                        if (connToDelete) onDeleteConnection(connToDelete.id);
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        left: '-25px',
                                                        cursor: 'pointer',
                                                        background: '#22c55e',
                                                        borderRadius: '50%',
                                                        width: '16px',
                                                        height: '16px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                    }}
                                                    title="Disconnect"
                                                >
                                                    <X size={10} strokeWidth={3} color="#000" />
                                                </div>
                                            )}

                                            <div
                                                id={`port-${id}-${input.id}`}
                                                className="node-port"
                                                onMouseDown={(e) => handlePortMouseDown(e, input.id)}
                                                onMouseUp={(e) => handlePortMouseUp(e, input.id)}
                                                style={{
                                                    width: '14px',
                                                    height: '14px',
                                                    borderRadius: '50%',
                                                    background: '#22c55e',
                                                    border: '2px solid #ffffff',
                                                    cursor: 'crosshair',
                                                    boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
                                                }}
                                            />
                                        </div>

                                        {!data.hidePortLabels && (
                                            editingPortId === input.id ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <input
                                                        autoFocus
                                                        value={tempPortLabel}
                                                        onChange={(e) => setTempPortLabel(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSavePortEdit(input.id, true);
                                                            if (e.key === 'Escape') handleCancelEdit();
                                                            e.stopPropagation();
                                                        }}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        style={{
                                                            background: 'rgba(0,0,0,0.5)',
                                                            border: '1px solid #555',
                                                            borderRadius: '4px',
                                                            color: '#fff',
                                                            fontSize: '12px',
                                                            padding: '2px 4px',
                                                            width: '80px',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                    <button onClick={() => handleSavePortEdit(input.id, true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Check size={14} color="#22c55e" /></button>
                                                    <button onClick={handleCancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={14} color="#ef4444" /></button>
                                                </div>
                                            ) : (
                                                <span
                                                    onDoubleClick={(e) => { e.stopPropagation(); handleStartEdit(input.id, input.label); }}
                                                    style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'text' }}
                                                    title="Double click to rename"
                                                >
                                                    {input.label}
                                                </span>
                                            )
                                        )}
                                        {!data.componentId && !data.hidePortControls && (
                                            <button
                                                onClick={() => handleRemoveInput(input.id)}
                                                style={{
                                                    marginLeft: '4px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    opacity: (selected && hoveredPortId === input.id) ? 1 : 0,
                                                    padding: '6px',
                                                    display: 'flex',
                                                    transition: 'opacity 0.2s',
                                                    pointerEvents: (selected && hoveredPortId === input.id) ? 'auto' : 'none'
                                                }}
                                                title="Remove Input"
                                            >
                                                <X size={12} color="#fff" />
                                            </button>
                                        )}
                                    </div>
                                )
                            })}

                            {/* Add Input Button (Relocated) */}
                            {(!data.hideInputsAdd && !data.componentId) && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleAddInput(); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '4px',
                                        color: 'rgba(255,255,255,0.7)',
                                        fontSize: '11px',
                                        padding: '4px 8px',
                                        cursor: 'pointer',
                                        marginTop: '4px',
                                        width: 'fit-content',
                                        marginLeft: '-2px'
                                    }}
                                >
                                    <Plus size={10} /> Add Input
                                </button>
                            )}
                        </div>
                    )}

                    {showMaterialPreview && (
                        <div
                            className="custom-node-material-preview-wrap"
                            role="button"
                            tabIndex={0}
                            title="Open material editor"
                            onMouseDown={(e) => {
                                e.stopPropagation();
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditMaterial?.(id);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onEditMaterial?.(id);
                                }
                            }}
                        >
                            <div
                                className="custom-node-material-preview-sphere"
                                style={{
                                    background: data.materialStyle ?? data.style ?? '#333',
                                    '--roughness': previewParams.roughness,
                                    '--metalness': previewParams.metalness
                                } as React.CSSProperties}
                            />
                        </div>
                    )}

                    {/* Main Content Area (Children) */}
                    <div style={{ flex: 1, minWidth: 0, maxWidth: '100%', position: 'relative' }}>
                        {children}
                    </div>

                    {/* OUTPUTS Area */}
                    {(outputs.length > 0 || canAddOutput) && (
                        <div
                            style={{
                                flex: data.outputsAreaWidth ? `0 0 ${data.outputsAreaWidth}px` : 1,
                                width: data.outputsAreaWidth ? `${data.outputsAreaWidth}px` : undefined,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0px',
                                alignItems: 'flex-end',
                                minWidth: 0,
                            }}
                        >
                            {outputs.map((output) => {
                                const isConnectedOutput = connections.some(
                                    conn => conn.sourceNodeId === id && conn.sourcePort === output.id
                                );

                                return (
                                    <div
                                        key={output.id}
                                        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minHeight: '24px', padding: '2px 0', width: 'calc(100% + 15px)', marginLeft: '-15px', background: 'rgba(255,255,255,0.001)', cursor: 'default' }}
                                        onMouseEnter={() => setHoveredPortId(output.id)}
                                        onMouseLeave={() => setHoveredPortId(null)}
                                    >
                                        {!data.componentId && !data.hidePortControls && (
                                            <button
                                                onClick={() => handleRemoveOutput(output.id)}
                                                style={{
                                                    marginRight: '4px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    opacity: (selected && hoveredPortId === output.id) ? 1 : 0,
                                                    padding: '6px',
                                                    display: 'flex',
                                                    transition: 'opacity 0.2s',
                                                    pointerEvents: (selected && hoveredPortId === output.id) ? 'auto' : 'none'
                                                }}
                                                title="Remove Output"
                                            >
                                                <X size={12} color="#fff" />
                                            </button>
                                        )}

                                        {!data.hidePortLabels && (
                                            editingPortId === output.id ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '40px', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => handleCancelEdit()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={14} color="#ef4444" /></button>
                                                    <button onClick={() => handleSavePortEdit(output.id, false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Check size={14} color="#22c55e" /></button>
                                                    <input
                                                        autoFocus
                                                        value={tempPortLabel}
                                                        onChange={(e) => setTempPortLabel(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSavePortEdit(output.id, false);
                                                            if (e.key === 'Escape') handleCancelEdit();
                                                            e.stopPropagation();
                                                        }}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        style={{
                                                            background: 'rgba(0,0,0,0.5)',
                                                            border: '1px solid #555',
                                                            borderRadius: '4px',
                                                            color: '#fff',
                                                            fontSize: '12px',
                                                            padding: '2px 4px',
                                                            width: '80px',
                                                            outline: 'none',
                                                            textAlign: 'right'
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <span
                                                    onDoubleClick={(e) => { e.stopPropagation(); handleStartEdit(output.id, output.label); }}
                                                    style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', marginRight: '42px', whiteSpace: 'nowrap', textAlign: 'right', cursor: 'text', flex: 1 }}
                                                    title="Double click to rename"
                                                >
                                                    {output.label}
                                                </span>
                                            )
                                        )}

                                        <div
                                            style={{
                                                position: 'absolute',
                                                right: `${data.outputPortOffsetRight ?? 5}px`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                zIndex: 100
                                            }}
                                        >
                                            <div
                                                id={`port-${id}-${output.id}`}
                                                className="node-port"
                                                onMouseDown={(e) => handlePortMouseDown(e, output.id)}
                                                onMouseUp={(e) => handlePortMouseUp(e, output.id)}
                                                style={{
                                                    width: '14px',
                                                    height: '14px',
                                                    borderRadius: '50%',
                                                    background: '#ef4444',
                                                    border: '2px solid #ffffff',
                                                    cursor: 'crosshair',
                                                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                                                }}
                                            />
                                            {!data.componentId && isConnectedOutput && onDeleteConnection && (
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const connsToDelete = connections.filter(c => c.sourceNodeId === id && c.sourcePort === output.id);
                                                        connsToDelete.forEach(c => onDeleteConnection(c.id));
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '-25px',
                                                        cursor: 'pointer',
                                                        background: '#ff4d4f',
                                                        borderRadius: '50%',
                                                        width: '16px',
                                                        height: '16px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                    }}
                                                    title="Disconnect All"
                                                >
                                                    <X size={10} strokeWidth={3} color="#000" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}

                            {canAddOutput && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleAddOutput(); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '4px',
                                        color: 'rgba(255,255,255,0.7)',
                                        fontSize: '11px',
                                        padding: '4px 8px',
                                        cursor: 'pointer',
                                        marginTop: '4px',
                                        width: 'fit-content',
                                        marginRight: '38px',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <Plus size={10} /> Add Output
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Warning Icon Overlay (Center) */}
                {isInfected && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '96px',
                            animation: 'warningPulse 1.5s ease-in-out infinite',
                            pointerEvents: 'none',
                            zIndex: 5,
                        }}
                    >
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowErrorDetails(true);
                            }}
                            style={{
                                marginBottom: '5px',
                                cursor: 'pointer',
                                pointerEvents: 'auto',
                                transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            title="Click for details"
                        >
                            ⚠️
                        </div>
                    </div>
                )}

                {/* Error Details Modal */}
                {showErrorDetails && isInfected && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: '10px',
                            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d0a0a 100%)',
                            border: '2px solid #ff0000',
                            borderRadius: '8px',
                            padding: '12px',
                            minWidth: '200px',
                            maxWidth: '250px',
                            boxShadow: '0 0 20px rgba(255, 0, 0, 0.5), inset 0 0 10px rgba(255, 0, 0, 0.1)',
                            zIndex: 1000,
                            pointerEvents: 'auto',
                            animation: 'modalPopIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
                            <span style={{ fontSize: '24px' }}>⚠️</span>
                            <h3 style={{ margin: 0, color: '#ff4444', fontSize: '14px', fontWeight: '700' }}>SECURITY ALERT</h3>
                        </div>

                        <div style={{ marginBottom: '10px', color: '#fff', lineHeight: '1.4' }}>
                            <p style={{ margin: '0 0 6px 0', fontSize: '11px', fontWeight: '600', color: '#ffaaaa' }}>
                                High Risk Connection Detected
                            </p>
                            <p style={{ margin: '0 0 4px 0', fontSize: '10px', color: '#ccc' }}>
                                <strong>Node:</strong> {customName}
                            </p>
                            <p style={{ margin: '0 0 4px 0', fontSize: '10px', color: '#ccc' }}>
                                <strong>Status:</strong> <span style={{ color: '#ff6666' }}>INFECTED</span>
                            </p>
                            <p style={{ margin: '0', fontSize: '10px', color: '#ccc' }}>
                                <strong>Reason:</strong> Connected to AntiVirus node.
                            </p>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowErrorDetails(false);
                            }}
                            style={{
                                width: '100%',
                                padding: '6px',
                                background: '#dc2626',
                                border: '1px solid #ff4444',
                                borderRadius: '6px',
                                color: 'white',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#ef4444'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
                        >
                            CLOSE
                        </button>
                    </div>
                )}
            </div>

            {/* Left Resize Handle */}
            {data.resizable && (
                <div
                    onMouseDown={handleResizeMouseDown}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '12px',
                        cursor: 'ew-resize',
                        zIndex: 20,
                        background: 'transparent',
                        // Optional: Show a visual indicator on hover
                        // transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    title="Drag to resize"
                />
            )}
        </div>
    );
};