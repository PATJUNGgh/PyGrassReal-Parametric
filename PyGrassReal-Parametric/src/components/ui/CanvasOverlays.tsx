import React from 'react';
import type { NodeData } from '../../types/NodeTypes';

// Import UI components
import { WireActionMenu } from './WireActionMenu';
import { GroupButtonOverlay } from './GroupButtonOverlay';
import { MaterialPicker } from '../MaterialPicker';
import { NodeSearchBox } from './NodeSearchBox';

// Define the props interface
interface CanvasOverlaysProps {
    // Shared
    scale: number;
    offset: { x: number; y: number };
    interactionMode: 'node' | '3d' | 'wire';

    // WireActionMenu
    selectedConnectionIds: Set<string>;
    getSelectedWiresCenter: () => { x: number; y: number } | null;
    handleDeleteWires: () => void;
    handleToggleWireStyle: (style: 'dashed' | 'ghost') => void;

    // GroupButtonOverlay
    showGroupButton: boolean;
    isInvalidGroupSelection: boolean;
    groupButtonProps: { count: number; centerX: number; buttonY: number; };
    isGroupButtonExiting: boolean;
    createGroupNode: () => void;

    // MaterialPicker
    editingNodeForMaterial: NodeData | null;
    editingMaterialNodeId: string | null;
    closeMaterialEditor: () => void;
    updateNodeData: (id: string, updates: Partial<NodeData['data']>) => void;

    // NodeSearchBox
    searchBoxVisible: boolean;
    searchBoxPos: { x: number; y: number };
    addNode: (type: NodeData['type'], position: { x: number; y: number; }) => void;
    hideSearchBox: () => void;
}

export const CanvasOverlays: React.FC<CanvasOverlaysProps> = ({
    scale,
    offset,
    interactionMode,
    selectedConnectionIds,
    getSelectedWiresCenter,
    handleDeleteWires,
    handleToggleWireStyle,
    showGroupButton,
    isInvalidGroupSelection,
    groupButtonProps,
    isGroupButtonExiting,
    createGroupNode,
    editingNodeForMaterial,
    editingMaterialNodeId,
    closeMaterialEditor,
    updateNodeData,
    searchBoxVisible,
    searchBoxPos,
    addNode,
    hideSearchBox
}) => {
    return (
        <>
            {/* Floating Wire Action Menu (Animated) */}
            <WireActionMenu
                visible={selectedConnectionIds.size > 0 && interactionMode === 'wire'}
                center={getSelectedWiresCenter()}
                onDelete={handleDeleteWires}
                onToggleStyle={handleToggleWireStyle}
            />

            {/* Group Button */}
            {showGroupButton && !isInvalidGroupSelection && (
                <GroupButtonOverlay
                    count={groupButtonProps.count}
                    centerX={groupButtonProps.centerX}
                    buttonY={groupButtonProps.buttonY}
                    scale={scale}
                    offset={offset}
                    isExiting={isGroupButtonExiting}
                    onClick={() => {
                        createGroupNode();
                    }}
                />
            )}

            {/* Material Picker Modal */}
            {editingNodeForMaterial && editingMaterialNodeId && (
                <MaterialPicker
                    initialStyle={editingNodeForMaterial.data.materialStyle || editingNodeForMaterial.data.style}
                    initialUrl={editingNodeForMaterial.data.materialPreviewUrl}
                    initialParams={editingNodeForMaterial.data.materialParams}
                    onClose={closeMaterialEditor}
                    onApply={(data) => {
                        updateNodeData(editingMaterialNodeId, {
                            materialStyle: data.style,
                            materialPreviewUrl: data.url,
                            materialParams: data.params,
                            style: data.style // also update style for backward compatibility or direct use
                        });
                        closeMaterialEditor();
                    }}
                />
            )}

            {/* Node Search Box */}
            {searchBoxVisible && (
                <NodeSearchBox
                    x={searchBoxPos.x}
                    y={searchBoxPos.y}
                    onSelect={(type) => {
                        addNode(type, {
                            x: (searchBoxPos.x - offset.x) / scale,
                            y: (searchBoxPos.y - offset.y) / scale
                        });
                        hideSearchBox();
                    }}
                    onClose={hideSearchBox}
                />
            )}

            {/* Scale Indicator */}
            <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.7)',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                zIndex: 10,
                pointerEvents: 'none',
            }}>
                {Math.round(scale * 100)}%
            </div>
        </>
    );
};
