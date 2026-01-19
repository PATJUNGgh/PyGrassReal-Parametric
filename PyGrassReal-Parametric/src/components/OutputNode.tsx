import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, X, LogIn, LogOut } from 'lucide-react';

interface OutputNodeProps {
    id: string;
    data: {
        customName?: string;
        inputs?: Array<{ id: string; label: string }>;
        width?: number;
        height?: number;
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
    parentGroupId?: string;
    overlappingGroupId?: string;
    onJoinGroup?: (nodeId: string, groupId: string) => void;
    onLeaveGroup?: (nodeId: string) => void;
    scale?: number;
    isInfected?: boolean;
    onDuplicate?: (id: string) => void;
}

export const OutputNode: React.FC<OutputNodeProps> = ({
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
    parentGroupId,
    overlappingGroupId,
    onJoinGroup,
    onLeaveGroup,
    scale,
    isInfected,
    onDuplicate,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{
        mouseX: number;
        mouseY: number;
        nodeX: number;
        nodeY: number;
    } | null>(null);
    const [editingPortId, setEditingPortId] = useState<string | null>(null);
    const [editingPortLabel, setEditingPortLabel] = useState('');
    const [showErrorDetails, setShowErrorDetails] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const customName = data.customName || 'Output Node';
    const inputs = data.inputs || [];
    const nodeRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        setDragStart({
            mouseX: e.clientX,
            mouseY: e.clientY,
            nodeX: position.x,
            nodeY: position.y,
        });
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging && dragStart) {
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

    useEffect(() => {
        if (!hasMounted) return;
        const timer = setTimeout(() => {
            onDataChange(id, { ...data, _structureChanged: Date.now() });
        }, 150);
        return () => clearTimeout(timer);
    }, [inputs.length, hasMounted]);

    const handleAddInput = () => {
        const newInput = {
            id: `input-${Date.now()}`,
            label: `Input ${inputs.length + 1}`,
        };
        onDataChange(id, { ...data, inputs: [...inputs, newInput] });
    };

    const handleRemoveInput = (inputId: string) => {
        onDataChange(id, {
            ...data,
            inputs: inputs.filter((inp) => inp.id !== inputId),
        });
    };

    const commitPortLabel = () => {
        if (!editingPortId) return;
        const nextLabel = editingPortLabel.trim() || 'Input';
        onDataChange(id, {
            ...data,
            inputs: inputs.map((inp) =>
                inp.id === editingPortId ? { ...inp, label: nextLabel } : inp
            ),
        });
        setEditingPortId(null);
        setEditingPortLabel('');
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
                    e.stopPropagation();
                    onSelect?.();
                    handleMouseDown(e);
                }}
                style={{
                    position: 'absolute',
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: '240px',
                    background: isInfected
                        ? 'linear-gradient(165deg, rgba(220, 38, 38, 0.85) 0%, rgba(255, 255, 255, 0.4) 100%)'
                        : 'linear-gradient(165deg, rgba(14, 165, 233, 0.6) 0%, rgba(255, 255, 255, 0.5) 100%)',
                    border: isInfected
                        ? '3px solid #ff0000'
                        : selected ? '3px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.5)',
                    borderRadius: '16px',
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
                    pointerEvents: 'auto',
                }}
                onContextMenu={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.();
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div
                    style={{
                        padding: '14px 18px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'transparent',
                        borderRadius: '14px 14px 0 0',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}
                    >
                        {isInfected && (
                            <span
                                style={{
                                    fontSize: '20px',
                                    animation: 'warningPulse 2s ease-in-out infinite',
                                    filter: 'drop-shadow(0 0 4px rgba(255, 193, 7, 0.8))'
                                }}
                            >
                                ⚠️
                            </span>
                        )}
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                            {customName}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
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
                                    width: '28px',
                                    height: '28px',
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
                                <span style={{ fontSize: '14px', fontWeight: 'bold', lineHeight: 1 }}>+</span>
                            </button>
                        )}
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
                                    padding: '6px',
                                    width: '28px',
                                    height: '28px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
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
                                    padding: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                title="Leave Group"
                            >
                                <LogOut size={14} />
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
                                padding: '6px',
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

                <div style={{ padding: '16px', display: 'flex', gap: '20px', position: 'relative' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)', letterSpacing: '0.5px', marginBottom: '4px' }}>
                            INPUTS
                        </div>

                        {inputs.map((input) => {
                            const isConnectedInput = connections.some(
                                conn => conn.targetNodeId === id && conn.targetPort === input.id
                            );

                            return (
                                <div key={input.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: '24px' }}>
                                    <div style={{
                                        position: 'absolute',
                                        left: '-32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        zIndex: 100
                                    }}>
                                        {isConnectedInput && onDeleteConnection && (
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
                                                background: '#22c55e',
                                                border: '2px solid #ffffff',
                                                cursor: 'crosshair',
                                                boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
                                                position: 'relative',
                                            }}
                                        />
                                    </div>

                                    {editingPortId === input.id ? (
                                        <input
                                            value={editingPortLabel}
                                            onChange={(e) => setEditingPortLabel(e.target.value)}
                                            onBlur={commitPortLabel}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') commitPortLabel();
                                            }}
                                            autoFocus
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.9)',
                                                border: '1px solid rgba(255, 255, 255, 0.6)',
                                                borderRadius: '4px',
                                                color: '#1e293b',
                                                fontSize: '12px',
                                                padding: '2px 6px',
                                                width: '90px',
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span
                                            style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', cursor: 'text' }}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                setEditingPortId(input.id);
                                                setEditingPortLabel(input.label);
                                            }}
                                            title="Double-click to rename"
                                        >
                                            {input.label}
                                        </span>
                                    )}
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
                                </div>
                            );
                        })}

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
            </div>
        </>
    );
};
