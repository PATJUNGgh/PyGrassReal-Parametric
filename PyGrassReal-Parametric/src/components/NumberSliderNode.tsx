import React, { useEffect, useRef, useState } from 'react';
import { LogIn, LogOut, Trash2, X } from 'lucide-react';

interface NumberSliderNodeProps {
    id: string;
    data: {
        customName?: string;
        outputs?: Array<{ id: string; label: string }>;
        min?: number;
        max?: number;
        step?: number;
        value?: number;
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

export const NumberSliderNode: React.FC<NumberSliderNodeProps> = ({
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
    const [hasMounted, setHasMounted] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const nodeRef = useRef<HTMLDivElement>(null);
    const customName = data.customName || 'Number Slider';
    const outputs = data.outputs || [{ id: 'output-main', label: 'Value' }];
    const outputPort = outputs[0];
    const min = typeof data.min === 'number' ? data.min : 0;
    const max = typeof data.max === 'number' ? data.max : 100;
    const step = typeof data.step === 'number' ? data.step : 1;
    const value = typeof data.value === 'number' ? data.value : 50;

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
    }, [hasMounted]);

    const handleNameChange = (newName: string) => {
        onDataChange(id, { ...data, customName: newName });
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

    const handleSliderChange = (nextValue: number) => {
        const clamped = Math.max(min, Math.min(max, nextValue));
        onDataChange(id, { ...data, value: clamped });
    };

    const isConnectedOutput = connections.some(
        conn => conn.sourceNodeId === id && conn.sourcePort === outputPort.id
    );

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
                    width: '260px',
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
                                border: '2px solid rgba(14, 165, 233, 0.6)',
                                borderRadius: '6px',
                                padding: '6px 10px',
                                color: '#0f172a',
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

                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)', letterSpacing: '0.5px' }}>
                            VALUE
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{value}</span>
                    </div>
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={value}
                        onChange={(e) => handleSliderChange(Number(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            cursor: 'pointer',
                        }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)' }}>
                        <span>{min}</span>
                        <span>{max}</span>
                    </div>

                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', position: 'relative' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.9)', marginRight: '10px' }}>
                            {outputPort.label}
                        </span>
                        <div style={{
                            position: 'absolute',
                            right: '-32px',
                            display: 'flex',
                            alignItems: 'center',
                            zIndex: 100
                        }}>
                            <div
                                id={`port-${id}-${outputPort.id}`}
                                className="node-port"
                                onMouseDown={(e) => handlePortMouseDown(e, outputPort.id)}
                                onMouseUp={(e) => handlePortMouseUp(e, outputPort.id)}
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
                                            c => c.sourceNodeId === id && c.sourcePort === outputPort.id
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
                </div>
            </div>
        </>
    );
};
