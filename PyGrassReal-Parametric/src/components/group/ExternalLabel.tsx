import React, { useState, useRef, useEffect } from 'react';
import type { NodeData } from '../../types/NodeTypes';

interface ExternalLabelProps {
    currentName: string;
    onNameChange: (id: string, newName: string) => void;
    nodeId: string;
    currentColor: {
        name: string;
        border: string;
        bg: string;
        accent: string;
    };
}

export const ExternalLabel: React.FC<ExternalLabelProps> = ({
    currentName,
    onNameChange,
    nodeId,
    currentColor,
}) => {
    const [labelFontSize, setLabelFontSize] = useState(50);
    const [isExternalEditing, setIsExternalEditing] = useState(false);
    const [showLabelBg, setShowLabelBg] = useState(true);
    const [showLabelOutline, setShowLabelOutline] = useState(false);
    const [labelFillColor, setLabelFillColor] = useState('transparent');
    const [showTextFillPicker, setShowTextFillPicker] = useState(false);
    const [isFontSizeEditing, setIsFontSizeEditing] = useState(false);
    const [isLabelHovered, setIsLabelHovered] = useState(false);
    const externalInputRef = useRef<HTMLInputElement>(null);
    const [internalName, setInternalName] = useState(currentName);

    useEffect(() => {
        setInternalName(currentName);
    }, [currentName]);

    useEffect(() => {
        if (isExternalEditing && externalInputRef.current) {
            externalInputRef.current.focus();
            externalInputRef.current.select();
        }
    }, [isExternalEditing]);

    const handleNameSubmit = () => {
        setIsExternalEditing(false);
        onNameChange(nodeId, internalName);
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: '100%',
            marginBottom: '20px',
            left: '0',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
            animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            zIndex: 100,
        }}>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    pointerEvents: 'auto',
                    paddingBottom: '10px',
                }}
                onMouseEnter={() => setIsLabelHovered(true)}
                onMouseLeave={() => {
                    setIsLabelHovered(false);
                    setShowTextFillPicker(false);
                }}
            >
                <div style={{
                    position: 'relative',
                    marginBottom: isLabelHovered ? '8px' : '0px',
                    transition: 'margin 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }}>
                    <div style={{
                        background: showLabelBg ? 'rgba(20, 20, 20, 0.85)' : 'transparent',
                        backdropFilter: showLabelBg ? 'blur(10px)' : 'none',
                        padding: '12px 32px',
                        borderRadius: '24px',
                        border: showLabelBg ? `3px solid ${currentColor.accent}` : '3px solid transparent',
                        color: showLabelOutline ? labelFillColor : currentColor.accent,
                        WebkitTextStroke: showLabelOutline ? `2px ${currentColor.accent}` : '0px',
                        fontSize: `${labelFontSize}px`,
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        textShadow: showLabelOutline ? 'none' : '0 4px 20px rgba(0,0,0,0.8)',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '80px',
                        boxShadow: showLabelBg ? `0 10px 40px rgba(0,0,0,0.6)` : 'none',
                        cursor: 'text',
                        transition: 'all 0.2s',
                    }}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            setIsExternalEditing(true);
                        }}
                    >
                        {isExternalEditing ? (
                            <input
                                ref={externalInputRef}
                                value={internalName}
                                onChange={(e) => setInternalName(e.target.value)}
                                onBlur={handleNameSubmit}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleNameSubmit();
                                    }
                                    e.stopPropagation();
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'inherit',
                                    fontSize: 'inherit',
                                    fontWeight: 'inherit',
                                    textTransform: 'inherit',
                                    letterSpacing: 'inherit',
                                    textAlign: 'center',
                                    width: `${Math.max(internalName.length, 3)}ch`,
                                    minWidth: '100px',
                                    outline: 'none',
                                    padding: 0,
                                    margin: 0,
                                }}
                            />
                        ) : (
                            internalName
                        )}
                    </div>
                </div>

                <div style={{
                    maxHeight: isLabelHovered ? '200px' : '0px',
                    opacity: isLabelHovered ? 1 : 0,
                    marginTop: isLabelHovered ? '10px' : '0px',
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%',
                    pointerEvents: isLabelHovered ? 'auto' : 'none',
                }}>
                    <div
                        title="Text option node"
                        style={{
                            background: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(8px)',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            border: `1px solid ${currentColor.border}`,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            width: '70%',
                            minWidth: '200px',
                            maxWidth: '500px',
                        }}
                    >
                        {isFontSizeEditing ? (
                            <input
                                type="number"
                                value={labelFontSize}
                                onChange={(e) => setLabelFontSize(Number(e.target.value))}
                                onBlur={() => {
                                    setIsFontSizeEditing(false);
                                    setLabelFontSize(Math.max(24, Math.min(200, labelFontSize)));
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setIsFontSizeEditing(false);
                                        setLabelFontSize(Math.max(24, Math.min(200, labelFontSize)));
                                    }
                                    e.stopPropagation();
                                }}
                                autoFocus
                                style={{
                                    width: '40px',
                                    background: 'rgba(0,0,0,0.5)',
                                    border: `1px solid ${currentColor.accent}`,
                                    color: '#fff',
                                    fontSize: '12px',
                                    borderRadius: '4px',
                                    padding: '2px',
                                    textAlign: 'center',
                                    outline: 'none',
                                }}
                            />
                        ) : (
                            <span
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setIsFontSizeEditing(true);
                                }}
                                style={{
                                    color: '#fff',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    fontVariantNumeric: 'tabular-nums',
                                    minWidth: '30px',
                                    textAlign: 'right',
                                    cursor: 'text',
                                }}
                                title="Double click to type size"
                            >
                                {labelFontSize}
                            </span>
                        )}
                        <input
                            type="range"
                            min="24"
                            max="200"
                            value={labelFontSize}
                            onChange={(e) => setLabelFontSize(Number(e.target.value))}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '100%',
                                flex: 1,
                                height: '4px',
                                accentColor: currentColor.accent,
                                cursor: 'ew-resize',
                                appearance: 'auto',
                                pointerEvents: 'auto',
                            }}
                            title={`Size: ${labelFontSize}px`}
                        />

                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

                        <button
                            onClick={(e) => { e.stopPropagation(); setShowLabelBg(!showLabelBg); }}
                            style={{
                                background: showLabelBg ? currentColor.accent : 'transparent',
                                border: '1px solid rgba(255,255,255,0.3)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                color: '#fff',
                                padding: '2px 6px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                            }}
                            title="Toggle Background"
                        >
                            BG
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowLabelOutline(!showLabelOutline); }}
                            style={{
                                background: showLabelOutline ? currentColor.accent : 'transparent',
                                border: '1px solid rgba(255,255,255,0.3)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                color: '#fff',
                                padding: '2px 6px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                textDecoration: 'underline',
                            }}
                            title="Toggle Outline Text"
                        >
                            T
                        </button>

                        {showLabelOutline && (
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowTextFillPicker(!showTextFillPicker);
                                    }}
                                    style={{
                                        background: labelFillColor === 'transparent' ? 'rgba(255,255,255,0.05)' : labelFillColor,
                                        border: '1px solid rgba(255,255,255,0.5)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        width: '20px',
                                        height: '20px',
                                        marginLeft: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    }}
                                    title="Text Fill Color"
                                >
                                    {labelFillColor === 'transparent' && (
                                        <div style={{
                                            position: 'absolute',
                                            width: '150%',
                                            height: '1px',
                                            background: '#ff4444',
                                            transform: 'rotate(-45deg)',
                                        }} />
                                    )}
                                </button>

                                {showTextFillPicker && (
                                    <div style={{
                                        position: 'absolute',
                                        left: '32px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'rgba(0, 0, 0, 0.9)',
                                        backdropFilter: 'blur(5px)',
                                        padding: '6px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        gap: '6px',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                        zIndex: 110,
                                        alignItems: 'center',
                                    }}>
                                        {[
                                            { val: 'transparent', label: '🚫', color: 'transparent' },
                                            { val: '#ffffff', label: '', color: '#fff' },
                                            { val: '#000000', label: '', color: '#000' },
                                            { val: currentColor.accent, label: '', color: currentColor.accent }
                                        ].map((opt) => (
                                            <button
                                                key={opt.val}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLabelFillColor(opt.val);
                                                    setShowTextFillPicker(false);
                                                }}
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '4px',
                                                    background: opt.color,
                                                    border: `1px solid ${labelFillColor === opt.val ? '#fff' : 'rgba(255,255,255,0.3)'}`,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '12px',
                                                    padding: 0,
                                                    transition: 'transform 0.1s',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                title={opt.label || opt.val}
                                            >
                                                {opt.val === 'transparent' && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        width: '150%',
                                                        height: '1px',
                                                        background: '#ff4444',
                                                        transform: 'rotate(-45deg)',
                                                    }} />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
