import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { NodePortItem } from './NodePortItem';

// Type definitions
interface Port {
    id: string;
    label: string;
}

interface Connection {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourcePort: string;
    targetPort: string;
}

interface PortListProps {
    type: 'input' | 'output';
    nodeId: string;
    ports: Port[];
    connections: Connection[];
    portModifiers: { [portId: string]: Array<string> };
    setPortModifiers: React.Dispatch<React.SetStateAction<{ [portId: string]: any }>>;
    componentId?: string;
    hideAddPort?: boolean;
    hideHeader?: boolean;
    hidePortControls?: boolean;
    hideModifierMenu?: boolean;
    hidePortLabels?: boolean;
    hideDisconnectButton?: boolean;
    onAddPort: () => void;
    onRemovePort: (portId: string) => void;
    onPortsChange?: (newPorts: Port[]) => void;
    onConnectionStart: (nodeId: string, portId: string, position: { x: number; y: number }) => void;
    onConnectionComplete: (nodeId: string, portId: string) => void;
    onDeleteConnection?: (connectionId: string) => void;
    editingPortId: string | null;
    editingPortValue: string;
    setEditingPortId: React.Dispatch<React.SetStateAction<string | null>>;
    setEditingPortValue: React.Dispatch<React.SetStateAction<string>>;
    interactionMode?: 'node' | '3d' | 'wire';
    nodeSelected: boolean;
}

export const NodePortList: React.FC<PortListProps> = ({
    type,
    nodeId,
    ports,
    connections,
    portModifiers,
    setPortModifiers,
    componentId,
    onAddPort,
    onRemovePort,
    onPortsChange,
    onConnectionStart,
    onConnectionComplete,
    onDeleteConnection,
    editingPortId,
    editingPortValue,
    setEditingPortId,
    setEditingPortValue,
    interactionMode,
    hideAddPort,
    hideHeader,
    hidePortControls,
    hideModifierMenu,
    hidePortLabels,
    hideDisconnectButton,
    nodeSelected,
}) => {
    const [hoveredPortId, setHoveredPortId] = useState<string | null>(null);
    const [modifierMenuOpenId, setModifierMenuOpenId] = useState<string | null>(null);

    const isInput = type === 'input';

    const handleToggleModifier = (portId: string, modifierId: string) => {
        const currentModifiers = portModifiers[portId] || [];
        let newModifiers;

        if (currentModifiers.includes(modifierId)) {
            newModifiers = currentModifiers.filter(m => m !== modifierId);
        } else {
            newModifiers = [...currentModifiers, modifierId];
        }

        setPortModifiers(prev => ({ ...prev, [portId]: newModifiers }));
    };

    const handleSavePortLabel = (portId: string) => {
        if (editingPortValue.trim() && typeof onPortsChange === 'function') {
            const updatedPorts = ports.map(p =>
                p.id === portId
                    ? { ...p, label: editingPortValue.trim() }
                    : p
            );
            onPortsChange(updatedPorts);
        }
        setEditingPortId(null);
    };

    const alignmentStyles: React.CSSProperties = isInput ? {} : { alignItems: 'flex-end', marginLeft: 'auto' };
    const flexStyles: React.CSSProperties = isInput ? { flex: 1 } : { flex: '0 0 auto' };

    useEffect(() => {
        if (!nodeSelected) {
            setHoveredPortId(null);
            setModifierMenuOpenId(null);
        }
    }, [nodeSelected]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', ...alignmentStyles, ...flexStyles }}>
            {!hideHeader && (
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)', letterSpacing: '0.5px', marginBottom: '4px', textAlign: isInput ? 'left' : 'right', width: '100%' }}>
                    {isInput ? 'INPUTS' : 'OUTPUTS'}
                </div>
            )}

            {ports.map((port) => {
                const isConnected = isInput
                    ? connections.some(conn => conn.targetNodeId === nodeId && conn.targetPort === port.id)
                    : connections.some(conn => conn.sourceNodeId === nodeId && conn.sourcePort === port.id);

                return (
                    <NodePortItem
                        key={port.id}
                        port={port}
                        type={type}
                        nodeId={nodeId}
                        isConnected={isConnected}
                        componentId={componentId}
                        portModifiers={portModifiers}
                        hoveredPortId={hoveredPortId}
                        modifierMenuOpenId={modifierMenuOpenId}
                        editingPortId={editingPortId}
                        editingPortValue={editingPortValue}
                        onConnectionStart={onConnectionStart}
                        onConnectionComplete={onConnectionComplete}
                        onDeleteConnection={onDeleteConnection}
                        onRemovePort={onRemovePort}
                        onPortsChange={onPortsChange}
                        setHoveredPortId={setHoveredPortId}
                        setModifierMenuOpenId={setModifierMenuOpenId}
                        setEditingPortId={setEditingPortId}
                        setEditingPortValue={setEditingPortValue}
                        handleSavePortLabel={handleSavePortLabel}
                        handleToggleModifier={handleToggleModifier}
                        connections={connections}
                    interactionMode={interactionMode}
                    hidePortControls={hidePortControls}
                    hideModifierMenu={hideModifierMenu}
                    hidePortLabels={hidePortLabels}
                    hideDisconnectButton={hideDisconnectButton}
                    nodeSelected={nodeSelected}
                />
                );
            })}

            {!componentId && !hideAddPort && (
                <button
                    onClick={onAddPort}
                    style={{ background: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#fff', fontWeight: 600, width: 'fit-content', whiteSpace: 'nowrap' }}
                >
                    <Plus size={12} />
                    Add {isInput ? 'Input' : 'Output'}
                </button>
            )}
        </div>
    );
};
