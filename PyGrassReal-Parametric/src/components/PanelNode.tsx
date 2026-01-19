import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Trash2, LogIn, X } from 'lucide-react';
import type { NodeData, Connection } from '../types/NodeTypes';

interface PanelNodeProps {
    id: string;
    data: any;
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
    onDataChange?: (id: string, data: any) => void;
    onDeleteConnection?: (connectionId: string) => void;
    isShaking?: boolean;
    onConnectionStart?: (nodeId: string, portId: string, position: { x: number; y: number }) => void;
}

export const PanelNode: React.FC<PanelNodeProps> = ({
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
}) => {
    // Resize State
    const [size, setSize] = useState({
        width: Math.max(340, data.width || 340),
        height: Math.max(300, data.height || 300)
    });
    const [isResizing, setIsResizing] = useState(false);
    const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number; direction: string } | null>(null);

    // Animation State
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setHasMounted(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const animationStyle = isShaking
        ? 'shake 0.3s ease-in-out'
        : !hasMounted
            ? 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            : 'none';

    // Sync size from props if changed externally (but ignore small default '1's from generic node data)
    useEffect(() => {
        // Check for valid dimensions (> 50px) to distinguish from default initialization
        if (data.width && data.height && (data.width > 50 || data.height > 50)) {
            // Trust the props directly without forcing a minimum here. 
            // The resize handler already enforces the minimums (300x200) before saving.
            setSize({ width: data.width, height: data.height });
        }
    }, [data.width, data.height]);

    const handleResizeStart = (e: React.MouseEvent, direction: string) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            width: size.width,
            height: size.height,
            direction
        };
    };

    useEffect(() => {
        if (!isResizing) return;

        const handleResizeMove = (e: MouseEvent) => {
            if (!resizeStartRef.current) return;
            const { x, y, width, height, direction } = resizeStartRef.current;
            const deltaX = (e.clientX - x) / (scale || 1);
            const deltaY = (e.clientY - y) / (scale || 1);

            let newWidth = width;
            let newHeight = height;

            if (direction.includes('e')) newWidth = Math.max(300, width + deltaX);
            if (direction.includes('s')) newHeight = Math.max(200, height + deltaY);

            setSize({ width: newWidth, height: newHeight });

            // Trigger real-time update for connections
            if (onDataChange) {
                onDataChange(id, { width: newWidth, height: newHeight });
            }
        };

        const handleResizeUp = () => {
            setIsResizing(false);
            if (onDataChange && resizeStartRef.current) {
                // Determine final size from state
                onDataChange(id, { width: size.width, height: size.height });
            }
            resizeStartRef.current = null;
        };

        window.addEventListener('mousemove', handleResizeMove);
        window.addEventListener('mouseup', handleResizeUp);
        return () => {
            window.removeEventListener('mousemove', handleResizeMove);
            window.removeEventListener('mouseup', handleResizeUp);
        };
    }, [isResizing, size, scale, id, onDataChange]);

    // Determine connected node
    const connectedNode = useMemo(() => {
        const inputConnection = connections.find(c => c.targetNodeId === id);
        if (!inputConnection) return null;
        return nodes.find(n => n.id === inputConnection.sourceNodeId);
    }, [connections, nodes, id]);

    // Color themes
    const colorThemes = [
        { name: 'Blue', bg: 'linear-gradient(165deg, rgba(14, 165, 233, 0.6) 0%, rgba(255, 255, 255, 0.5) 100%)', border: '#38bdf8' },
        { name: 'Red', bg: 'linear-gradient(165deg, rgba(220, 38, 38, 0.85) 0%, rgba(255, 255, 255, 0.4) 100%)', border: '#dc2626' },
        { name: 'Green', bg: 'linear-gradient(165deg, rgba(34, 197, 94, 0.6) 0%, rgba(255, 255, 255, 0.5) 100%)', border: '#22c55e' },
        { name: 'Orange', bg: 'linear-gradient(165deg, rgba(245, 158, 11, 0.6) 0%, rgba(255, 255, 255, 0.5) 100%)', border: '#f59e0b' },
        { name: 'Purple', bg: 'linear-gradient(165deg, rgba(14, 165, 233, 0.6) 0%, rgba(255, 255, 255, 0.5) 100%)', border: '#38bdf8' },
    ];
    const [colorIndex, setColorIndex] = useState(0);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const currentTheme = colorThemes[colorIndex];

    // Dragging Logic
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; nodeX: number; nodeY: number } | null>(null);
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Left click only
        // Prevent drag if clicking on resize handles or content (handled separately if needed)
        // Checks passed via stopPropagation on handles
        e.stopPropagation();
        onSelect?.();

        // Don't drag if resizing
        if (isResizing) return;

        setIsDragging(true);
        setDragStart({
            mouseX: e.clientX,
            mouseY: e.clientY,
            nodeX: position.x,
            nodeY: position.y,
        });
    };

    useEffect(() => {
        if (!isDragging || !dragStart) return;

        const handleMouseMove = (e: MouseEvent) => {
            const currentScale = Math.max(scale || 1, 0.01);
            const deltaX = (e.clientX - dragStart.mouseX) / currentScale;
            const deltaY = (e.clientY - dragStart.mouseY) / currentScale;

            onPositionChange(id, {
                x: dragStart.nodeX + deltaX,
                y: dragStart.nodeY + deltaY,
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setDragStart(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart, id, onPositionChange, scale]);


    return (
        <>
            <style>
                {`
                    @keyframes popIn {
                        0% { transform: scale(0); opacity: 0; }
                        70% { transform: scale(1.1); opacity: 1; }
                        100% { transform: scale(1); opacity: 1; }
                    }
                    @keyframes shake {
                        0% { transform: translate(0, 0); }
                        25% { transform: translate(-3px, 3px); }
                        50% { transform: translate(3px, -3px); }
                        75% { transform: translate(-3px, 3px); }
                        100% { transform: translate(0, 0); }
                    }
                `}
            </style>
            <div
                id={id}
                style={{
                    animation: animationStyle,
                    position: 'absolute',
                    left: position.x,
                    top: position.y,
                    width: size.width,
                    height: size.height,
                    background: currentTheme.bg,
                    border: selected ? '3px solid #38bdf8' : `1px solid rgba(255, 255, 255, 0.5)`,
                    borderRadius: 16,
                    boxShadow: selected
                        ? '0 0 0 4px rgba(56, 189, 248, 0.4), 0 0 30px 5px rgba(56, 189, 248, 0.6)'
                        : '0 10px 30px -5px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontFamily: 'Inter, sans-serif',
                    display: 'flex',
                    flexDirection: 'column',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    zIndex: selected ? 100 : 10,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    pointerEvents: 'auto', // Ensure it captures events
                }}
                data-no-selection="true"
                onMouseDown={handleMouseDown}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
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
                    {connections.some(c => c.targetNodeId === id) && onDeleteConnection && (
                        <div
                            onClick={(e) => {
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
                    {connections.some(c => c.sourceNodeId === id && c.sourcePort === 'output-main') && onDeleteConnection && (
                        <div
                            onClick={(e) => {
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
                        title="Output Panel Data"
                    />
                </div>


                {/* Header */}
                <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    borderRadius: '16px 16px 0 0',
                    // Header is draggable via parent handler
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>👁️</span>
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>Panel</span>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }} onMouseDown={(e) => e.stopPropagation()}>

                        {/* Duplicate Button (Visible on Hover) */}
                        {isHovered && onDuplicate && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDuplicate(id);
                                }}
                                title="Duplicate Node"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    border: '1px solid rgba(255, 255, 255, 0.4)',
                                    borderRadius: '6px',
                                    width: '24px',
                                    height: '24px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    zIndex: 105,
                                }}
                            >
                                <span style={{ fontSize: '14px', fontWeight: 'bold', lineHeight: 1 }}>+</span>
                            </button>
                        )}

                        {/* Join/Leave Group Buttons */}
                        {overlappingGroupId && !parentGroupId && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onJoinGroup?.(id, overlappingGroupId);
                                }}
                                style={{
                                    background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '6px',
                                    padding: '4px',
                                    width: '24px',
                                    height: '24px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    zIndex: 105,
                                }}
                                title="Join Group"
                            >
                                <LogIn size={14} strokeWidth={3} />
                            </button>
                        )}

                        {parentGroupId && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onLeaveGroup?.(id);
                                }}
                                style={{
                                    background: 'rgba(255, 165, 0, 0.3)',
                                    border: '1px solid rgba(255, 165, 0, 0.6)',
                                    borderRadius: '6px',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '24px',
                                    height: '24px',
                                    zIndex: 105,
                                }}
                                title="Leave Group"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                            </button>
                        )}

                        {/* Color Picker Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent drag/select
                                setShowColorPicker(!showColorPicker);
                            }}
                            onMouseDown={(e) => e.stopPropagation()} // Extra safety
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.4)',
                                borderRadius: '6px',
                                padding: 4, // Match delete button
                                width: '24px',
                                height: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                zIndex: 105,
                            }}
                            title="Change Color"
                        >
                            <span style={{ fontSize: '12px' }}>🎨</span>
                            {showColorPicker && (
                                <div style={{
                                    position: 'absolute',
                                    top: '30px',
                                    right: 0,
                                    background: 'rgba(30, 30, 30, 0.95)',
                                    backdropFilter: 'blur(10px)',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    gap: '6px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    zIndex: 1000,
                                    minWidth: 'max-content',
                                    pointerEvents: 'auto',
                                }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    {colorThemes.map((theme, idx) => (
                                        <div
                                            key={theme.name}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setColorIndex(idx);
                                                setShowColorPicker(false);
                                            }}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '4px',
                                                background: theme.bg,
                                                border: idx === colorIndex ? '2px solid white' : '1px solid rgba(255,255,255,0.3)',
                                                cursor: 'pointer',
                                                transition: 'transform 0.1s',
                                            }}
                                            title={theme.name}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        />
                                    ))}
                                </div>
                            )}
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent drag/select
                                onDelete(id);
                            }}
                            onMouseDown={(e) => e.stopPropagation()} // Extra safety
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.4)',
                                borderRadius: '6px',
                                padding: 4,
                                cursor: 'pointer',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '24px',
                                height: '24px',
                                zIndex: 105,
                            }}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                {/* Content Area - Scrollable */}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9 }}>
                                <span>🎯</span>
                                <span><strong>Target:</strong> {connectedNode.data.customName || connectedNode.type}</span>
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 6, fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ opacity: 0.7, marginBottom: 4 }}>ID: {connectedNode.id}</div>
                                <div style={{ opacity: 0.7, marginBottom: 4 }}>Type: {connectedNode.type}</div>
                                <div style={{ color: '#93c5fd', fontWeight: 'bold' }}>
                                    X: {Math.round(connectedNode.position.x)}, Y: {Math.round(connectedNode.position.y)}
                                </div>
                            </div>

                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, opacity: 0.9 }}>
                                    <span>📦</span>
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
                        <div style={{
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
                            <span style={{ fontSize: 24 }}>🔌</span>
                            <span style={{ fontWeight: 500 }}>No Connection</span>
                        </div>
                    )}
                </div>

                {/* Resize Handles - Show only on hover or selection */}
                {(isHovered || selected) && (
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
                    </>
                )}
            </div>
        </>
    );
};
