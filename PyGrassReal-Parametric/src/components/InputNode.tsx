import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, X, LogIn, LogOut } from 'lucide-react';

interface InputNodeProps {
    id: string;
    data: {
        customName?: string;
        outputs?: Array<{ id: string; label: string }>;
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

export const InputNode: React.FC<InputNodeProps> = ({
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
    const [isEditingName, setIsEditingName] = useState(false);
    const [editingPortId, setEditingPortId] = useState<string | null>(null);
    const [editingPortLabel, setEditingPortLabel] = useState('');
    const [showErrorDetails, setShowErrorDetails] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const customName = data.customName || 'Input Node';
    const outputs = data.outputs || [];
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
    }, [outputs.length, hasMounted]);

    const handleNameChange = (newName: string) => {
        onDataChange(id, { ...data, customName: newName });
    };

    const handleAddOutput = () => {
        const newOutput = {
            id: `output-${Date.now()}`,
            label: `Output ${outputs.length + 1}`,
        };
        onDataChange(id, { ...data, outputs: [...outputs, newOutput] });
    };

    const handleRemoveOutput = (outputId: string) => {
        onDataChange(id, {
            ...data,
            outputs: outputs.filter((out) => out.id !== outputId),
        });
    };

    const commitPortLabel = () => {
        if (!editingPortId) return;
        const nextLabel = editingPortLabel.trim() || 'Output';
        onDataChange(id, {
            ...data,
            outputs: outputs.map((out) =>
                out.id === editingPortId ? { ...out, label: nextLabel } : out
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
                                width: '150px',
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
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsEditingName(true);
                            }}
                        >
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                                {customName}
                            </span>
                        </div>
                    )}
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
                                    {editingPortId === output.id ? (
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
                                                marginRight: '10px',
                                                width: '90px',
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span
                                            style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', marginRight: '10px', cursor: 'text' }}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                setEditingPortId(output.id);
                                                setEditingPortLabel(output.label);
                                            }}
                                            title="Double-click to rename"
                                        >
                                            {output.label}
                                        </span>
                                    )}

                                    <div style={{
                                        position: 'absolute',
                                        right: '-32px',
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
                                                background: '#ef4444',
                                                border: '2px solid #ffffff',
                                                cursor: 'crosshair',
                                                boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                                                position: 'relative',
                                            }}
                                        />
                                        {isConnectedOutput && onDeleteConnection && (
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
                                                    right: '-25px',
                                                    cursor: 'pointer',
                                                    color: '#000000',
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
                                                <X size={10} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

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
