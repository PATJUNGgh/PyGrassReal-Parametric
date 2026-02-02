import React, { useMemo } from 'react';
import { CustomNode } from './CustomNode';
import type { NodeData } from '../types/NodeTypes';

// Props for the internal body component
interface SliderBodyProps {
    id: string;
    data: NodeData['data'];
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void;
}

// The unique UI for the Number Slider, to be passed as children
const SliderBody: React.FC<SliderBodyProps> = ({ id, data, onDataChange }) => {
    // Extract slider-specific values with defaults
    const value = typeof data.value === 'number' ? data.value : 50;
    const min = typeof data.min === 'number' ? data.min : 0;
    const max = typeof data.max === 'number' ? data.max : 100;
    const step = data.step !== undefined ? Number(data.step) : 1;

    // Effect to enforce constraints (min <= value <= max) after any data change.
    // This is safer than onBlur because it avoids race conditions with state updates.
    React.useEffect(() => {
        const currentMin = data.min ?? 0;
        const currentMax = data.max ?? 100;
        const currentValue = data.value ?? 50;

        let updatedMin = currentMin;
        let updatedMax = currentMax;
        let updatedValue = currentValue;

        let needsUpdate = false;

        // Rule: Min cannot be greater than Max. If it is, clamp min down to max.
        if (updatedMin > updatedMax) {
            updatedMin = updatedMax;
            needsUpdate = true;
        }

        // Rule: Value must be within the (newly clamped) min/max range.
        if (updatedValue < updatedMin) {
            updatedValue = updatedMin;
            needsUpdate = true;
        }
        if (updatedValue > updatedMax) {
            updatedValue = updatedMax;
            needsUpdate = true;
        }

        // Only call onDataChange if a value has actually changed to avoid infinite loops.
        if (needsUpdate) {
            onDataChange(id, { ...data, min: updatedMin, max: updatedMax, value: updatedValue });
        }
    }, [data.min, data.max, data.value, id, data, onDataChange]);


    const handleSliderChange = (newValue: number) => {
        let clamped = Math.max(min, Math.min(max, newValue));
        // Ensure clean floating point numbers
        if (step < 1) {
            clamped = Number(clamped.toFixed(4));
        }
        onDataChange(id, { ...data, value: clamped });
    };

    const handleInputChange = (field: 'min' | 'max' | 'value', numericValue: number) => {
        if (isNaN(numericValue)) return;
        onDataChange(id, { ...data, [field]: numericValue });
    };

    return (
        <div
            // compensating for the restored node padding
            style={{ padding: '0', flex: 1, minWidth: 0, marginRight: '-36px' }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div style={{ flex: 1 }}>
                {/* Top row for Min/Max/Step inputs */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', gap: '6px' }}>
                    <SmartInput label="MIN" value={min} step={step} onChange={val => handleInputChange('min', val)} onBlur={() => { }} />
                    <SmartInput
                        label="STEP"
                        value={step}
                        step={0.001}
                        onChange={val => onDataChange(id, { ...data, step: Math.max(0, val) })}
                        onBlur={() => {
                            if (step <= 0) onDataChange(id, { ...data, step: 0.1 });
                        }}
                    />
                    <SmartInput label="MAX" value={max} step={step} onChange={val => handleInputChange('max', val)} onBlur={() => { }} />
                </div>

                {/* Bottom row for slider and value output */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SmartInput
                        label=""
                        value={value}
                        step={step}
                        onChange={(val) => handleInputChange('value', val)}
                        onBlur={() => handleSliderChange(value)}
                        width="64px"
                        style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '4px 8px',
                            textAlign: 'center',
                            background: 'rgba(15, 23, 42, 0.45)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                        }}
                    />
                    <div style={{ flex: 1 }}>
                        <input
                            type="range"
                            min={min}
                            max={max}
                            step={step}
                            value={value}
                            onChange={(e) => handleSliderChange(Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            style={{ width: '100%', cursor: 'pointer', accentColor: '#38bdf8' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Smart Input Component that handles local string state for reliable editing
interface SmartInputProps {
    label: string;
    value: number;
    step?: number;
    onChange: (val: number) => void;
    onBlur: () => void;
    width?: string;
    style?: React.CSSProperties;
}

const SmartInput: React.FC<SmartInputProps> = ({ label, value, step, onChange, onBlur, width = "48px", style }) => {
    const [localValue, setLocalValue] = React.useState<string>(value.toString());
    const [isEditing, setIsEditing] = React.useState(false);

    // Sync from props when not editing
    React.useEffect(() => {
        if (!isEditing) {
            setLocalValue(value.toString());
        }
    }, [value, isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setLocalValue(newVal);

        const num = parseFloat(newVal);
        // Only trigger update if it's a valid number
        if (!isNaN(num)) {
            onChange(num);
        }
    };

    const handleBlur = () => {
        setIsEditing(false);

        // Try to parse the final value from local state
        const num = parseFloat(localValue);

        // If it's a valid number, commit it via onChange
        if (!isNaN(num) && localValue.trim() !== '') {
            onChange(num);
        } else {
            // If invalid (e.g. empty or "-"), revert the input to the last good prop value
            setLocalValue(value.toString());
        }

        // Now, call the original onBlur prop
        onBlur();
        // Force sync back to formatted value from props (handled by useEffect)
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onPointerDown={(e) => e.stopPropagation()}>
            {label && (
                <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.4px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {label}
                </span>
            )}
            <input
                className="nodrag"
                type="number"
                value={localValue}
                step="any"
                onChange={handleChange}
                onFocus={() => setIsEditing(true)}
                onBlur={handleBlur}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    e.stopPropagation(); // Prevent node deletion etc.
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{
                    width,
                    textAlign: style?.textAlign || 'left',
                    fontSize: style?.fontSize || '10px',
                    fontWeight: style?.fontWeight || 600,
                    color: '#e2e8f0',
                    background: style?.background || 'transparent',
                    border: style?.border || '1px dashed rgba(255, 255, 255, 0.35)',
                    borderRadius: '6px',
                    padding: style?.padding || '2px 4px',
                    ...style
                }}
            />
        </div>
    );
};

// The main exported component, which wraps CustomNode
export const NumberSliderNode: React.FC<Omit<React.ComponentProps<typeof CustomNode>, 'children'>> = (props) => {
    const enhancedData = useMemo(() => {
        return {
            ...props.data,
            customName: props.data.customName || 'Number Slider',
            width: props.data.width || 480,
            minWidth: 360,
            // Define the output port here so CustomNode can render it
            outputs: [{ id: 'output-value', label: 'Value', type: 'number' as const }],
            // Enable hide options to show default ports and controls
            hideInputs: true,
            hideOutputsHeader: true,
            hideOutputsAdd: true,
            hidePortLabels: true,
            hidePortControls: true,
            hideModifierMenu: true,

            // Enable resizing (Left handle implemented in CustomNode)
            resizable: true,

            // Constrain Outputs Area to force slider expansion
            outputsAreaWidth: 52,

            // Adjust Output Port to the right
            outputPortOffsetRight: -6,

            // Restore stable padding with reduced bottom
            bodyPadding: '15px 20px 4px 10px',

            // Override default minHeight (100px) to fit content tightly
            bodyMinHeight: 60,
        };
    }, [props.data]);

    return (
        <CustomNode {...props} data={enhancedData}>
            {/* The slider UI is passed as children, which CustomNode will render in the middle */}
            <SliderBody
                id={props.id}
                data={props.data}
                onDataChange={props.onDataChange}
            />
        </CustomNode>
    );
};
