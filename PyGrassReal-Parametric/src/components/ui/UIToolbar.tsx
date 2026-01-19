import React from 'react';

interface UIToolbarProps {
    showNodeEditor: boolean;
    setShowNodeEditor: (show: boolean) => void;
    showWidgetEditor: boolean;
    setShowWidgetEditor: (show: boolean) => void;
    interactionMode: '3d' | 'node' | 'wire';
    setInteractionMode: (mode: '3d' | 'node' | 'wire') => void;
    snapEnabled: boolean;
    setSnapEnabled: (snap: boolean) => void;
    setHandleTextureTarget: (target: 'x' | 'y' | 'z') => void;
    handleImageButtonClick: () => void;
    setIsDraggingNode: (isDragging: boolean) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UIToolbar: React.FC<UIToolbarProps> = ({
    showNodeEditor,
    setShowNodeEditor,
    showWidgetEditor,
    setShowWidgetEditor,
    interactionMode,
    setInteractionMode,
    snapEnabled,
    setSnapEnabled,
    setHandleTextureTarget,
    handleImageButtonClick,
    setIsDraggingNode,
    fileInputRef,
    handleImageChange,
}) => {
    return (
        <div style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            display: 'flex',
            gap: 6,
            background: 'rgba(20, 20, 20, 0.8)',
            padding: '10px 25px', // Increased padding to frame items better
            borderRadius: 16,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            alignItems: 'center',
            userSelect: 'none',
        }}>
            {/* Snap Toggle */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginRight: 8,
                opacity: 0.8,
            }}>
                <input
                    type="checkbox"
                    checked={snapEnabled}
                    onChange={(e) => setSnapEnabled(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, color: 'white', fontWeight: 500 }}>Snap</span>
            </div>

            {/* Divider */}
            <div style={{
                width: 1,
                height: 24,
                background: 'rgba(255, 255, 255, 0.1)',
            }} />

            {/* Node Editor Toggle */}
            {!showWidgetEditor && (
                <button
                    onClick={() => setShowNodeEditor(!showNodeEditor)}
                    title="Toggle Node Editor"
                    style={{
                        padding: '6px 10px',
                        background: showNodeEditor
                            ? 'linear-gradient(135deg, #646cff, #535bf2)'
                            : 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        flexDirection: 'column',
                        gap: 2,
                        boxShadow: showNodeEditor ? '0 4px 12px rgba(100, 108, 255, 0.3)' : 'none',
                        minWidth: 42,
                    }}
                >
                    <span style={{ fontSize: 14 }}>📐</span>
                    <span style={{ fontSize: 9 }}>Nodes {showNodeEditor && '✓'}</span>
                </button>
            )}

            {/* Widget Editor Toggle */}
            {!showNodeEditor && (
                <button
                    onClick={() => setShowWidgetEditor(!showWidgetEditor)}
                    title="Toggle Widget Editor"
                    style={{
                        padding: '6px 10px',
                        background: showWidgetEditor
                            ? 'linear-gradient(135deg, #10b981, #059669)'
                            : 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        flexDirection: 'column',
                        gap: 2,
                        boxShadow: showWidgetEditor ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                        minWidth: 42,
                    }}
                >
                    <span style={{ fontSize: 14 }}>🧩</span>
                    <span style={{ fontSize: 9 }}>Widget {showWidgetEditor && '✓'}</span>
                </button>
            )}

            {/* --- 3D Mode Controls --- */}
            {!showNodeEditor && !showWidgetEditor && (
                <>
                    <div style={{ width: 1, height: 24, background: 'rgba(255, 255, 255, 0.1)' }} />
                    <button onClick={() => { setHandleTextureTarget('x'); handleImageButtonClick(); }} title="Apply image to X" style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #ff3333, #cc0000)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 51, 51, 0.3)' }}>🔴 Image X</button>
                    <button onClick={() => { setHandleTextureTarget('y'); handleImageButtonClick(); }} title="Apply image to Y" style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #33ff33, #00cc00)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(51, 255, 51, 0.3)' }}>🟢 Image Y</button>
                    <button onClick={() => { setHandleTextureTarget('z'); handleImageButtonClick(); }} title="Apply image to Z" style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #3388ff, #0066cc)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(51, 136, 255, 0.3)' }}>🔵 Image Z</button>
                </>
            )}

            {/* --- Node Mode Controls --- */}
            {(showNodeEditor || showWidgetEditor) && (
                <>
                    {/* 3D Mode Button */}
                    <button
                        onClick={() => setInteractionMode('3d')}
                        title="3D Interaction Mode"
                        style={{
                            padding: '6px 10px',
                            background: interactionMode === '3d'
                                ? 'linear-gradient(135deg, #4ecdc4, #44a8a0)' // Active Teal/Cyan
                                : 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            flexDirection: 'column',
                            gap: 2,
                            boxShadow: interactionMode === '3d' ? '0 4px 12px rgba(78, 205, 196, 0.3)' : 'none',
                            minWidth: 42,
                        }}
                    >
                        <span style={{ fontSize: 14 }}>🎮</span>
                        <span style={{ fontSize: 9 }}>3D Mode</span>
                    </button>

                    {/* Node Mode Button */}
                    <button
                        onClick={() => setInteractionMode('node')}
                        title="Node Interaction Mode"
                        style={{
                            padding: '6px 10px',
                            background: interactionMode === 'node'
                                ? 'linear-gradient(135deg, #ff5252, #f44336)' // Active Red
                                : 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            flexDirection: 'column',
                            gap: 2,
                            boxShadow: interactionMode === 'node' ? '0 4px 12px rgba(255, 82, 82, 0.3)' : 'none',
                            minWidth: 42,
                        }}
                    >
                        <span style={{ fontSize: 14 }}>🔧</span>
                        <span style={{ fontSize: 9 }}>Node Mode</span>
                    </button>

                    {/* Wire Mode Button */}
                    <button
                        onClick={() => setInteractionMode(interactionMode === 'wire' ? 'node' : 'wire')}
                        title="Wire Selection Mode"
                        style={{
                            padding: '6px 10px',
                            background: interactionMode === 'wire'
                                ? 'linear-gradient(135deg, #fbbf24, #d97706)' // Active Amber/Yellow
                                : 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            flexDirection: 'column',
                            gap: 2,
                            boxShadow: interactionMode === 'wire' ? '0 4px 12px rgba(251, 191, 36, 0.3)' : 'none',
                            minWidth: 42,
                        }}
                    >
                        <span style={{ fontSize: 14 }}>🔗</span>
                        <span style={{ fontSize: 9 }}>Wire Mode</span>
                    </button>

                    <div style={{ width: 1, height: 24, background: 'rgba(255, 255, 255, 0.1)' }} />

                    {/* Node Grid (2 Rows x 3 Columns) - Only show for Nodes, not Widget */}
                    {showNodeEditor && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)', // Updated to 4 columns for better balance (4 top, 3 bottom)
                            gap: 4,
                            alignItems: 'center',
                        }}>
                            {[
                                { type: 'box', label: 'Box Node', icon: '📦', color: ['#646cff', '#535bf2'], shadow: '100, 108, 255' },
                                { type: 'sphere', label: 'Sphere Node', icon: '⚪', color: ['#2196f3', '#1976d2'], shadow: '33, 150, 243' },
                                { type: 'custom', label: 'Custom', icon: '⚙️', color: ['#8b5cf6', '#7c3aed'], shadow: '139, 92, 246' },
                                { type: 'antivirus', label: 'AntiVirus', icon: '🛡️', color: ['#dc2626', '#fca5a5'], shadow: '220, 38, 38' },
                                { type: 'input', label: 'Input', icon: '📥', color: ['#22c55e', '#16a34a'], shadow: '34, 197, 94' },
                                { type: 'output', label: 'Output', icon: '📤', color: ['#ef4444', '#dc2626'], shadow: '239, 68, 68' },
                                { type: 'number-slider', label: 'Number Slider', icon: 'NS', color: ['#0ea5e9', '#0284c7'], shadow: '14, 165, 233' },
                                { type: 'panel', label: 'Panel', icon: '👁️', color: ['#eab308', '#ca8a04'], shadow: '234, 179, 8' },
                            ].map(node => (
                                <div
                                    key={node.type}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('nodeType', node.type);
                                        e.dataTransfer.effectAllowed = 'copy';
                                        setIsDraggingNode(true);
                                    }}
                                    onDragEnd={() => setIsDraggingNode(false)}
                                    style={{
                                        padding: '3px 6px', // Reduced padding to fit better
                                        borderRadius: 6,
                                        background: `linear-gradient(135deg, ${node.color[0]}, ${node.color[1]})`,
                                        color: 'white',
                                        cursor: 'grab',
                                        fontWeight: 600,
                                        fontSize: 10,
                                        userSelect: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        flexDirection: 'column',
                                        gap: 1,
                                        boxShadow: `0 2px 8px rgba(${node.shadow}, 0.3)`,
                                        minWidth: 38,
                                        textAlign: 'center',
                                        width: '100%',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <span style={{ fontSize: 12 }}>{node.icon}</span>
                                    <span style={{ fontSize: 8, whiteSpace: 'nowrap' }}>{node.label}</span>
                                </div>
                            ))}
                        </div>
                    )}

                </>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
            />
        </div>
    );
};
