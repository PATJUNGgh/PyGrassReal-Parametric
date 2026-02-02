import React, { useMemo } from 'react';
import { CustomNode } from './CustomNode';
import type { NodeData } from '../types/NodeTypes';

import styles from './NodePromptNode.module.css';

interface PromptBodyProps {
    id: string;
    data: NodeData['data'];
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void;
}

const PromptBody: React.FC<PromptBodyProps & { showSubmit: boolean }> = ({ id, data, onDataChange, showSubmit }) => {
    const promptText = typeof data.promptText === 'string' ? data.promptText : '';

    return (
        <div className={styles.promptBodyContainer}>
            <textarea
                value={promptText}
                placeholder="Type prompt..."
                onChange={(e) => onDataChange(id, { ...data, promptText: e.target.value })}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className={styles.promptTextarea}
            />
            {showSubmit && (
                <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDataChange(id, {
                            ...data,
                            promptSubmittedText: promptText,
                            promptSubmittedAt: Date.now(),
                        });
                    }}
                    className={styles.submitButton}
                >
                    Submit
                </button>
            )}
        </div>
    );
};

export const NodePromptNode: React.FC<Omit<React.ComponentProps<typeof CustomNode>, 'children'>> = (props) => {
    const isConnectedToInspector = (props.connections || []).some((connection) =>
        connection.sourceNodeId === props.id && connection.sourcePort === 'output-prompt'
    );
    const enhancedData = useMemo(() => {
        return {
            ...props.data,
            customName: props.data.customName || 'Node Prompt',
            width: props.data.width || 380,
            minWidth: 320,
            height: props.data.height || 200,
            outputs: [{ id: 'output-prompt', label: 'Prompt', type: 'Text' as const }],
            hideInputs: true,
            hideOutputsAdd: true,
            hideOutputsHeader: true,
            hidePortControls: true,
            resizable: true,
        };
    }, [props.data]);

    return (
        <CustomNode {...props} data={enhancedData}>
            <PromptBody
                id={props.id}
                data={props.data}
                onDataChange={props.onDataChange}
                showSubmit={isConnectedToInspector}
            />
        </CustomNode>
    );
};
