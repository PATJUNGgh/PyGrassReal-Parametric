
export type ViewportType = 'Top' | 'Bottom' | 'Front' | 'Back' | 'Right' | 'Left' | 'Perspective';

export type ToolType = 'select' | 'box' | 'sphere' | 'cylinder' | 'point' | 'polyline' | 'curve';

export type TransformMode = 'translate' | 'rotate' | 'scale';

export type DisplayMode = 'Wireframe' | 'Shaded' | 'Rendered' | 'Ghosted' | 'X-Ray';

export type UnitType = 'mm' | 'cm' | 'm' | 'in' | 'ft';

export interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  isCurrent: boolean;
}

export interface IObject3D {
  id: string;
  type: 'box' | 'sphere' | 'cylinder' | 'point' | 'polyline' | 'curve';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  // points is used for polyline and curve control points
  points?: [number, number, number][];
  color: string;
  selected: boolean;
  layerId: string;
}

export interface ViewportConfig {
  id: ViewportType;
  cameraPosition: [number, number, number];
  isOrthographic: boolean;
  zoom?: number;
}

export interface AppState {
  objects: IObject3D[];
  layers: Layer[];
  selectedTool: ToolType;
  commandHistory: string[];
  activeViewport: ViewportType | null;
  gridVisible: boolean;
  snapEnabled: boolean;
}