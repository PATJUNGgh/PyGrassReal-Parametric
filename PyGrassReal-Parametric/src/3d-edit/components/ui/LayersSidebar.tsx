import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { LayerPanel } from '../widgets/LayerPanel';
import type { LayerInputData } from '../../utils/computeLayerData';
import styles from './LayersSidebar.module.css';

type LayersSidebarLayer = LayerInputData & {
    visible?: boolean;
    treeDepth?: number;
    hasChildren?: boolean;
};

interface LayersSidebarProps {
    layers: LayersSidebarLayer[];
    onLayerRename?: (layerId: string, newLabel: string) => void;
    onLayerDelete?: (layerId: string | string[]) => void;
}

const LayersSidebar: React.FC<LayersSidebarProps> = ({
    layers,
    onLayerRename,
    onLayerDelete,
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const layersForPanel = useMemo(() => {
        const byId = new Map(layers.map((layer) => [layer.id, layer]));
        const depthMemo = new Map<string, number>();

        const resolveDepth = (layer: LayersSidebarLayer, visited: Set<string> = new Set()): number => {
            if (typeof layer.depth === 'number') return layer.depth;
            if (typeof layer.treeDepth === 'number') return layer.treeDepth;
            if (!layer.parentId) return 0;
            if (depthMemo.has(layer.id)) return depthMemo.get(layer.id) ?? 0;
            if (visited.has(layer.id)) return 0;

            const parent = byId.get(layer.parentId);
            if (!parent) return 0;

            const nextVisited = new Set(visited);
            nextVisited.add(layer.id);
            const resolved = resolveDepth(parent, nextVisited) + 1;
            depthMemo.set(layer.id, resolved);
            return resolved;
        };

        return layers.map((layer) => ({
            id: layer.id,
            label: layer.label,
            depth: resolveDepth(layer),
            treePrefix: layer.treePrefix,
        }));
    }, [layers]);

    return (
        <>
            {/* Toggle Button - At Card Edge */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`${styles.toggleButton} ${isCollapsed ? styles.toggleButtonCollapsed : ''}`}
                style={{
                    left: isCollapsed ? '16px' : '310px',
                }}
            >
                {isCollapsed ? (
                    <ChevronRight size={17} strokeWidth={2.3} />
                ) : (
                    <ChevronLeft size={17} strokeWidth={2.3} />
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
                            layers={layersForPanel}
                            hideToolbar={true}
                            hideCheckboxes={true}
                            hideIcons={true}
                            hideTreeGraphics={false}
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
