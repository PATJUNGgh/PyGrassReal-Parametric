import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { MaterialPreviewSphere, extractColorFromStyle, normalizeParams, type MaterialParams } from './MaterialPicker';
import './CustomNode.css';
import './CustomNodeMenu.css';
import { NodeActionBar } from './NodeActionBar';
import { useNodeDragV2 } from '../hooks/useNodeDragV2';
import { useNodeResizeV2 } from '../hooks/useNodeResizeV2';
import { NodeHeader } from './custom_node/NodeHeader';
import { NodeBody } from './custom_node/NodeBody';
import { NodeErrorOverlay } from './custom_node/NodeErrorOverlay';
import { NodeResizeHandle } from './custom_node/NodeResizeHandle';

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

    // Store latest data and onDataChange in refs to avoid dependency cycle
    const onDataChangeRef = useRef(onDataChange);
    onDataChangeRef.current = onDataChange;
    const dataRef = useRef(data);
    dataRef.current = data;

    // Effects
    useEffect(() => {
        const timer = setTimeout(() => setHasMounted(true), 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!hasMounted) return;
        const timer = setTimeout(() => {
            // Use refs to get latest values without adding them to dependency array
            onDataChangeRef.current(id, { ...dataRef.current, _structureChanged: Date.now() });
        }, 150);
        return () => clearTimeout(timer);
    }, [inputs.length, outputs.length, hasMounted, id]); // Dependencies are now stable

    // Handlers
    const handleTogglePause = () => {
        onDataChange(id, { ...data, isPaused: !isNodePaused });
    };

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
            <NodeHeader
                id={id}
                customName={customName}
                isNodePaused={isNodePaused}
                selected={selected}
                overlappingGroupId={overlappingGroupId}
                parentGroupId={parentGroupId}
                onNameChange={handleNameChange}
                onTogglePause={handleTogglePause}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onJoinGroup={onJoinGroup}
                onLeaveGroup={onLeaveGroup}
                onCluster={onCluster}
            />

            <NodeBody
                id={id}
                data={data}
                inputs={inputs}
                outputs={outputs}
                connections={connections}
                selected={selected}
                nodeType={nodeType}
                hoveredPortId={hoveredPortId}
                editingPortId={editingPortId}
                tempPortLabel={tempPortLabel}
                canAddOutput={canAddOutput}
                showMaterialPreview={showMaterialPreview}
                previewParams={previewParams}
                children={children}
                setHoveredPortId={setHoveredPortId}
                setTempPortLabel={setTempPortLabel}
                onDeleteConnection={onDeleteConnection}
                onPortMouseDown={handlePortMouseDown}
                onPortMouseUp={handlePortMouseUp}
                onStartEdit={handleStartEdit}
                onCancelEdit={handleCancelEdit}
                onSavePortEdit={handleSavePortEdit}
                onRemoveInput={handleRemoveInput}
                onAddInput={handleAddInput}
                onRemoveOutput={handleRemoveOutput}
                onAddOutput={handleAddOutput}
                onEditMaterial={onEditMaterial}
            />

            <NodeErrorOverlay
                id={id}
                isInfected={isInfected}
                customName={customName}
                showErrorDetails={showErrorDetails}
                setShowErrorDetails={setShowErrorDetails}
            />

            <NodeResizeHandle
                data={data}
                onResizeMouseDown={handleResizeMouseDown}
            />
        </div>
    );
};