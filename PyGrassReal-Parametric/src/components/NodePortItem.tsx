import React from 'react';
import { X, Layers, GitMerge, ArrowDownUp, ListFilter, StretchHorizontal } from 'lucide-react';
import { PortModifierMenu } from './PortModifierMenu';

// Type definitions from PortList, consider moving to a shared types file
interface Port {
    id: string;
    label: string;
}

interface PortItemProps {
    port: Port;
    type: 'input' | 'output';
    nodeId: string;
    isConnected: boolean;
    componentId?: string;
    portModifiers: { [portId: string]: Array<string> };
    hoveredPortId: string | null;
    modifierMenuOpenId: string | null;
    editingPortId: string | null;
    editingPortValue: string;
    onConnectionStart: (nodeId: string, portId: string, position: { x: number; y: number }) => void;
    onConnectionComplete: (nodeId: string, portId: string) => void;
    onDeleteConnection?: (connectionId: string) => void;
    onRemovePort: (portId: string) => void;
    onPortsChange: (newPorts: Port[]) => void;
    setHoveredPortId: (id: string | null) => void;
    setModifierMenuOpenId: (id: string | null) => void;
    setEditingPortId: (id: string | null) => void;
    setEditingPortValue: (value: string) => void;
    handleSavePortLabel: (portId: string) => void;
    handleToggleModifier: (portId: string, modifierId: string) => void;
    connections: any[]; // Simplified for now
    interactionMode?: 'node' | '3d' | 'wire';
    hidePortControls?: boolean;
    hideModifierMenu?: boolean;
    hidePortLabels?: boolean;
    hideDisconnectButton?: boolean;
    nodeSelected: boolean;
}

export const NodePortItem: React.FC<PortItemProps> = ({
    port,
    type,
    nodeId,
    isConnected,
    componentId,
    portModifiers,
    hoveredPortId,
    modifierMenuOpenId,
    editingPortId,
    editingPortValue,
    onConnectionStart,
    onConnectionComplete,
    onDeleteConnection,
    onRemovePort,
    setHoveredPortId,
    setModifierMenuOpenId,
    setEditingPortId,
    setEditingPortValue,
    handleSavePortLabel,
    handleToggleModifier,
    connections,
    interactionMode,
    hidePortControls,
    hideModifierMenu,
    hidePortLabels,
    hideDisconnectButton,
    nodeSelected,
}) => {
    const isInput = type === 'input';

    const modifierOptions = [
        { id: 'flatten', label: 'Flatten', icon: <Layers size={10} /> },
        { id: 'graft', label: 'Graft', icon: <GitMerge size={10} /> },
        { id: 'reverse', label: 'Reverse', icon: <ArrowDownUp size={10} /> },
        { id: 'simplify', label: 'Simplify', icon: <ListFilter size={10} /> },
        { id: 'longest', label: 'Longest', icon: <StretchHorizontal size={10} /> },
    ];
    const modifierIconMap: Record<string, React.ReactNode> = {
        flatten: <Layers size={10} />,
        graft: <GitMerge size={10} />,
        reverse: <ArrowDownUp size={10} />,
        simplify: <ListFilter size={10} />,
        longest: <StretchHorizontal size={10} />,
    };
    const modifierMenuRadius = 30;
    const modifierMenuItemSize = 22;

    const handlePortMouseDown = (e: React.MouseEvent, portId: string) => {
        e.stopPropagation();
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        onConnectionStart(nodeId, portId, {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        });
    };

    const handlePortMouseUp = (e: React.MouseEvent, portId: string) => {
        e.stopPropagation();
        onConnectionComplete(nodeId, portId);
    };

    const closeModifierMenu = () => {
        setModifierMenuOpenId(null);
        setHoveredPortId(null);
    };

    // Conditional styles
    const portContainerStyles: React.CSSProperties = isInput ? {} : { justifyContent: 'flex-end' };
    const portStickoutStyles: React.CSSProperties = isInput ? { left: '-32px' } : { right: '-32px' };
    const portColor = isInput ? '#22c55e' : '#ef4444';
    const portBoxShadow = isInput ? '0 0 8px rgba(34, 197, 94, 0.5)' : '0 0 8px rgba(239, 68, 68, 0.5)';
    const disconnectButtonStyles: React.CSSProperties = isInput
        ? { left: '-25px', background: '#22c55e', color: '#000000' }
        : { right: '-25px', background: '#ff4d4f', color: '#000000' };

    return (
            <div
                style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: '24px',
                    flexWrap: 'nowrap',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    overflow: 'visible',
                    ...portContainerStyles
                }}
                onMouseEnter={() => {
                    if (!nodeSelected) return;
                    setHoveredPortId(port.id);
                }}
                onMouseLeave={() => {
                    if (!nodeSelected) return;
                    setHoveredPortId(null);
                }}
            >
            {/* Port with Disconnect Button Logic */}
            <div style={{
                position: 'absolute',
                ...portStickoutStyles,
                display: 'flex',
                alignItems: 'center',
                zIndex: 100
            }}>
                {!hideDisconnectButton && !componentId && isConnected && onDeleteConnection && interactionMode === 'wire' && (
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
                            if (isInput) {
                                const connToDelete = connections.find(c => c.targetNodeId === nodeId && c.targetPort === port.id);
                                if (connToDelete) onDeleteConnection(connToDelete.id);
                            } else {
                                const connsToDelete = connections.filter(c => c.sourceNodeId === nodeId && c.sourcePort === port.id);
                                connsToDelete.forEach(c => onDeleteConnection(c.id));
                            }
                        }}
                        style={{
                            position: 'absolute',
                            cursor: 'pointer',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            ...disconnectButtonStyles,
                        }}
                        title={isInput ? "Disconnect" : "Disconnect All"}
                    >
                        <X size={10} strokeWidth={3} />
                    </div>
                )}
                <div
                    id={`port-${nodeId}-${port.id}`}
                    className="node-port"
                    onMouseDown={(e) => handlePortMouseDown(e, port.id)}
                    onMouseUp={(e) => handlePortMouseUp(e, port.id)}
                    style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: portColor,
                        border: '2px solid #ffffff',
                        cursor: 'crosshair',
                        boxShadow: portBoxShadow,
                        position: 'relative',
                    }}
                />
            </div>

            {/* Port Label and Modifier Menu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '0 1 auto', flexWrap: 'nowrap', minWidth: 0, order: isInput ? 1 : -1 }}>
                {!hidePortLabels && (editingPortId === port.id ? (
                    (() => {
                        const cancelButton = (
                            <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setEditingPortId(null); }} style={{ background: 'rgba(239, 68, 68, 0.6)', border: '1px solid rgba(239, 68, 68, 0.8)', borderRadius: '3px', width: '18px', height: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: 0, }} title="Cancel (Esc)">✕</button>
                        );
            
                        const saveButton = (
                            <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSavePortLabel(port.id); }} style={{ background: 'rgba(34, 197, 94, 0.6)', border: '1px solid rgba(34, 197, 94, 0.8)', borderRadius: '3px', width: '18px', height: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: 0, }} title="Save (Enter)">✓</button>
                        );
            
                        const editInput = (
                            <input
                                type="text"
                                value={editingPortValue}
                                onChange={(e) => setEditingPortValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSavePortLabel(port.id);
                                    else if (e.key === 'Escape') setEditingPortId(null);
                                }}
                                autoFocus
                                style={{ 
                                    fontSize: '13px', 
                                    color: '#fff', 
                                    background: 'rgba(255, 255, 255, 0.1)', 
                                    border: '1px solid rgba(255, 255, 255, 0.3)', 
                                    borderRadius: '3px', 
                                    padding: '2px 4px', 
                                    outline: 'none', 
                                    minWidth: '60px', 
                                    maxWidth: '80px', 
                                    textAlign: isInput ? 'left' : 'right' 
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        );
            
                        return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {isInput ? (
                                    <>
                                        {editInput}
                                        {saveButton}
                                        {cancelButton}
                                    </>
                                ) : (
                                    <>
                                        {cancelButton}
                                        {saveButton}
                                        {editInput}
                                    </>
                                )}
                            </div>
                        );
                    })()
                ) : (
                    <span
                        onDoubleClick={() => { if (!componentId) { setEditingPortId(port.id); setEditingPortValue(port.label); } }}
                        style={{
                            fontSize: '13px',
                            color: 'rgba(255, 255, 255, 0.9)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: isInput ? '0 1 auto' : '1 1 auto',
                            minWidth: 0,
                            maxWidth: '150px',
                            cursor: componentId ? 'default' : 'text',
                            textAlign: isInput ? 'left' : 'right',
                            order: isInput ? 1 : 1,
                        }}
                    >
                        {port.label}
                    </span>
                ))}

                {!hidePortControls && nodeSelected && ((portModifiers[port.id]?.length > 0) || ((hoveredPortId === port.id || modifierMenuOpenId === port.id) && !editingPortId)) && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        position: 'relative',
                        animation: 'fadeIn 0.15s ease-in-out',
                        flex: '0 0 auto',
                        whiteSpace: 'nowrap',
                        gap: '4px',
                        justifyContent: isInput ? 'flex-start' : 'flex-end',
                        width: isInput ? 'auto' : 'auto',
                        marginRight: isInput ? 0 : '6px',
                        order: isInput ? 2 : -2,
                    }}>
                        {!isInput && !componentId && hoveredPortId === port.id && !editingPortId && (
                            <button onClick={() => onRemovePort(port.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.5, padding: '2px', display: 'flex' }}><X size={12} color="#fff" /></button>
                        )}
                        {hoveredPortId !== port.id && portModifiers[port.id]?.length > 0 && (
                            <div style={{ display: 'flex', gap: '1px' }}>
                                {portModifiers[port.id].map((modifier) => (
                                    <div key={modifier} style={{ fontSize: '9px', fontWeight: 700, color: '#fff', background: 'rgba(59, 130, 246, 0.6)', border: '1px solid rgba(59, 130, 246, 0.8)', borderRadius: '2px', padding: '1px 3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{modifierIconMap[modifier]}</div>
                                ))}
                            </div>
                        )}
                        {(hoveredPortId === port.id || modifierMenuOpenId === port.id) && !editingPortId && !hideModifierMenu && (
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <button
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
                                        setModifierMenuOpenId(modifierMenuOpenId === port.id ? null : port.id);
                                    }}
                                    title="Data Structure Options"
                                    style={{
                                        background: modifierMenuOpenId === port.id ? 'rgba(59, 130, 246, 0.6)' : 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        borderRadius: '3px',
                                        width: '16px',
                                        height: '16px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontSize: '10px',
                                        transition: 'all 0.2s',
                                    }}
                                >ƒsT</button>
                                {modifierMenuOpenId === port.id && (
                                    <PortModifierMenu onClose={closeModifierMenu} options={modifierOptions} activeModifiers={portModifiers[port.id] || []} onToggleModifier={(modifierId) => handleToggleModifier(port.id, modifierId)} menuRadius={modifierMenuRadius} itemSize={modifierMenuItemSize} />
                                )}
                            </div>
                        )}
                        {isInput && !componentId && hoveredPortId === port.id && (
                            <button onClick={() => onRemovePort(port.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.5, padding: '2px', display: 'flex' }}><X size={12} color="#fff" /></button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
