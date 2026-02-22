import React, { createContext, useContext, useState, useCallback } from 'react';
import type { NodeData } from '../types/NodeTypes';

// --- Types ---
interface NodeInteractionContextType {
    hoveredPortId: string | null;
    setHoveredPortId: (portId: string | null) => void;
    editingPortId: string | null;
    tempPortLabel: string;
    setTempPortLabel: (label: string) => void;
    canAddInput: boolean;
    canAddOutput: boolean;
    isPortRenamable: boolean;

    // Handlers
    startEdit: (portId: string, currentLabel: string) => void;
    cancelEdit: () => void;
    onSavePortEdit: (portId:string, isInput: boolean) => void;
    onPortMouseDown: (e: React.MouseEvent | React.PointerEvent, portId: string) => void;
    onPortMouseUp: (e: React.MouseEvent | React.PointerEvent, portId: string) => void;
    onRemoveInput: (inputId: string) => void;
    onAddInput: () => void;
    onRemoveOutput: (outputId: string) => void;
    onAddOutput: () => void;
    onDeleteConnection?: (connectionId: string) => void;
}

const NodeInteractionContext = createContext<NodeInteractionContextType | undefined>(undefined);

// --- Provider ---
interface NodeInteractionProviderProps {
    children: React.ReactNode;
    nodeId: string;
    nodeData: NodeData['data'];
    onDataChange: (id: string, data: any) => void;
    onConnectionStart: (nodeId: string, portId: string, position: { x: number; y: number }) => void;
    onConnectionComplete: (nodeId: string, portId: string) => void;
    onDeleteConnection?: (connectionId: string) => void;
}

export const NodeInteractionProvider: React.FC<NodeInteractionProviderProps> = ({ 
    children, 
    nodeId,
    nodeData,
    onDataChange,
    onConnectionStart,
    onConnectionComplete,
    onDeleteConnection,
}) => {
    const [hoveredPortId, setHoveredPortId] = useState<string | null>(null);
    const [editingPortId, setEditingPortId] = useState<string | null>(null);
    const [tempPortLabel, setTempPortLabel] = useState('');

    const inputs = nodeData.inputs || [];
    const outputs = nodeData.outputs || [];
    const nodeType = nodeData.type;

    const startEdit = useCallback((portId: string, currentLabel: string) => {
        if (nodeType && !['custom', 'input', 'output', 'layer-source', 'layer-bridge'].includes(nodeType)) return;
        setEditingPortId(portId);
        setTempPortLabel(currentLabel);
    }, [nodeType]);

    const cancelEdit = useCallback(() => {
        setEditingPortId(null);
        setTempPortLabel('');
    }, []);

    const onSavePortEdit = useCallback((portId: string, isInput: boolean) => {
        if (!tempPortLabel.trim()) {
            setEditingPortId(null);
            return;
        }
        const newData = { ...nodeData };
        if (isInput) {
            newData.inputs = (nodeData.inputs || []).map(p => p.id === portId ? { ...p, label: tempPortLabel } : p);
        } else {
            newData.outputs = (nodeData.outputs || []).map(p => p.id === portId ? { ...p, label: tempPortLabel } : p);
        }
        onDataChange(nodeId, newData);
        setEditingPortId(null);
    }, [tempPortLabel, nodeData, onDataChange, nodeId]);

    const onAddInput = useCallback(() => {
        let newLabel = `Input ${inputs.length + 1}`;
        if (nodeType === 'layer-source') {
            newLabel = `Layer ${inputs.length + 1}`;
        }
        onDataChange(nodeId, { ...nodeData, inputs: [...inputs, { id: `input-${Date.now()}`, label: newLabel }] });
    }, [nodeId, nodeData, onDataChange, inputs, nodeType]);

    const onAddOutput = useCallback(() => {
        onDataChange(nodeId, { ...nodeData, outputs: [...outputs, { id: `output-${Date.now()}`, label: `Output ${outputs.length + 1}` }] });
    }, [nodeId, nodeData, onDataChange, outputs]);

    const onRemoveInput = useCallback((inputId: string) => {
        onDataChange(nodeId, { ...nodeData, inputs: inputs.filter((inp) => inp.id !== inputId) });
    }, [nodeId, nodeData, onDataChange, inputs]);

    const onRemoveOutput = useCallback((outputId: string) => {
        onDataChange(nodeId, { ...nodeData, outputs: outputs.filter((out) => out.id !== outputId) });
    }, [nodeId, nodeData, onDataChange, outputs]);

    const onPortMouseDown = useCallback((e: React.MouseEvent | React.PointerEvent, portId: string) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        onConnectionStart(nodeId, portId, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }, [nodeId, onConnectionStart]);

    const onPortMouseUp = useCallback((e: React.MouseEvent | React.PointerEvent, portId: string) => {
        e.stopPropagation();
        onConnectionComplete(nodeId, portId);
    }, [nodeId, onConnectionComplete]);

    const value: NodeInteractionContextType = {
        hoveredPortId,
        setHoveredPortId,
        editingPortId,
        tempPortLabel,
        setTempPortLabel,
        canAddInput: !nodeData.componentId && !nodeData.hideInputs && !nodeData.hideInputsAdd,
        canAddOutput: !nodeData.componentId && !nodeData.hideOutputsAdd,
        isPortRenamable: !(nodeType && !['custom', 'input', 'output', 'layer-source', 'layer-bridge'].includes(nodeType)),
        startEdit,
        cancelEdit,
        onSavePortEdit,
        onPortMouseDown,
        onPortMouseUp,
        onRemoveInput,
        onAddInput,
        onRemoveOutput,
        onAddOutput,
        onDeleteConnection,
    };

    return (
        <NodeInteractionContext.Provider value={value}>
            {children}
        </NodeInteractionContext.Provider>
    );
};

// --- Hook ---
export const useNodeInteraction = (): NodeInteractionContextType => {
    const context = useContext(NodeInteractionContext);
    if (context === undefined) {
        throw new Error('useNodeInteraction must be used within a NodeInteractionProvider');
    }
    return context;
};
