import React, { useState, useEffect } from 'react';
import type { NodeData } from '../../types/NodeTypes';
import { NODE_DEFINITIONS } from '../../definitions/nodeDefinitions';
import styles from './DragOverlay.module.css';

type ActiveDragData = { type: NodeData['type'], x: number, y: number };

interface DragOverlayProps {
    activeDragNode: ActiveDragData | null;
}

export const DragOverlay: React.FC<DragOverlayProps> = ({ activeDragNode }) => {
    const [position, setPosition] = useState({
        x: activeDragNode?.x || 0,
        y: activeDragNode?.y || 0
    });

    useEffect(() => {
        if (!activeDragNode) return;

        setPosition({ x: activeDragNode.x, y: activeDragNode.y });

        const handlePointerMove = (e: PointerEvent) => {
            setPosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('pointermove', handlePointerMove);
        return () => window.removeEventListener('pointermove', handlePointerMove);
    }, [activeDragNode]);

    if (!activeDragNode) return null;

    const nodeDef = NODE_DEFINITIONS[activeDragNode.type];
    if (!nodeDef) return null;

    return (
        <div
            className={styles.overlay}
            style={{
                transform: `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%) scale(1.1)`,
            }}
        >
            <div className={styles.card}>
                <span className={styles.icon}>{nodeDef.icon}</span>
            </div>
        </div>
    );
};

