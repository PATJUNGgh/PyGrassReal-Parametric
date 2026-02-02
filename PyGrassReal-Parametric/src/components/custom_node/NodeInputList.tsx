import React from 'react';
import { Plus, X, Check } from 'lucide-react';
import type { Port } from '../../types/NodeTypes';

interface Connection {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourcePort: string;
    targetPort: string;
}

interface NodeInputListProps {
    nodeId: string;
    inputs: Port[];
    connections: Connection[];
    componentId?: string;
    hideInputs?: boolean;
    hideInputsAdd?: boolean;
    hidePortLabels?: boolean;
    hidePortControls?: boolean;
    selected: boolean;
    nodeType?: string;
    hoveredPortId: string | null;
    editingPortId: string | null;
    tempPortLabel: string;
    onDeleteConnection?: (connectionId: string) => void;
    onPortMouseDown: (e: React.MouseEvent, portId: string) => void;
    onPortMouseUp: (e: React.MouseEvent, portId: string) => void;
    onStartEdit: (portId: string, currentLabel: string) => void;
    onCancelEdit: () => void;
    onSavePortEdit: (portId: string, isInput: boolean) => void;
    setTempPortLabel: (label: string) => void;
    onRemoveInput: (inputId: string) => void;
    setHoveredPortId: (portId: string | null) => void;
    onAddInput: () => void;
}

export const NodeInputList: React.FC<NodeInputListProps> = ({
    nodeId,
    inputs,
    connections,
    componentId,
    hideInputs,
    hideInputsAdd,
    hidePortLabels,
    hidePortControls,
    selected,
    nodeType,
    hoveredPortId,
    editingPortId,
    tempPortLabel,
    onDeleteConnection,
    onPortMouseDown,
    onPortMouseUp,
    onStartEdit,
    onCancelEdit,
    onSavePortEdit,
    setTempPortLabel,
    onRemoveInput,
    setHoveredPortId,
    onAddInput,
}) => {
    if (inputs.length === 0 && (hideInputs || componentId || hideInputsAdd)) {
        return null;
    }

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0px', minWidth: 0 }}>
            {inputs.map((input) => {
                const isConnectedInput = connections.some(
                    conn => conn.targetNodeId === nodeId && conn.targetPort === input.id
                );

                return (
                    <div
                        key={input.id}
                        style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: '24px', padding: '2px 0', width: 'calc(100% + 15px)', marginRight: '-15px', background: 'rgba(255,255,255,0.001)', cursor: 'default' }}
                        onMouseEnter={() => setHoveredPortId(input.id)}
                        onMouseLeave={() => setHoveredPortId(null)}
                    >
                        <div style={{
                            position: 'absolute',
                            left: '-37px',
                            display: 'flex',
                            alignItems: 'center',
                            zIndex: 100
                        }}>
                            {!componentId && isConnectedInput && onDeleteConnection && (
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const connToDelete = connections.find(c => c.targetNodeId === nodeId && c.targetPort === input.id);
                                        if (connToDelete) onDeleteConnection(connToDelete.id);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        left: '-25px',
                                        cursor: 'pointer',
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
                                    <X size={10} strokeWidth={3} color="#000" />
                                </div>
                            )}

                            <div
                                id={`port-${nodeId}-${input.id}`}
                                className="node-port"
                                onMouseDown={(e) => onPortMouseDown(e, input.id)}
                                onMouseUp={(e) => onPortMouseUp(e, input.id)}
                                style={{
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    background: '#22c55e',
                                    border: '2px solid #ffffff',
                                    cursor: 'crosshair',
                                    boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
                                }}
                            />
                        </div>

                        {!hidePortLabels && (
                            editingPortId === input.id ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <input
                                        autoFocus
                                        value={tempPortLabel}
                                        onChange={(e) => setTempPortLabel(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') onSavePortEdit(input.id, true);
                                            if (e.key === 'Escape') onCancelEdit();
                                            e.stopPropagation();
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        style={{
                                            background: 'rgba(0,0,0,0.5)',
                                            border: '1px solid #555',
                                            borderRadius: '4px',
                                            color: '#fff',
                                            fontSize: '12px',
                                            padding: '2px 4px',
                                            width: '80px',
                                            outline: 'none'
                                        }}
                                    />
                                    <button onClick={() => onSavePortEdit(input.id, true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Check size={14} color="#22c55e" /></button>
                                    <button onClick={onCancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={14} color="#ef4444" /></button>
                                </div>
                            ) : (
                                <span
                                    onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(input.id, input.label); }}
                                    style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'text' }}
                                    title="Double click to rename"
                                >
                                    {input.label}
                                </span>
                            )
                        )}
                        {!componentId && !hidePortControls && (
                            <button
                                onClick={() => onRemoveInput(input.id)}
                                style={{
                                    marginLeft: '4px',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    opacity: (selected && hoveredPortId === input.id) ? 1 : 0,
                                    padding: '6px',
                                    display: 'flex',
                                    transition: 'opacity 0.2s',
                                    pointerEvents: (selected && hoveredPortId === input.id) ? 'auto' : 'none'
                                }}
                                title="Remove Input"
                            >
                                <X size={12} color="#fff" />
                            </button>
                        )}
                    </div>
                )
            })}

            {/* Add Input Button (Relocated) */}
            {(!hideInputsAdd && !componentId) && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onAddInput(); }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '11px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        marginTop: '4px',
                        width: 'fit-content',
                        marginLeft: '-2px'
                    }}
                >
                    <Plus size={10} /> Add Input
                </button>
            )}
        </div>
    );
};