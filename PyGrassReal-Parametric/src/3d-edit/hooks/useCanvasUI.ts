import { useState, useCallback } from 'react';

export function useCanvasUI() {
    // State for NodeSearchBox
    const [searchBoxVisible, setSearchBoxVisible] = useState(false);
    const [searchBoxPos, setSearchBoxPos] = useState({ x: 0, y: 0 });
    const [searchBoxContext, setSearchBoxContext] = useState<{ sourceNodeId: string, sourcePortId: string } | null>(null);

    // State for MaterialPicker
    const [editingMaterialNodeId, setEditingMaterialNodeId] = useState<string | null>(null);

    const showSearchBox = useCallback((x: number, y: number, context?: { sourceNodeId: string, sourcePortId: string }) => {
        setSearchBoxPos({ x, y });
        setSearchBoxContext(context || null);
        setSearchBoxVisible(true);
    }, []);

    const hideSearchBox = useCallback(() => {
        setSearchBoxVisible(false);
        setSearchBoxContext(null);
    }, []);

    const openMaterialEditor = useCallback((nodeId: string) => {
        setEditingMaterialNodeId(nodeId);
    }, []);

    const closeMaterialEditor = useCallback(() => {
        setEditingMaterialNodeId(null);
    }, []);

    return {
        searchBoxVisible,
        searchBoxPos,
        searchBoxContext,
        editingMaterialNodeId,
        showSearchBox,
        hideSearchBox,
        openMaterialEditor,
        closeMaterialEditor,
    };
}
