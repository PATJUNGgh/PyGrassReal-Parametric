export interface Port {
    id: string;
    label: string;
    type?: string;
    structure?: 'item' | 'list' | 'tree';
}

export interface NodeData {
    id: string;
    type: 'box' | 'sphere' | 'vector-xyz' | 'mesh-union' | 'mesh-difference' | 'mesh-intersection' | 'model-material' | 'text-on-mesh' | 'mesh-array' | 'mesh-eval' | 'face-normals' | 'custom' | 'antivirus' | 'input' | 'output' | 'number-slider' | 'series' | 'group' | 'component' | 'panel' | 'widget-window' | 'layer-source' | 'layer-view' | 'layer-bridge' | 'node-prompt' | 'background-color' | 'viewport';
    position: { x: number; y: number };
    data: {
        width?: number;
        height?: number;
        depth?: number;
        radius?: number;
        scale?: { x: number; y: number; z: number };
        rotation?: { x: number; y: number; z: number };
        location?: { x: number; y: number; z: number };
        customName?: string;
        icon?: string;
        inputs?: Port[];
        outputs?: Port[];
        min?: number;
        max?: number;
        step?: number;
        value?: number;
        start?: number;
        count?: number;
        series?: number[];
        childNodeIds?: string[];
        componentId?: string;
        minWidth?: number;
        hideOutputsAdd?: boolean;
        hideInputsAdd?: boolean;
        hideInputs?: boolean;
        hideInputsHeader?: boolean;
        hideOutputs?: boolean;
        hideOutputsHeader?: boolean;
        hidePortControls?: boolean;
        hidePortLabels?: boolean;
        hideModifierMenu?: boolean;
        showInputsWithChildren?: boolean;
        showLayerPanel?: boolean;
        hideLayerPanelToolbar?: boolean;
        hideLayerPanelCheckboxes?: boolean;
        hideLayerPanelIcons?: boolean;
        centerOutput?: boolean;
        showMaterialPreview?: boolean;
        materialPreviewUrl?: string;
        materialPreviewStyle?: string;
        resizable?: boolean;
        isPaused?: boolean;
        theme?: 'default' | 'antivirus' | 'layer-source';
        promptText?: string;
        promptSubmittedText?: string;
        promptSubmittedAt?: number;
        backgroundColor?: string;
        backgroundMode?: 'solid' | 'gradient';
        backgroundGradientStart?: string;
        backgroundGradientEnd?: string;
        backgroundGradientAngle?: number;
        backgroundUpdatedAt?: number;
        editorOrigin?: 'nodes' | 'widget';
        viewportMode?: 'wireframe' | 'depth' | 'monochrome' | 'rendered';
        viewportUpdatedAt?: number;
        sceneObjectId?: string;
        // Text On Mesh specific
        text?: string;
        font?: string;
        textHeight?: number;
        textDepth?: number;
        baseMesh?: unknown;
        // Mesh Array specific
        meshArrayMode?: 'linear' | 'box' | 'polar' | 'rectangular';
        // Mesh Union specific
        smoothness?: number;
        // Mesh Intersection specific
        meshIntersectionMode?: 'intersect' | 'subtract';
        // Mesh Difference specific
        showMeshesB?: boolean;
        // Panel Node specific
        isGroup?: boolean;
    };
}

export interface Connection {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourcePort: string;
    targetPort: string;
    isDashed?: boolean;
    isGhost?: boolean;
}

export interface NodeCanvasHandle {
    zoomToFit: () => void;
    undo: () => void;
    redo: () => void;
    updateNodeData: (id: string, updates: Partial<NodeData['data']>) => void;
    startAction: () => void;
    endAction: () => void;
    endActionAfterNextChange: () => void;
}
