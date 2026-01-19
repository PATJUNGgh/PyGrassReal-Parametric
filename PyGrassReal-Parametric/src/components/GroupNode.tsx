import React, { useState, useRef } from 'react';
import type { NodeData } from '../types/NodeTypes';
import { Trash2 } from 'lucide-react';

interface GroupNodeProps {
    node: NodeData;
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    onDelete?: (nodeId: string, deleteChildren?: boolean) => void;
    selected?: boolean;
    onSelect?: () => void;
    onNameChange?: (id: string, newName: string) => void;
    onCluster?: (groupId: string) => void;
}

export const GroupNode: React.FC<GroupNodeProps> = ({
    node,
    onPositionChange,
    onDelete,
    selected = false,
    onSelect,
    onNameChange,
    onCluster,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false); // For exit animation
    const [showDeleteOptions, setShowDeleteOptions] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showOutsideLabel, setShowOutsideLabel] = useState(false);

    // External Label State
    const [labelFontSize, setLabelFontSize] = useState(50);
    const [isExternalEditing, setIsExternalEditing] = useState(false);
    const [showLabelBg, setShowLabelBg] = useState(true); // Toggle Background
    const [showLabelOutline, setShowLabelOutline] = useState(false); // Toggle Outline
    const [labelFillColor, setLabelFillColor] = useState('transparent'); // Inner Fill Color
    const [showTextFillPicker, setShowTextFillPicker] = useState(false); // Popup state
    const [isFontSizeEditing, setIsFontSizeEditing] = useState(false); // Numeric edit state
    const [isLabelHovered, setIsLabelHovered] = useState(false); // Hover state to auto-hide controls
    const externalInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus external input
    React.useEffect(() => {
        if (isExternalEditing && externalInputRef.current) {
            externalInputRef.current.focus();
            externalInputRef.current.select();
        }
    }, [isExternalEditing]);

    // Rename state
    const [isEditing, setIsEditing] = useState(false);
    const [currentName, setCurrentName] = useState(node.data?.customName || 'Group');

    // Sync name if prop updates
    React.useEffect(() => {
        if (node.data?.customName) {
            setCurrentName(node.data.customName);
        }
    }, [node.data?.customName]);

    const dragStartPos = useRef({ x: 0, y: 0 });
    const nodeRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Color palette
    const colors = [
        { name: 'Orange', border: 'rgba(255, 165, 0, 0.6)', bg: 'rgba(255, 165, 0, 0.05)', accent: '#ff8c00' },
        { name: 'Blue', border: 'rgba(59, 130, 246, 0.6)', bg: 'rgba(59, 130, 246, 0.05)', accent: '#3b82f6' },
        { name: 'Green', border: 'rgba(34, 197, 94, 0.6)', bg: 'rgba(34, 197, 94, 0.05)', accent: '#22c55e' },
        { name: 'Purple', border: 'rgba(168, 85, 247, 0.6)', bg: 'rgba(168, 85, 247, 0.05)', accent: '#a855f7' },
        { name: 'Red', border: 'rgba(239, 68, 68, 0.6)', bg: 'rgba(239, 68, 68, 0.05)', accent: '#ef4444' },
    ];

    const [colorIndex, setColorIndex] = useState(0);
    const currentColor = colors[colorIndex];

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only left click
        // Don't drag if editing name or clicking controls
        if (isEditing) return;

        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX - node.position.x,
            y: e.clientY - node.position.y,
        };
        e.stopPropagation();
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const newX = e.clientX - dragStartPos.current.x;
        const newY = e.clientY - dragStartPos.current.y;
        onPositionChange(node.id, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleNameSubmit = () => {
        setIsEditing(false);
        if (currentName.trim() === '') {
            setCurrentName(node.data?.customName || 'Group'); // Revert if empty
        } else {
            onNameChange?.(node.id, currentName);
        }
    };

    React.useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging]);

    // Focus input when editing starts
    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const width = node.data?.width || 400;
    const height = node.data?.height || 300;

    const triggerDelete = (deleteChildren: boolean) => {
        if (!onDelete) return;
        setIsDeleting(true); // Trigger exit animation
        setShowDeleteOptions(false);
        setTimeout(() => {
            onDelete(node.id, deleteChildren);
        }, 300);
    };

    return (
        <>
            <style>{`
                @keyframes popIn {
                    0% { transform: scale(0); opacity: 0; }
                    70% { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes popOut {
                    0% { transform: scale(1); opacity: 1; }
                    30% { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(0); opacity: 0; }
                }
            `}</style>
            <div
                id={node.id}
                ref={nodeRef}
                data-no-selection="true"
                onMouseDown={(e) => {
                    e.stopPropagation();
                    onSelect?.();
                    handleMouseDown(e);
                }}
                style={{
                    position: 'absolute',
                    left: node.position.x,
                    top: node.position.y,
                    width: `${width}px`,
                    height: `${height}px`,
                    background: currentColor.bg,
                    border: selected
                        ? `3px dashed ${currentColor.accent}`
                        : `2px dashed ${currentColor.border}`,
                    borderRadius: '20px',
                    boxShadow: selected
                        ? `0 0 0 4px ${currentColor.border}, 0 0 30px 5px ${currentColor.border}`
                        : `0 4px 20px ${currentColor.border}`,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    zIndex: showDeleteOptions ? 1000 : 0, // Lift above nodes when menu is open
                    animation: isDeleting
                        ? 'popOut 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards'
                        : 'popIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                    pointerEvents: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center', // Center the content
                    borderBottom: `1px dashed ${currentColor.border}`,
                    background: currentColor.bg,
                    borderTopLeftRadius: '18px',
                    borderTopRightRadius: '18px',
                    position: 'relative', // For absolute positioning of buttons
                    zIndex: 20, // Ensure header is above body content and nodes when lifted
                }}>
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'text', marginRight: '60px' }}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                        }}
                    >

                        {isEditing ? (
                            <input
                                ref={inputRef}
                                value={currentName}
                                onChange={(e) => setCurrentName(e.target.value)}
                                onBlur={handleNameSubmit}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleNameSubmit();
                                    e.stopPropagation(); // Prevent canvas hotkeys
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    border: `1px solid ${currentColor.accent}`,
                                    borderRadius: '4px',
                                    color: currentColor.accent,
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    outline: 'none',
                                    width: '120px',
                                    textAlign: 'center',
                                    textTransform: 'uppercase',
                                }}
                            />
                        ) : (
                            <span style={{
                                fontSize: '15px', // Increased size
                                fontWeight: 700,
                                color: currentColor.accent,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}>
                                {currentName}
                            </span>
                        )}
                    </div>

                    {/* Toggle Outside Label Button - Next to name */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowOutsideLabel(!showOutsideLabel);
                        }}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            marginLeft: '8px',
                            opacity: 0.6,
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.transform = 'scale(1)'; }}
                        title={showOutsideLabel ? "Hide External Label" : "Show External Label"}
                    >
                        <span style={{ fontSize: '18px' }}>📦</span>
                    </button>


                    {/* External Floating Label */}
                    {showOutsideLabel && (
                        <div style={{
                            position: 'absolute',
                            bottom: '100%', // Anchor to bottom so it expands upwards
                            marginBottom: '20px', // Spacing from the group header
                            left: '0',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            pointerEvents: 'none',
                            animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            zIndex: 100,
                        }}>
                            {/* Interactive Wrapper to handle Hover */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    pointerEvents: 'auto', // Capture hover events
                                    paddingBottom: '10px', // Hit area buffer
                                }}
                                onMouseEnter={() => setIsLabelHovered(true)}
                                onMouseLeave={() => {
                                    setIsLabelHovered(false);
                                    setShowTextFillPicker(false); // Auto-close picker on leave
                                }}
                            >
                                {/* Text Label */}
                                <div style={{
                                    position: 'relative',
                                    marginBottom: isLabelHovered ? '8px' : '0px', // Reduce gap when hidden
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
                                                value={currentName}
                                                onChange={(e) => setCurrentName(e.target.value)}
                                                onBlur={() => {
                                                    setIsExternalEditing(false);
                                                    onNameChange?.(node.id, currentName);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        setIsExternalEditing(false);
                                                        onNameChange?.(node.id, currentName);
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
                                                    width: `${Math.max(currentName.length, 3)}ch`,
                                                    minWidth: '100px',
                                                    outline: 'none',
                                                    padding: 0,
                                                    margin: 0,
                                                }}
                                            />
                                        ) : (
                                            currentName
                                        )}
                                    </div>
                                </div>

                                {/* Control Bar Wrapper for Animation - Handles height collapse */}
                                <div style={{
                                    maxHeight: isLabelHovered ? '200px' : '0px', // Allow growth or fully collapse
                                    opacity: isLabelHovered ? 1 : 0,
                                    marginTop: isLabelHovered ? '10px' : '0px', // Add separation only when shown
                                    overflow: 'hidden', // Clip content during transition
                                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    width: '100%',
                                    pointerEvents: isLabelHovered ? 'auto' : 'none',
                                }}>
                                    {/* Text Option Node Control Bar */}
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
                                            width: '70%', // Scale relative to group width
                                            minWidth: '200px', // Minimum usable width
                                            maxWidth: '500px', // Maximum constraint
                                        }}
                                    >
                                        {isFontSizeEditing ? (
                                            <input
                                                type="number"
                                                value={labelFontSize}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    setLabelFontSize(val);
                                                }}
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
                                                width: '100%', // Fill the container
                                                flex: 1,      // Allow growing
                                                height: '4px',
                                                accentColor: currentColor.accent,
                                                cursor: 'ew-resize',
                                                appearance: 'auto',
                                                pointerEvents: 'auto', // Ensure slider is always interactive
                                            }}
                                            title={`Size: ${labelFontSize}px`}
                                        />

                                        {/* Toggle Buttons */}
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
                                                        borderRadius: '4px', // Square with rounded corners
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
                                                    {/* Diagonal line for transparent */}
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

                                                {/* Color Popup - Pops to right */}
                                                {showTextFillPicker && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: '32px', // To the right of the button
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
                                                                    borderRadius: '4px', // Match swatch style
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
                    )}

                    {/* Color Picker Button - Absolute positioned on the left */}
                    <div style={{ position: 'absolute', left: '12px', zIndex: 10 }}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowColorPicker(!showColorPicker);
                            }}
                            style={{
                                background: `linear-gradient(135deg, ${currentColor.accent}, ${currentColor.border})`,
                                border: `1px solid ${currentColor.accent}`,
                                borderRadius: '8px',
                                padding: '6px 10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                transition: 'all 0.2s',
                                boxShadow: `0 2px 8px ${currentColor.border}`,
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#fff',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = `0 4px 12px ${currentColor.border}`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = `0 2px 8px ${currentColor.border}`;
                            }}
                            title="Change Color"
                        >
                            <span style={{ fontSize: '14px' }}>🎨</span>
                        </button>

                        {/* Color Picker Popup */}
                        {showColorPicker && (
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: '36px', // Move ABOVE the button
                                    left: '0',
                                    background: 'rgba(30, 30, 30, 0.95)',
                                    backdropFilter: 'blur(10px)',
                                    padding: '8px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    boxShadow: '0 -10px 30px rgba(0,0,0,0.5)', // Shadow upwards
                                    display: 'flex',
                                    gap: '8px',
                                    animation: 'popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    cursor: 'default',
                                    zIndex: 1000, // Try to force it on top locally
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                            >
                                {colors.map((c, index) => (
                                    <div
                                        key={c.name}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setColorIndex(index);
                                            setShowColorPicker(false);
                                        }}
                                        title={c.name}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: c.accent,
                                            border: index === colorIndex ? '2px solid white' : '2px solid transparent',
                                            cursor: 'pointer',
                                            transform: index === colorIndex ? 'scale(1.1)' : 'scale(1)',
                                            transition: 'all 0.2s',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.25)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = index === colorIndex ? 'scale(1.1)' : 'scale(1)'}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Cluster + Delete Buttons - Absolute positioned on the right */}
                    {(onCluster || onDelete) && (
                        <div style={{ position: 'absolute', right: '12px', display: 'flex', gap: '6px', zIndex: 12 }}>
                            {onCluster && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCluster(node.id);
                                    }}
                                    style={{
                                        background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '6px',
                                        padding: '6px 8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s',
                                        color: '#fff',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        letterSpacing: '0.4px',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.5)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                    title="Convert group to component"
                                >
                                    Cluster
                                </button>
                            )}

                            {onDelete && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDeleteOptions((prev) => !prev);
                                    }}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.9)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '6px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 1)';
                                        e.currentTarget.style.transform = 'scale(1.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)';
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                    title="Delete Options"
                                >
                                    <Trash2 size={14} color="#fff" />
                                </button>
                            )}

                            {showDeleteOptions && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '36px',
                                        right: 0,
                                        background: 'rgba(20, 20, 20, 0.95)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                        padding: '6px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        zIndex: 2000,
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => triggerDelete(false)}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '6px',
                                            color: '#fff',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            padding: '6px 8px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                        }}
                                        title="Delete group only"
                                    >
                                        Delete group only
                                    </button>
                                    <button
                                        onClick={() => triggerDelete(true)}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.85)',
                                            border: '1px solid rgba(239, 68, 68, 0.6)',
                                            borderRadius: '6px',
                                            color: '#fff',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            padding: '6px 8px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                        }}
                                        title="Delete group and all child nodes"
                                    >
                                        Delete group + children
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Body - Empty, just a container */}
                <div style={{
                    flex: 1,
                    position: 'relative',
                    pointerEvents: 'none', // Allow clicks to pass through to nodes inside
                }}>
                    {/* Optional: Corner indicators */}
                    <div style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        width: '12px',
                        height: '12px',
                        borderTop: `2px solid ${currentColor.border}`,
                        borderLeft: `2px solid ${currentColor.border}`,
                        borderTopLeftRadius: '4px',
                    }} />
                    <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '12px',
                        height: '12px',
                        borderTop: `2px solid ${currentColor.border}`,
                        borderRight: `2px solid ${currentColor.border}`,
                        borderTopRightRadius: '4px',
                    }} />
                    <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        width: '12px',
                        height: '12px',
                        borderBottom: `2px solid ${currentColor.border}`,
                        borderLeft: `2px solid ${currentColor.border}`,
                        borderBottomLeftRadius: '4px',
                    }} />
                    <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        width: '12px',
                        height: '12px',
                        borderBottom: `2px solid ${currentColor.border}`,
                        borderRight: `2px solid ${currentColor.border}`,
                        borderBottomRightRadius: '4px',
                    }} />
                </div>
            </div >
        </>
    );
};
