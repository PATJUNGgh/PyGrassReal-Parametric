import { useState, useCallback } from 'react';

export function useCanvasUI() {
    // State for NodeSearchBox
    const [searchBoxVisible, setSearchBoxVisible] = useState(false);
    const [searchBoxPos, setSearchBoxPos] = useState({ x: 0, y: 0 });

    // State for MaterialPicker
    const [editingMaterialNodeId, setEditingMaterialNodeId] = useState<string | null>(null);

    const showSearchBox = useCallback((x: number, y: number) => {
        setSearchBoxPos({ x, y });
        setSearchBoxVisible(true);
    }, []);

    const hideSearchBox = useCallback(() => {
        setSearchBoxVisible(false);
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
        editingMaterialNodeId,
        showSearchBox,
        hideSearchBox,
        openMaterialEditor,
        closeMaterialEditor,
    };
}
