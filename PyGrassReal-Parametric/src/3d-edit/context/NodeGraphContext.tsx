import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useHistory } from '../hooks/useHistory';
import type { NodeData, Connection } from '../types/NodeTypes';
import { migrateGraph } from '../utils/nodeMigration';

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
    loadGraph: (nodes: NodeData[], connections: Connection[]) => void;
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
    // Migrate initial data before creating the state
    const migratedInitial = React.useMemo(() => migrateGraph(initialNodes, initialConnections), []);
    
    const [nodes, setNodes] = useState<NodeData[]>(migratedInitial.nodes);
    const [connections, setConnections] = useState<Connection[]>(migratedInitial.connections);

    const historyApi = useHistory({
        initialNodes: nodes,
        initialConnections: connections,
        setNodes,
        setConnections,
    });

    const loadGraph = React.useCallback((newNodes: NodeData[], newConnections: Connection[]) => {
        const migrated = migrateGraph(newNodes, newConnections);
        setNodes(migrated.nodes);
        setConnections(migrated.connections);
        historyApi.pushToHistory(migrated, true);
    }, [historyApi]);

    const contextValue = React.useMemo(() => ({
        nodes,
        connections,
        ...historyApi,
        setNodesRaw: setNodes,
        loadGraph,
    }), [nodes, connections, historyApi, loadGraph]);

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
