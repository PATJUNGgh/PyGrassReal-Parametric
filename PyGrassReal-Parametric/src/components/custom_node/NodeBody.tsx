import React from 'react';
import type { Port } from '../../types/NodeTypes';
import { NodeInputList } from './NodeInputList';
import { NodeOutputList } from './NodeOutputList';
import type { MaterialParams } from '../MaterialPicker';

interface Connection {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourcePort: string;
    targetPort: string;
}

interface NodeBodyProps {
    id: string;
    data: any; // Using any for now, should be more specific
    inputs: Port[];
    outputs: Port[];
    connections: Connection[];
    selected: boolean;
    nodeType?: string;
    hoveredPortId: string | null;
    editingPortId: string | null;
    tempPortLabel: string;
    canAddOutput: boolean;
    showMaterialPreview: boolean;
    previewParams: MaterialParams;
    children: React.ReactNode;
    setHoveredPortId: (portId: string | null) => void;
    setTempPortLabel: (label: string) => void;
    onDeleteConnection?: (connectionId: string) => void;
    onPortMouseDown: (e: React.MouseEvent, portId: string) => void;
    onPortMouseUp: (e: React.MouseEvent, portId: string) => void;
    onStartEdit: (portId: string, currentLabel: string) => void;
    onCancelEdit: () => void;
    onSavePortEdit: (portId: string, isInput: boolean) => void;
    onRemoveInput: (inputId: string) => void;
    onAddInput: () => void;
    onRemoveOutput: (outputId: string) => void;
    onAddOutput: () => void;
    onEditMaterial?: (id: string) => void;
}


export const NodeBody: React.FC<NodeBodyProps> = ({
    id,
    data,
    inputs,
    outputs,
    connections,
    selected,
    nodeType,
    hoveredPortId,
    editingPortId,
    tempPortLabel,
    canAddOutput,
    showMaterialPreview,
    previewParams,
    children,
    setHoveredPortId,
    setTempPortLabel,
    onDeleteConnection,
    onPortMouseDown,
    onPortMouseUp,
    onStartEdit,
    onCancelEdit,
    onSavePortEdit,
    onRemoveInput,
    onAddInput,
    onRemoveOutput,
    onAddOutput,
    onEditMaterial,
}) => {
    return (
        <div className="custom-node-body">
            {/* Headers Row (Pinned Top) */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px 0 20px',
                zIndex: 10,
                pointerEvents: 'none'
            }}>
                {!data.hideInputs && !data.hideInputsHeader && (
                    <div style={{ fontSize: '10px', fontWeight: 900, color: '#fff', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.5 }}>
                        INPUTS
                    </div>
                )}
                {!data.hideOutputsHeader && (
                    <div style={{ fontSize: '10px', fontWeight: 900, color: '#fff', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.5, marginLeft: 'auto' }}>
                        OUTPUTS
                    </div>
                )}
            </div>

            <div
                style={{
                    padding: data.bodyPadding ?? '36px 20px 16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '10px',
                    width: '100%',
                    minHeight: data.bodyMinHeight !== undefined ? `${data.bodyMinHeight}px` : '100px',
                    position: 'relative',
                    zIndex: 1
                }}
            >
                <NodeInputList
                    nodeId={id}
                    inputs={inputs}
                    connections={connections}
                    componentId={data.componentId}
                    hideInputs={data.hideInputs}
                    hideInputsAdd={data.hideInputsAdd}
                    hidePortLabels={data.hidePortLabels}
                    hidePortControls={data.hidePortControls}
                    selected={selected}
                    nodeType={nodeType}
                    hoveredPortId={hoveredPortId}
                    editingPortId={editingPortId}
                    tempPortLabel={tempPortLabel}
                    onDeleteConnection={onDeleteConnection}
                    onPortMouseDown={onPortMouseDown}
                    onPortMouseUp={onPortMouseUp}
                    onStartEdit={onStartEdit}
                    onCancelEdit={onCancelEdit}
                    onSavePortEdit={onSavePortEdit}
                    setTempPortLabel={setTempPortLabel}
                    onRemoveInput={onRemoveInput}
                    setHoveredPortId={setHoveredPortId}
                    onAddInput={onAddInput}
                />

                {showMaterialPreview && (
                    <div
                        className="custom-node-material-preview-wrap"
                        role="button"
                        tabIndex={0}
                        title="Open material editor"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onEditMaterial?.(id);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                onEditMaterial?.(id);
                            }
                        }}
                    >
                        <div
                            className="custom-node-material-preview-sphere"
                            style={{
                                background: data.materialStyle ?? data.style ?? '#333',
                                '--roughness': previewParams.roughness,
                                '--metalness': previewParams.metalness
                            } as React.CSSProperties}
                        />
                    </div>
                )}

                {/* Main Content Area (Children) */}
                <div style={{ flex: 1, minWidth: 0, maxWidth: '100%', position: 'relative' }}>
                    {children}
                </div>

                <NodeOutputList
                    nodeId={id}
                    outputs={outputs}
                    connections={connections}
                    componentId={data.componentId}
                    canAddOutput={canAddOutput}
                    hidePortLabels={data.hidePortLabels}
                    hidePortControls={data.hidePortControls}
                    selected={selected}
                    nodeType={nodeType}
                    hoveredPortId={hoveredPortId}
                    editingPortId={editingPortId}
                    tempPortLabel={tempPortLabel}
                    outputsAreaWidth={data.outputsAreaWidth}
                    outputPortOffsetRight={data.outputPortOffsetRight}
                    onDeleteConnection={onDeleteConnection}
                    onPortMouseDown={onPortMouseDown}
                    onPortMouseUp={onPortMouseUp}
                    onStartEdit={onStartEdit}
                    onCancelEdit={onCancelEdit}
                    onSavePortEdit={onSavePortEdit}
                    setTempPortLabel={setTempPortLabel}
                    onRemoveOutput={onRemoveOutput}
                    setHoveredPortId={setHoveredPortId}
                    onAddOutput={onAddOutput}
                />
            </div>
        </div>
    );
};
