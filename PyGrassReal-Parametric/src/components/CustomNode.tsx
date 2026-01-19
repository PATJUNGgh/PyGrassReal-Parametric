import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, X, LogIn, LogOut } from 'lucide-react';

interface CustomNodeProps {
    id: string;
    data: {
        customName?: string;
        inputs?: Array<{ id: string; label: string }>;
        outputs?: Array<{ id: string; label: string }>;
        width?: number;
        height?: number;
        isGroup?: boolean;
        componentId?: string;
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
    scale,
    isInfected,
    onDuplicate,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    // Store initial drag state for precise delta calculation
    const [dragStart, setDragStart] = useState<{
        mouseX: number;
        mouseY: number;
        nodeX: number;
        nodeY: number;
    } | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [showErrorDetails, setShowErrorDetails] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const customName = data.customName ?? 'Custom Node';
    const inputs = data.inputs || [];
    const outputs = data.outputs || [];
    const nodeRef = useRef<HTMLDivElement>(null);
    const [hasMounted, setHasMounted] = useState(false);
    const computedWidth = data.componentId
        ? Math.min(620, Math.max(320, (customName.length * 8) + 180))
        : 320;



    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        // Record starting positions
        setDragStart({
            mouseX: e.clientX,
            mouseY: e.clientY,
            nodeX: position.x,
            nodeY: position.y,
        });
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging && dragStart) {
            // Nodes are rendered inside a transform container with:
            // transform: translate(offset.x, offset.y) scale(scale)
            // 
            // To convert screen coordinates to canvas coordinates:
            // canvasX = (screenX - offset.x) / scale
            // canvasY = (screenY - offset.y) / scale
            //
            // But we're calculating delta, so:
            // deltaCanvas = deltaScreen / scale

            const currentScale = Math.max(scale || 1, 0.01);
            const deltaX = (e.clientX - dragStart.mouseX) / currentScale;
            const deltaY = (e.clientY - dragStart.mouseY) / currentScale;

            onPositionChange(id, {
                x: dragStart.nodeX + deltaX,
                y: dragStart.nodeY + deltaY,
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragStart]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setHasMounted(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // Notify parent when structure changes (for group auto-resize)
    useEffect(() => {
        if (!hasMounted) return;

        // Signal that structure changed (after DOM updates)
        const timer = setTimeout(() => {
            onDataChange(id, { ...data, _structureChanged: Date.now() });
        }, 150);

        return () => clearTimeout(timer);
    }, [inputs.length, outputs.length, hasMounted]);

    const handleNameChange = (newName: string) => {
        onDataChange(id, { ...data, customName: newName });
    };

    const handleAddInput = () => {
        const newInput = {
            id: `input-${Date.now()}`,
            label: `Input ${inputs.length + 1}`,
        };
        onDataChange(id, { ...data, inputs: [...inputs, newInput] });
    };

    const handleAddOutput = () => {
        const newOutput = {
            id: `output-${Date.now()}`,
            label: `Output ${outputs.length + 1}`,
        };
        onDataChange(id, { ...data, outputs: [...outputs, newOutput] });
    };

    const handleRemoveInput = (inputId: string) => {
        onDataChange(id, {
            ...data,
            inputs: inputs.filter((inp) => inp.id !== inputId),
        });
    };

    const handleRemoveOutput = (outputId: string) => {
        onDataChange(id, {
            ...data,
            outputs: outputs.filter((out) => out.id !== outputId),
        });
    };

    const handlePortMouseDown = (e: React.MouseEvent, portId: string) => {
        e.stopPropagation();
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        onConnectionStart(id, portId, {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        });
    };

    const handlePortMouseUp = (e: React.MouseEvent, portId: string) => {
        e.stopPropagation();
        onConnectionComplete(id, portId);
    };

    const animationStyle = isShaking
        ? 'shake 0.3s ease-in-out'
        : !hasMounted
            ? 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            : 'none';

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
                    @keyframes warningPulse {
                        0% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(255, 193, 7, 0.6)); opacity: 1; }
                        25% { transform: scale(1.3); filter: drop-shadow(0 0 20px rgba(255, 230, 0, 1)); opacity: 1; }
                        50% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(255, 193, 7, 0.6)); opacity: 1; }
                        75% { transform: scale(1.15); filter: drop-shadow(0 0 15px rgba(255, 230, 0, 0.9)); opacity: 1; }
                        100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(255, 193, 7, 0.6)); opacity: 1; }
                    }
                    @keyframes criticalBorderPulse {
                        0% { 
                            box-shadow: 0 0 0 4px rgba(255, 0, 0, 0.4), 0 0 30px 5px rgba(255, 0, 0, 0.6); 
                            border-color: #ff0000; 
                        }
                        50% { 
                            box-shadow: 0 0 0 8px rgba(255, 50, 50, 0.7), 0 0 60px 20px rgba(255, 0, 0, 0.9); 
                            border-color: #ff5555;
                        }
                        100% { 
                            box-shadow: 0 0 0 4px rgba(255, 0, 0, 0.4), 0 0 30px 5px rgba(255, 0, 0, 0.6); 
                            border-color: #ff0000; 
                        }
                    }
                    @keyframes modalPopIn {
                        0% { 
                            opacity: 0;
                            transform: translateX(-50%) scale(0.5);
                        }
                        70% { 
                            transform: translateX(-50%) scale(1.1);
                        }
                        100% { 
                            opacity: 1;
                            transform: translateX(-50%) scale(1);
                        }
                    }
                    .node-port {
                        transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    }
                    .node-port:hover {
                        transform: scale(1.2) !important;
                        box-shadow: 0 0 12px rgba(255, 255, 255, 0.8);
                        z-index: 101;
                    }
                `}
            </style>
            <div
                id={id}
                ref={nodeRef}
                data-no-selection="true"
                onMouseDown={(e) => {
                    e.stopPropagation(); // Prevent selection box in App
                    onSelect?.(); // Select this node
                    handleMouseDown(e);
                }}
                style={{
                    position: 'absolute',
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: `${computedWidth}px`,
                    background: isInfected
                        ? 'linear-gradient(165deg, rgba(220, 38, 38, 0.85) 0%, rgba(255, 255, 255, 0.4) 100%)'
                        : 'linear-gradient(165deg, rgba(14, 165, 233, 0.6) 0%, rgba(255, 255, 255, 0.5) 100%)',
                    // Infected Node (Error State - Red Border)
                    border: isInfected
                        ? '3px solid #ff0000'
                        : selected ? '3px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.5)',
                    borderRadius: '16px',
                    // Infected Node (Error State - Red Glow)
                    boxShadow: isInfected
                        ? '0 0 0 4px rgba(255, 0, 0, 0.4), 0 0 30px 5px rgba(255, 0, 0, 0.8), 0 10px 30px -5px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 0, 0, 0.3)'
                        : selected
                            ? '0 0 0 4px rgba(56, 189, 248, 0.4), 0 0 30px 5px rgba(56, 189, 248, 0.6), 0 10px 30px -5px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(56, 189, 248, 0.3)'
                            : '0 10px 30px -5px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.2)',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    backdropFilter: isInfected ? 'blur(12px) saturate(180%)' : 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: isInfected ? 'blur(12px) saturate(180%)' : 'blur(20px) saturate(180%)',
                    color: '#fff',
                    fontFamily: "'Inter', sans-serif",
                    animation: (isInfected && !isShaking) ? 'criticalBorderPulse 1.5s infinite ease-in-out' : animationStyle,
                    zIndex: selected ? 100 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    pointerEvents: 'auto', // Keep interactive
                }}
                onContextMenu={(e) => e.stopPropagation()} // Prevent canvas context menu
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.();
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '14px 18px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        position: 'relative',
                        background: 'transparent',
                        borderRadius: '14px 14px 0 0',
                    }}
                >
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
                            style={{
                                background: 'rgba(255, 255, 255, 0.9)',
                                border: '2px solid rgba(59, 130, 246, 0.6)',
                                borderRadius: '6px',
                                padding: '6px 10px',
                                color: '#1e293b',
                                fontSize: '14px',
                                fontWeight: 600,
                                width: 'calc(100% - 130px)',
                                maxWidth: 'calc(100% - 130px)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'text',
                                minWidth: 0,
                                flex: '1 1 auto',
                                paddingRight: '110px',
                            }}
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
                    <div style={{ display: 'flex', gap: '6px', position: 'absolute', right: '12px', top: '12px' }}>
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
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)';
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                <span style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: 1 }}>+</span>
                            </button>
                        )}

                        {/* Detach from Group button (only if in a group) */}
                        {/* Join Group button (only if NOT in a group but Overlapping one) */}
                        {overlappingGroupId && !parentGroupId && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onJoinGroup?.(id, overlappingGroupId);
                                }}
                                style={{
                                    background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)', // Vibrant Green Gradient
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '6px',
                                    padding: '4px',
                                    width: '24px',
                                    height: '24px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white', // White Icon
                                    marginRight: '0px',
                                    boxShadow: '0 2px 6px rgba(34, 197, 94, 0.4)',
                                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                    e.currentTarget.style.boxShadow = '0 0 12px rgba(74, 222, 128, 0.6)';
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #60f090 0%, #4ade80 100%)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(34, 197, 94, 0.4)';
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)';
                                }}
                                title="Join Group"
                            >
                                <LogIn size={14} strokeWidth={2.5} />
                            </button>
                        )}

                        {/* Detach from Group button (only if in a group) */}
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
                                    width: '24px',
                                    height: '24px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                title="Leave Group"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                                    <path d="M10 3H3v18h7M16 17l5-5-5-5M21 12H9" />
                                </svg>
                            </button>
                        )}
                        {data.componentId && onCluster && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCluster(id);
                                }}
                                style={{
                                    background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '6px',
                                    padding: '6px 8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    color: '#fff',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    letterSpacing: '0.4px',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.5)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                                title="Edit component"
                            >
                                Cluster
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(id);
                            }}
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.4)',
                                borderRadius: '6px',
                                padding: '4px',
                                width: '24px',
                                height: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            title="Delete Node"
                        >
                            <Trash2 size={14} color="#fff" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '16px', display: 'flex', gap: '20px', position: 'relative' }}>

                    {/* INPUTS Area */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)', letterSpacing: '0.5px', marginBottom: '4px' }}>
                            INPUTS
                        </div>

                        {inputs.map((input) => {
                            // Check if this specific input port has a connection
                            const isConnectedInput = connections.some(
                                conn => conn.targetNodeId === id && conn.targetPort === input.id
                            );

                            return (
                                <div key={input.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: '24px' }}>
                                    {/* Port with Delete Button Logic (Fixed Position: Absolute Left Stick Out) */}
                                    <div style={{
                                        position: 'absolute',
                                        left: '-32px', // Extrude out of node
                                        display: 'flex',
                                        alignItems: 'center',
                                        zIndex: 100
                                    }}>
                                        {/* Disconnect Button (Absolute LEFT of port) */}
                                        {!data.componentId && isConnectedInput && onDeleteConnection && (
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const connToDelete = connections.find(
                                                        c => c.targetNodeId === id && c.targetPort === input.id
                                                    );
                                                    if (connToDelete) {
                                                        onDeleteConnection(connToDelete.id);
                                                    }
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    left: '-25px', // Adjusted to -25px
                                                    cursor: 'pointer',
                                                    color: '#000000', // Black icon
                                                    background: '#22c55e', // Green background
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
                                                <X size={10} strokeWidth={3} />
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
                                                background: '#22c55e', // Green for Input
                                                border: '2px solid #ffffff',
                                                cursor: 'crosshair',
                                                boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
                                                position: 'relative',
                                            }}
                                        />
                                    </div>

                                    <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)' }}>{input.label}</span>
                                    {!data.componentId && (
                                        <button
                                            onClick={() => handleRemoveInput(input.id)}
                                            style={{
                                                marginLeft: 'auto',
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                opacity: 0.5,
                                                padding: '2px',
                                                display: 'flex'
                                            }}
                                        >
                                            <X size={12} color="#fff" />
                                        </button>
                                    )}
                                </div>
                            )
                        })}

                        {!data.componentId && (
                            <button
                                onClick={handleAddInput}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    border: '1px solid rgba(255, 255, 255, 0.4)',
                                    borderRadius: '6px',
                                    padding: '6px 10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '10px',
                                    color: '#fff',
                                    fontWeight: 600,
                                    width: 'fit-content',
                                }}
                            >
                                <Plus size={12} />
                                Add Input
                            </button>
                        )}
                    </div>

                    {/* OUTPUTS Area */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)', letterSpacing: '0.5px', marginBottom: '4px', textAlign: 'right', width: '100%' }}>
                            OUTPUTS
                        </div>

                        {outputs.map((output) => {
                            const isConnectedOutput = connections.some(
                                conn => conn.sourceNodeId === id && conn.sourcePort === output.id
                            );

                            return (
                                <div key={output.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', minHeight: '24px' }}>
                                    {!data.componentId && (
                                        <button
                                            onClick={() => handleRemoveOutput(output.id)}
                                            style={{
                                                marginRight: 'auto',
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                opacity: 0.5,
                                                padding: '2px',
                                                display: 'flex'
                                            }}
                                        >
                                            <X size={12} color="#fff" />
                                        </button>
                                    )}
                                    <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', marginRight: '10px' }}>{output.label}</span>

                                    {/* Port with Delete Button Logic (Fixed Position: Absolute Right Stick Out) */}
                                    <div style={{
                                        position: 'absolute',
                                        right: '-32px', // Extrude out of node right
                                        display: 'flex',
                                        alignItems: 'center',
                                        zIndex: 100
                                    }}>

                                        <div
                                            id={`port-${id}-${output.id}`}
                                            className="node-port"
                                            onMouseDown={(e) => handlePortMouseDown(e, output.id)}
                                            onMouseUp={(e) => handlePortMouseUp(e, output.id)}
                                            style={{
                                                width: '14px',
                                                height: '14px',
                                                borderRadius: '50%',
                                                background: '#ef4444', // Red for Output
                                                border: '2px solid #ffffff',
                                                cursor: 'crosshair',
                                                boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                                                position: 'relative',
                                            }}
                                        />
                                        {/* Disconnect Button (Absolute RIGHT of port) */}
                                        {!data.componentId && isConnectedOutput && onDeleteConnection && (
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const connsToDelete = connections.filter(
                                                        c => c.sourceNodeId === id && c.sourcePort === output.id
                                                    );
                                                    connsToDelete.forEach(c => onDeleteConnection(c.id));
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    right: '-25px', // Adjusted to -25px
                                                    cursor: 'pointer',
                                                    color: '#000000', // Black Icon
                                                    background: '#ff4d4f', // Red Background (User Request)
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
                                                <X size={10} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}

                        {!data.componentId && (
                            <button
                                onClick={handleAddOutput}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    border: '1px solid rgba(255, 255, 255, 0.4)',
                                    borderRadius: '6px',
                                    padding: '6px 10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '10px',
                                    color: '#fff',
                                    fontWeight: 600,
                                    width: 'fit-content',
                                }}
                            >
                                <Plus size={12} />
                                Add Output
                            </button>
                        )}
                    </div>
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
            </div >
        </>
    );
};
