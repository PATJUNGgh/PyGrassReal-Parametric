import React, { useState, useEffect, useRef } from 'react';
import type { NodeData } from '../../types/NodeTypes';
import { NODE_DEFINITIONS } from '../../definitions/nodeDefinitions';
import './NodeSearchBox.css';

const SEARCHABLE_NODES = Object.values(NODE_DEFINITIONS).map(def => ({
    type: def.type,
    name: def.name,
}));

interface NodeSearchBoxProps {
    x: number;
    y: number;
    onSelect: (nodeType: NodeData['type']) => void;
    onClose: () => void;
}

export const NodeSearchBox: React.FC<NodeSearchBoxProps> = ({ x, y, onSelect, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isMiddleDragging, setIsMiddleDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const searchBoxRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const middleDragActiveRef = useRef(false);
    const middleDragStartYRef = useRef(0);
    const middleDragStartScrollRef = useRef(0);

    const filteredNodes = SEARCHABLE_NODES.filter(node =>
        node.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'Enter') {
                if (filteredNodes[selectedIndex]) {
                    onSelect(filteredNodes[selectedIndex].type);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault(); // Prevent cursor movement in input
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredNodes.length - 1));
            } else if (e.key === 'ArrowDown') {
                e.preventDefault(); // Prevent cursor movement in input
                setSelectedIndex(prev => (prev < filteredNodes.length - 1 ? prev + 1 : 0));
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handleClickOutside); // Use mousedown to capture clicks before they propagate
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose, onSelect, selectedIndex, filteredNodes]);

    useEffect(() => {
        const handleWindowMouseMove = (e: MouseEvent) => {
            if (!middleDragActiveRef.current || !listRef.current) return;
            const deltaY = e.clientY - middleDragStartYRef.current;
            listRef.current.scrollTop = middleDragStartScrollRef.current - deltaY;
        };

        const handleWindowMouseUp = () => {
            if (!middleDragActiveRef.current) return;
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

    return (
        <div
            ref={searchBoxRef}
            className="node-search-box"
            style={{
                position: 'absolute',
                left: x,
                top: y,
                background: 'rgba(40, 40, 40, 0.95)',
                border: '1px solid #666',
                borderRadius: '8px',
                boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
                zIndex: 2000,
                display: 'flex',
                flexDirection: 'column',
                width: '200px',
            }}
            onClick={e => e.stopPropagation()}
            onWheel={e => e.stopPropagation()}
            onWheelCapture={e => e.stopPropagation()}
        >
            <input
                ref={inputRef}
                type="text"
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                    background: '#202020',
                    border: 'none',
                    borderBottom: '1px solid #555',
                    color: '#eee',
                    padding: '8px',
                    fontSize: '13px',
                    borderRadius: '8px 8px 0 0',
                    outline: 'none',
                }}
            />
            <div
                ref={listRef}
                style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    cursor: isMiddleDragging ? 'grabbing' : 'auto',
                }}
                onMouseDown={(e) => {
                    if (e.button !== 1 || !listRef.current) return;
                    e.preventDefault();
                    e.stopPropagation();
                    middleDragActiveRef.current = true;
                    setIsMiddleDragging(true);
                    middleDragStartYRef.current = e.clientY;
                    middleDragStartScrollRef.current = listRef.current.scrollTop;
                }}
            >
                {filteredNodes.map((node, index) => (
                    <div
                        key={node.type}
                        onClick={() => onSelect(node.type)}
                        style={{
                            padding: '6px 8px',
                            cursor: 'pointer',
                            background: index === selectedIndex ? '#3b82f6' : 'transparent',
                            color: index === selectedIndex ? '#fff' : '#ccc',
                            fontSize: '12px',
                        }}
                    >
                        {node.name}
                    </div>
                ))}
                {filteredNodes.length === 0 && (
                    <div style={{ padding: '10px 12px', color: '#888' }}>No results found</div>
                )}
            </div>
        </div>
    );
};
