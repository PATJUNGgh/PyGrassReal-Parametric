import { create } from 'zustand';

export interface Layer {
    id: string;
    label: string;
    nodeId: string; // The ID of the LayerWidgetNode it belongs to
    depth: number; // Indentation level for tree view
}

interface LayerStoreState {
    layers: Layer[];
    setLayers: (layers: Layer[]) => void;
    addLayer: (nodeId: string, label?: string, depth?: number) => void;
    removeLayer: (layerId: string | string[]) => void;
    updateLayer: (layerId: string, updates: Partial<{ label: string; depth: number }>) => void;
    moveLayer: (nodeId: string, dragIndex: number, dropIndex: number) => void;
    getLayersByNodeId: (nodeId: string) => Layer[];
}

export const useLayerStore = create<LayerStoreState>((set, get) => ({
    layers: [],

    setLayers: (layers) => set({ layers }),

    addLayer: (nodeId, label, depth = 0) => {
        const newLayer: Layer = {
            id: `layer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            label: label || `Layer ${get().layers.filter(l => l.nodeId === nodeId).length + 1}`,
            nodeId: nodeId,
            depth: depth,
        };
        set((state) => ({ layers: [...state.layers, newLayer] }));
    },

    removeLayer: (layerId) => {
        const idsToRemove = new Set(Array.isArray(layerId) ? layerId : [layerId]);
        set((state) => ({
            layers: state.layers.filter((layer) => !idsToRemove.has(layer.id)),
        }));
    },

    updateLayer: (layerId, updates) => {
        set((state) => ({
            layers: state.layers.map((layer) =>
                layer.id === layerId ? { ...layer, ...updates } : layer
            ),
        }));
    },

    moveLayer: (nodeId, dragIndex, dropIndex) => {
        set((state) => {
            const allLayers = state.layers;
            const layersForNode = allLayers.filter(l => l.nodeId === nodeId);
            const otherLayers = allLayers.filter(l => l.nodeId !== nodeId);

            const [movedItem] = layersForNode.splice(dragIndex, 1);
            if (!movedItem) return state;

            layersForNode.splice(dropIndex, 0, movedItem);

            return { layers: [...otherLayers, ...layersForNode] };
        });
    },

    getLayersByNodeId: (nodeId: string) => {
        return get().layers.filter(l => l.nodeId === nodeId);
    }
}));
