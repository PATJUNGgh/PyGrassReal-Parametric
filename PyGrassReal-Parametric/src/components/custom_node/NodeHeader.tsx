import React, { useState } from 'react';
import { NodeActionBar } from '../NodeActionBar';
import '../CustomNode.css';

interface NodeHeaderProps {
    id: string;
    customName: string;
    isNodePaused: boolean;
    selected: boolean;
    overlappingGroupId?: string;
    overlapGroupId?: string;
    parentGroupId?: string;
    hideTitleLabel?: boolean;
    onNameChange: (newName: string) => void;
    onTogglePause: () => void;
    onDuplicate?: (id: string) => void;
    onDelete: (id: string) => void;
    onJoinGroup?: (nodeId: string, groupId: string) => void;
    onLeaveGroup?: (nodeId: string) => void;
    onCluster?: (nodeId: string) => void;
}

export const NodeHeader: React.FC<NodeHeaderProps> = ({
    id,
    customName,
    isNodePaused,
    selected,
    overlappingGroupId,
    parentGroupId,
    onNameChange,
    onTogglePause,
    onDuplicate,
    onDelete,
    onJoinGroup,
    onLeaveGroup,
    onCluster,
    hideTitleLabel,
}) => {
    const [isEditingName, setIsEditingName] = useState(false);

    return (
        <div className="node-header">
            {isEditingName ? (
                <input
                    type="text"
                    value={customName}
                    onChange={(e) => onNameChange(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') setIsEditingName(false);
                    }}
                    autoFocus
                    className="node-header-input"
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <div
                    className="node-header-title"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingName(true);
                    }}
                >
                    <span style={{ fontSize: '18px' }}>⚙️</span>
                    {!hideTitleLabel && (
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff', whiteSpace: 'normal', lineHeight: 1.2 }}>
                            {customName}
                        </span>
                    )}
                </div>
            )}
            <NodeActionBar
                selected={selected}
                isPaused={isNodePaused}
                onTogglePause={onTogglePause}
                onDuplicate={onDuplicate ? () => onDuplicate(id) : undefined}
                onInfo={() => {
                    alert(`Node ID: ${id}\nName: ${customName}`);
                }}
                onDelete={() => onDelete(id)}
                canJoinGroup={!!(overlappingGroupId && !parentGroupId && onJoinGroup)}
                onJoinGroup={() => onJoinGroup?.(id, overlappingGroupId!)}
                canLeaveGroup={!!(parentGroupId && onLeaveGroup)}
                onLeaveGroup={() => onLeaveGroup?.(id)}
                onCluster={onCluster ? () => onCluster(id) : undefined}
            />
        </div>
    );
};
