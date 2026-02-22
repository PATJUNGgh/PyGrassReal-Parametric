import React from 'react';
import { Plus, X, Check } from 'lucide-react';
import type { Port } from '../../types/NodeTypes';
import { useNodeInteraction } from '../../context/NodeInteractionContext';
import styles from './NodeOutputList.module.css';

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
    hidePortLabels?: boolean;
    hidePortControls?: boolean;
    selected: boolean;
    nodeType?: string;
    outputsAreaWidth?: number;
    outputPortOffsetRight?: number;
    outputPortOffsetLeft?: number;
    outputPortSide?: 'left' | 'right';
    outputListTopPadding?: number;
    outputRowMinHeight?: number;
    outputRowGap?: number;
    outputRowPaddingY?: number;
    outputLabelMarginRight?: number;
    outputEditMarginRight?: number;
    outputPortAbsoluteCentered?: boolean;
    isInteractionDisabled?: boolean;
    onLabelMouseUp?: () => void;
}

export const NodeOutputList: React.FC<NodeOutputListProps> = ({
    nodeId,
    outputs,
    connections,
    componentId,
    hidePortLabels,
    hidePortControls,
    selected,
    nodeType,
    outputsAreaWidth,
    outputPortOffsetRight,
    outputPortOffsetLeft,
    outputPortSide = 'right',
    outputListTopPadding,
    outputRowMinHeight,
    outputRowGap,
    outputRowPaddingY,
    outputLabelMarginRight,
    outputEditMarginRight,
    outputPortAbsoluteCentered,
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
        onRemoveOutput,
        onAddOutput,
        canAddOutput,
        isPortRenamable,
    } = useNodeInteraction();

    const stopNodeDrag = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
    };

    const outputOnLeft = outputPortSide === 'left';
    const isVectorXYZ = nodeType === 'vector-xyz';
    const fallbackOutputLabelMarginRight = isVectorXYZ ? '52px' : undefined;
    const fallbackOutputEditMarginRight = isVectorXYZ ? '34px' : undefined;
    const resolvedOutputLabelMarginRight = typeof outputLabelMarginRight === 'number'
        ? `${outputLabelMarginRight}px`
        : fallbackOutputLabelMarginRight;
    const resolvedOutputEditMarginRight = typeof outputEditMarginRight === 'number'
        ? `${outputEditMarginRight}px`
        : fallbackOutputEditMarginRight;
    const addOutputOffset = resolvedOutputLabelMarginRight ?? '22px';
    const addOutputButtonStyle = {
        ['--add-output-offset' as const]: addOutputOffset
    } as React.CSSProperties;

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
                gap: `${outputRowGap ?? 0}px`,
                alignItems: outputOnLeft ? 'flex-start' : 'flex-end',
                minWidth: 0,
                paddingTop: outputListTopPadding ?? 0,
                pointerEvents: isInteractionDisabled ? 'none' : 'auto',
            }}
        >
            {outputs.map((output) => {
                const isConnectedOutput = connections.some(
                    conn => conn.sourceNodeId === nodeId && conn.sourcePort === output.id
                );

                return (
                    <div
                        key={output.id}
                        className={styles.nodeOutputListItem}
                        style={{
                            minHeight: outputRowMinHeight ?? 24,
                            padding: `${outputRowPaddingY ?? 2}px 0`,
                        }}
                        onMouseEnter={() => setHoveredPortId(output.id)}
                        onMouseLeave={() => setHoveredPortId(null)}
                    >


                        {!hidePortLabels && (
                            editingPortId === output.id ? (
                                <div
                                    className={styles.portLabelEditContainer}
                                    onMouseDown={stopNodeDrag}
                                    style={resolvedOutputEditMarginRight ? { marginRight: resolvedOutputEditMarginRight } : undefined}
                                >
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
                                    <button
                                        type="button"
                                        onMouseDown={stopNodeDrag}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={() => onSavePortEdit(output.id, false)}
                                        className={styles.portLabelEditButton}
                                        title="Confirm"
                                    >
                                        <Check size={14} color="#22c55e" />
                                    </button>
                                    <input
                                        autoFocus
                                        value={tempPortLabel}
                                        onChange={(e) => setTempPortLabel(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                onSavePortEdit(output.id, false);
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
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                                    {!hidePortControls && selected && hoveredPortId === output.id && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRemoveOutput(output.id); }}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className={styles.removeOutputButton}
                                            title="Remove Output"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                    <span
                                        onDoubleClick={(e) => { e.stopPropagation(); if (isPortRenamable) startEdit(output.id, output.label); }}
                                        onMouseDown={stopNodeDrag}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onMouseUp={(e) => {
                                            e.stopPropagation();
                                            onLabelMouseUp?.();
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`${styles.portLabel} node-port-label-copyable`}
                                        style={resolvedOutputLabelMarginRight ? { marginRight: resolvedOutputLabelMarginRight } : undefined}
                                        title={isPortRenamable ? "Double click to rename" : ""}
                                    >
                                        {output.label}
                                    </span>
                                </div>
                            )
                        )}

                        <div
                            className={styles.nodePortContainer}
                            style={{
                                position: outputPortAbsoluteCentered ? 'absolute' : undefined,
                                top: outputPortAbsoluteCentered ? '50%' : undefined,
                                right: outputPortAbsoluteCentered
                                    ? (!outputOnLeft ? `${outputPortOffsetRight ?? -5}px` : undefined)
                                    : undefined,
                                left: outputPortAbsoluteCentered
                                    ? (outputOnLeft ? `${outputPortOffsetLeft ?? -37}px` : undefined)
                                    : undefined,
                                marginRight: !outputPortAbsoluteCentered
                                    ? (!outputOnLeft ? `${outputPortOffsetRight ?? -5}px` : undefined)
                                    : undefined,
                                marginLeft: !outputPortAbsoluteCentered
                                    ? (outputOnLeft ? `${outputPortOffsetLeft ?? -37}px` : undefined)
                                    : undefined,
                                transform: ['boolean-toggle'].includes(nodeType || '')
                                    ? (outputPortAbsoluteCentered
                                        ? `translateY(-50%) translateX(${outputOnLeft ? '-6px' : '6px'})`
                                        : `translateX(${outputOnLeft ? '-6px' : '6px'})`)
                                    : (outputPortAbsoluteCentered ? 'translateY(-50%)' : undefined)
                            }}
                        >
                            <div
                                className={styles.nodePortHitbox}
                                style={{ transform: `translateX(${outputOnLeft ? '-8px' : '8px'})` }}
                                data-node-id={nodeId}
                                data-port-id={output.id}
                                onPointerDown={(e) => {
                                    onPortMouseDown(e, output.id);
                                }}
                                onPointerUp={(e) => {
                                    onPortMouseUp(e, output.id);
                                }}
                            >
                                <div
                                    id={`port-${nodeId}-${output.id}`}
                                    className={`${styles.nodePort} node-port`}
                                    data-node-id={nodeId}
                                    data-port-id={output.id}
                                />
                            </div>

                        </div>
                    </div>
                )
            })}

            {canAddOutput && (
                <div className={`${styles.addOutputRow} ${outputOnLeft ? styles.addOutputRowLeft : styles.addOutputRowRight}`}>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onAddOutput(); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={styles.addOutputButton}
                        style={addOutputButtonStyle}
                        title="Add Output"
                        aria-label="Add Output"
                    >
                        <Plus size={12} />
                    </button>
                </div>
            )}
        </div>
    );
};
