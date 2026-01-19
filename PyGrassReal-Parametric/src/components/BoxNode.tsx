import React, { useState, useRef, useEffect } from 'react';
import type { NodeData } from '../types/NodeTypes';
import { Trash2 } from 'lucide-react';

interface BoxNodeProps {
    node: NodeData;
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void;
    onConnectionStart: (nodeId: string, port: string, position: { x: number; y: number }) => void;
    onConnectionComplete: (nodeId: string, port: string) => void;
    onDelete?: (nodeId: string) => void;
    isShaking?: boolean;
    selected?: boolean;
    onSelect?: () => void;
    scale?: number;
    isInfected?: boolean;
}

export const BoxNode: React.FC<BoxNodeProps> = ({
    node,
    onPositionChange,
    onDataChange,
    onConnectionStart,
    onConnectionComplete,
    onDelete,
    isShaking,
    selected = false,
    onSelect,
    scale,
    isInfected = false,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{
        mouseX: number;
        mouseY: number;
        nodeX: number;
        nodeY: number;
    } | null>(null);
    const nodeRef = useRef<HTMLDivElement>(null);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setHasMounted(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.node-header')) {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
            setIsDragging(true);
            setDragStart({
                mouseX: e.clientX,
                mouseY: e.clientY,
                nodeX: node.position.x,
                nodeY: node.position.y,
            });
            e.stopPropagation();
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging && dragStart) {
                // Nodes are rendered with transform: scale(), so convert pixel delta to canvas space
                const currentScale = Math.max(scale || 1, 0.01);
                const deltaX = (e.clientX - dragStart.mouseX) / currentScale;
                const deltaY = (e.clientY - dragStart.mouseY) / currentScale;

                onPositionChange(node.id, {
                    x: dragStart.nodeX + deltaX,
                    y: dragStart.nodeY + deltaY,
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart, node.id, onPositionChange, scale]);

    const handleInputChange = (key: string, value: string | number, nestedKey?: string) => {
        let newData = { ...node.data };
        if (nestedKey) {
            newData = {
                ...newData,
                [key]: {
                    ...(newData[key as keyof typeof newData] as object),
                    [nestedKey]: Number(value),
                },
            };
        } else {
            newData = { ...newData, [key]: Number(value) };
        }
        onDataChange(node.id, newData);
    };

    const handlePortMouseDown = (e: React.MouseEvent, port: string) => {
        e.stopPropagation();
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        onConnectionStart(node.id, port, {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        });
    };

    const animationStyle = isShaking
        ? 'shake 0.3s ease-in-out'
        : !hasMounted
            ? 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            : 'none';

    return (
        <>
            <style>{`
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
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
                .node-port {
                    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .node-port:hover {
                    transform: translateY(-50%) scale(1.5) !important;
                    box-shadow: 0 0 12px rgba(255, 255, 255, 0.8);
                    z-index: 100;
                }
            `}</style>
            <div
                id={node.id}
                ref={nodeRef}
                data-no-selection="true" // Marker to prevent selection box
                onMouseDown={(e) => {
                    e.stopPropagation(); // Prevent selection box in App
                    onSelect?.(); // Select this node
                    handleMouseDown(e);
                }}
                style={{
                    position: 'absolute',
                    left: `${node.position.x}px`,
                    top: `${node.position.y}px`,
                    width: '280px',
                    background: 'linear-gradient(165deg, rgba(14, 165, 233, 0.6) 0%, rgba(255, 255, 255, 0.5) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    borderRadius: '16px',
                    boxShadow: selected
                        ? '0 0 0 4px #38bdf8, 0 0 30px 5px rgba(56, 189, 248, 0.6), 0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 0 0 2px rgba(56, 189, 248, 0.3)'
                        : '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 0 0 1px rgba(255, 255, 255, 0.18)',
                    border: selected ? '2px solid #38bdf8' : 'none',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    zIndex: 10,
                    animation: animationStyle,
                    transformOrigin: 'center center',
                    display: 'flex',
                    flexDirection: 'column',
                    pointerEvents: 'auto', // Keep interactive even if parent is none
                }}
            >
                {/* Header */}
                <div
                    className="node-header"
                    style={{
                        padding: '14px 18px',
                        background: 'transparent',
                        borderRadius: '14px 14px 0 0',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
                        cursor: 'grab',
                        fontWeight: 600,
                        fontSize: '13px',
                        color: '#fff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <span>📦 Box</span>
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(node.id);
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
                    )}
                </div>

                {/* Body */}
                <div style={{ padding: '20px' }}>
                    {/* Transform Section */}
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '10px', color: '#fff', display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Transform
                        </label>

                        {/* Scale Row */}
                        <div style={{ marginBottom: '6px', position: 'relative' }}>
                            <label style={{ fontSize: '9px', color: '#fff', display: 'block', marginBottom: '2px' }}>Scale</label>

                            {/* Scale Input Port */}
                            <div
                                id={`port-${node.id}-scale-input`}
                                className="node-port"
                                onMouseDown={(e) => handlePortMouseDown(e, 'scale-input')}
                                onMouseUp={(e) => handlePortMouseUp(e, 'scale-input')}
                                style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    backgroundColor: '#4caf50',
                                    border: '2px solid #fff',
                                    cursor: 'pointer',
                                    position: 'absolute',
                                    left: '-25px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                }}
                                title="Scale Input"
                            />

                            {/* Scale Output Port */}
                            <div
                                id={`port-${node.id}-scale-output`}
                                className="node-port"
                                onMouseDown={(e) => handlePortMouseDown(e, 'scale-output')}
                                onMouseUp={(e) => handlePortMouseUp(e, 'scale-output')}
                                style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    backgroundColor: '#ff5722',
                                    border: '2px solid #fff',
                                    cursor: 'pointer',
                                    position: 'absolute',
                                    right: '-25px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                }}
                                title="Scale Output"
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '9px', color: '#fff', display: 'block', marginBottom: '2px' }}>X</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={node.data.scale?.x ?? 1}
                                        onChange={(e) => onDataChange(node.id, {
                                            scale: { x: parseFloat(e.target.value) || 1, y: node.data.scale?.y ?? 1, z: node.data.scale?.z ?? 1 }
                                        })}
                                        style={{
                                            width: '100%',
                                            padding: '4px 4px',
                                            borderRadius: '4px',
                                            border: '1px solid rgba(76, 175, 80, 0.5)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                            color: '#1e293b',
                                            fontSize: '9px',
                                            textAlign: 'center',
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '9px', color: '#fff', display: 'block', marginBottom: '2px' }}>Y</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={node.data.scale?.y ?? 1}
                                        onChange={(e) => onDataChange(node.id, {
                                            scale: { x: node.data.scale?.x ?? 1, y: parseFloat(e.target.value) || 1, z: node.data.scale?.z ?? 1 }
                                        })}
                                        style={{
                                            width: '100%',
                                            padding: '4px 4px',
                                            borderRadius: '4px',
                                            border: '1px solid rgba(76, 175, 80, 0.5)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                            color: '#1e293b',
                                            fontSize: '9px',
                                            textAlign: 'center',
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '9px', color: '#fff', display: 'block', marginBottom: '2px' }}>Z</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={node.data.scale?.z ?? 1}
                                        onChange={(e) => onDataChange(node.id, {
                                            scale: { x: node.data.scale?.x ?? 1, y: node.data.scale?.y ?? 1, z: parseFloat(e.target.value) || 1 }
                                        })}
                                        style={{
                                            width: '100%',
                                            padding: '4px 4px',
                                            borderRadius: '4px',
                                            border: '1px solid rgba(76, 175, 80, 0.5)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                            color: '#1e293b',
                                            fontSize: '9px',
                                            textAlign: 'center',
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Rotate Row */}
                        <div style={{ marginBottom: '6px', position: 'relative' }}>
                            <label style={{ fontSize: '9px', color: '#fff', display: 'block', marginBottom: '2px' }}>Rotate</label>

                            {/* Rotate Input Port */}
                            <div
                                id={`port-${node.id}-rotate-input`}
                                className="node-port"
                                onMouseDown={(e) => handlePortMouseDown(e, 'rotate-input')}
                                onMouseUp={(e) => handlePortMouseUp(e, 'rotate-input')}
                                style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    backgroundColor: '#4caf50',
                                    border: '2px solid #fff',
                                    cursor: 'pointer',
                                    position: 'absolute',
                                    left: '-25px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                }}
                                title="Rotate Input"
                            />

                            {/* Rotate Output Port */}
                            <div
                                id={`port-${node.id}-rotate-output`}
                                className="node-port"
                                onMouseDown={(e) => handlePortMouseDown(e, 'rotate-output')}
                                onMouseUp={(e) => handlePortMouseUp(e, 'rotate-output')}
                                style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    backgroundColor: '#ff5722',
                                    border: '2px solid #fff',
                                    cursor: 'pointer',
                                    position: 'absolute',
                                    right: '-25px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                }}
                                title="Rotate Output"
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '9px', color: '#fff', display: 'block', marginBottom: '2px' }}>X</label>
                                    <input
                                        type="number"
                                        step="1"
                                        value={node.data.rotation?.x ?? 0}
                                        onChange={(e) => onDataChange(node.id, {
                                            rotation: { x: parseFloat(e.target.value) || 0, y: node.data.rotation?.y ?? 0, z: node.data.rotation?.z ?? 0 }
                                        })}
                                        style={{
                                            width: '100%',
                                            padding: '4px 4px',
                                            borderRadius: '4px',
                                            border: '1px solid rgba(33, 150, 243, 0.5)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                            color: '#1e293b',
                                            fontSize: '9px',
                                            textAlign: 'center',
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '9px', color: '#fff', display: 'block', marginBottom: '2px' }}>Y</label>
                                    <input
                                        type="number"
                                        step="1"
                                        value={node.data.rotation?.y ?? 0}
                                        onChange={(e) => onDataChange(node.id, {
                                            rotation: { x: node.data.rotation?.x ?? 0, y: parseFloat(e.target.value) || 0, z: node.data.rotation?.z ?? 0 }
                                        })}
                                        style={{
                                            width: '100%',
                                            padding: '4px 4px',
                                            borderRadius: '4px',
                                            border: '1px solid rgba(33, 150, 243, 0.5)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                            color: '#1e293b',
                                            fontSize: '9px',
                                            textAlign: 'center',
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '9px', color: '#fff', display: 'block', marginBottom: '2px' }}>Z</label>
                                    <input
                                        type="number"
                                        step="1"
                                        value={node.data.rotation?.z ?? 0}
                                        onChange={(e) => onDataChange(node.id, {
                                            rotation: { x: node.data.rotation?.x ?? 0, y: node.data.rotation?.y ?? 0, z: parseFloat(e.target.value) || 0 }
                                        })}
                                        style={{
                                            width: '100%',
                                            padding: '4px 4px',
                                            borderRadius: '4px',
                                            border: '1px solid rgba(33, 150, 243, 0.5)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                            color: '#1e293b',
                                            fontSize: '9px',
                                            textAlign: 'center',
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Location Row */}
                        <div style={{ position: 'relative' }}>
                            <label style={{ fontSize: '9px', color: '#fff', display: 'block', marginBottom: '2px' }}>Location</label>

                            {/* Location Input Port */}
                            <div
                                id={`port-${node.id}-location-input`}
                                className="node-port"
                                onMouseDown={(e) => handlePortMouseDown(e, 'location-input')}
                                onMouseUp={(e) => handlePortMouseUp(e, 'location-input')}
                                style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    backgroundColor: '#4caf50',
                                    border: '2px solid #fff',
                                    cursor: 'pointer',
                                    position: 'absolute',
                                    left: '-25px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                }}
                                title="Location Input"
                            />

                            {/* Location Output Port */}
                            <div
                                id={`port-${node.id}-location-output`}
                                className="node-port"
                                onMouseDown={(e) => handlePortMouseDown(e, 'location-output')}
                                onMouseUp={(e) => handlePortMouseUp(e, 'location-output')}
                                style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    backgroundColor: '#ff5722',
                                    border: '2px solid #fff',
                                    cursor: 'pointer',
                                    position: 'absolute',
                                    right: '-25px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                }}
                                title="Location Output"
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                                <div>
                                    <label style={{ fontSize: '9px', color: '#fff', display: 'block', marginBottom: '2px' }}>X</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={node.data.location?.x ?? 0}
                                        onChange={(e) => onDataChange(node.id, {
                                            location: { x: parseFloat(e.target.value) || 0, y: node.data.location?.y ?? 0, z: node.data.location?.z ?? 0 }
                                        })}
                                        style={{
                                            width: '100%',
                                            padding: '4px 4px',
                                            borderRadius: '4px',
                                            border: '1px solid rgba(255, 152, 0, 0.5)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                            color: '#1e293b',
                                            fontSize: '9px',
                                            textAlign: 'center',
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '9px', color: '#fff', display: 'block', marginBottom: '2px' }}>Y</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={node.data.location?.y ?? 0}
                                        onChange={(e) => onDataChange(node.id, {
                                            location: { x: node.data.location?.x ?? 0, y: parseFloat(e.target.value) || 0, z: node.data.location?.z ?? 0 }
                                        })}
                                        style={{
                                            width: '100%',
                                            padding: '4px 4px',
                                            borderRadius: '4px',
                                            border: '1px solid rgba(255, 152, 0, 0.5)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                            color: '#1e293b',
                                            fontSize: '9px',
                                            textAlign: 'center',
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '9px', color: '#fff', display: 'block', marginBottom: '2px' }}>Z</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={node.data.location?.z ?? 0}
                                        onChange={(e) => onDataChange(node.id, {
                                            location: { x: node.data.location?.x ?? 0, y: node.data.location?.y ?? 0, z: parseFloat(e.target.value) || 0 }
                                        })}
                                        style={{
                                            width: '100%',
                                            padding: '4px 4px',
                                            borderRadius: '4px',
                                            border: '1px solid rgba(255, 152, 0, 0.5)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                            color: '#1e293b',
                                            fontSize: '9px',
                                            textAlign: 'center',
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Ports - Centered Vertically */}
                    {/* Input Port */}
                </div>
            </div>
        </>
    );
};
