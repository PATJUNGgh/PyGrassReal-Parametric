import React, { useEffect, useRef, useState } from 'react';
import type { Connection, Port } from '../types/NodeTypes';
import { Copy, Info, Power } from 'lucide-react';
import { useNodeDragV2 } from '../hooks/useNodeDragV2';
import { getDisconnectPolicy } from '../graph/connectionPolicy';
import styles from './AiAgentNode.module.css';
import phraramAvatar from '../../assets/Profile-Ai/PHRARAM-AI-512.png';
import hanumanAvatar from '../../assets/Profile-Ai/HANUMAN-AI-512.png';
import phralakAvatar from '../../assets/Profile-Ai/PHRALAK-AI-512.png';
import phipekAvatar from '../../assets/Profile-Ai/PHIPEK-AI-512.png';
import phraramVectorAvatar from '../../assets/Profile-Ai/vector-centered/PHRARAM-AI(noname)-centered.png';
import hanumanVectorAvatar from '../../assets/Profile-Ai/vector-centered/HANUMAN-AI(noname)-centered.png';
import phralakVectorAvatar from '../../assets/Profile-Ai/vector-centered/PHRALAK-AI(noname)-centered.png';
import phipekVectorAvatar from '../../assets/Profile-Ai/vector-centered/PHIPEK-AI(noname)-centered.png';

type AgentType = 'phraram' | 'hanuman' | 'phralak' | 'phipek';
type PortMode = 'input' | 'output';

interface AgentOption {
    id: AgentType;
    label: string;
    image: string;
}

const AI_AGENT_INPUT_PORT: Port = { id: 'input-agent', label: 'Input', type: 'Data' };
const AI_AGENT_OUTPUT_PORT: Port = { id: 'output-agent', label: 'Output', type: 'Data' };

const AGENT_OPTIONS: AgentOption[] = [
    { id: 'phraram', label: 'Phraram', image: phraramAvatar },
    { id: 'hanuman', label: 'Hanuman', image: hanumanAvatar },
    { id: 'phralak', label: 'Phralak', image: phralakAvatar },
    { id: 'phipek', label: 'Phipek', image: phipekAvatar },
];

const isAgentType = (value: unknown): value is AgentType => {
    return value === 'phraram' || value === 'hanuman' || value === 'phralak' || value === 'phipek';
};

const isPortMode = (value: unknown): value is PortMode => {
    return value === 'input' || value === 'output';
};

const getPortsForMode = (mode: PortMode) => {
    return mode === 'input'
        ? { inputs: [AI_AGENT_INPUT_PORT], outputs: [] as Port[] }
        : { inputs: [] as Port[], outputs: [AI_AGENT_OUTPUT_PORT] };
};

const arePortsEqual = (ports: Port[] | undefined, expectedPorts: Port[]) => {
    if ((ports?.length ?? 0) !== expectedPorts.length) {
        return false;
    }

    return expectedPorts.every((expectedPort, index) => {
        const current = ports?.[index];
        return (
            current?.id === expectedPort.id
            && current?.label === expectedPort.label
            && current?.type === expectedPort.type
        );
    });
};

interface AiAgentNodeProps {
    id: string;
    data: {
        width?: number;
        height?: number;
        customName?: string;
        agentType?: AgentType;
        portMode?: PortMode;
        isPaused?: boolean;
        isNewAiAgent?: boolean;
        inputs?: Port[];
        outputs?: Port[];
    };
    position: { x: number; y: number };
    selected: boolean;
    scale?: number;
    isInfected?: boolean;
    connections: Connection[];
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    onDataChange: (id: string, data: Record<string, unknown>) => void;
    onDelete: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onConnectionStart: (nodeId: string, portId: string, position: { x: number; y: number }) => void;
    onConnectionComplete: (nodeId: string, portId: string) => void;
    onSelect?: (multiSelect?: boolean) => void;
    onDeleteConnection?: (connectionId: string) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}

export const AiAgentNode: React.FC<AiAgentNodeProps> = (props) => {
    const defaultName = 'AI Agent';
    const {
        id,
        data,
        connections,
        onDataChange,
        onDelete,
        onDuplicate,
        onDeleteConnection,
        onPositionChange,
        selected,
        onSelect,
        onConnectionStart,
        onConnectionComplete,
        onDragStart,
        onDragEnd,
        position,
        scale = 1,
        isInfected = false,
    } = props;

    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [isNameEditorOpen, setIsNameEditorOpen] = useState(false);
    const [nameDraft, setNameDraft] = useState('');
    const [isSpawnPopIn, setIsSpawnPopIn] = useState(!!data.isNewAiAgent);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const circleRef = useRef<HTMLDivElement | null>(null);
    const nameInputRef = useRef<HTMLInputElement | null>(null);
    const hasDraggedRef = useRef(false);
    const wasDraggingRef = useRef(false);

    const agentType: AgentType = isAgentType(data.agentType) ? data.agentType : 'phraram';
    const portMode: PortMode = isPortMode(data.portMode) ? data.portMode : 'input';
    const displayName = typeof data.customName === 'string' && data.customName.trim()
        ? data.customName.trim()
        : defaultName;
    const selectedAgent = AGENT_OPTIONS.find((option) => option.id === agentType) ?? AGENT_OPTIONS[0];
    const expectedPorts = getPortsForMode(portMode);
    const diameter = 144;
    const portId = portMode === 'input' ? AI_AGENT_INPUT_PORT.id : AI_AGENT_OUTPUT_PORT.id;
    const isPaused = data.isPaused === true;

    useEffect(() => {
        if (!isPickerOpen && !isActionMenuOpen && !isNameEditorOpen) {
            return;
        }

        const handleWindowPointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!target || !rootRef.current?.contains(target)) {
                setIsPickerOpen(false);
                setIsActionMenuOpen(false);
                setIsNameEditorOpen(false);
            }
        };

        window.addEventListener('pointerdown', handleWindowPointerDown);
        return () => {
            window.removeEventListener('pointerdown', handleWindowPointerDown);
        };
    }, [isPickerOpen, isActionMenuOpen, isNameEditorOpen]);

    useEffect(() => {
        if (!selected) {
            setIsActionMenuOpen(false);
        }
    }, [selected]);

    useEffect(() => {
        if (!isNameEditorOpen) {
            return;
        }
        const timer = window.setTimeout(() => {
            nameInputRef.current?.focus();
            nameInputRef.current?.select();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [isNameEditorOpen]);

    useEffect(() => {
        const updates: Record<string, unknown> = {};
        const portsNeedSync = (
            !arePortsEqual(data.inputs, expectedPorts.inputs)
            || !arePortsEqual(data.outputs, expectedPorts.outputs)
        );
        const stateNeedSync = data.agentType !== agentType || data.portMode !== portMode;
        const sizeNeedSync = data.width !== diameter || data.height !== diameter;
        const nameNeedSync = typeof data.customName !== 'string' || !data.customName.trim();

        if (portsNeedSync || stateNeedSync) {
            updates.agentType = agentType;
            updates.portMode = portMode;
            updates.inputs = expectedPorts.inputs;
            updates.outputs = expectedPorts.outputs;
        }
        if (sizeNeedSync) {
            updates.width = diameter;
            updates.height = diameter;
        }
        if (nameNeedSync) {
            updates.customName = defaultName;
        }

        if (Object.keys(updates).length === 0) {
            return;
        }

        onDataChange(id, updates);
    }, [
        id,
        data.agentType,
        data.portMode,
        data.inputs,
        data.outputs,
        data.width,
        data.height,
        data.customName,
        onDataChange,
        agentType,
        portMode,
        expectedPorts.inputs,
        expectedPorts.outputs,
        defaultName,
    ]);

    const handlePositionChange = (nextPosition: { x: number; y: number }) => {
        hasDraggedRef.current = true;
        onPositionChange(id, nextPosition);
    };

    const { isDragging, handlePointerDown: handleDragPointerDown } = useNodeDragV2({
        onPositionChange: handlePositionChange,
        initialPosition: position,
        scale,
        disabled: isPaused,
    });

    useEffect(() => {
        if (isDragging && !wasDraggingRef.current) {
            setIsSpawnPopIn(false);
            onDragStart?.();
        }
        if (!isDragging && wasDraggingRef.current) {
            onDragEnd?.();
        }
        wasDraggingRef.current = isDragging;
    }, [isDragging, onDragStart, onDragEnd]);

    useEffect(() => {
        if (!data.isNewAiAgent) {
            return;
        }

        setIsSpawnPopIn(true);
        const timer = window.setTimeout(() => {
            setIsSpawnPopIn(false);
        }, 420);

        return () => window.clearTimeout(timer);
    }, [data.isNewAiAgent]);

    const disconnectNodeConnectionsByPolicy = (nextMode: PortMode) => {
        if (!onDeleteConnection) {
            return;
        }

        const disconnectPolicy = getDisconnectPolicy('ai-agent', portMode, nextMode);
        if (!disconnectPolicy.allow || disconnectPolicy.scope === 'none') {
            return;
        }

        const relatedConnections = connections.filter(
            (connection) => {
                if (disconnectPolicy.scope === 'incoming') {
                    return connection.targetNodeId === id;
                }
                if (disconnectPolicy.scope === 'outgoing') {
                    return connection.sourceNodeId === id;
                }
                return connection.sourceNodeId === id || connection.targetNodeId === id;
            }
        );

        relatedConnections.forEach((connection) => {
            onDeleteConnection(connection.id);
        });
    };

    const handleAgentSelect = (nextAgentType: AgentType) => {
        if (nextAgentType === agentType) {
            setIsPickerOpen(false);
            return;
        }

        onDataChange(id, { agentType: nextAgentType });
        setIsPickerOpen(false);
    };

    const handlePortModeChange = (nextMode: PortMode) => {
        if (nextMode === portMode) {
            return;
        }

        disconnectNodeConnectionsByPolicy(nextMode);
        const nextPorts = getPortsForMode(nextMode);

        onDataChange(id, {
            portMode: nextMode,
            inputs: nextPorts.inputs,
            outputs: nextPorts.outputs,
        });
    };

    const handleBottomMenuToggle = () => {
        setIsPickerOpen(false);
        setIsNameEditorOpen(false);
        setIsActionMenuOpen((previous) => !previous);
    };

    const handleTogglePause = () => {
        onDataChange(id, { isPaused: !isPaused });
        setIsActionMenuOpen(false);
    };

    const handleDuplicate = () => {
        onDuplicate?.(id);
        setIsActionMenuOpen(false);
    };

    const handleInfo = () => {
        alert(`Node ID: ${id}\nName: ${displayName}`);
        setIsActionMenuOpen(false);
    };

    const isPointerInsideCircle = (event: React.PointerEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = event.clientX - centerX;
        const dy = event.clientY - centerY;
        const radius = rect.width / 2;
        return (dx * dx) + (dy * dy) <= radius * radius;
    };

    const isClickInAvatarZone = (event: React.MouseEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = event.clientX - centerX;
        const dy = event.clientY - centerY;
        const avatarZoneRadius = 58;
        return (dx * dx) + (dy * dy) <= avatarZoneRadius * avatarZoneRadius;
    };

    const handleCirclePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        if (!isPointerInsideCircle(event)) return;

        event.stopPropagation();
        hasDraggedRef.current = false;
        setIsPickerOpen(false);
        setIsActionMenuOpen(false);
        setIsNameEditorOpen(false);

        const isMultiSelect = event.ctrlKey || event.shiftKey;
        if (!selected || isMultiSelect) {
            onSelect?.(isMultiSelect);
        }

        handleDragPointerDown(event);
    };

    const handlePortPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        onConnectionStart(id, portId, {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        });
    };

    const handlePortPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        event.stopPropagation();
        onConnectionComplete(id, portId);
    };

    const handleCircleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsPickerOpen(false);
        setIsNameEditorOpen(false);
        setIsActionMenuOpen(true);
    };

    const handleNameConfirm = () => {
        const nextName = nameDraft.trim() || defaultName;
        onDataChange(id, { customName: nextName });
        setIsNameEditorOpen(false);
    };

    const handleNameCancel = () => {
        setNameDraft(displayName);
        setIsNameEditorOpen(false);
    };

    return (
        <div
            ref={rootRef}
            className={styles.root}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${diameter}px`,
                height: `${diameter}px`,
                zIndex: selected ? 120 : 2,
            }}
        >
            {!isNameEditorOpen && (
                <button
                    type="button"
                    className={`${styles.label} ${selected ? styles.labelSelected : ''}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        setNameDraft(displayName);
                        setIsNameEditorOpen(true);
                        setIsPickerOpen(false);
                        setIsActionMenuOpen(false);
                    }}
                    title="Click to rename"
                >
                    {displayName}
                </button>
            )}

            {selected && (
                <button
                    type="button"
                    className={styles.deleteButton}
                    aria-label="Delete AI Agent"
                    title="Delete AI Agent"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        onDelete(id);
                    }}
                >
                    <span className={styles.deleteIcon} aria-hidden="true" />
                </button>
            )}

            {isNameEditorOpen && (
                <div
                    className={styles.nameEditor}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                >
                    <input
                        ref={nameInputRef}
                        type="text"
                        className={styles.nameInput}
                        value={nameDraft}
                        maxLength={42}
                        onChange={(event) => setNameDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                handleNameConfirm();
                            } else if (event.key === 'Escape') {
                                event.preventDefault();
                                handleNameCancel();
                            }
                        }}
                    />
                    <button
                        type="button"
                        className={`${styles.nameActionButton} ${styles.nameActionConfirm}`}
                        onClick={handleNameConfirm}
                        aria-label="Confirm name"
                        title="Confirm"
                    >
                        {'\u2713'}
                    </button>
                    <button
                        type="button"
                        className={`${styles.nameActionButton} ${styles.nameActionCancel}`}
                        onClick={handleNameCancel}
                        aria-label="Cancel rename"
                        title="Cancel"
                    >
                        {'\u2715'}
                    </button>
                </div>
            )}

            <div
                className={`${styles.vectorFxLayer} ${isPickerOpen ? styles.vectorFxLayerActive : ''}`}
            >
                <span className={`${styles.vectorBeam} ${styles.vectorBeamTl}`} />
                <span className={`${styles.vectorBeam} ${styles.vectorBeamTr}`} />
                <span className={`${styles.vectorBeam} ${styles.vectorBeamBr}`} />
                <span className={`${styles.vectorBeam} ${styles.vectorBeamBl}`} />

                <button
                    type="button"
                    className={`${styles.vectorNode} ${styles.vectorNodeTl} ${agentType === 'phraram' ? styles.vectorNodeSelected : ''}`}
                    title="Phraram"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        handleAgentSelect('phraram');
                    }}
                >
                    <img
                        src={phraramVectorAvatar}
                        alt="Phraram"
                        className={`${styles.vectorAvatarImage} ${styles.vectorAvatarPhraram}`}
                        draggable={false}
                    />
                </button>
                <button
                    type="button"
                    className={`${styles.vectorNode} ${styles.vectorNodeTr} ${agentType === 'hanuman' ? styles.vectorNodeSelected : ''}`}
                    title="Hanuman"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        handleAgentSelect('hanuman');
                    }}
                >
                    <img
                        src={hanumanVectorAvatar}
                        alt="Hanuman"
                        className={`${styles.vectorAvatarImage} ${styles.vectorAvatarHanuman}`}
                        draggable={false}
                    />
                </button>
                <button
                    type="button"
                    className={`${styles.vectorNode} ${styles.vectorNodeBl} ${agentType === 'phralak' ? styles.vectorNodeSelected : ''}`}
                    title="Phralak"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        handleAgentSelect('phralak');
                    }}
                >
                    <img
                        src={phralakVectorAvatar}
                        alt="Phralak"
                        className={`${styles.vectorAvatarImage} ${styles.vectorAvatarPhralak}`}
                        draggable={false}
                    />
                </button>
                <button
                    type="button"
                    className={`${styles.vectorNode} ${styles.vectorNodeBr} ${agentType === 'phipek' ? styles.vectorNodeSelected : ''}`}
                    title="Phipek"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                        event.stopPropagation();
                        handleAgentSelect('phipek');
                    }}
                >
                    <img
                        src={phipekVectorAvatar}
                        alt="Phipek"
                        className={`${styles.vectorAvatarImage} ${styles.vectorAvatarPhipek}`}
                        draggable={false}
                    />
                </button>
            </div>

            <div
                ref={circleRef}
                className={`${styles.circle} ${selected ? styles.circleSelected : ''} custom-node-base ${isSpawnPopIn ? styles.popIn : ''}`}
                data-no-selection="true"
                onPointerDown={handleCirclePointerDown}
                onClick={(event) => {
                    event.stopPropagation();
                    const isMultiSelect = event.ctrlKey || event.shiftKey;
                    if (!hasDraggedRef.current && isClickInAvatarZone(event)) {
                        setIsPickerOpen((previous) => !previous);
                        setIsActionMenuOpen(false);
                        return;
                    }
                    if (!hasDraggedRef.current && selected && !isMultiSelect) {
                        onSelect?.(false);
                    }
                }}
                onContextMenu={handleCircleContextMenu}
            >
                <div
                    className={`${styles.circleGlow} ${selected ? styles.circleGlowSelected : ''} ${isInfected ? styles.circleGlowInfected : ''}`}
                    aria-hidden
                />

                <div className={styles.avatarAnchor}>
                    <button
                        type="button"
                        className={styles.avatarButton}
                        title={`${selectedAgent.label} (click to change)`}
                        onClick={(event) => {
                            event.stopPropagation();
                            if (hasDraggedRef.current) {
                                return;
                            }
                            setIsPickerOpen((previous) => !previous);
                            setIsActionMenuOpen(false);
                        }}
                    >
                        <img
                            src={selectedAgent.image}
                            alt={selectedAgent.label}
                            className={styles.avatarImage}
                            draggable={false}
                        />
                    </button>

                </div>
            </div>

            {selected && (
                <button
                    type="button"
                    className={styles.bottomMenuButton}
                    title="Open menu"
                    aria-haspopup="menu"
                    aria-expanded={isActionMenuOpen}
                    onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                    }}
                    onClick={(event) => {
                        event.stopPropagation();
                        handleBottomMenuToggle();
                    }}
                >
                    M
                </button>
            )}

            {isActionMenuOpen && (
                <>
                    <div
                        className={styles.actionMenuBackdrop}
                        onPointerDown={(event) => {
                            event.stopPropagation();
                            setIsActionMenuOpen(false);
                        }}
                        onClick={(event) => {
                            event.stopPropagation();
                            setIsActionMenuOpen(false);
                        }}
                    />
                    <div
                        className={styles.actionMenuPopup}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className={`${styles.actionMenuItem} ${styles.actionMenuItemPower} ${isPaused ? styles.actionMenuItemPaused : ''}`}
                            title={isPaused ? 'Resume Node' : 'Pause Node'}
                            aria-pressed={isPaused}
                            onClick={handleTogglePause}
                        >
                            <Power size={14} strokeWidth={2.2} />
                        </button>
                        <button
                            type="button"
                            className={`${styles.actionMenuItem} ${styles.actionMenuItemDuplicate}`}
                            title="Duplicate Node"
                            onClick={handleDuplicate}
                            disabled={!onDuplicate}
                        >
                            <Copy size={14} strokeWidth={2.2} />
                        </button>
                        <button
                            type="button"
                            className={`${styles.actionMenuItem} ${styles.actionMenuItemInfo}`}
                            title="Node Info"
                            onClick={handleInfo}
                        >
                            <Info size={14} strokeWidth={2.2} />
                        </button>
                    </div>
                </>
            )}

            <div
                className={`${styles.portHitbox} ${portMode === 'input' ? styles.portLeft : styles.portRight}`}
                data-node-id={id}
                data-port-id={portId}
                onPointerDown={handlePortPointerDown}
                onPointerUp={handlePortPointerUp}
            >
                <div
                    id={`port-${id}-${portId}`}
                    className={`node-port ${styles.port} ${portMode === 'input' ? styles.portInput : styles.portOutput}`}
                    data-node-id={id}
                    data-port-id={portId}
                />
            </div>

            <div
                className={styles.modeMiniToggle}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
            >
                <button
                    type="button"
                    className={`${styles.modeMiniButton} ${portMode === 'input' ? styles.modeMiniButtonInputActive : ''}`}
                    onClick={() => handlePortModeChange('input')}
                    title="Set Input mode"
                >
                    IN
                </button>
                <button
                    type="button"
                    className={`${styles.modeMiniButton} ${portMode === 'output' ? styles.modeMiniButtonOutputActive : ''}`}
                    onClick={() => handlePortModeChange('output')}
                    title="Set Output mode"
                >
                    OUT
                </button>
            </div>
        </div>
    );
};


