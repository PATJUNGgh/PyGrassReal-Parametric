import React from 'react';
import { Plus, X, Check } from 'lucide-react';
import type { Port } from '../../types/NodeTypes';
import { useNodeInteraction } from '../../context/NodeInteractionContext';
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
    inputsAreaWidth?: number;
    inputPortOffsetLeft?: number;
    inputListTopPadding?: number;
    inputRowMinHeight?: number;
    inputRowGap?: number;
    inputRowPaddingY?: number;
    isInteractionDisabled?: boolean;
    onLabelMouseUp?: () => void;
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
    inputsAreaWidth,
    inputPortOffsetLeft,
    inputListTopPadding,
    inputRowMinHeight,
    inputRowGap,
    inputRowPaddingY,
    isInteractionDisabled = false,
    onLabelMouseUp,
}) => {
    const {
        hoveredPortId,
        editingPortId,
        tempPortLabel,
        setHoveredPortId,
        setTempPortLabel,
        onPortMouseDown,
        onPortMouseUp,
        startEdit,
        cancelEdit,
        onSavePortEdit,
        onRemoveInput,
        onAddInput,
        isPortRenamable,
        canAddInput,
    } = useNodeInteraction();

    const stopNodeDrag = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
    };

    if (inputs.length === 0 && (hideInputs || componentId || hideInputsAdd || !canAddInput)) {
        return null;
    }

    return (
        <div
            className={styles.nodeInputListContainer}
            style={{
                flex: inputsAreaWidth ? `0 0 ${inputsAreaWidth}px` : 1,
                width: inputsAreaWidth ? `${inputsAreaWidth}px` : undefined,
                display: 'flex',
                flexDirection: 'column',
                gap: `${inputRowGap ?? 0}px`,
                minWidth: 0,
                paddingTop: inputListTopPadding ?? 0,
                pointerEvents: isInteractionDisabled ? 'none' : 'auto',
            }}
        >
            {inputs.map((input) => {
                return (
                    <div
                        key={input.id}
                        className={styles.nodeInputListItem}
                        style={{
                            minHeight: inputRowMinHeight ?? 24,
                            padding: `${inputRowPaddingY ?? 2}px 0`,
                        }}
                        onMouseEnter={() => setHoveredPortId(input.id)}
                        onMouseLeave={() => setHoveredPortId(null)}
                    >
                        <div
                            className={`${styles.nodePortContainer} ${['unit-x', 'unit-y', 'unit-z'].includes(nodeType || '') ? styles.nodePortContainerUnit : ''}`}
                            style={inputPortOffsetLeft !== undefined ? { left: `${inputPortOffsetLeft}px` } : undefined}
                        >
                            <div
                                className={styles.nodePortHitbox}
                                data-node-id={nodeId}
                                data-port-id={input.id}
                                onPointerDown={(e) => {
                                    onPortMouseDown(e, input.id);
                                }}
                                onPointerUp={(e) => {
                                    onPortMouseUp(e, input.id);
                                }}
                            >
                                <div
                                    id={`port-${nodeId}-${input.id}`}
                                    className={`${styles.nodePort} node-port`}
                                    data-node-id={nodeId}
                                    data-port-id={input.id}
                                />
                            </div>
                        </div>

                        {!hidePortLabels && (
                            editingPortId === input.id ? (
                                <div className={styles.portLabelEditContainer} onMouseDown={stopNodeDrag}>
                                    <input
                                        autoFocus
                                        value={tempPortLabel}
                                        onChange={(e) => setTempPortLabel(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                onSavePortEdit(input.id, true);
                                                e.stopPropagation();
                                            }
                                            if (e.key === 'Escape') {
                                                cancelEdit();
                                                e.stopPropagation();
                                            }
                                        }}
                                        onMouseDown={stopNodeDrag}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className={styles.portLabelInput}
                                    />
                                    <button
                                        type="button"
                                        onMouseDown={stopNodeDrag}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={() => onSavePortEdit(input.id, true)}
                                        className={styles.portLabelEditButton}
                                        title="Confirm"
                                    >
                                        <Check size={14} color="#22c55e" />
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={stopNodeDrag}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={cancelEdit}
                                        className={styles.portLabelEditButton}
                                        title="Cancel"
                                    >
                                        <X size={14} color="#ef4444" />
                                    </button>
                                </div>
                            ) : (
                                <span
                                    onDoubleClick={(e) => { e.stopPropagation(); if(isPortRenamable) startEdit(input.id, input.label); }}
                                    onMouseDown={stopNodeDrag}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseUp={(e) => {
                                        e.stopPropagation();
                                        onLabelMouseUp?.();
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`${styles.portLabel} node-port-label-copyable`}
                                    title={isPortRenamable ? "Double click to rename" : ""}
                                >
                                    {input.label}
                                </span>
                            )
                        )}

                        {canAddInput && !hidePortControls && selected && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemoveInput(input.id); }}
                                onPointerDown={(e) => e.stopPropagation()}
                                className={styles.removeInputButton}
                                title="Remove Input"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                );
            })}

            {canAddInput && !hideInputsAdd && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onAddInput(); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={styles.addInputButton}
                    title="Add Input"
                >
                    <Plus size={12} />
                </button>
            )}
        </div>
    );
};
