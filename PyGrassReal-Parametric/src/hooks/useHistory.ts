import { useState, useRef, useCallback, useEffect } from 'react';
import type { NodeData, Connection } from '../types/NodeTypes';

// --- GLOBAL LOCK (THE NUCLEAR OPTION) ---
const GLOBAL_LOCK_KEY = '__PYGRASS_HISTORY_LOCK__';
const DEBOUNCE_MS = 250; // Reduced slightly to feel snappier but still safe

function acquireGlobalLock(): boolean {
    if (typeof window === 'undefined') return true;

    const now = Date.now();
    const lastTime = (window as any)[GLOBAL_LOCK_KEY] || 0;

    if (now - lastTime < DEBOUNCE_MS) {
        return false;
    }

    (window as any)[GLOBAL_LOCK_KEY] = now;
    return true;
}
// ----------------------------------------

interface HistoryState {
    nodes: NodeData[];
    connections: Connection[];
}

function areStatesEqual(a: HistoryState | null | undefined, b: HistoryState | null | undefined): boolean {
    if (!a || !b) {
        return a === b; // Returns true if both are null/undefined, false otherwise.
    }

    if (a.nodes.length !== b.nodes.length || a.connections.length !== b.connections.length) {
        return false;
    }

    // Using JSON.stringify for a deep-check, consistent with the rest of the hook.
    return JSON.stringify(a) === JSON.stringify(b);
}

interface UseHistoryProps {
    initialNodes: NodeData[];
    initialConnections: Connection[];
    setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
}

const MAX_HISTORY_SIZE = 500;

export function useHistory({
    initialNodes,
    initialConnections,
    setNodes,
    setConnections
}: UseHistoryProps) {
    const [history, setHistory] = useState<{
        past: Array<HistoryState>,
        future: Array<HistoryState>
    }>({
        past: [],
        future: []
    });

    const nodesRef = useRef(initialNodes);
    const connectionsRef = useRef(initialConnections);

    const isUndoingRef = useRef(false);
    const isActionInProgressRef = useRef(false);

    // Sync refs with props updates
    useEffect(() => {
        nodesRef.current = initialNodes;
        connectionsRef.current = initialConnections;
    }, [initialNodes, initialConnections]);

    // --- CORE PUSH LOGIC ---
    const pushToHistory = useCallback((stateOverride?: HistoryState, force: boolean = false) => {
        if (isUndoingRef.current) return;

        // REDO PROTECTION GUARD
        if (!force && history.future.length > 0) {
            // Blocked background push to preserve Redo stack
            return;
        }

        const nodesToSave = stateOverride ? stateOverride.nodes : nodesRef.current;
        const connectionsToSave = stateOverride ? stateOverride.connections : connectionsRef.current;

        const currentState = {
            nodes: JSON.parse(JSON.stringify(nodesToSave)),
            connections: JSON.parse(JSON.stringify(connectionsToSave))
        };

        setHistory(prev => {
            const lastPast = prev.past[prev.past.length - 1];

            if (!isSignificantChange(lastPast, currentState)) {
                return prev;
            }

            return {
                past: [...prev.past, currentState].slice(-MAX_HISTORY_SIZE),
                future: []
            };
        });
    }, [history]);

    const startAction = useCallback(() => {
        if (isUndoingRef.current) return;
        isActionInProgressRef.current = true;
        pushToHistory(undefined, true);
    }, [pushToHistory]);

    const endAction = useCallback(() => {
        // Force push the final state to ensure we capture the result of the action.
        pushToHistory(undefined, true);
        isActionInProgressRef.current = false;
    }, [pushToHistory]);

    const SIGNIFICANT_MOVE_THRESHOLD = 0.1; // Lowered to 0.1 for better sensitivity

    function isSignificantChange(a: HistoryState | null | undefined, b: HistoryState | null | undefined): boolean {
        if (!a || !b) return true;

        // 1. Connectivity Check (Strict)
        if (a.connections.length !== b.connections.length) return true;
        if (JSON.stringify(a.connections) !== JSON.stringify(b.connections)) return true;

        // 2. Node Count Check
        if (a.nodes.length !== b.nodes.length) return true;

        // 3. Topology/Geometry Check
        const bNodeMap = new Map(b.nodes.map(n => [n.id, n]));

        for (const nodeA of a.nodes) {
            const nodeB = bNodeMap.get(nodeA.id);
            if (!nodeB) return true; // ID mismatch

            // Check 2D Position
            const dx = Math.abs(nodeA.position.x - nodeB.position.x);
            const dy = Math.abs(nodeA.position.y - nodeB.position.y);

            if (dx > SIGNIFICANT_MOVE_THRESHOLD || dy > SIGNIFICANT_MOVE_THRESHOLD) {
                return true;
            }

            // Check 3D Transform (Location, Rotation, Scale)
            const locA = nodeA.data.location;
            const locB = nodeB.data.location;
            if (locA && locB) {
                if (Math.abs(locA.x - locB.x) > SIGNIFICANT_MOVE_THRESHOLD ||
                    Math.abs(locA.y - locB.y) > SIGNIFICANT_MOVE_THRESHOLD ||
                    Math.abs(locA.z - locB.z) > SIGNIFICANT_MOVE_THRESHOLD) return true;
            } else if (!!locA !== !!locB) return true;

            const rotA = nodeA.data.rotation;
            const rotB = nodeB.data.rotation;
            if (rotA && rotB) {
                if (Math.abs(rotA.x - rotB.x) > 0.001 ||
                    Math.abs(rotA.y - rotB.y) > 0.001 ||
                    Math.abs(rotA.z - rotB.z) > 0.001) return true;
            } else if (!!rotA !== !!rotB) return true;

            const sclA = nodeA.data.scale;
            const sclB = nodeB.data.scale;
            if (sclA && sclB) {
                if (Math.abs(sclA.x - sclB.x) > 0.001 ||
                    Math.abs(sclA.y - sclB.y) > 0.001 ||
                    Math.abs(sclA.z - sclB.z) > 0.001) return true;
            } else if (!!sclA !== !!sclB) return true;
        }

        return false; // Structurally and Geometrically identical
    }

    // --- STANDARD UNDO (Pure Function) ---
    const undo = useCallback(() => {
        // 1. Global Debounce
        if (!acquireGlobalLock()) return;

        // 2. Local Guard
        if (isUndoingRef.current) return;

        // 3. Logic Check
        if (history.past.length === 0) {
            return;
        }

        isUndoingRef.current = true;

        const currentState = {
            nodes: JSON.parse(JSON.stringify(nodesRef.current)),
            connections: JSON.parse(JSON.stringify(connectionsRef.current))
        };

        const newPast = [...history.past];
        let targetState = newPast.pop()!;

        // --- INTELLIGENT SKIP ---
        let skippedCount = 0;
        // Keep digging provided we have history and the current target is "same" as live state
        while (targetState && !isSignificantChange(targetState, currentState) && newPast.length > 0) {
            skippedCount++;
            targetState = newPast.pop()!;
        }

        if (skippedCount > 0) {
            // Smart Undo: Skipped similar states
        }

        // 4. APPLY STATE

        setNodes(JSON.parse(JSON.stringify(targetState.nodes)));
        setConnections(JSON.parse(JSON.stringify(targetState.connections)));

        nodesRef.current = targetState.nodes;
        connectionsRef.current = targetState.connections;

        // 5. UPDATE HISTORY CHUNKS
        setHistory({
            past: newPast,
            future: [currentState, ...history.future]
        });

        setTimeout(() => {
            isUndoingRef.current = false;
        }, 100);

    }, [history, setNodes, setConnections]); // Dependent on 'history' to get fresh state

    // --- STANDARD REDO (Pure Function) ---
    const redo = useCallback(() => {
        if (!acquireGlobalLock()) return;

        if (isUndoingRef.current) return;

        if (history.future.length === 0) {
            return;
        }

        isUndoingRef.current = true;

        const currentState = {
            nodes: JSON.parse(JSON.stringify(nodesRef.current)),
            connections: JSON.parse(JSON.stringify(connectionsRef.current))
        };

        const newFuture = [...history.future];

        // --- STANDARD REDO (Direct Apply) ---
        // We disabled Smart Skip for Redo to ensure explicit user actions (like small drags) are restored.
        const targetState = newFuture.shift();

        // Safety check / Fallback
        if (!targetState) {
            isUndoingRef.current = false;
            return;
        }

        // Even if the LAST state is still "insignificant", we MUST apply it.
        // This handles micro-drags that the user explicitly wants to restore.

        // APPLY the target state

        setNodes(JSON.parse(JSON.stringify(targetState.nodes)));
        setConnections(JSON.parse(JSON.stringify(targetState.connections)));

        // Update refs to reflect the newly applied state
        nodesRef.current = targetState.nodes;
        connectionsRef.current = targetState.connections;

        // After a successful redo, push the previous current state onto the past stack
        // so that an undo will revert to it. The targetState becomes the new current
        // state and remains out of the past stack until a subsequent undo.
        setHistory({
            past: [...history.past, currentState],
            future: newFuture
        });

        setTimeout(() => {
            isUndoingRef.current = false;
        }, 100);

    }, [history, setNodes, setConnections]);


    // --- HISTORY-AWARE SETTERS ---
    const setNodesWithHistory = useCallback((updater: NodeData[] | ((prev: NodeData[]) => NodeData[])) => {
        if (isUndoingRef.current) {
            setNodes(updater);
            return;
        }

        const currentNodes = nodesRef.current;
        const nextNodes = typeof updater === 'function' ? updater(currentNodes) : updater;

        if (JSON.stringify(nextNodes) === JSON.stringify(currentNodes)) return;

        // Auto-push logic
        if (!isActionInProgressRef.current) {
            pushToHistory({
                nodes: JSON.parse(JSON.stringify(currentNodes)),
                connections: JSON.parse(JSON.stringify(connectionsRef.current))
            });
        }

        nodesRef.current = nextNodes;
        setNodes(nextNodes);
    }, [setNodes, pushToHistory]);

    const setConnectionsWithHistory = useCallback((updater: Connection[] | ((prev: Connection[]) => Connection[])) => {
        if (isUndoingRef.current) {
            setConnections(updater);
            return;
        }

        const currentConnections = connectionsRef.current;
        const nextConnections = typeof updater === 'function' ? updater(currentConnections) : updater;

        if (JSON.stringify(nextConnections) === JSON.stringify(currentConnections)) return;

        if (!isActionInProgressRef.current) {
            pushToHistory({
                nodes: JSON.parse(JSON.stringify(nodesRef.current)),
                connections: JSON.parse(JSON.stringify(currentConnections))
            });
        }

        connectionsRef.current = nextConnections;
        setConnections(nextConnections);
    }, [setConnections, pushToHistory]);

    return {
        undo,
        redo,
        pushToHistory,
        startAction,
        endAction,
        setNodesWithHistory,
        setConnectionsWithHistory,
        isUndoingRef,
    };
}
