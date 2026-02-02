import React, { useMemo, useState, useEffect } from 'react';
import { X, Eye, EyeOff, Target, Database, Search } from 'lucide-react';
import type { NodeData, Connection } from '../types/NodeTypes';
import { useNodeDrag } from '../hooks/useNodeDrag';
import { useInspectorNodeResize } from '../hooks/useInspectorNodeResize';
import clsx from 'clsx';
import './CustomNode.css';
import './CustomNodeMenu.css';
import { NodeActionBar } from './NodeActionBar';

interface InspectorNodeProps {
    id: string;
    data: {
        customName?: string;
        width?: number;
        height?: number;
        isPaused?: boolean;
    };
    position: { x: number; y: number };
    selected: boolean;
    nodes: NodeData[];
    connections: Connection[];
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    onDelete: (id: string) => void;
    onConnectionComplete: (nodeId: string, portId: string) => void;
    onSelect?: () => void;
    scale?: number;
    // New Props for Group/Duplicate
    onDuplicate?: (id: string) => void;
    parentGroupId?: string;
    overlappingGroupId?: string;
    onJoinGroup?: (nodeId: string, groupId: string) => void;
    onLeaveGroup?: (nodeId: string) => void;
    onDataChange: (id: string, data: Partial<InspectorNodeProps['data']>) => void;
    onDeleteConnection?: (connectionId: string) => void;
    isShaking?: boolean;
    onConnectionStart?: (nodeId: string, portId: string, position: { x: number; y: number }) => void;
    interactionMode?: 'node' | '3d' | 'wire';
    isInfected?: boolean;
    isPaused?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}

export const InspectorNode: React.FC<InspectorNodeProps> = ({
    id,
    data,
    position,
    selected,
    nodes,
    connections,
    onPositionChange,
    onDelete,
    onConnectionComplete,
    onSelect,
    scale = 1,
    onDuplicate,
    parentGroupId,
    overlappingGroupId,
    onJoinGroup,
    onLeaveGroup,
    onDataChange,
    onDeleteConnection,
    isShaking,
    onConnectionStart,
    interactionMode,
    isInfected = false,
    isPaused = false,
    onDragStart,
    onDragEnd,
}) => {
    const { size, isResizing, handleResizeStart } = useInspectorNodeResize({
        id,
        initialWidth: data.width,
        initialHeight: data.height,
        scale,
        position,
        onDataChange,
        onPositionChange,
    });

    // Animation State
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setHasMounted(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const isNodePaused = data.isPaused ?? isPaused;

    const animationClasses = clsx('custom-node-base', selected ? 'custom-node-selected' : 'custom-node-unselected', {
        'custom-node-paused': isNodePaused,
        'custom-node-infected': !isNodePaused && isInfected,
        'custom-node-normal': !isNodePaused && !isInfected,
        'custom-node-animation-shake': isShaking,
        'custom-node-animation-popin': !hasMounted,
    });

    // Determine connected node
    const connectedNode = useMemo(() => {
        const inputConnection = connections.find(c => c.targetNodeId === id);
        if (!inputConnection) return null;
        return nodes.find(n => n.id === inputConnection.sourceNodeId);
    }, [connections, nodes, id]);

    const vectorXYZValues = useMemo(() => {
        if (!connectedNode || connectedNode.type !== 'vector-xyz') return null;

        const getNumberFromInput = (portId: string) => {
            const inputConn = connections.find(
                (conn) => conn.targetNodeId === connectedNode.id && conn.targetPort === portId
            );
            if (!inputConn) return null;
            const source = nodes.find((node) => node.id === inputConn.sourceNodeId);
            if (!source || source.type !== 'number-slider') return null;
            return typeof source.data.value === 'number' ? source.data.value : null;
        };

        return {
            x: getNumberFromInput('X'),
            y: getNumberFromInput('Y'),
            z: getNumberFromInput('Z'),
        };
    }, [connectedNode, connections, nodes]);

    const layerSourceData = useMemo(() => {
        if (!connectedNode || connectedNode.type !== 'layer-source') return null;

        // Find all connections targeting this layer source node
        // We sort by port index/id to maintain order if possible, or just arrival order
        const inputConnections = connections.filter(c => c.targetNodeId === connectedNode.id);

        // Map connections to source nodes
        const sourceNodes = inputConnections.map(conn => {
            const node = nodes.find(n => n.id === conn.sourceNodeId);
            return { node, portId: conn.targetPort };
        }).filter(item => item.node !== undefined);

        return sourceNodes;
    }, [connectedNode, connections, nodes]);

    const [showAllSeries, setShowAllSeries] = useState(false);

    const { isDragging, handleMouseDown } = useNodeDrag({
        id,
        position,
        onPositionChange,
        scale,
        onSelect,
        isResizing,
        onDragStart,
        onDragEnd
    });

    const cursorStyle = isNodePaused ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab');
    const activeBackground = isInfected
        ? 'linear-gradient(165deg, rgba(220, 38, 38, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%)'
        : 'linear-gradient(180deg, rgba(56, 189, 248, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%)';
    const activeBorder = isInfected
        ? '3px solid #ff0000'
        : selected
            ? '3px solid #38bdf8'
            : '1px solid rgba(255, 255, 255, 0.2)';
    const activeBoxShadow = isInfected
        ? '0 0 0 4px rgba(255, 0, 0, 0.4), 0 0 30px 5px rgba(255, 0, 0, 0.8), 0 10px 30px -5px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 0, 0, 0.3)'
        : selected
            ? '0 0 0 4px rgba(56, 189, 248, 0.4), 0 0 30px 5px rgba(56, 189, 248, 0.6), 0 10px 30px -5px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(56, 189, 248, 0.3)'
            : '0 10px 30px -5px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.1)';
    const activeBackdropFilter = isInfected ? 'blur(4px) saturate(180%)' : 'blur(6px) saturate(180%)';
    const containerBaseStyle = {
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        borderRadius: '16px',
        color: 'white',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        zIndex: selected ? 100 : 1,
        cursor: cursorStyle,
        pointerEvents: 'auto',
        userSelect: 'none',
        transition: 'border 0.3s ease, box-shadow 0.3s ease, background 0.3s ease, opacity 0.3s ease, filter 0.3s ease',
    };
    const activeStyle = {
        background: activeBackground,
        border: activeBorder,
        boxShadow: activeBoxShadow,
        backdropFilter: activeBackdropFilter,
        WebkitBackdropFilter: activeBackdropFilter,
        filter: 'none',
        opacity: 1,
    };
    const pausedStyle = {
        background: 'rgba(50, 50, 50, 0.8)',
        border: '1px solid #666',
        boxShadow: '0 20px 50px -20px rgba(0, 0, 0, 0.85), inset 0 0 30px rgba(255, 255, 255, 0.08)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        filter: 'grayscale(100%)',
        opacity: 1,
    };
    const containerStyle = {
        ...containerBaseStyle,
        ...(isNodePaused ? pausedStyle : activeStyle),
    };
    const togglePauseState = () => {
        onDataChange(id, { isPaused: !isNodePaused });
    };
    return (
        <>
            <div
                id={id}
                className={animationClasses}
                style={containerStyle}
                data-no-selection="true"
                onMouseDown={handleMouseDown}
            >
                {/* Input Port - Positioned Absolutely relative to the Main Node container, NOT inside scrollable area */}
                <div
                    style={{
                        position: 'absolute',
                        left: '-7px', // stick out slightly
                        top: '50%', // Centered vertically
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        alignItems: 'center',
                        zIndex: 102, // Higher than node content
                        pointerEvents: 'auto'
                    }}
                >
                    {/* Disconnect Button */}
                    {connections.some(c => c.targetNodeId === id) && onDeleteConnection && interactionMode === 'wire' && (
                        <div
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const conn = connections.find(c => c.targetNodeId === id);
                                if (conn) onDeleteConnection(conn.id);
                            }}
                            style={{
                                position: 'absolute',
                                left: '-25px',
                                cursor: 'pointer',
                                color: '#000000',
                                background: '#22c55e',
                                borderRadius: '50%',
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                zIndex: 103,
                            }}
                            title="Disconnect"
                        >
                            <X size={10} strokeWidth={3} />
                        </div>
                    )}
                    <div
                        id={`port-${id}-input-main`}
                        className="node-port"
                        onMouseUp={(e) => {
                            e.stopPropagation();
                            onConnectionComplete(id, 'input-main');
                        }}
                        style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: '#22c55e',
                            border: '2px solid #ffffff',
                            cursor: 'crosshair',
                            boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
                            transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        title="Connect node to inspect"
                    />
                </div>

                {/* Output Port - Positioned Absolutely on Right */}
                <div
                    style={{
                        position: 'absolute',
                        right: '-7px', // stick out slightly
                        top: '50%', // Centered vertically
                        transform: 'translate(50%, -50%)',
                        display: 'flex',
                        alignItems: 'center',
                        zIndex: 102, // Higher than node content
                        pointerEvents: 'auto'
                    }}
                >
                    {/* Disconnect Button (Output) */}
                    {connections.some(c => c.sourceNodeId === id && c.sourcePort === 'output-main') && onDeleteConnection && interactionMode === 'wire' && (
                        <div
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Find connections from this output
                                const conns = connections.filter(c => c.sourceNodeId === id && c.sourcePort === 'output-main');
                                conns.forEach(c => onDeleteConnection(c.id));
                            }}
                            style={{
                                position: 'absolute',
                                right: '-25px', // Shift right to avoid overlap with port
                                cursor: 'pointer',
                                color: '#000000',
                                background: '#ef4444', // Red for output
                                borderRadius: '50%',
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                zIndex: 103,
                            }}
                            title="Disconnect Output"
                        >
                            <X size={10} strokeWidth={3} />
                        </div>
                    )}
                    <div
                        id={`port-${id}-output-main`}
                        className="node-port"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            if (onConnectionStart) {
                                onConnectionStart(id, 'output-main', { x: e.clientX, y: e.clientY });
                            }
                        }}
                        style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: '#ef4444', // Red for Output
                            border: '2px solid #ffffff',
                            cursor: 'crosshair',
                            boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                            transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        title="Output Inspector Data"
                    />
                </div>


                {/* Header */}
                <div className="node-header">
                    <div className="node-header-title">
                        <span style={{ fontSize: '18px' }}>👁</span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff', whiteSpace: 'normal', lineHeight: 1.2 }}>
                            Inspector
                        </span>
                    </div>

                    <NodeActionBar
                        selected={selected}
                        isPaused={isNodePaused}
                        onTogglePause={togglePauseState}
                        pauseTitle={isNodePaused ? 'Resume Inspector' : 'Pause Inspector'}
                        onDuplicate={onDuplicate ? () => onDuplicate(id) : undefined}
                        duplicateTitle="Duplicate Inspector"
                        onInfo={() => {
                            alert(`Inspector ID: ${id}`);
                        }}
                        infoTitle="Inspector Info"
                        onDelete={() => onDelete(id)}
                        canJoinGroup={!!(overlappingGroupId && !parentGroupId && onJoinGroup)}
                        onJoinGroup={() => onJoinGroup?.(id, overlappingGroupId!)}
                        canLeaveGroup={!!(parentGroupId && onLeaveGroup)}
                        onLeaveGroup={() => onLeaveGroup?.(id)}
                    />
                </div>                {/* Content Area - Scrollable */}
                <div style={{
                    padding: 16,
                    fontSize: 12,
                    flex: 1, // Fill remaining height
                    overflowY: 'auto',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column'
                }}>


                    {connectedNode ? (
                        <div key={connectedNode.id} className="popIn" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9 }}>
                                <Target size={16} color="#38bdf8" />
                                <span><strong>Target:</strong> {connectedNode.data.customName || connectedNode.type}</span>
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 6, fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ opacity: 0.7, marginBottom: 4 }}>ID: {connectedNode.id}</div>
                                <div style={{ opacity: 0.7, marginBottom: 4 }}>Type: {connectedNode.type}</div>
                                <div style={{ color: '#93c5fd', fontWeight: 'bold' }}>
                                    X: {Math.round(connectedNode.position.x)}, Y: {Math.round(connectedNode.position.y)}
                                </div>
                            </div>

                            {vectorXYZValues && (vectorXYZValues.x !== null || vectorXYZValues.y !== null || vectorXYZValues.z !== null) && (
                                <div style={{ background: 'rgba(15, 23, 42, 0.35)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.5px', marginBottom: 6 }}>
                                        Vector XYZ
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>X</span>
                                            <span>{vectorXYZValues.x ?? 0}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Y</span>
                                            <span>{vectorXYZValues.y ?? 0}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Z</span>
                                            <span>{vectorXYZValues.z ?? 0}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {connectedNode.type === 'number-slider' && (
                                <div style={{ background: 'rgba(15, 23, 42, 0.35)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.5px', marginBottom: 6 }}>
                                        Number Value
                                    </div>
                                    <div style={{ fontSize: 16, fontWeight: 'bold', color: '#38bdf8' }}>
                                        {typeof connectedNode.data.value === 'number' ? connectedNode.data.value : 'N/A'}
                                    </div>
                                </div>
                            )}

                            {connectedNode.type === 'series' && (() => {
                                const start = typeof connectedNode.data.start === 'number' ? connectedNode.data.start : 0;
                                const step = typeof connectedNode.data.step === 'number' ? connectedNode.data.step : 1;
                                const count = typeof connectedNode.data.count === 'number' ? connectedNode.data.count : 1;
                                const safeCount = Math.max(1, Math.floor(count));
                                const previewLimit = showAllSeries ? safeCount : Math.min(safeCount, 10);
                                const preview = Array.from({ length: previewLimit }, (_, i) => {
                                    const value = start + (step * i);
                                    return Math.round(value * 1000) / 1000;
                                });
                                const previewText = preview.join('\n') + (!showAllSeries && safeCount > 10 ? '\n...' : '');
                                return (
                                    <div style={{ background: 'rgba(15, 23, 42, 0.35)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.5px' }}>
                                                Output Preview
                                            </div>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={showAllSeries}
                                                    onChange={(e) => setShowAllSeries(e.target.checked)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                Show All
                                            </label>
                                        </div>
                                        <div style={{ fontSize: 12, color: '#e2e8f0', whiteSpace: 'pre-line' }}>
                                            {previewText}
                                        </div>
                                    </div>
                                );
                            })()}

                            {layerSourceData && (
                                <div style={{ background: 'rgba(15, 23, 42, 0.35)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', marginBottom: 12 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.5px', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Layer Objects</span>
                                        <span style={{ opacity: 0.5 }}>{layerSourceData.length} items</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#e2e8f0', maxHeight: '150px', overflowY: 'auto' }}>
                                        {layerSourceData.length === 0 ? (
                                            <div style={{ fontStyle: 'italic', opacity: 0.5, padding: 4 }}>No objects connected</div>
                                        ) : (
                                            layerSourceData.map((item, index) => (
                                                <div key={`${item.node!.id}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                                                    <span style={{ opacity: 0.5, minWidth: 16, fontSize: 10 }}>{index + 1}.</span>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: 500 }}>{item.node!.data.customName || item.node!.type}</span>
                                                        <span style={{ opacity: 0.4, fontSize: 9 }}>ID: {item.node!.id.slice(0, 6)}...</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, opacity: 0.9 }}>
                                    <Database size={16} color="#38bdf8" />
                                    <span><strong>Node Data:</strong></span>
                                </div>
                                <pre style={{
                                    margin: 0,
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: 10,
                                    borderRadius: 6,
                                    overflowX: 'auto',
                                    fontSize: 11,
                                    lineHeight: '1.4',
                                    color: '#a5f3fc',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {JSON.stringify(connectedNode.data, null, 2)}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        <div key="no-connection" className="popIn" style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            gap: 8,
                            opacity: 0.5,
                            border: '2px dashed rgba(255,255,255,0.15)',
                            borderRadius: 8,
                            background: 'rgba(0,0,0,0.1)',
                            minHeight: '100px'
                        }}>
                            <Search size={40} strokeWidth={1.5} />
                            <span style={{ fontWeight: 500 }}>No Connection</span>
                        </div>
                    )}
                </div>

                {/* Resize Handles - Show only on hover or selection */}
                {selected && (
                    <>
                        {/* Right Edge (E) */}
                        <div
                            onMouseDown={(e) => handleResizeStart(e, 'e')}
                            style={{
                                position: 'absolute',
                                top: 0,
                                right: -4,
                                width: 10,
                                height: '100%',
                                cursor: 'ew-resize',
                                zIndex: 110,
                            }}
                        />
                        {/* Left Edge (W) */}
                        <div
                            onMouseDown={(e) => handleResizeStart(e, 'w')}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: -4,
                                width: 10,
                                height: '100%',
                                cursor: 'ew-resize',
                                zIndex: 110,
                            }}
                        />
                        {/* Bottom Edge (S) */}
                        <div
                            onMouseDown={(e) => handleResizeStart(e, 's')}
                            style={{
                                position: 'absolute',
                                bottom: -4,
                                left: 0,
                                width: '100%',
                                height: 10,
                                cursor: 'ns-resize',
                                zIndex: 110,
                            }}
                        />
                        {/* Bottom-Right Corner (SE) */}
                        <div
                            onMouseDown={(e) => handleResizeStart(e, 'se')}
                            style={{
                                position: 'absolute',
                                bottom: -6,
                                right: -6,
                                width: 20,
                                height: 20,
                                cursor: 'nwse-resize',
                                zIndex: 120,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {/* Visual Corner Marker */}
                            <div style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: selected ? '#646cff' : 'rgba(255,255,255,0.5)',
                                boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                            }} />
                        </div>
                        {/* Bottom-Left Corner (SW) */}
                        <div
                            onMouseDown={(e) => handleResizeStart(e, 'sw')}
                            style={{
                                position: 'absolute',
                                bottom: -6,
                                left: -6,
                                width: 20,
                                height: 20,
                                cursor: 'nesw-resize',
                                zIndex: 120,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {/* Visual Corner Marker */}
                            <div style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: selected ? '#646cff' : 'rgba(255,255,255,0.5)',
                                boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                            }} />
                        </div>
                    </>
                )}
            </div >
        </>
    );
};




