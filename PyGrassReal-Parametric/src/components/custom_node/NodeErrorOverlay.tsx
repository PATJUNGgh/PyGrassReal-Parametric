import React from 'react';

interface NodeErrorOverlayProps {
    id: string;
    isInfected: boolean;
    customName: string;
    showErrorDetails: boolean;
    setShowErrorDetails: (show: boolean) => void;
}

export const NodeErrorOverlay: React.FC<NodeErrorOverlayProps> = ({
    id,
    isInfected,
    customName,
    showErrorDetails,
    setShowErrorDetails,
}) => {
    if (!isInfected) {
        return null;
    }

    return (
        <>
            {/* Warning Icon Overlay (Center) */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '96px',
                    animation: 'warningPulse 1.5s ease-in-out infinite',
                    pointerEvents: 'none',
                    zIndex: 5,
                }}
            >
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowErrorDetails(true);
                    }}
                    style={{
                        marginBottom: '5px',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    title="Click for details"
                >
                    ⚠️
                </div>
            </div>

            {/* Error Details Modal */}
            {showErrorDetails && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginBottom: '10px',
                        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d0a0a 100%)',
                        border: '2px solid #ff0000',
                        borderRadius: '8px',
                        padding: '12px',
                        minWidth: '200px',
                        maxWidth: '250px',
                        boxShadow: '0 0 20px rgba(255, 0, 0, 0.5), inset 0 0 10px rgba(255, 0, 0, 0.1)',
                        zIndex: 1000,
                        pointerEvents: 'auto',
                        animation: 'modalPopIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
                        <span style={{ fontSize: '24px' }}>⚠️</span>
                        <h3 style={{ margin: 0, color: '#ff4444', fontSize: '14px', fontWeight: '700' }}>SECURITY ALERT</h3>
                    </div>

                    <div style={{ marginBottom: '10px', color: '#fff', lineHeight: '1.4' }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: '11px', fontWeight: '600', color: '#ffaaaa' }}>
                            High Risk Connection Detected
                        </p>
                        <p style={{ margin: '0 0 4px 0', fontSize: '10px', color: '#ccc' }}>
                            <strong>Node:</strong> {customName}
                        </p>
                        <p style={{ margin: '0 0 4px 0', fontSize: '10px', color: '#ccc' }}>
                            <strong>Status:</strong> <span style={{ color: '#ff6666' }}>INFECTED</span>
                        </p>
                        <p style={{ margin: '0', fontSize: '10px', color: '#ccc' }}>
                            <strong>Reason:</strong> Connected to AntiVirus node.
                        </p>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowErrorDetails(false);
                        }}
                        style={{
                            width: '100%',
                            padding: '6px',
                            background: '#dc2626',
                            border: '1px solid #ff4444',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
                    >
                        CLOSE
                    </button>
                </div>
            )}
        </>
    );
};
