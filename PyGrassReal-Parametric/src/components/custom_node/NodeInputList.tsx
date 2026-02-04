import React from 'react';
import { Plus, X, Check } from 'lucide-react';
import type { Port } from '../../types/NodeTypes';

import styles from './NodeInputList.module.css';

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
        <div className={styles.nodeInputListContainer}>
            {inputs.map((input) => {
                const isConnectedInput = connections.some(
                    conn => conn.targetNodeId === nodeId && conn.targetPort === input.id
                );

                return (
                    <div
                        key={input.id}
                        className={styles.nodeInputListItem}
                        onMouseEnter={() => setHoveredPortId(input.id)}
                        onMouseLeave={() => setHoveredPortId(null)}
                    >
                        <div className={styles.nodePortContainer}>


                            <div
                                id={`port-${nodeId}-${input.id}`}
                                className={`${styles.nodePort} node-port`}
                                onMouseDown={(e) => onPortMouseDown(e, input.id)}
                                onMouseUp={(e) => onPortMouseUp(e, input.id)}
                            />
                        </div>

                        {!hidePortLabels && (
                            editingPortId === input.id ? (
                                <div className={styles.portLabelEditContainer}>
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
                                        className={styles.portLabelInput}
                                    />
                                    <button onClick={() => onSavePortEdit(input.id, true)} className={styles.portLabelEditButton}><Check size={14} color="#22c55e" /></button>
                                    <button onClick={onCancelEdit} className={styles.portLabelEditButton}><X size={14} color="#ef4444" /></button>
                                </div>
                            ) : (
                                <span
                                    onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(input.id, input.label); }}
                                    className={styles.portLabel}
                                    title="Double click to rename"
                                >
                                    {input.label}
                                </span>
                            )
                        )}

                    </div>
                )
            })}

            {/* Add Input Button (Relocated) */}
            {(!hideInputsAdd && !componentId) && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onAddInput(); }}
                    className={styles.addInputButton}
                >
                    <Plus size={10} /> Add Input
                </button>
            )}
        </div>
    );
};