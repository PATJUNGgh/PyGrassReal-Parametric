import { TransformControls } from '@react-three/drei';
import * as React from 'react';
import * as THREE from 'three';

declare module '@react-three/drei' {
  interface TransformControlsProps {
    onDraggingChanged?: (event: { value: boolean }) => void;
  }
}
