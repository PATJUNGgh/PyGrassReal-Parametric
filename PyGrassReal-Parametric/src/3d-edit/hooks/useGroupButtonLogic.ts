import { useState, useMemo, useEffect, useRef } from 'react';
import type { NodeData } from '../types/NodeTypes';

interface UseGroupButtonLogicProps {
    selectedNodeIds: Set<string>;
    filteredNodes: NodeData[];
}

interface GroupButtonProps {
    centerX: number;
    buttonY: number;
    count: number;
}

interface UseGroupButtonLogicResult {
    shouldShowGroupButton: boolean;
    groupButtonProps: GroupButtonProps;
    isInvalidGroupSelection: boolean;
    showGroupButton: boolean;
    isGroupButtonExiting: boolean;
}

export const useGroupButtonLogic = ({
    selectedNodeIds,
    filteredNodes,
}: UseGroupButtonLogicProps): UseGroupButtonLogicResult => {
    const [isGroupButtonExiting, setIsGroupButtonExiting] = useState(false);
    const [showGroupButton, setShowGroupButton] = useState(false);

    const lastGroupButtonPropsRef = useRef({ centerX: 0, buttonY: 0, count: 0 });

    const { shouldShowGroupButton, groupButtonProps, isInvalidGroupSelection } = useMemo(() => {
        let shouldShow = selectedNodeIds.size > 1;
        let isInvalidSelection = false;
        let centerX = lastGroupButtonPropsRef.current.centerX;
        let buttonY = lastGroupButtonPropsRef.current.buttonY;
        let count = selectedNodeIds.size;

        if (shouldShow) {
            const selectedNodes = filteredNodes.filter(n => selectedNodeIds.has(n.id));

            const hasGroupNode = selectedNodes.some(n => n.type === 'group');
            const isAnyInGroup = selectedNodes.some(n =>
                filteredNodes.some(g => g.type === 'group' && g.data.childNodeIds?.includes(n.id))
            );

            if (hasGroupNode || isAnyInGroup) {
                shouldShow = false;
                isInvalidSelection = true;
            } else if (selectedNodes.length > 0) {
                const NODE_WIDTH = 280;
                const minX = Math.min(...selectedNodes.map(n => n.position.x));
                const maxX = Math.max(...selectedNodes.map(n => n.position.x + NODE_WIDTH));
                const minY = Math.min(...selectedNodes.map(n => n.position.y));

                centerX = (minX + maxX) / 2;
                buttonY = minY - 80;
            }
        }

        if (!shouldShow) {
            count = lastGroupButtonPropsRef.current.count;
        }

        return {
            shouldShowGroupButton: shouldShow,
            groupButtonProps: {
                centerX,
                buttonY,
                count,
            },
            isInvalidGroupSelection: isInvalidSelection,
        };
    }, [selectedNodeIds, filteredNodes]);

    useEffect(() => {
        if (shouldShowGroupButton) {
            lastGroupButtonPropsRef.current = groupButtonProps;
        }
    }, [shouldShowGroupButton, groupButtonProps]);

    useEffect(() => {
        if (shouldShowGroupButton) {
            if (!showGroupButton) {
                setShowGroupButton(true);
                setIsGroupButtonExiting(false);
            } else if (isGroupButtonExiting) {
                setIsGroupButtonExiting(false);
            }
        } else if (showGroupButton && !isGroupButtonExiting) {
            if (isInvalidGroupSelection) {
                setShowGroupButton(false);
                setIsGroupButtonExiting(false);
            } else {
                setIsGroupButtonExiting(true);
                const timer = setTimeout(() => {
                    setShowGroupButton(false);
                    setIsGroupButtonExiting(false);
                }, 400);
                return () => clearTimeout(timer);
            }
        }
    }, [shouldShowGroupButton, isInvalidGroupSelection, showGroupButton, isGroupButtonExiting]);

    return {
        shouldShowGroupButton,
        groupButtonProps,
        isInvalidGroupSelection,
        showGroupButton,
        isGroupButtonExiting,
    };
};
