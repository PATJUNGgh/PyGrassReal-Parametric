export interface Port {
    id: string;
    label: string;
    type?: string;
    structure?: 'item' | 'list' | 'tree';
}

export interface NumberSliderItem {
    id: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
}

export interface ChatHistoryMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    contentType?: 'text' | 'image';
    imageDataUrl?: string;
    imageDataUrls?: string[];
}

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatHistoryMessage[];
    timestamp: number;
}

export interface PendingImageItem {
    id: string;
    name: string;
    dataUrl: string;
}

export type SculptBrushType = 'carve' | 'inflate' | 'smooth' | 'flatten' | 'crease' | 'stamp' | 'cut';
export type SculptTargetType = 'point' | 'stroke' | 'area';
export type SculptEngine = 'displacement' | 'boolean';
export type SculptEdgeFalloff = 'soft' | 'sharp';

export interface SculptVector3 {
    x: number;
    y: number;
    z: number;
}

export interface SculptTarget {
    type: SculptTargetType;
    positions: SculptVector3[];
}

export interface SculptOp {
    brushType: SculptBrushType;
    target: SculptTarget;
    radius: number;
    strength: number;
    edgeFalloff: SculptEdgeFalloff;
    engineHint?: SculptEngine;
}

export interface SculptPlan {
    ops: SculptOp[];
}

export type PaintType = 'fill' | 'stroke' | 'gradient' | 'smooth' | 'erase';
export type PaintTargetType = 'point' | 'stroke' | 'area';
export type PaintEdgeFalloff = 'soft' | 'sharp';

export interface PaintVector3 {
    x: number;
    y: number;
    z: number;
}

export interface PaintTarget {
    type: PaintTargetType;
    positions: PaintVector3[];
}

export interface PaintColor {
    r: number;
    g: number;
    b: number;
}

export interface PaintOp {
    paintType: PaintType;
    target: PaintTarget;
    color: PaintColor;
    opacity: number;
    radius: number;
    edgeFalloff: PaintEdgeFalloff;
    colorEnd?: PaintColor;
    gradientAxis?: PaintVector3;
}

export interface PaintPlan {
    ops: PaintOp[];
}

export interface PicturePlacement {
    uv?: { u: number; v: number };
    worldPos?: { x: number; y: number; z: number };
    scale?: number;
    rotation?: number;
}

export interface PictureLayer {
    id: string;
    image: string | null;
    placements: PicturePlacement[];
    smooth?: boolean;
    visible?: boolean;
}

export interface PictureData {
    layers: PictureLayer[];
    activeLayerId?: string | null;
}

export interface NodeData {
    id: string;
    type: 'box' | 'sphere' | 'cone' | 'cylinder' | 'unit-x' | 'unit-y' | 'unit-z' | 'vector-xyz' | 'transform' | 'build-3d-ai' | 'ai-agent' | 'vertex-mask' | 'mesh-union' | 'mesh-difference' | 'mesh-intersection' | 'model-material' | 'text-on-mesh' | 'mesh-array' | 'mesh-eval' | 'face-normals' | 'custom' | 'antivirus' | 'input' | 'output' | 'number-slider' | 'boolean-toggle' | 'series' | 'group' | 'component' | 'panel' | 'widget-window' | 'ai-assistant' | 'prompt' | 'layer-source' | 'layer-view' | 'layer-bridge' | 'node-prompt' | 'background-color' | 'viewport' | 'ai-sculpt' | 'ai-paint' | 'picture-on-mesh';
    position: { x: number; y: number };
    data: {
        version?: number;
        width?: number;
        height?: number;
        depth?: number;
        length?: number;
        radius?: number;
        corner?: number;
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
        value?: number | boolean | number[];
        sliders?: NumberSliderItem[];
        useGlobalConfig?: boolean;
        globalMin?: number;
        globalMax?: number;
        globalStep?: number;
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
        hideHeader?: boolean;
        isNameEditable?: boolean;
        hideTitleLabel?: boolean;
        hidePortControls?: boolean;
        hidePortLabels?: boolean;
        hideModifierMenu?: boolean;
        showInputsWithChildren?: boolean;
        showLayerPanel?: boolean;
        hideLayerPanelToolbar?: boolean;
        hideLayerPanelCheckboxes?: boolean;
        hideLayerPanelIcons?: boolean;
        centerOutput?: boolean;
        inputsAreaWidth?: number;
        inputPortOffsetLeft?: number;
        outputsAreaWidth?: number;
        inputListTopPadding?: number;
        outputListTopPadding?: number;
        inputRowMinHeight?: number;
        outputRowMinHeight?: number;
        inputRowGap?: number;
        outputRowGap?: number;
        inputRowPaddingY?: number;
        outputRowPaddingY?: number;
        outputLabelMarginRight?: number;
        outputEditMarginRight?: number;
        outputPortOffsetRight?: number;
        outputPortOffsetLeft?: number;
        outputPortAbsoluteCentered?: boolean;
        outputPortSide?: 'left' | 'right';
        bodyPadding?: string;
        bodyMinHeight?: number;
        freeResizable?: boolean;
        showMaterialPreview?: boolean;
        style?: any;
        materialStyle?: any;
        materialParams?: any;
        materialPreviewUrl?: string;
        materialPreviewStyle?: string;
        resizable?: boolean;
        isPaused?: boolean;
        theme?: 'default' | 'antivirus' | 'layer-source';
        promptText?: string;
        promptSubmittedText?: string;
        promptSubmittedAt?: number;
        isGenerating?: boolean;
        promptStatus?: 'idle' | 'generating' | 'success' | 'error' | 'cancelled';
        promptError?: string;
        stopGenerationToken?: number;
        chatHistory?: ChatHistoryMessage[];
        chatSessions?: ChatSession[];
        activeSessionId?: string;
        pendingImages?: PendingImageItem[];
        chatModel?: 'model-a' | 'model-b';
        chatActionMode?: 'plan' | 'act';
        planContent?: string;
        planMarkdown?: string;
        planUpdatedAt?: number;
        planSource?: 'ai' | 'user';
        planPanelVisible?: boolean;
        planPanelWidth?: number;
        aiAssistantDraft?: string;
        aiAssistantResponse?: string;
        promptDraft?: string;
        promptPendingImages?: PendingImageItem[];
        promptOutput?: string;
        panelVisible?: boolean;
        panelPosition?: { x: number; y: number };
        panelSize?: { width: number; height: number };
        backgroundColor?: string;
        backgroundMode?: 'solid' | 'gradient';
        backgroundGradientStart?: string;
        backgroundGradientEnd?: string;
        backgroundGradientAngle?: number;
        backgroundUpdatedAt?: number;
        editorOrigin?: 'nodes' | 'widget';
        autoCreateSource?: {
            nodeId: string;
            portId: string;
            ruleId: string;
        };
        viewportMode?: 'wireframe' | 'depth' | 'monochrome' | 'rendered';
        viewportUpdatedAt?: number;
        sceneObjectId?: string;
        // AI Sculpt specific
        sculptPlan?: SculptPlan;
        sculptOps?: SculptOp[];
        sculptResult?: unknown;
        // AI Paint specific
        paintPlan?: PaintPlan;
        paintOps?: PaintOp[];
        paintResult?: unknown;
        // Picture on Mesh specific
        pictureImage?: string | null;
        pictureHit?: boolean;
        pictureErase?: boolean;
        pictureSmooth?: boolean;
        pictureLayerId?: string;
        pictureData?: PictureData;
        pictureResult?: unknown;
        pictureTransformPatch?: Partial<PicturePlacement>;
        pictureTransformToken?: number;
        // AI Agent specific
        agentType?: 'phraram' | 'hanuman' | 'phralak' | 'phipek';
        portMode?: 'input' | 'output';
        isNewAiAgent?: boolean;
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
        // Boolean Toggle specific (multi-toggle)
        toggles?: Array<{ id: string; value: boolean }>;
        toggleNextId?: number;
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
    showSearchBox: (x: number, y: number) => void;
    hideSearchBox: () => void;
    startAction: () => void;
    endAction: () => void;
    endActionAfterNextChange: () => void;
    clearSelection: () => void;
}
