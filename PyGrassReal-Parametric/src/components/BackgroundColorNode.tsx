import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { CustomNode } from './CustomNode';
import type { NodeData } from '../types/NodeTypes';
import styles from './BackgroundColorNode.module.css';

export const DEFAULT_BACKGROUND_COLOR = '#1e1e1e';
export const DEFAULT_GRADIENT_START = '#0f172a';
export const DEFAULT_GRADIENT_END = '#1f2937';
export const DEFAULT_GRADIENT_ANGLE = 135;

export const BackgroundColorNode: React.FC<Omit<React.ComponentProps<typeof CustomNode>, 'children'>> = (props) => {
    const currentColor = typeof props.data.backgroundColor === 'string'
        ? props.data.backgroundColor
        : DEFAULT_BACKGROUND_COLOR;
    const isGradient = props.data.backgroundMode === 'gradient';
    const gradientStart = typeof props.data.backgroundGradientStart === 'string'
        ? props.data.backgroundGradientStart
        : DEFAULT_GRADIENT_START;
    const gradientEnd = typeof props.data.backgroundGradientEnd === 'string'
        ? props.data.backgroundGradientEnd
        : DEFAULT_GRADIENT_END;
    const gradientAngle = typeof props.data.backgroundGradientAngle === 'number'
        ? props.data.backgroundGradientAngle
        : DEFAULT_GRADIENT_ANGLE;

    const onDataChangeRef = useRef(props.onDataChange);
    useEffect(() => {
        onDataChangeRef.current = props.onDataChange;
    }, [props.onDataChange]);

    const enhancedData = useMemo(() => {
        const isGradientMode = props.data.backgroundMode === 'gradient';
        return {
            ...props.data,
            customName: props.data.customName || 'BlackGround color',
            width: 320,
            height: isGradientMode ? 400 : 240,
            bodyPadding: '10px 0 0 0',
            inputs: [],
            outputs: [],
            hideInputs: true,
            hideOutputs: true,
            hideOutputsAdd: true,
            hideOutputsHeader: true,
            hidePortControls: true,
            resizable: false,
        };
    }, [props.data]);

    const handleColorChange = useCallback((nextColor: string) => {
        onDataChangeRef.current(props.id, {
            backgroundColor: nextColor,
            backgroundUpdatedAt: Date.now()
        });
    }, [props.id]);

    const handleGradientChange = useCallback((nextValues: Partial<{ start: string; end: string; angle: number }>) => {
        onDataChangeRef.current(props.id, {
            backgroundGradientStart: nextValues.start ?? gradientStart,
            backgroundGradientEnd: nextValues.end ?? gradientEnd,
            backgroundGradientAngle: typeof nextValues.angle === 'number' ? nextValues.angle : gradientAngle,
            backgroundUpdatedAt: Date.now()
        });
    }, [props.id, gradientStart, gradientEnd, gradientAngle]);

    const handleModeToggle = useCallback((checked: boolean) => {
        onDataChangeRef.current(props.id, {
            backgroundMode: checked ? 'gradient' : 'solid',
            backgroundUpdatedAt: Date.now()
        });
    }, [props.id]);

    const handleHexChange = useCallback((value: string, type: 'solid' | 'start' | 'end') => {
        let hex = value;
        if (!hex.startsWith('#')) hex = '#' + hex;

        const isValid = /^#[0-9A-Fa-f]{6}$/.test(hex);

        if (isValid) {
            if (type === 'solid') handleColorChange(hex);
            else if (type === 'start') handleGradientChange({ start: hex });
            else if (type === 'end') handleGradientChange({ end: hex });
        }
    }, [handleColorChange, handleGradientChange]);

    const previewStyle = isGradient
        ? `linear-gradient(${gradientAngle}deg, ${gradientStart} 0%, ${gradientEnd} 100%)`
        : currentColor;

    return (
        <CustomNode {...props} data={enhancedData}>
            <div className={styles.container}>
                <label className={styles.toggleRow}>
                    <div className={styles.checkboxWrapper}>
                        <input
                            type="checkbox"
                            checked={isGradient}
                            onChange={(e) => handleModeToggle(e.target.checked)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                    </div>
                    <span>Gradient Mode</span>
                </label>

                <div className={styles.controlsStack}>
                    {isGradient ? (
                        <>
                            <div className={styles.gradientRow}>
                                <div className={styles.inputGroup}>
                                    <div className={styles.colorWrapper} title="Start Color">
                                        <div className={styles.colorPreview} style={{ background: gradientStart }} />
                                        <input
                                            type="color"
                                            value={gradientStart}
                                            className={styles.colorInput}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onChange={(e) => handleGradientChange({ start: e.target.value })}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        defaultValue={gradientStart}
                                        className={styles.hexInput}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onChange={(e) => handleHexChange(e.target.value, 'start')}
                                        onBlur={(e) => e.target.value = gradientStart}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <div className={styles.colorWrapper} title="End Color">
                                        <div className={styles.colorPreview} style={{ background: gradientEnd }} />
                                        <input
                                            type="color"
                                            value={gradientEnd}
                                            className={styles.colorInput}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onChange={(e) => handleGradientChange({ end: e.target.value })}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        defaultValue={gradientEnd}
                                        className={styles.hexInput}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onChange={(e) => handleHexChange(e.target.value, 'end')}
                                        onBlur={(e) => e.target.value = gradientEnd}
                                    />
                                </div>
                            </div>

                            <div className={styles.sliderGroup}>
                                <div className={styles.angleLabel}>
                                    Angle: <span className={styles.angleValue}>{gradientAngle}°</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={360}
                                    value={gradientAngle}
                                    className={styles.angleSlider}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onChange={(e) => handleGradientChange({ angle: Number(e.target.value) })}
                                />
                            </div>
                        </>
                    ) : (
                        <div className={styles.inputGroup}>
                            <div className={styles.colorWrapper}>
                                <div className={styles.colorPreview} style={{ background: currentColor }} />
                                <input
                                    type="color"
                                    value={currentColor}
                                    className={styles.colorInput}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onChange={(e) => handleColorChange(e.target.value)}
                                />
                            </div>
                            <input
                                type="text"
                                defaultValue={currentColor}
                                className={styles.hexInput}
                                onMouseDown={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                onChange={(e) => handleHexChange(e.target.value, 'solid')}
                                onBlur={(e) => e.target.value = currentColor}
                            />
                        </div>
                    )}
                </div>

                <div
                    className={styles.preview}
                    style={{ background: previewStyle }}
                />
            </div>
        </CustomNode>
    );
};
