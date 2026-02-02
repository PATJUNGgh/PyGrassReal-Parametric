import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { LayerPanel } from '../widgets/LayerPanel';
import styles from './LayersSidebar.module.css';

interface LayersSidebarProps {
    layers: Array<{
        id: string;
        label: string;
        visible?: boolean;
        treeDepth?: number;
        hasChildren?: boolean;
        treePrefix?: string;
    }>;
    onLayerRename?: (layerId: string, newLabel: string) => void;
    onLayerDelete?: (layerId: string | string[]) => void;
}

const LayersSidebar: React.FC<LayersSidebarProps> = ({
    layers,
    onLayerRename,
    onLayerDelete,
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <>
            {/* Toggle Button - At Card Edge */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`${styles.toggleButton} ${isCollapsed ? styles.toggleButtonCollapsed : ''}`}
                style={{
                    left: isCollapsed ? '20px' : '305px',
                }}
            >
                {isCollapsed ? (
                    <ChevronRight size={20} strokeWidth={2.5} />
                ) : (
                    <ChevronLeft size={20} strokeWidth={2.5} />
                )}
            </button>

            {/* Floating Sidebar Card */}
            <div
                className={`${styles.sidebarCard} ${isCollapsed ? styles.sidebarCardCollapsed : ''}`}
                style={{
                    left: isCollapsed ? '-360px' : '20px',
                }}
            >
                {/* Glow Effect */}
                <div
                    className={styles.glowEffect}
                />

                {/* Header */}
                <div
                    className={styles.header}
                >
                    <div className={styles.headerContent}>
                        <div
                            className={styles.iconContainer}
                        >
                            <Layers size={24} style={{ color: '#3B82F6', strokeWidth: 2 }} />
                        </div>
                        <div>
                            <h3
                                className={styles.headerTitle}
                            >
                                Layer List
                            </h3>
                            <p
                                className={styles.headerSubtitle}
                            >
                                {layers.length} {layers.length === 1 ? 'layer' : 'layers'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Layers Content */}
                <div
                    className={styles.layersContent}
                >
                    {/* Inner Card */}
                    <div
                        className={styles.innerCard}
                    >
                        <LayerPanel
                            layers={layers.map(layer => ({
                                id: layer.id,
                                label: layer.label,
                                depth: layer.treeDepth ?? 0, // Use treeDepth if available, otherwise default to 0
                                treePrefix: layer.treePrefix,
                            }))}
                            hideToolbar={true}
                            hideCheckboxes={true}
                            hideIcons={true}
                            hideTreeGraphics={true}
                            onUpdate={(id, updates) => onLayerRename?.(id, updates.label)} // Map onLayerRename to onUpdate
                            onDeleteLayer={onLayerDelete} // Map onLayerDelete to onDeleteLayer
                        />
                    </div>
                </div>

                {/* Footer */}
                <div
                    className={styles.footer}
                >
                    <div
                        className={styles.footerDot}
                    />
                    <span
                        className={styles.footerText}
                    >
                        Connected to Widget Window
                    </span>
                </div>


            </div>
        </>
    );
};

export default LayersSidebar;
