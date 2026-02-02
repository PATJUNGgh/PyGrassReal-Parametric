import * as THREE from 'three';

export const ROTATION_SNAP_DEG = 30;

export const AXIS_HANDLE_COLORS = {
  x: '#ff3333',
  y: '#33ff33',
  z: '#3388ff',
} as const;

// 8 corner positions for rotation handles (outer)
export const corners = [
  [-0.525, -0.525, -0.525],
  [0.525, -0.525, -0.525],
  [-0.525, 0.525, -0.525],
  [0.525, 0.525, -0.525],
  [-0.525, -0.525, 0.525],
  [0.525, -0.525, 0.525],
  [-0.525, 0.525, 0.525],
  [0.525, 0.525, 0.525],
];

// Face centers for scaling handles
export const faceHandles = [
  { pos: [0.525, 0, 0], axis: 'x' }, // Right (+X)
  { pos: [-0.525, 0, 0], axis: 'x' }, // Left (-X)
  { pos: [0, 0.525, 0], axis: 'y' }, // Top (+Y)
  { pos: [0, -0.525, 0], axis: 'y' }, // Bottom (-Y)
  { pos: [0, 0, 0.525], axis: 'z' }, // Front (+Z)
  { pos: [0, 0, -0.525], axis: 'z' }, // Back (-Z)
];

const axisHandleTextureCache: Partial<Record<'x' | 'y' | 'z', THREE.Texture>> = {};

export const getAxisHandleTexture = (axis: 'x' | 'y' | 'z') => {
  if (axisHandleTextureCache[axis]) {
    return axisHandleTextureCache[axis] as THREE.Texture;
  }

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = AXIS_HANDLE_COLORS[axis];
    ctx.fillRect(4, 4, size - 8, size - 8);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, size - 8, size - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(8, 8, size - 16, (size - 16) * 0.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  axisHandleTextureCache[axis] = texture;
  return texture;
};
