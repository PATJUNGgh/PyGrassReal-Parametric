import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MaterialPreviewSphere, extractColorFromStyle, normalizeParams, type MaterialParams } from './MaterialPicker';
import './CustomNode.css';
import './CustomNodeMenu.css';
import { useNodeDragV2 } from '../hooks/useNodeDragV2';
import { useNodeResizeV2 } from '../hooks/useNodeResizeV2';
import { useNodeResize } from '../hooks/useInspectorNodeResize';
import { NodeHeader } from './custom_node/NodeHeader';
import { NodeBody } from './custom_node/NodeBody';
import { NodeErrorOverlay } from './custom_node/NodeErrorOverlay';
import { NodeResizeHandle } from './custom_node/NodeResizeHandle';
import { NodeInteractionProvider } from '../context/NodeInteractionContext';
import type { NodeData } from '../types/NodeTypes';

interface CustomNodeProps {
    id: string;
    data: NodeData['data'];
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
    onSelect?: (multiSelect?: boolean) => void;
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
    interactionMode?: 'node' | '3d' | 'wire';
}

export const CustomNode = React.memo((props: CustomNodeProps) => {
    const {
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
        scale = 1,
        isInfected,
        onDuplicate,
        children,
        onEditMaterial,
        nodeType,
        interactionMode,
    } = props;

    // State and Refs
    const [showErrorDetails, setShowErrorDetails] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const nodeRef = useRef<HTMLDivElement>(null);
    const hasDraggedRef = useRef(false);

    // Derived State
    const isNodePaused = data.isPaused ?? false;
    const customName = data.customName ?? 'Custom Node';
    const isRenamable = data.isNameEditable ?? true;
    const inputs = data.inputs || [];
    const outputs = data.outputs || [];
    const showMaterialPreview = Boolean(data.showMaterialPreview || data.type === 'model-material');
    const computedWidth = data.width || (data.componentId ? Math.min(620, Math.max(320, (customName.length * 8) + 180)) : 320);
    const previewParams = normalizeParams(data.materialParams);
    
    // Drag and Resize Hooks
    const handlePositionChange = useCallback((newPosition: { x: number, y: number }) => {
        hasDraggedRef.current = true;
        onPositionChange(id, newPosition);
    }, [id, onPositionChange]);

    const { isDragging, handlePointerDown: handleDragPointerDown } = useNodeDragV2({
        onPositionChange: handlePositionChange,
        initialPosition: position,
        scale: scale,
        disabled: isNodePaused,
    });

    const { size: freeSize, handleResizeStart: handleFreeResizeStart } = useNodeResize({
        id,
        initialWidth: data.width || 320,
        initialHeight: data.height || 200,
        minWidth: data.minWidth || 200,
        minHeight: data.bodyMinHeight || 100,
        scale,
        position,
        onDataChange,
        onPositionChange,
    });

    const isFreeResizing = data.freeResizable && selected;

    const { handleResizeMouseDown } = useNodeResizeV2({
        id,
        data,
        position,
        scale: scale,
        nodeRef,
        onDataChange,
        onPositionChange,
        initialWidth: computedWidth,
        disabled: isNodePaused || data.freeResizable,
    });

    // Refs for stable callbacks
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
            onDataChangeRef.current(id, { ...dataRef.current, _structureChanged: Date.now() });
        }, 150);
        return () => clearTimeout(timer);
    }, [inputs.length, outputs.length, hasMounted, id]);

    // Non-interaction Handlers
    const handleTogglePause = () => onDataChange(id, { ...data, isPaused: !isNodePaused });
    const handleNameChange = (newName: string) => onDataChange(id, { ...data, customName: newName });

    // Styles
    const animationStyle = isShaking ? 'shake 0.3s ease-in-out' : !hasMounted ? 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none';
    const cursorStyle = isNodePaused ? 'not-allowed' : isDragging ? 'grabbing' : 'grab';
    const pausedStyle = { filter: 'grayscale(80%)', opacity: 0.7 };

    const containerStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${data.width || (isFreeResizing ? freeSize.width : computedWidth)}px`,
        height: data.height ? `${data.height}px` : (isFreeResizing ? `${freeSize.height}px` : undefined),
        background: isInfected ? 'linear-gradient(165deg, rgba(220, 38, 38, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%)' : 'linear-gradient(180deg, rgba(56, 189, 248, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%)',
        border: isInfected ? '3px solid #ff0000' : selected ? '3px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.2)',
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
        overflow: 'visible',
        ...(isNodePaused ? pausedStyle : {}),
    };

    return (
        <NodeInteractionProvider
            nodeId={id}
            nodeData={data}
            onDataChange={onDataChange}
            onConnectionStart={onConnectionStart}
            onConnectionComplete={onConnectionComplete}
            onDeleteConnection={onDeleteConnection}
        >
            <div
                id={id}
                ref={nodeRef}
                className="custom-node-base"
                data-no-selection="true"
                onPointerDown={(e) => {
                    e.stopPropagation();
                    const isMultiSelect = e.ctrlKey || e.shiftKey;
                    hasDraggedRef.current = false;
                    if (!selected || isMultiSelect) {
                        onSelect?.(isMultiSelect);
                    }
                    handleDragPointerDown(e);
                }}
                style={containerStyle}
                onContextMenu={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!hasDraggedRef.current && selected && !(e.ctrlKey || e.shiftKey)) {
                        onSelect?.(false);
                    }
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {!data.hideHeader && (
                    <NodeHeader
                        id={id}
                        customName={customName}
                        isRenamable={isRenamable}
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
                        hideTitleLabel={data.hideTitleLabel || (nodeType === 'node-prompt' && (data.width || (isFreeResizing ? freeSize.width : computedWidth)) < 210)}
                    />
                )}

                <NodeBody
                    id={id}
                    data={data}
                    inputs={inputs}
                    outputs={outputs}
                    connections={connections}
                    selected={selected}
                    nodeType={nodeType}
                    showMaterialPreview={showMaterialPreview}
                    previewParams={previewParams}
                    children={children}
                    onEditMaterial={onEditMaterial}
                />

                <NodeErrorOverlay
                    id={id}
                    isInfected={isInfected}
                    customName={customName}
                    showErrorDetails={showErrorDetails}
                    setShowErrorDetails={setShowErrorDetails}
                />

                {data.freeResizable && selected && (
                    <>
                        <div onPointerDown={(e) => handleFreeResizeStart(e, 'e')} style={{ position: 'absolute', top: 0, right: -4, width: 10, height: '100%', cursor: 'ew-resize', zIndex: 110 }} />
                        <div onPointerDown={(e) => handleFreeResizeStart(e, 'w')} style={{ position: 'absolute', top: 0, left: -4, width: 10, height: '100%', cursor: 'ew-resize', zIndex: 110 }} />
                        <div onPointerDown={(e) => handleFreeResizeStart(e, 's')} style={{ position: 'absolute', bottom: -4, left: 0, width: '100%', height: 10, cursor: 'ns-resize', zIndex: 110 }} />
                        <div onPointerDown={(e) => handleFreeResizeStart(e, 'se')} style={{ position: 'absolute', bottom: -5, right: -5, width: 15, height: 15, cursor: 'nwse-resize', zIndex: 111 }} />
                        <div onPointerDown={(e) => handleFreeResizeStart(e, 'sw')} style={{ position: 'absolute', bottom: -5, left: -5, width: 15, height: 15, cursor: 'nesw-resize', zIndex: 111 }} />
                    </>
                )}

                {!data.freeResizable && (
                    <NodeResizeHandle
                        data={data}
                        onResizeMouseDown={handleResizeMouseDown}
                    />
                )}
            </div>
        </NodeInteractionProvider>
    );
});
