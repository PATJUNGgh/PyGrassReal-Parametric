// src/hooks/useTextureUploader.ts
import { useState, useRef, useCallback } from 'react';
import * as THREE from 'three';

const HANDLE_UPLOAD_ENDPOINT = 'http://localhost:5174/upload-handle';

export function useTextureUploader() {
  const [handleTextures, setHandleTextures] = useState<Partial<Record<'x' | 'y' | 'z', THREE.Texture>>>({});
  const [handleTextureTarget, setHandleTextureTarget] = useState<'x' | 'y' | 'z' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTextureFromUrl = useCallback((url: string, onLoad: (texture: THREE.Texture) => void) => {
    const loader = new THREE.TextureLoader();
    loader.load(url, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      onLoad(texture);
    });
  }, []);

  const handleImageButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = handleTextureTarget; // Use state from hook

    if (!file || !target) {
      if (e.target) e.target.value = '';
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('axis', target);
      const response = await fetch(HANDLE_UPLOAD_ENDPOINT, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const url = `${data.url}?t=${Date.now()}`;
      loadTextureFromUrl(url, (texture) => {
        setHandleTextures((prev) => {
          prev[target]?.dispose();
          return { ...prev, [target]: texture };
        });
      });
    } catch (error) {
      console.error('Failed to upload handle image', error);
    }

    if (e.target) e.target.value = '';
  }, [handleTextureTarget, loadTextureFromUrl]);

  return {
    handleTextures,
    setHandleTextureTarget,
    fileInputRef,
    handleImageButtonClick,
    handleImageChange,
  };
}
