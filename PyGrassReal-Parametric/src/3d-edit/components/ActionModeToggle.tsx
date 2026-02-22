import React from 'react';
import clsx from 'clsx';

interface ActionModeToggleProps {
    selectedMode: 'plan' | 'act';
    onSetMode: (mode: 'plan' | 'act') => void;
    planTitle?: string;
    actTitle?: string;
    // Optional props for custom styling if needed
    planBgColorActive?: string;
    actBgColorActive?: string;
    textColorActive?: string;
    textColorInactive?: string;
    fontSize?: number;
    padding?: string;
    borderRadius?: number;
    containerClass?: string;
}

export const ActionModeToggle: React.FC<ActionModeToggleProps> = ({
    selectedMode,
    onSetMode,
    planTitle = "Plan Mode",
    actTitle = "Act Mode",
    planBgColorActive = '#0ea5e9', // default for top section
    actBgColorActive = '#22c55e',  // default for top section
    textColorActive = '#fff',
    textColorInactive = '#94a3b8',
    fontSize = 10,
    padding = '2px 6px',
    borderRadius = 4,
    containerClass,
}) => {
    return (
        <div
            className={clsx("action-mode-toggle-container", containerClass)}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                background: 'rgba(15,23,42,0.6)', // Base background for the toggle group
                padding: 2,
                borderRadius: 6,
            }}
            onMouseDown={(e) => e.stopPropagation()} // Prevent node drag when clicking toggle
        >
            <button
                onClick={(e) => { e.stopPropagation(); onSetMode('plan'); }}
                style={{
                    padding: padding,
                    borderRadius: borderRadius,
                    border: 'none',
                    cursor: 'pointer',
                    background: selectedMode === 'plan' ? planBgColorActive : 'transparent',
                    color: selectedMode === 'plan' ? textColorActive : textColorInactive,
                    fontSize: fontSize,
                    fontWeight: 600,
                }}
                title={planTitle}
            >
                Plan
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); onSetMode('act'); }}
                style={{
                    padding: padding,
                    borderRadius: borderRadius,
                    border: 'none',
                    cursor: 'pointer',
                    background: selectedMode === 'act' ? actBgColorActive : 'transparent',
                    color: selectedMode === 'act' ? textColorActive : textColorInactive,
                    fontSize: fontSize,
                    fontWeight: 600,
                }}
                title={actTitle}
            >
                Act
            </button>
        </div>
    );
};
