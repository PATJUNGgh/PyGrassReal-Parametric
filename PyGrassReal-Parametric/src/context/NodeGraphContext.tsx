import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useHistory } from '../hooks/useHistory';
import type { NodeData, Connection } from '../types/NodeTypes';

interface NodeGraphContextType {
    nodes: NodeData[];
    connections: Connection[];
    undo: () => void;
    redo: () => void;
    pushToHistory: (stateOverride?: { nodes: NodeData[], connections: Connection[] }, force?: boolean) => void;
    startAction: () => void;
    endAction: () => void;
    setNodesWithHistory: (updater: NodeData[] | ((prev: NodeData[]) => NodeData[])) => void;
    setConnectionsWithHistory: (updater: Connection[] | ((prev: Connection[]) => Connection[])) => void;
    isUndoingRef: React.MutableRefObject<boolean>;
    // Raw setter for special cases like scene synchronization that shouldn't create a history entry
    setNodesRaw: React.Dispatch<React.SetStateAction<NodeData[]>>;
}

const NodeGraphContext = createContext<NodeGraphContextType | undefined>(undefined);

interface NodeGraphProviderProps {
    children: ReactNode;
    initialNodes?: NodeData[];
    initialConnections?: Connection[];
}

export const NodeGraphProvider: React.FC<NodeGraphProviderProps> = ({ 
    children, 
    initialNodes = [], 
    initialConnections = [] 
}) => {
    const [nodes, setNodes] = useState<NodeData[]>(initialNodes);
    const [connections, setConnections] = useState<Connection[]>(initialConnections);

    const historyApi = useHistory({
        initialNodes: nodes,
        initialConnections: connections,
        setNodes,
        setConnections,
    });

    const contextValue: NodeGraphContextType = {
        nodes,
        connections,
        ...historyApi,
        setNodesRaw: setNodes, // Exposing the raw setter
    };

    return (
        <NodeGraphContext.Provider value={contextValue}>
            {children}
        </NodeGraphContext.Provider>
    );
};

export const useNodeGraph = (): NodeGraphContextType => {
    const context = useContext(NodeGraphContext);
    if (context === undefined) {
        throw new Error('useNodeGraph must be used within a NodeGraphProvider');
    }
    return context;
};
