import { useState, useEffect, useCallback } from 'react';
import type { Connection } from '../types/NodeTypes';

interface UseConnectionLogicProps {
    canvasRef: React.RefObject<HTMLDivElement>;
    connections: Connection[];
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
    offset: { x: number; y: number };
    scale: number;
    getPortPosition: (nodeId: string, portId: string) => { x: number; y: number } | null;
    setLightningEffects: React.Dispatch<React.SetStateAction<Array<{ id: string; source: { x: number; y: number }; target: { x: number; y: number } }>>>;
    setShakingNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const useConnectionLogic = ({
    canvasRef,
    connections,
    setConnections,
    offset,
    scale,
    getPortPosition,
    setLightningEffects,
    setShakingNodes
}: UseConnectionLogicProps) => {
    const [draggingConnection, setDraggingConnection] = useState<{
        sourceNodeId: string;
        sourcePort: string;
        currentPos: { x: number; y: number };
    } | null>(null);

    // Start connection dragging
    const startConnection = useCallback((nodeId: string, port: string, position: { x: number; y: number }) => {
        if (!canvasRef.current) {
            return;
        }
        const rect = canvasRef.current.getBoundingClientRect();

        const newDragging = {
            sourceNodeId: nodeId,
            sourcePort: port,
            // Convert viewport position to canvas space
            currentPos: {
                x: position.x - rect.left,
                y: position.y - rect.top,
            },
        };
        setDraggingConnection(newDragging);
    }, [offset, canvasRef]);

    // Global listener for Dragging Connection (Robust)
    useEffect(() => {
        if (!draggingConnection) return;

        const handleWindowMouseMove = (e: MouseEvent) => {
            if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                setDraggingConnection(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        currentPos: {
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                        }
                    };
                });
            }
        };

        const handleWindowMouseUp = (e: MouseEvent) => {
            // Cancel connection if dropped on nothing
            setDraggingConnection(null);
        };

        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [draggingConnection?.sourceNodeId, draggingConnection?.sourcePort, canvasRef]);

    // Function strictly for cleaning up or manual updates if needed
    const updateConnectionDrag = useCallback((e: React.MouseEvent) => {
        // No-op: handled by useEffect
    }, []);

    // Complete connection
    const completeConnection = useCallback((targetNodeId: string, targetPort: string) => {
        if (draggingConnection) {
            // Prevent connecting Input to Input or Output to Output
            const sourceIsInput = draggingConnection.sourcePort.toLowerCase().includes('input');
            const targetIsInput = targetPort.toLowerCase().includes('input');
            if (sourceIsInput === targetIsInput) {
                setDraggingConnection(null);
                return;
            }

            // Normalize connection direction: Ensure Source is Output and Target is Input
            let finalSourceId = draggingConnection.sourceNodeId;
            let finalSourcePort = draggingConnection.sourcePort;
            let finalTargetId = targetNodeId;
            let finalTargetPort = targetPort;

            if (sourceIsInput && !targetIsInput) {
                // User dragged from Input -> Output, so we swap them
                finalSourceId = targetNodeId;
                finalSourcePort = targetPort;
                finalTargetId = draggingConnection.sourceNodeId;
                finalTargetPort = draggingConnection.sourcePort;
            }

            // Prevent duplicate connection (check using normalized values)
            const exists = connections.some(c =>
                c.sourceNodeId === finalSourceId && c.targetNodeId === finalTargetId &&
                c.sourcePort === finalSourcePort && c.targetPort === finalTargetPort
            );

            if (exists) {
                setDraggingConnection(null);
                return;
            }

            const newConnection: Connection = {
                id: `conn-${Date.now()}`,
                sourceNodeId: finalSourceId,
                targetNodeId: finalTargetId,
                sourcePort: finalSourcePort,
                targetPort: finalTargetPort,
            };
            setConnections((prev) => [...prev, newConnection]);
            setDraggingConnection(null);

            // Trigger Lightning Effect
            const sourcePos = getPortPosition(draggingConnection.sourceNodeId, draggingConnection.sourcePort);
            const targetPos = getPortPosition(targetNodeId, targetPort);

            if (sourcePos && targetPos) {
                const newLightning = {
                    id: `lightning-${Date.now()}`,
                    source: sourcePos,
                    target: targetPos,
                };
                setLightningEffects((prev) => [...prev, newLightning]);

                // Cleanup lightning
                setTimeout(() => {
                    setLightningEffects((prev) => prev.filter(l => l.id !== newLightning.id));
                }, 500);
            }

            // Trigger Shake Effect
            setShakingNodes((prev) => new Set(prev).add(draggingConnection.sourceNodeId).add(targetNodeId));
            setTimeout(() => {
                setShakingNodes((prev) => {
                    const next = new Set(prev);
                    next.delete(draggingConnection.sourceNodeId);
                    next.delete(targetNodeId);
                    return next;
                });
            }, 300);
        }
    }, [draggingConnection, getPortPosition, connections, setConnections, setLightningEffects, setShakingNodes]);

    // Delete connection
    const deleteConnection = useCallback((connectionId: string) => {
        setConnections((prev) => prev.filter((conn) => conn.id !== connectionId));
    }, [setConnections]);

    // Cancel connection
    const cancelConnection = useCallback(() => {
        setDraggingConnection(null);
    }, []);

    return {
        draggingConnection,
        startConnection,
        completeConnection,
        deleteConnection,
        cancelConnection,
        updateConnectionDrag
    };
};
