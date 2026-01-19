import React from 'react';
import type { Connection, NodeData } from '../types/NodeTypes';

interface ConnectionLayerProps {
    connections: Connection[];
    nodes: NodeData[];
    getPortPosition: (nodeId: string, portId: string) => { x: number; y: number } | null;
    infectedNodeIds: Set<string>;
    selectedConnectionIds: Set<string>;
    interactionMode: 'node' | '3d' | 'wire';
    setSelectedConnectionIds: (ids: Set<string>) => void;
    draggingConnection: { sourceNodeId: string; sourcePort: string; currentPos: { x: number; y: number } } | null;
    scale: number;
    offset: { x: number; y: number };
    children?: React.ReactNode;
}

export const ConnectionLayer: React.FC<ConnectionLayerProps> = ({
    connections,
    nodes,
    getPortPosition,
    infectedNodeIds,
    selectedConnectionIds,
    interactionMode,
    setSelectedConnectionIds,
    draggingConnection,
    children
}) => {

    // Helper to check port type
    const isInputPortId = (id: string) => id.includes('input');

    return (
        <svg
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0,
            }}
        >
            {/* Render connections */}
            {connections.map((conn) => {
                const sourcePos = getPortPosition(conn.sourceNodeId, conn.sourcePort);
                const targetPos = getPortPosition(conn.targetNodeId, conn.targetPort);
                if (!sourcePos || !targetPos) return null;

                const startX = sourcePos.x;
                const startY = sourcePos.y;
                const endX = targetPos.x;
                const endY = targetPos.y;

                const dx = endX - startX;
                const controlOffset = Math.max(Math.abs(dx) * 0.5, 50);

                // Determine control points based on port type (Input vs Output)
                const sourceIsInput = isInputPortId(conn.sourcePort);
                const targetIsInput = isInputPortId(conn.targetPort);

                const cp1x = sourceIsInput ? startX - controlOffset : startX + controlOffset;
                const cp2x = targetIsInput ? endX - controlOffset : endX + controlOffset;

                // Check if this connection is part of an infected network
                const isSourceInfected = infectedNodeIds.has(conn.sourceNodeId);
                const isTargetInfected = infectedNodeIds.has(conn.targetNodeId);
                // Also need to check if one of them is the AntiVirus itself to color the first link
                const sourceNode = nodes.find(n => n.id === conn.sourceNodeId);
                const targetNode = nodes.find(n => n.id === conn.targetNodeId);
                const isSourceAV = sourceNode?.type === 'antivirus';
                const isTargetAV = targetNode?.type === 'antivirus';

                const isErrorConnection = isSourceInfected || isTargetInfected || isSourceAV || isTargetAV;
                const isSelected = selectedConnectionIds.has(conn.id);

                // Wire Styles
                const strokeStyle = conn.isDashed ? "5,5" : "none";
                const opacityStyle = conn.isGhost ? 0.2 : 1;

                // Connection Wire
                return (
                    <g key={conn.id} style={{ opacity: opacityStyle, transition: 'opacity 0.2s' }}>
                        {/* Invisible thick path for easier clicking */}
                        <path
                            d={`M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`}
                            stroke="transparent"
                            strokeWidth="20"
                            fill="none"
                            style={{
                                pointerEvents: interactionMode === 'wire' ? 'stroke' : 'none',
                                cursor: interactionMode === 'wire' ? 'pointer' : 'default',
                            }}
                            onClick={(e) => {
                                if (interactionMode === 'wire') {
                                    e.stopPropagation();
                                    const newSelected = new Set(selectedConnectionIds);
                                    if (e.ctrlKey || e.shiftKey) {
                                        if (newSelected.has(conn.id)) newSelected.delete(conn.id);
                                        else newSelected.add(conn.id);
                                        setSelectedConnectionIds(newSelected);
                                    } else {
                                        // Single select
                                        setSelectedConnectionIds(new Set([conn.id]));
                                    }
                                }
                            }}
                        />
                        {/* Visible Wire */}
                        <path
                            d={`M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`}
                            stroke={isSelected ? "#FFD700" : (isErrorConnection ? "#ff0000" : "#2196f3")}
                            strokeWidth={isSelected ? "4" : (isErrorConnection ? "3" : "2")}
                            strokeDasharray={strokeStyle}
                            className={isErrorConnection ? "infected-connection" : ""}
                            fill="none"
                            style={{
                                filter: isSelected
                                    ? "drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))"
                                    : (isErrorConnection ? "drop-shadow(0 0 5px rgba(255, 0, 0, 0.8))" : "none"),
                                animation: isErrorConnection ? "dash 1s linear infinite" : "none",
                                pointerEvents: 'none', // Clicks handled by transparent path
                            }}
                        />
                    </g>
                );
            })}

            {/* Render dragging connection */}
            {draggingConnection && (() => {
                const sourcePos = getPortPosition(draggingConnection.sourceNodeId, draggingConnection.sourcePort);

                if (!sourcePos) {
                    return null;
                }

                const draggingX = draggingConnection.currentPos.x;
                const draggingY = draggingConnection.currentPos.y;

                const dx = draggingX - sourcePos.x;
                const controlOffset = Math.max(Math.abs(dx) * 0.5, 50);

                const isInput = isInputPortId(draggingConnection.sourcePort);
                const startX = sourcePos.x;
                const startY = sourcePos.y;

                let cp1x, cp2x;

                if (isInput) {
                    cp1x = startX - controlOffset;
                    cp2x = draggingX + controlOffset;
                } else {
                    cp1x = startX + controlOffset;
                    cp2x = draggingX - controlOffset;
                }

                return (
                    <path
                        d={`M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${draggingY}, ${draggingX} ${draggingY}`}
                        stroke="#2196f3"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        fill="none"
                        pointerEvents="none"
                    />
                );
            })()}
            {children}
        </svg>
    );
};
