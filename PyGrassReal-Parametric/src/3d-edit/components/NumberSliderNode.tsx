import React, { useMemo } from 'react';
import { CustomNode } from './CustomNode';
import type { NodeData, NumberSliderItem } from '../types/NodeTypes';
import styles from './NumberSliderNode.module.css';

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 100;
const DEFAULT_STEP = 1;
const DEFAULT_VALUE = 50;
const SLIDER_ROW_HEIGHT_GLOBAL = 52;
const SLIDER_ROW_HEIGHT_INDIVIDUAL = 52;
const SLIDER_ROW_GAP = 8;

interface SliderState {
    useGlobalConfig: boolean;
    globalMin: number;
    globalMax: number;
    globalStep: number;
    sliders: NumberSliderItem[];
}

interface SliderBodyProps {
    id: string;
    data: NodeData['data'];
    isNodeSelected: boolean;
    onDataChange: (id: string, data: Partial<NodeData['data']>) => void;
}

interface SmartInputProps {
    label: string;
    value: number;
    step?: number;
    onChange: (val: number) => void;
    onBlur: () => void;
    width?: string;
    style?: React.CSSProperties;
    inputClassName?: string;
    labelClassName?: string;
}

interface SliderRowProps {
    slider: NumberSliderItem;
    index: number;
    isNodeSelected: boolean;
    useGlobalConfig: boolean;
    globalMin: number;
    globalMax: number;
    globalStep: number;
    canDelete: boolean;
    onSliderValueChange: (sliderId: string, value: number) => void;
    onSliderConfigChange: (sliderId: string, field: 'min' | 'max' | 'step', value: number) => void;
    onDeleteSlider: (sliderId: string) => void;
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const sanitizeStep = (value: unknown, fallback = DEFAULT_STEP): number => {
    if (!isFiniteNumber(value) || value <= 0) return fallback;
    return value;
};

const clampValue = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
};

const normalizeRange = (minValue: number, maxValue: number): [number, number] => {
    return minValue <= maxValue ? [minValue, maxValue] : [maxValue, minValue];
};

const createSliderId = (): string => {
    return `slider-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const buildSliderOutputs = (sliders: NumberSliderItem[]): Array<{ id: string; label: string; type: 'number' }> => {
    return sliders.map((_, index) => ({
        id: index === 0 ? 'output-main' : `output-${index + 1}`,
        label: `Value ${index + 1}`,
        type: 'number',
    }));
};

const valueArrayMatches = (currentValue: NodeData['data']['value'], expected: number[]): boolean => {
    if (!Array.isArray(currentValue) || currentValue.length !== expected.length) return false;
    return expected.every((item, index) => currentValue[index] === item);
};

const sliderListMatches = (currentSliders: NodeData['data']['sliders'], expected: NumberSliderItem[]): boolean => {
    if (!Array.isArray(currentSliders) || currentSliders.length !== expected.length) return false;
    return expected.every((item, index) => {
        const current = currentSliders[index];
        if (!current) return false;
        return current.id === item.id
            && current.value === item.value
            && current.min === item.min
            && current.max === item.max
            && current.step === item.step;
    });
};

const normalizeSliderState = (data: NodeData['data']): SliderState => {
    const legacyValues = Array.isArray(data.value) ? data.value : [];
    const legacyScalar = isFiniteNumber(data.value) ? data.value : undefined;

    const [globalMin, globalMax] = normalizeRange(
        isFiniteNumber(data.globalMin) ? data.globalMin : (isFiniteNumber(data.min) ? data.min : DEFAULT_MIN),
        isFiniteNumber(data.globalMax) ? data.globalMax : (isFiniteNumber(data.max) ? data.max : DEFAULT_MAX)
    );

    const globalStep = sanitizeStep(isFiniteNumber(data.globalStep) ? data.globalStep : data.step, DEFAULT_STEP);
    const useGlobalConfig = data.useGlobalConfig !== false;

    let rawSliders: NumberSliderItem[] = [];
    if (Array.isArray(data.sliders) && data.sliders.length > 0) {
        rawSliders = data.sliders;
    } else if (legacyValues.length > 0) {
        rawSliders = legacyValues.map((value, index) => ({
            id: `slider-${index + 1}`,
            value: isFiniteNumber(value) ? value : DEFAULT_VALUE,
            min: isFiniteNumber(data.min) ? data.min : globalMin,
            max: isFiniteNumber(data.max) ? data.max : globalMax,
            step: sanitizeStep(data.step, globalStep),
        }));
    } else {
        rawSliders = [{
            id: 'slider-1',
            value: isFiniteNumber(legacyScalar) ? legacyScalar : DEFAULT_VALUE,
            min: isFiniteNumber(data.min) ? data.min : globalMin,
            max: isFiniteNumber(data.max) ? data.max : globalMax,
            step: sanitizeStep(data.step, globalStep),
        }];
    }

    const sliders = rawSliders.map((slider, index) => {
        const [sliderMin, sliderMax] = normalizeRange(
            isFiniteNumber(slider.min) ? slider.min : globalMin,
            isFiniteNumber(slider.max) ? slider.max : globalMax,
        );

        const sliderStep = sanitizeStep(isFiniteNumber(slider.step) ? slider.step : globalStep, globalStep);
        const arrayValueAtIndex = legacyValues[index];
        const resolvedValue = isFiniteNumber(slider.value)
            ? slider.value
            : (isFiniteNumber(arrayValueAtIndex)
                ? arrayValueAtIndex
                : (index === 0 && isFiniteNumber(legacyScalar) ? legacyScalar : DEFAULT_VALUE));

        const activeMin = useGlobalConfig ? globalMin : sliderMin;
        const activeMax = useGlobalConfig ? globalMax : sliderMax;

        return {
            id: typeof slider.id === 'string' && slider.id.trim() ? slider.id : `slider-${index + 1}`,
            value: clampValue(resolvedValue, activeMin, activeMax),
            min: sliderMin,
            max: sliderMax,
            step: sliderStep,
        };
    });

    return {
        useGlobalConfig,
        globalMin,
        globalMax,
        globalStep,
        sliders: sliders.length > 0 ? sliders : [{
            id: 'slider-1',
            value: clampValue(DEFAULT_VALUE, globalMin, globalMax),
            min: globalMin,
            max: globalMax,
            step: globalStep,
        }],
    };
};

const toPatchData = (state: SliderState): Partial<NodeData['data']> => {
    return {
        useGlobalConfig: state.useGlobalConfig,
        globalMin: state.globalMin,
        globalMax: state.globalMax,
        globalStep: state.globalStep,
        min: state.globalMin,
        max: state.globalMax,
        step: state.globalStep,
        sliders: state.sliders,
        value: state.sliders.map((slider) => slider.value),
    };
};

const needsStateMigration = (data: NodeData['data'], normalizedState: SliderState): boolean => {
    const patch = toPatchData(normalizedState);
    const expectedValue = (patch.value ?? []) as number[];
    const expectedSliders = (patch.sliders ?? []) as NumberSliderItem[];

    return data.useGlobalConfig !== patch.useGlobalConfig
        || data.globalMin !== patch.globalMin
        || data.globalMax !== patch.globalMax
        || data.globalStep !== patch.globalStep
        || data.min !== patch.min
        || data.max !== patch.max
        || data.step !== patch.step
        || !valueArrayMatches(data.value, expectedValue)
        || !sliderListMatches(data.sliders, expectedSliders);
};

const SmartInput: React.FC<SmartInputProps> = ({
    label,
    value,
    onChange,
    onBlur,
    width = '48px',
    style,
    inputClassName,
    labelClassName,
}) => {
    const [localValue, setLocalValue] = React.useState<string>(value.toString());
    const [isEditing, setIsEditing] = React.useState(false);

    React.useEffect(() => {
        if (!isEditing) {
            setLocalValue(value.toString());
        }
    }, [value, isEditing]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextValue = event.target.value;
        setLocalValue(nextValue);

        const numericValue = parseFloat(nextValue);
        if (!Number.isNaN(numericValue)) {
            onChange(numericValue);
        }
    };

    const handleBlur = () => {
        setIsEditing(false);

        const parsed = parseFloat(localValue);
        if (!Number.isNaN(parsed) && localValue.trim() !== '') {
            onChange(parsed);
        } else {
            setLocalValue(value.toString());
        }

        onBlur();
    };

    return (
        <div className={styles.smartInputContainer} onPointerDown={(event) => event.stopPropagation()}>
            {label && (
                <span className={`${styles.smartInputLabel} ${labelClassName || ''}`}>
                    {label}
                </span>
            )}
            <input
                className={`nodrag ${styles.smartInput} ${inputClassName || ''}`}
                type="number"
                value={localValue}
                step="any"
                onChange={handleChange}
                onFocus={() => setIsEditing(true)}
                onBlur={handleBlur}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        (event.target as HTMLInputElement).blur();
                    }
                    event.stopPropagation();
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                style={{
                    width,
                    textAlign: style?.textAlign,
                    fontSize: style?.fontSize,
                    fontWeight: style?.fontWeight,
                    color: style?.color,
                    background: style?.background,
                    border: style?.border,
                    borderRadius: style?.borderRadius,
                    padding: style?.padding,
                    ...style,
                }}
            />
        </div>
    );
};

const SliderRow: React.FC<SliderRowProps> = ({
    slider,
    index,
    isNodeSelected,
    useGlobalConfig,
    globalMin,
    globalMax,
    globalStep,
    canDelete,
    onSliderValueChange,
    onSliderConfigChange,
    onDeleteSlider,
}) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const activeMin = useGlobalConfig ? globalMin : (slider.min ?? globalMin);
    const activeMax = useGlobalConfig ? globalMax : (slider.max ?? globalMax);
    const activeStep = useGlobalConfig ? globalStep : (slider.step ?? globalStep);
    const baseRowHeight = useGlobalConfig ? SLIDER_ROW_HEIGHT_GLOBAL : SLIDER_ROW_HEIGHT_INDIVIDUAL;
    const showIndividualConfig = !useGlobalConfig && isNodeSelected && isHovered;
    const rowHeight = showIndividualConfig ? 90 : baseRowHeight;

    return (
        <div
            className={styles.sliderRow}
            style={{
                minHeight: `${rowHeight}px`,
                zIndex: isHovered ? 5 : 1,
                transition: 'min-height 120ms ease',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={styles.sliderRowContent}>
                <span className={styles.sliderRowIndex}>
                    #{index + 1}
                </span>
                <SmartInput
                    label=""
                    value={slider.value}
                    step={activeStep}
                    onChange={(value) => onSliderValueChange(slider.id, value)}
                    onBlur={() => { }}
                    width="56px"
                    inputClassName={`${styles.smartInputMedium} ${styles.smartInputCenter}`}
                />
                <div style={{ flex: 1 }}>
                    <input
                        type="range"
                        min={activeMin}
                        max={activeMax}
                        step={activeStep}
                        value={slider.value}
                        onChange={(event) => onSliderValueChange(slider.id, Number(event.target.value))}
                        onClick={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                        className={styles.sliderRangeInput}
                    />
                </div>
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onDeleteSlider(slider.id);
                    }}
                    className={styles.deleteSliderButton}
                    style={{
                        opacity: isHovered && canDelete ? 1 : 0,
                        pointerEvents: isHovered && canDelete ? 'auto' : 'none',
                        transition: 'opacity 120ms ease',
                    }}
                    title="Delete slider"
                >
                    x
                </button>
            </div>

            {showIndividualConfig && (
                <div
                    className={styles.individualConfigContainer}
                >
                    <SmartInput
                        label="MIN"
                        value={slider.min ?? globalMin}
                        step={slider.step ?? globalStep}
                        onChange={(value) => onSliderConfigChange(slider.id, 'min', value)}
                        onBlur={() => { }}
                        width="58px"
                        inputClassName={styles.smartInputSmall}
                    />
                    <SmartInput
                        label="STEP"
                        value={slider.step ?? globalStep}
                        step={0.001}
                        onChange={(value) => onSliderConfigChange(slider.id, 'step', value)}
                        onBlur={() => { }}
                        width="58px"
                        inputClassName={styles.smartInputSmall}
                    />
                    <SmartInput
                        label="MAX"
                        value={slider.max ?? globalMax}
                        step={slider.step ?? globalStep}
                        onChange={(value) => onSliderConfigChange(slider.id, 'max', value)}
                        onBlur={() => { }}
                        width="58px"
                        inputClassName={styles.smartInputSmall}
                    />
                </div>
            )}
        </div>
    );
};

const SliderBody: React.FC<SliderBodyProps> = ({ id, data, isNodeSelected, onDataChange }) => {
    const normalizedState = useMemo(() => normalizeSliderState(data), [data]);

    React.useEffect(() => {
        if (needsStateMigration(data, normalizedState)) {
            onDataChange(id, toPatchData(normalizedState));
        }
    }, [data, id, normalizedState, onDataChange]);

    const commitState = React.useCallback((nextState: SliderState) => {
        const sanitized = normalizeSliderState({
            ...data,
            ...toPatchData(nextState),
        });
        onDataChange(id, toPatchData(sanitized));
    }, [data, id, onDataChange]);

    const handleModeToggle = () => {
        const nextUseGlobalConfig = !normalizedState.useGlobalConfig;
        const nextSliders = normalizedState.sliders.map((slider) => {
            const clampMin = nextUseGlobalConfig ? normalizedState.globalMin : (slider.min ?? normalizedState.globalMin);
            const clampMax = nextUseGlobalConfig ? normalizedState.globalMax : (slider.max ?? normalizedState.globalMax);
            return {
                ...slider,
                value: clampValue(slider.value, clampMin, clampMax),
            };
        });

        commitState({
            ...normalizedState,
            useGlobalConfig: nextUseGlobalConfig,
            sliders: nextSliders,
        });
    };

    const handleGlobalConfigChange = (field: 'min' | 'max' | 'step', numericValue: number) => {
        if (!isFiniteNumber(numericValue)) return;

        let nextMin = normalizedState.globalMin;
        let nextMax = normalizedState.globalMax;
        let nextStep = normalizedState.globalStep;

        if (field === 'min') nextMin = numericValue;
        if (field === 'max') nextMax = numericValue;
        if (field === 'step') nextStep = sanitizeStep(numericValue, normalizedState.globalStep);

        if (nextMin > nextMax) {
            if (field === 'min') {
                nextMax = nextMin;
            } else {
                nextMin = nextMax;
            }
        }

        const nextSliders = normalizedState.sliders.map((slider) => ({
            ...slider,
            value: clampValue(slider.value, nextMin, nextMax),
        }));

        commitState({
            ...normalizedState,
            globalMin: nextMin,
            globalMax: nextMax,
            globalStep: nextStep,
            sliders: nextSliders,
        });
    };

    const handleSliderValueChange = (sliderId: string, numericValue: number) => {
        if (!isFiniteNumber(numericValue)) return;

        const nextSliders = normalizedState.sliders.map((slider) => {
            if (slider.id !== sliderId) return slider;

            const min = normalizedState.useGlobalConfig ? normalizedState.globalMin : (slider.min ?? normalizedState.globalMin);
            const max = normalizedState.useGlobalConfig ? normalizedState.globalMax : (slider.max ?? normalizedState.globalMax);
            const step = normalizedState.useGlobalConfig ? normalizedState.globalStep : (slider.step ?? normalizedState.globalStep);

            let nextValue = clampValue(numericValue, min, max);
            if (step < 1) {
                nextValue = Number(nextValue.toFixed(4));
            }

            return {
                ...slider,
                value: nextValue,
            };
        });

        commitState({
            ...normalizedState,
            sliders: nextSliders,
        });
    };

    const handleSliderConfigChange = (sliderId: string, field: 'min' | 'max' | 'step', numericValue: number) => {
        if (!isFiniteNumber(numericValue)) return;

        const nextSliders = normalizedState.sliders.map((slider) => {
            if (slider.id !== sliderId) return slider;

            let nextMin = isFiniteNumber(slider.min) ? slider.min : normalizedState.globalMin;
            let nextMax = isFiniteNumber(slider.max) ? slider.max : normalizedState.globalMax;
            let nextStep = sanitizeStep(isFiniteNumber(slider.step) ? slider.step : normalizedState.globalStep, normalizedState.globalStep);

            if (field === 'min') nextMin = numericValue;
            if (field === 'max') nextMax = numericValue;
            if (field === 'step') nextStep = sanitizeStep(numericValue, nextStep);

            if (nextMin > nextMax) {
                if (field === 'min') {
                    nextMax = nextMin;
                } else {
                    nextMin = nextMax;
                }
            }

            const clampMin = normalizedState.useGlobalConfig ? normalizedState.globalMin : nextMin;
            const clampMax = normalizedState.useGlobalConfig ? normalizedState.globalMax : nextMax;

            return {
                ...slider,
                min: nextMin,
                max: nextMax,
                step: nextStep,
                value: clampValue(slider.value, clampMin, clampMax),
            };
        });

        commitState({
            ...normalizedState,
            sliders: nextSliders,
        });
    };

    const handleAddSlider = () => {
        const lastSlider = normalizedState.sliders[normalizedState.sliders.length - 1];
        const nextSlider: NumberSliderItem = {
            id: createSliderId(),
            value: clampValue(lastSlider?.value ?? normalizedState.globalMin, normalizedState.globalMin, normalizedState.globalMax),
            min: normalizedState.globalMin,
            max: normalizedState.globalMax,
            step: normalizedState.globalStep,
        };

        commitState({
            ...normalizedState,
            sliders: [...normalizedState.sliders, nextSlider],
        });
    };

    const handleDeleteSlider = (sliderId: string) => {
        if (normalizedState.sliders.length <= 1) return;

        commitState({
            ...normalizedState,
            sliders: normalizedState.sliders.filter((slider) => slider.id !== sliderId),
        });
    };

    return (
        <div
            className={styles.sliderBodyContainer}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <div className={styles.sliderBodyFlex}>
                <div className={styles.sliderBodyHeader}>
                    <div className={styles.sliderBodyModeToggleGroup}>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                handleModeToggle();
                            }}
                            className={`${styles.modeToggleButton} ${normalizedState.useGlobalConfig ? styles.modeToggleButtonGlobal : styles.modeToggleButtonIndividual}`}
                            title="Toggle Global/Individual mode"
                        >
                            M
                        </button>
                        <span className={styles.modeToggleText}>
                            {normalizedState.useGlobalConfig ? 'Global Mode' : 'Individual Mode'}
                        </span>
                    </div>
                    <span className={styles.sliderCountText}>
                        {normalizedState.sliders.length} sliders
                    </span>
                </div>

                {normalizedState.useGlobalConfig && (
                    <div className={styles.globalConfigInputsContainer}>
                        <SmartInput
                            label="MIN"
                            value={normalizedState.globalMin}
                            step={normalizedState.globalStep}
                            onChange={(value) => handleGlobalConfigChange('min', value)}
                            onBlur={() => { }}
                            inputClassName={styles.smartInputGlobalConfig}
                        />
                        <SmartInput
                            label="STEP"
                            value={normalizedState.globalStep}
                            step={0.001}
                            onChange={(value) => handleGlobalConfigChange('step', value)}
                            onBlur={() => { }}
                            inputClassName={styles.smartInputGlobalConfig}
                        />
                        <SmartInput
                            label="MAX"
                            value={normalizedState.globalMax}
                            step={normalizedState.globalStep}
                            onChange={(value) => handleGlobalConfigChange('max', value)}
                            onBlur={() => { }}
                            inputClassName={styles.smartInputGlobalConfig}
                        />
                    </div>
                )}

                <div className={styles.sliderRowsContainer} style={{ gap: `${SLIDER_ROW_GAP}px` }}>
                    {normalizedState.sliders.map((slider, index) => (
                        <SliderRow
                            key={slider.id}
                            slider={slider}
                            index={index}
                            isNodeSelected={isNodeSelected}
                            useGlobalConfig={normalizedState.useGlobalConfig}
                            globalMin={normalizedState.globalMin}
                            globalMax={normalizedState.globalMax}
                            globalStep={normalizedState.globalStep}
                            canDelete={normalizedState.sliders.length > 1}
                            onSliderValueChange={handleSliderValueChange}
                            onSliderConfigChange={handleSliderConfigChange}
                            onDeleteSlider={handleDeleteSlider}
                        />
                    ))}
                </div>

                {isNodeSelected && (
                    <div className={styles.addSliderButtonContainer}>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                handleAddSlider();
                            }}
                            className={styles.addSliderButton}
                        >
                            + Add Slider
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

interface NumberSliderNodeProps extends Omit<React.ComponentProps<typeof CustomNode>, 'children'> {
    interactionMode?: 'node' | '3d' | 'wire';
}

export const NumberSliderNode: React.FC<NumberSliderNodeProps> = (props) => {
    const selected = !!props.selected;
    const onSelect = props.onSelect;
    const normalizedState = useMemo(() => normalizeSliderState(props.data), [props.data]);
    const outputPorts = useMemo(() => buildSliderOutputs(normalizedState.sliders), [normalizedState.sliders]);
    const [isSelectionActivated, setIsSelectionActivated] = React.useState(false);
    const prevSelectedRef = React.useRef<boolean | null>(null);
    const effectiveInteractionMode = props.interactionMode ?? 'node';
    const isNodeSelectedInNodeMode = effectiveInteractionMode === 'node' && selected && isSelectionActivated;

    React.useEffect(() => {
        if (prevSelectedRef.current === null) {
            prevSelectedRef.current = selected;
            return;
        }

        // Activate controls after explicit re-selection (or any selection after first mount).
        if (!prevSelectedRef.current && selected) {
            setIsSelectionActivated(true);
        }

        if (!selected) {
            setIsSelectionActivated(false);
        }

        prevSelectedRef.current = selected;
    }, [selected]);

    const handleNodeSelect = React.useCallback((multiSelect?: boolean) => {
        setIsSelectionActivated(true);
        onSelect?.(multiSelect);
    }, [onSelect]);

    const enhancedData = useMemo(() => {
        const outputListTopPadding = normalizedState.useGlobalConfig ? 56 : 32;
        const outputRowMinHeight = normalizedState.useGlobalConfig ? SLIDER_ROW_HEIGHT_GLOBAL : SLIDER_ROW_HEIGHT_INDIVIDUAL;

        return {
            ...props.data,
            customName: props.data.customName || 'Number Slider',
            isNameEditable: false,
            width: props.data.width || 500,
            height: undefined,
            minWidth: 380,
            outputs: outputPorts,
            hideInputs: true,
            hideOutputsHeader: true,
            hideOutputsAdd: true,
            hidePortLabels: true,
            hidePortControls: true,
            hideModifierMenu: true,
            inputPortOffsetLeft: -30,
            resizable: true,
            outputsAreaWidth: 30,
            outputPortSide: 'right',
            outputPortOffsetRight: 4,
            outputListTopPadding,
            outputRowMinHeight,
            outputRowGap: SLIDER_ROW_GAP,
            outputRowPaddingY: 0,
            outputPortAbsoluteCentered: true,
            bodyPadding: '12px 20px 8px 14px',
            bodyMinHeight: 94,
        };
    }, [props.data, outputPorts, normalizedState.useGlobalConfig]);

    return (
        <CustomNode {...props} onSelect={handleNodeSelect} data={enhancedData}>
            <SliderBody
                id={props.id}
                data={props.data}
                isNodeSelected={isNodeSelectedInNodeMode}
                onDataChange={props.onDataChange}
            />
        </CustomNode>
    );
};
