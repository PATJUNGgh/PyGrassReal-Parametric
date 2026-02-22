import React, { useRef } from 'react';
import type { Port } from '../../types/NodeTypes';
import { NodeInputList } from './NodeInputList';
import { NodeOutputList } from './NodeOutputList';
import type { MaterialParams } from '../MaterialPicker';
import { useCopyTooltip } from '../../hooks/useCopyTooltip';
import SectionHeader from './SectionHeader';
import { useNodeInteraction } from '../../context/NodeInteractionContext';

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
    showMaterialPreview: boolean;
    previewParams: MaterialParams;
    children: React.ReactNode;
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
    showMaterialPreview,
    previewParams,
    children,
    onEditMaterial,
}) => {
    const bodyRef = useRef<HTMLDivElement>(null);
    const { copyTooltip, handleLabelSelectionMouseUp, handleTooltipMouseDown, handleTooltipClick } = useCopyTooltip(bodyRef);
    const { editingPortId, canAddOutput } = useNodeInteraction();

    const editingSide: 'input' | 'output' | null = editingPortId
        ? (inputs.some((input) => input.id === editingPortId)
            ? 'input'
            : outputs.some((output) => output.id === editingPortId)
                ? 'output'
                : null)
        : null;

    const hasOutputs = outputs.length > 0;
    const hasOutputColumn = hasOutputs || canAddOutput;
    const showInputColumn = editingSide !== 'output';
    const showOutputColumn = hasOutputColumn && editingSide !== 'input';

    const isUnitNode = ['unit-x', 'unit-y', 'unit-z'].includes(nodeType || '');

    return (
        <div className="custom-node-body" ref={bodyRef}>
            {copyTooltip?.visible && (
                <div
                    className="node-name-copy-tooltip"
                    onMouseDown={handleTooltipMouseDown}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={handleTooltipClick}
                    style={{
                        left: `${copyTooltip.x}px`,
                        top: `${copyTooltip.y}px`,
                    }}
                >
                    {copyTooltip.text}
                </div>
            )}
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
                {showInputColumn && !data.hideInputs && !data.hideInputsHeader && !isUnitNode && (
                    <SectionHeader label="INPUTS" align="left" onMouseUp={handleLabelSelectionMouseUp} />
                )}
                {showOutputColumn && !data.hideOutputsHeader && !isUnitNode && (
                     <SectionHeader label="OUTPUTS" align="right" onMouseUp={handleLabelSelectionMouseUp} />
                )}
            </div>

            <div
                style={{
                    padding: data.bodyPadding ?? '36px 20px 16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '10px',
                    width: '100%',
                    minHeight: 0,
                    position: 'relative',
                    zIndex: 1,
                    flex: 1,
                    alignItems: 'stretch',
                }}
            >
                {showInputColumn && (
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
                        inputsAreaWidth={data.inputsAreaWidth}
                        inputPortOffsetLeft={data.inputPortOffsetLeft}
                        inputListTopPadding={data.inputListTopPadding}
                        inputRowMinHeight={data.inputRowMinHeight}
                        inputRowGap={data.inputRowGap}
                        inputRowPaddingY={data.inputRowPaddingY}
                        isInteractionDisabled={editingSide === 'output'}
                        onLabelMouseUp={handleLabelSelectionMouseUp}
                    />
                )}

                {showMaterialPreview && (
                    <div
                        className="custom-node-material-preview-wrap"
                        role="button"
                        tabIndex={0}
                        title="Open material editor"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
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
                <div style={{ flex: 1, minWidth: 0, maxWidth: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    {children}
                </div>

                {showOutputColumn && (
                    <NodeOutputList
                        nodeId={id}
                        outputs={outputs}
                        connections={connections}
                        componentId={data.componentId}
                        hidePortLabels={data.hidePortLabels}
                        hidePortControls={data.hidePortControls}
                        selected={selected}
                        nodeType={nodeType}
                        outputsAreaWidth={data.outputsAreaWidth}
                        outputPortOffsetRight={data.outputPortOffsetRight}
                        outputPortOffsetLeft={data.outputPortOffsetLeft}
                        outputPortSide={data.outputPortSide}
                        outputListTopPadding={data.outputListTopPadding}
                        outputRowMinHeight={data.outputRowMinHeight}
                        outputRowGap={data.outputRowGap}
                        outputRowPaddingY={data.outputRowPaddingY}
                        outputLabelMarginRight={data.outputLabelMarginRight}
                        outputEditMarginRight={data.outputEditMarginRight}
                        outputPortAbsoluteCentered={data.outputPortAbsoluteCentered}
                        isInteractionDisabled={editingSide === 'input'}
                        onLabelMouseUp={handleLabelSelectionMouseUp}
                    />
                )}
            </div>
        </div>
    );
};
