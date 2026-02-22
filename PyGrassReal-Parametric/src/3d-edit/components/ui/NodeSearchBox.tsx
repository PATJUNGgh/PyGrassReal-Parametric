import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { NodeData } from '../../types/NodeTypes';
import { NODE_DEFINITIONS } from '../../definitions/nodeDefinitions';
import { HIDDEN_NODES } from '../../definitions/hiddenNodes';
import { NODE_CATEGORIES, WIDGET_CATEGORIES, type NodeCategory } from '../../definitions/nodeCategories';
import './NodeSearchBox.css';

interface SearchableNode {
    type: NodeData['type'];
    name: string;
}

interface CategorizedSection {
    id: string;
    label: string;
    nodes: SearchableNode[];
    defaultExpanded: boolean;
}

const SEARCH_EXCLUDED_NODE_TYPES = new Set<NodeData['type']>(['group', 'component']);

const SEARCHABLE_NODES: SearchableNode[] = Object.values(NODE_DEFINITIONS)
    .filter((def) => !HIDDEN_NODES.includes(def.type) && !SEARCH_EXCLUDED_NODE_TYPES.has(def.type))
    .map((def) => ({
        type: def.type,
        name: def.name,
    }));

const buildCategorySections = (
    nodes: SearchableNode[],
    categories: NodeCategory[]
): CategorizedSection[] => {
    const nodeMap = new Map(nodes.map((node) => [node.type, node]));
    const sections: CategorizedSection[] = [];

    for (const category of categories) {
        const categoryNodes = category.nodeTypes
            .map((nodeType) => {
                return nodeMap.get(nodeType);
            })
            .filter((node): node is SearchableNode => !!node);

        if (categoryNodes.length === 0) {
            continue;
        }

        sections.push({
            id: category.id,
            label: category.label,
            nodes: categoryNodes,
            defaultExpanded: Boolean(category.defaultExpanded),
        });
    }

    return sections;
};

interface NodeSearchBoxProps {
    x: number;
    y: number;
    onSelect: (nodeType: NodeData['type']) => void;
    onClose: () => void;
    allowedTypes?: string[];
    categoryMode?: 'nodes' | 'widget';
}

export const NodeSearchBox: React.FC<NodeSearchBoxProps> = ({
    x,
    y,
    onSelect,
    onClose,
    allowedTypes,
    categoryMode,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isMiddleDragging, setIsMiddleDragging] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const inputRef = useRef<HTMLInputElement>(null);
    const searchBoxRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const middleDragActiveRef = useRef(false);
    const middleDragStartYRef = useRef(0);
    const middleDragStartScrollRef = useRef(0);

    const categoryConfig = useMemo(() => {
        if (categoryMode === 'nodes') {
            return NODE_CATEGORIES;
        }
        if (categoryMode === 'widget') {
            return WIDGET_CATEGORIES;
        }

        const seenNodeTypes = new Set<NodeData['type']>();
        const mergedCategories: NodeCategory[] = [];

        const pushCategory = (category: NodeCategory) => {
            const uniqueNodeTypes = category.nodeTypes.filter((nodeType) => {
                if (seenNodeTypes.has(nodeType)) {
                    return false;
                }
                seenNodeTypes.add(nodeType);
                return true;
            });

            if (uniqueNodeTypes.length === 0) {
                return;
            }

            mergedCategories.push({
                ...category,
                nodeTypes: uniqueNodeTypes,
            });
        };

        NODE_CATEGORIES.forEach(pushCategory);
        WIDGET_CATEGORIES.forEach(pushCategory);

        return mergedCategories;
    }, [categoryMode]);

    const baseNodes = useMemo(() => {
        if (!allowedTypes || allowedTypes.length === 0) {
            return SEARCHABLE_NODES;
        }

        const searchableNodeMap = new Map(SEARCHABLE_NODES.map((node) => [node.type, node]));
        return allowedTypes
            .map((type) => searchableNodeMap.get(type as NodeData['type']))
            .filter((node): node is SearchableNode => !!node);
    }, [allowedTypes]);

    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const hasSearch = normalizedSearchTerm.length > 0;
    const isSingleAllowedTypeMode = Boolean(allowedTypes && allowedTypes.length === 1);

    const filteredNodes = useMemo(() => {
        if (!hasSearch) {
            return baseNodes;
        }
        return baseNodes.filter((node) => node.name.toLowerCase().includes(normalizedSearchTerm));
    }, [baseNodes, hasSearch, normalizedSearchTerm]);

    const sectionsWithoutSearch = useMemo(
        () => buildCategorySections(baseNodes, categoryConfig),
        [baseNodes, categoryConfig]
    );

    const visibleSections = useMemo(
        () => buildCategorySections(filteredNodes, categoryConfig),
        [filteredNodes, categoryConfig]
    );

    const defaultExpandedByCategoryId = useMemo(() => {
        const defaultMap = new Map<string, boolean>();
        sectionsWithoutSearch.forEach((section) => {
            defaultMap.set(section.id, section.defaultExpanded);
        });
        return defaultMap;
    }, [sectionsWithoutSearch]);

    const effectiveExpandedCategories = useMemo(() => {
        if (hasSearch) {
            const autoExpanded: Record<string, boolean> = {};
            visibleSections.forEach((section) => {
                autoExpanded[section.id] = true;
            });
            return autoExpanded;
        }

        const resolvedExpanded: Record<string, boolean> = {};
        visibleSections.forEach((section) => {
            resolvedExpanded[section.id] = expandedCategories[section.id]
                ?? defaultExpandedByCategoryId.get(section.id)
                ?? false;
        });
        return resolvedExpanded;
    }, [defaultExpandedByCategoryId, expandedCategories, hasSearch, visibleSections]);

    const visibleNodes = useMemo(() => {
        if (isSingleAllowedTypeMode) {
            return filteredNodes;
        }

        const nodes: SearchableNode[] = [];

        visibleSections.forEach((section) => {
            if (effectiveExpandedCategories[section.id]) {
                nodes.push(...section.nodes);
            }
        });

        return nodes;
    }, [effectiveExpandedCategories, filteredNodes, isSingleAllowedTypeMode, visibleSections]);

    const nodeIndexByType = useMemo(() => {
        const indexMap = new Map<NodeData['type'], number>();
        visibleNodes.forEach((node, index) => {
            indexMap.set(node.type, index);
        });
        return indexMap;
    }, [visibleNodes]);

    const effectiveSelectedIndex = visibleNodes.length === 0
        ? 0
        : Math.min(selectedIndex, visibleNodes.length - 1);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }

            if (e.key === 'Enter') {
                const selectedNode = visibleNodes[effectiveSelectedIndex];
                if (selectedNode) {
                    onSelect(selectedNode.type);
                }
                return;
            }

            if (visibleNodes.length === 0) {
                return;
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((previousState) => {
                    const normalizedIndex = Math.min(previousState, visibleNodes.length - 1);
                    return normalizedIndex > 0 ? normalizedIndex - 1 : visibleNodes.length - 1;
                });
                return;
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((previousState) => {
                    const normalizedIndex = Math.min(previousState, visibleNodes.length - 1);
                    return normalizedIndex < visibleNodes.length - 1 ? normalizedIndex + 1 : 0;
                });
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [effectiveSelectedIndex, onClose, onSelect, visibleNodes]);

    useEffect(() => {
        const handleWindowMouseMove = (e: MouseEvent) => {
            if (!middleDragActiveRef.current || !listRef.current) {
                return;
            }
            const deltaY = e.clientY - middleDragStartYRef.current;
            listRef.current.scrollTop = middleDragStartScrollRef.current - deltaY;
        };

        const handleWindowMouseUp = () => {
            if (!middleDragActiveRef.current) {
                return;
            }
            middleDragActiveRef.current = false;
            setIsMiddleDragging(false);
        };

        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, []);

    useEffect(() => {
        const handleNativeWheel = (e: WheelEvent) => {
            e.stopPropagation();
        };

        const searchBoxEl = searchBoxRef.current;
        if (searchBoxEl) {
            searchBoxEl.addEventListener('wheel', handleNativeWheel, { capture: true });
        }

        return () => {
            if (searchBoxEl) {
                searchBoxEl.removeEventListener('wheel', handleNativeWheel, { capture: true });
            }
        };
    }, []);

    useEffect(() => {
        const list = listRef.current;
        if (!list) {
            return;
        }

        const handleListWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
            list.scrollTop += e.deltaY;
        };

        list.addEventListener('wheel', handleListWheel, { passive: false });
        return () => {
            list.removeEventListener('wheel', handleListWheel);
        };
    }, []);

    const toggleCategory = (categoryId: string) => {
        if (hasSearch) {
            return;
        }
        setExpandedCategories((previousState) => ({
            ...previousState,
            [categoryId]: !(
                previousState[categoryId]
                ?? defaultExpandedByCategoryId.get(categoryId)
                ?? false
            ),
        }));
    };

    const renderHighlightedText = (value: string) => {
        if (!hasSearch) {
            return value;
        }

        const normalizedValue = value.toLowerCase();
        const matchIndex = normalizedValue.indexOf(normalizedSearchTerm);
        if (matchIndex < 0) {
            return value;
        }

        const prefix = value.slice(0, matchIndex);
        const match = value.slice(matchIndex, matchIndex + normalizedSearchTerm.length);
        const suffix = value.slice(matchIndex + normalizedSearchTerm.length);

        return (
            <>
                {prefix}
                <mark className="node-search-box__highlight">{match}</mark>
                {suffix}
            </>
        );
    };

    return (
        <div
            ref={searchBoxRef}
            className="node-search-box"
            style={{
                position: 'absolute',
                left: x,
                top: y,
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
        >
            <input
                ref={inputRef}
                className="node-search-box__input"
                type="text"
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedIndex(0);
                }}
            />
            <div
                ref={listRef}
                className={`node-search-box__list ${isMiddleDragging ? 'is-middle-dragging' : ''}`}
                onMouseDown={(e) => {
                    if (e.button !== 1 || !listRef.current) {
                        return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    middleDragActiveRef.current = true;
                    setIsMiddleDragging(true);
                    middleDragStartYRef.current = e.clientY;
                    middleDragStartScrollRef.current = listRef.current.scrollTop;
                }}
            >
                {isSingleAllowedTypeMode
                    ? visibleNodes.map((node) => {
                        const nodeIndex = nodeIndexByType.get(node.type) ?? -1;
                        const isSelected = nodeIndex === effectiveSelectedIndex;
                        return (
                            <div
                                key={node.type}
                                className={`node-search-box__item ${isSelected ? 'is-selected' : ''}`}
                                onPointerDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onSelect(node.type);
                                }}
                            >
                                {renderHighlightedText(node.name)}
                            </div>
                        );
                    })
                    : visibleSections.map((section) => {
                        const isExpanded = Boolean(effectiveExpandedCategories[section.id]);
                        return (
                            <div key={section.id} className="node-search-box__category">
                                <button
                                    type="button"
                                    className="category-header"
                                    disabled={hasSearch}
                                    onPointerDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleCategory(section.id);
                                    }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                >
                                    <span className={`category-arrow ${isExpanded ? 'is-expanded' : ''}`}>{'>'}</span>
                                    <span className="category-label">{section.label}</span>
                                    <span className="category-count">{section.nodes.length}</span>
                                </button>
                                {isExpanded && (
                                    <div className="category-content">
                                        {section.nodes.map((node) => {
                                            const nodeIndex = nodeIndexByType.get(node.type) ?? -1;
                                            const isSelected = nodeIndex === effectiveSelectedIndex;
                                            return (
                                                <div
                                                    key={node.type}
                                                    className={`node-search-box__item ${isSelected ? 'is-selected' : ''}`}
                                                    onPointerDown={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        onSelect(node.type);
                                                    }}
                                                >
                                                    {renderHighlightedText(node.name)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                {visibleNodes.length === 0 && (
                    <div className="node-search-box__empty">No results found</div>
                )}
            </div>
        </div>
    );
};
