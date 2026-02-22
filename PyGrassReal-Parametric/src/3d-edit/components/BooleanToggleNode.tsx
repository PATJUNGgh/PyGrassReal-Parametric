import React, { useMemo } from 'react';
import { CustomNode } from './CustomNode';
import type { NodeData, Port } from '../types/NodeTypes';

const DEFAULT_VALUE = false;
const MAX_TOGGLES = 16;
const TOGGLE_ROW_HEIGHT = 28;
const TOGGLE_ROW_GAP = 6;

interface BooleanToggleItem {
    id: string;
    value: boolean;
}

interface BooleanBodyProps {
    toggles: BooleanToggleItem[];
    selected?: boolean;
    canAddToggle: boolean;
    canRemoveToggle: boolean;
    onToggle: (toggleId: string) => void;
    onAddToggle: () => void;
    onRemoveToggle: (toggleId: string) => void;
}

const parseToggleIndex = (toggleId: string): number | null => {
    const match = toggleId.match(/^toggle_(\d+)$/);
    if (!match) return null;
    const parsed = Number(match[1]);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
};

const normalizeToggles = (data: NodeData['data']): BooleanToggleItem[] => {
    if (Array.isArray(data.toggles)) {
        const seenIds = new Set<string>();
        const sanitized = data.toggles
            .map((toggle): BooleanToggleItem | null => {
                if (!toggle || typeof toggle.id !== 'string') return null;
                const toggleIndex = parseToggleIndex(toggle.id);
                if (toggleIndex === null) return null;
                const normalizedId = `toggle_${toggleIndex}`;
                if (seenIds.has(normalizedId)) return null;
                seenIds.add(normalizedId);
                return {
                    id: normalizedId,
                    value: typeof toggle.value === 'boolean' ? toggle.value : DEFAULT_VALUE,
                };
            })
            .filter((toggle): toggle is BooleanToggleItem => toggle !== null);

        if (sanitized.length > 0) {
            return sanitized;
        }
    }

    return [{
        id: 'toggle_1',
        value: typeof data.value === 'boolean' ? data.value : DEFAULT_VALUE,
    }];
};

const getToggleNextId = (data: NodeData['data'], toggles: BooleanToggleItem[]): number => {
    const maxToggleId = toggles.reduce((maxId, toggle) => {
        const toggleIndex = parseToggleIndex(toggle.id);
        return toggleIndex !== null && toggleIndex > maxId ? toggleIndex : maxId;
    }, 0);

    const configuredNextId = (
        typeof data.toggleNextId === 'number'
        && Number.isInteger(data.toggleNextId)
        && data.toggleNextId > 0
    )
        ? data.toggleNextId
        : maxToggleId + 1;

    return Math.max(configuredNextId, maxToggleId + 1);
};

const buildOutputPorts = (toggles: BooleanToggleItem[]): Port[] => {
    return toggles.map((toggle) => {
        const toggleIndex = parseToggleIndex(toggle.id) ?? 1;
        return {
            id: `out_${toggleIndex}`,
            label: `Bool #${toggleIndex}`,
            type: 'Boolean',
        };
    });
};

const togglesEqual = (
    source: NodeData['data']['toggles'],
    expected: BooleanToggleItem[]
): boolean => {
    if (!Array.isArray(source) || source.length !== expected.length) {
        return false;
    }

    return expected.every((toggle, index) => {
        const sourceToggle = source[index];
        if (!sourceToggle || typeof sourceToggle.id !== 'string') return false;
        return sourceToggle.id === toggle.id && sourceToggle.value === toggle.value;
    });
};

const outputsEqual = (
    source: NodeData['data']['outputs'],
    expected: Port[]
): boolean => {
    if (!Array.isArray(source) || source.length !== expected.length) {
        return false;
    }

    return expected.every((port, index) => {
        const sourcePort = source[index];
        if (!sourcePort) return false;
        return sourcePort.id === port.id
            && sourcePort.label === port.label
            && sourcePort.type === port.type;
    });
};

const createPatchData = (
    toggles: BooleanToggleItem[],
    toggleNextId: number
): Partial<NodeData['data']> => ({
    toggles,
    toggleNextId,
    value: toggles[0]?.value ?? DEFAULT_VALUE,
    outputs: buildOutputPorts(toggles),
});

const BooleanBody: React.FC<BooleanBodyProps> = ({
    toggles,
    selected,
    canAddToggle,
    canRemoveToggle,
    onToggle,
    onAddToggle,
    onRemoveToggle,
}) => {
    return (
        <div
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: `${TOGGLE_ROW_GAP}px`,
            }}
        >
            {toggles.map((toggle, index) => {
                const toggleIndex = parseToggleIndex(toggle.id) ?? (index + 1);
                const value = toggle.value;

                return (
                    <div
                        key={toggle.id}
                        style={{
                            position: 'relative',
                            height: `${TOGGLE_ROW_HEIGHT}px`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0 6px',
                            borderRadius: '7px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxSizing: 'border-box',
                        }}
                    >
                        {canRemoveToggle && (
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onRemoveToggle(toggle.id);
                                }}
                                onMouseDown={(event) => event.stopPropagation()}
                                style={{
                                    position: 'absolute',
                                    left: '-24px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '18px',
                                    height: '18px',
                                    minWidth: '18px',
                                    minHeight: '18px',
                                    maxWidth: '18px',
                                    maxHeight: '18px',
                                    padding: 0,
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                    borderRadius: '50%',
                                    border: '1px solid rgba(248, 113, 113, 0.9)',
                                    background: 'rgba(117, 65, 65, 0.9)',
                                    color: '#fecaca',
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    lineHeight: '18px',
                                    flexShrink: 0,
                                    boxShadow: '0 0 0 1px rgba(127, 29, 29, 0.6), 0 1px 4px rgba(0, 0, 0, 0.45)',
                                    zIndex: 2,
                                    textAlign: 'center',
                                }}
                                title={`Remove toggle #${toggleIndex}`}
                            >
                                X
                            </button>
                        )}

                        <span
                            style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: 'rgba(255, 255, 255, 0.75)',
                                width: '18px',
                                textAlign: 'left',
                                flexShrink: 0,
                            }}
                        >
                            #{toggleIndex}
                        </span>

                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onToggle(toggle.id);
                            }}
                            onMouseDown={(event) => event.stopPropagation()}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                color: '#fff',
                                cursor: 'pointer',
                            }}
                            title={`Toggle #${toggleIndex}`}
                        >
                            <span
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: value ? '#10b981' : '#ef4444',
                                    letterSpacing: '0.2px',
                                }}
                            >
                                {value ? 'TRUE' : 'FALSE'}
                            </span>

                            <span
                                style={{
                                    width: '32px',
                                    height: '16px',
                                    borderRadius: '999px',
                                    position: 'relative',
                                    background: value ? '#10b981' : '#334155',
                                    transition: 'background 0.2s ease',
                                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.35)',
                                    flexShrink: 0,
                                }}
                            >
                                <span
                                    style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        position: 'absolute',
                                        top: '2px',
                                        left: value ? '18px' : '2px',
                                        background: '#ffffff',
                                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.35)',
                                        transition: 'left 0.2s ease',
                                    }}
                                />
                            </span>
                        </button>

                    </div>
                );
            })}

            {selected && canAddToggle && (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onAddToggle();
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    style={{
                        height: '24px',
                        borderRadius: '6px',
                        border: '1px dashed rgba(255, 255, 255, 0.35)',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxSizing: 'border-box',
                    }}
                    title="Add Toggle"
                >
                    + Add Toggle
                </button>
            )}
        </div>
    );
};

export const BooleanToggleNode: React.FC<Omit<React.ComponentProps<typeof CustomNode>, 'children'>> = (props) => {
    const nodeData = props.data as NodeData['data'];
    const toggles = useMemo(() => normalizeToggles(nodeData), [nodeData]);
    const toggleNextId = useMemo(() => getToggleNextId(nodeData, toggles), [nodeData, toggles]);
    const outputPorts = useMemo(() => buildOutputPorts(toggles), [toggles]);

    React.useEffect(() => {
        const requiresMigration = !togglesEqual(nodeData.toggles, toggles)
            || nodeData.toggleNextId !== toggleNextId
            || !outputsEqual(nodeData.outputs, outputPorts)
            || nodeData.value !== toggles[0]?.value;

        if (requiresMigration) {
            props.onDataChange(props.id, createPatchData(toggles, toggleNextId));
        }
    }, [
        nodeData.outputs,
        nodeData.toggleNextId,
        nodeData.toggles,
        nodeData.value,
        outputPorts,
        props.id,
        props.onDataChange,
        toggleNextId,
        toggles,
    ]);

    const handleToggle = React.useCallback((toggleId: string) => {
        const nextToggles = toggles.map((toggle) => (
            toggle.id === toggleId
                ? { ...toggle, value: !toggle.value }
                : toggle
        ));
        props.onDataChange(props.id, createPatchData(nextToggles, toggleNextId));
    }, [props.id, props.onDataChange, toggleNextId, toggles]);

    const handleAddToggle = React.useCallback(() => {
        if (toggles.length >= MAX_TOGGLES) return;

        const nextToggles = [
            ...toggles,
            { id: `toggle_${toggleNextId}`, value: DEFAULT_VALUE },
        ];
        props.onDataChange(props.id, createPatchData(nextToggles, toggleNextId + 1));
    }, [props.id, props.onDataChange, toggleNextId, toggles]);

    const handleRemoveToggle = React.useCallback((toggleId: string) => {
        if (toggles.length <= 1) return;
        const nextToggles = toggles.filter((toggle) => toggle.id !== toggleId);
        if (nextToggles.length === 0) return;
        props.onDataChange(props.id, createPatchData(nextToggles, toggleNextId));
    }, [props.id, props.onDataChange, toggleNextId, toggles]);

    const enhancedData = useMemo(() => {
        return {
            ...nodeData,
            customName: nodeData.customName || 'Boolean Toggle',
            isNameEditable: false,
            width: 230,
            height: undefined,
            outputs: outputPorts,

            hideInputs: true,
            hideInputsAdd: true,
            hideOutputsAdd: true,
            hidePortControls: true,
            hideModifierMenu: true,
            hideTitleLabel: true,
            hidePortLabels: true,
            hideOutputsHeader: true,

            bodyPadding: '16px 10px 10px 30px',
            bodyMinHeight: 96,
            outputsAreaWidth: 34,
            outputListTopPadding: 0,
            outputRowMinHeight: TOGGLE_ROW_HEIGHT,
            outputRowGap: TOGGLE_ROW_GAP,
            outputRowPaddingY: 0,
            outputPortAbsoluteCentered: true,
            outputPortOffsetRight: 26,
        };
    }, [nodeData, outputPorts]);

    return (
        <CustomNode {...props} data={enhancedData} nodeType="boolean-toggle">
            <BooleanBody
                toggles={toggles}
                selected={props.selected}
                canAddToggle={toggles.length < MAX_TOGGLES}
                canRemoveToggle={toggles.length > 1}
                onToggle={handleToggle}
                onAddToggle={handleAddToggle}
                onRemoveToggle={handleRemoveToggle}
            />
        </CustomNode>
    );
};
