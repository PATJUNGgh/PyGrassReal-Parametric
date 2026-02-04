import React, { useMemo } from 'react';
import { CustomNode } from './CustomNode';
import type { NodeData } from '../types/NodeTypes';

// Props for the internal body component
interface BooleanBodyProps {
    id: string;
    data: NodeData['data'];
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void;
}

const BooleanBody: React.FC<BooleanBodyProps> = ({ id, data, onDataChange }) => {
    // Default to false if undefined
    const value = typeof data.value === 'boolean' ? data.value : false;

    const handleToggle = () => {
        onDataChange(id, { ...data, value: !value });
    };

    return (
        <div
            style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 0',
                marginRight: '-20px' // Compensate for padding to align with output port
            }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div
                onClick={handleToggle}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.2s ease',
                }}
            >
                <span
                    style={{
                        marginRight: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: value ? '#10b981' : '#ef4444',
                        minWidth: '36px',
                        textAlign: 'center'
                    }}
                >
                    {value ? 'TRUE' : 'FALSE'}
                </span>

                {/* Custom Toggle Switch */}
                <div
                    style={{
                        width: '36px',
                        height: '20px',
                        background: value ? '#10b981' : '#334155',
                        borderRadius: '20px',
                        position: 'relative',
                        transition: 'background 0.3s ease',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                    }}
                >
                    <div
                        style={{
                            width: '16px',
                            height: '16px',
                            background: '#ffffff',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: value ? '18px' : '2px',
                            transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export const BooleanToggleNode: React.FC<Omit<React.ComponentProps<typeof CustomNode>, 'children'>> = (props) => {
    const enhancedData = useMemo(() => {
        return {
            ...props.data,
            customName: props.data.customName || 'Boolean Toggle',
            width: 180,
            minWidth: 160,
            // Ensure output port is present
            outputs: [{ id: 'output-bool', label: 'Boolean', type: 'Boolean' }],

            // Hide standard inputs/controls
            hideInputs: true,
            hideInputsAdd: true,
            hideOutputsAdd: true,
            hidePortControls: true,
            hideModifierMenu: true,
            hideTitleLabel: true,
            hidePortLabels: true,
            hideOutputsHeader: true,

            // Layout adjustments
            bodyPadding: '10px 15px',
            bodyMinHeight: 60,
            outputsAreaWidth: 40,
            outputPortOffsetRight: 1,
        };
    }, [props.data]);

    return (
        <CustomNode {...props} data={enhancedData}>
            <BooleanBody
                id={props.id}
                data={props.data}
                onDataChange={props.onDataChange}
            />
        </CustomNode>
    );
};
