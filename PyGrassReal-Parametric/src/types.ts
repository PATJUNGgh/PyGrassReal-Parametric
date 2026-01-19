export type TransformMode = 'translate' | 'rotate' | 'scale';

export interface SceneObject {
  id: string;
  type: 'box' | 'sphere';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
}
