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

interface NodeOutputListProps {
    nodeId: string;
    outputs: Port[];
    connections: Connection[];
    componentId?: string;
    canAddOutput: boolean;
    hidePortLabels?: boolean;
    hidePortControls?: boolean;
    selected: boolean;
    nodeType?: string;
    hoveredPortId: string | null;
    editingPortId: string | null;
    tempPortLabel: string;
    outputsAreaWidth?: number;
    outputPortOffsetRight?: number;
    onDeleteConnection?: (connectionId: string) => void;
    onPortMouseDown: (e: React.MouseEvent, portId: string) => void;
    onPortMouseUp: (e: React.MouseEvent, portId: string) => void;
    onStartEdit: (portId: string, currentLabel: string) => void;
    onCancelEdit: () => void;
    onSavePortEdit: (portId: string, isInput: boolean) => void;
    setTempPortLabel: (label: string) => void;
    onRemoveOutput: (outputId: string) => void;
    setHoveredPortId: (portId: string | null) => void;
    onAddOutput: () => void;
}

export const NodeOutputList: React.FC<NodeOutputListProps> = ({
    nodeId,
    outputs,
    connections,
    componentId,
    canAddOutput,
    hidePortLabels,
    hidePortControls,
    selected,
    nodeType,
    hoveredPortId,
    editingPortId,
    tempPortLabel,
    outputsAreaWidth,
    outputPortOffsetRight,
    onDeleteConnection,
    onPortMouseDown,
    onPortMouseUp,
    onStartEdit,
    onCancelEdit,
    onSavePortEdit,
    setTempPortLabel,
    onRemoveOutput,
    setHoveredPortId,
    onAddOutput,
}) => {
    if (outputs.length === 0 && !canAddOutput) {
        return null;
    }

    return (
        <div
            style={{
                flex: outputsAreaWidth ? `0 0 ${outputsAreaWidth}px` : 1,
                width: outputsAreaWidth ? `${outputsAreaWidth}px` : undefined,
                display: 'flex',
                flexDirection: 'column',
                gap: '0px',
                alignItems: 'flex-end',
                minWidth: 0,
            }}
        >
            {outputs.map((output) => {
                const isConnectedOutput = connections.some(
                    conn => conn.sourceNodeId === nodeId && conn.sourcePort === output.id
                );

                return (
                    <div
                        key={output.id}
                        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minHeight: '24px', padding: '2px 0', width: 'calc(100% + 15px)', marginLeft: '-15px', background: 'rgba(255,255,255,0.001)', cursor: 'default' }}
                        onMouseEnter={() => setHoveredPortId(output.id)}
                        onMouseLeave={() => setHoveredPortId(null)}
                    >


                        {!hidePortLabels && (
                            editingPortId === output.id ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '40px', justifyContent: 'flex-end' }}>
                                    <button onClick={() => onCancelEdit()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={14} color="#ef4444" /></button>
                                    <button onClick={() => onSavePortEdit(output.id, false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Check size={14} color="#22c55e" /></button>
                                    <input
                                        autoFocus
                                        value={tempPortLabel}
                                        onChange={(e) => setTempPortLabel(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') onSavePortEdit(output.id, false);
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
                                            outline: 'none',
                                            textAlign: 'right'
                                        }}
                                    />
                                </div>
                            ) : (
                                <span
                                    onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(output.id, output.label); }}
                                    style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)', marginRight: '42px', whiteSpace: 'nowrap', textAlign: 'right', cursor: 'text', flex: 1 }}
                                    title="Double click to rename"
                                >
                                    {output.label}
                                </span>
                            )
                        )}

                        <div
                            style={{
                                position: 'absolute',
                                right: `${outputPortOffsetRight ?? 5}px`,
                                display: 'flex',
                                alignItems: 'center',
                                zIndex: 100
                            }}
                        >
                            <div
                                id={`port-${nodeId}-${output.id}`}
                                className="node-port"
                                onMouseDown={(e) => onPortMouseDown(e, output.id)}
                                onMouseUp={(e) => onPortMouseUp(e, output.id)}
                                style={{
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    background: '#ef4444',
                                    border: '2px solid #ffffff',
                                    cursor: 'crosshair',
                                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                                }}
                            />

                        </div>
                    </div>
                )
            })}

            {canAddOutput && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onAddOutput(); }}
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
                        marginRight: '38px',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <Plus size={10} /> Add Output
                </button>
            )}
        </div>
    );
};