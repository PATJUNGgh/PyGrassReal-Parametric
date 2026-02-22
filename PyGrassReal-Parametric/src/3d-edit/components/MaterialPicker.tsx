import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import './MaterialPicker.css';

// Type definitions
export type MaterialParams = {
    roughness: number;
    metalness: number;
    emissive: number;
    transparency: number;
};

// Helper functions
export const extractColorFromStyle = (style?: string): string => {
    if (!style) return '#9ca3af';
    const hexMatch = style.match(/#([0-9a-fA-F]{3,6})/);
    if (hexMatch) return hexMatch[0];
    const rgbMatch = style.match(/rgba?\(([^)]+)\)/);
    if (rgbMatch) {
        const parts = rgbMatch[1].split(',').map((part) => Number(part.trim())).filter((n) => Number.isFinite(n));
        if (parts.length >= 3) {
            const [r, g, b] = parts;
            return `rgb(${r}, ${g}, ${b})`;
        }
    }
    return '#9ca3af';
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const defaultMaterialParams: MaterialParams = { roughness: 0.35, metalness: 0.2, emissive: 0, transparency: 0 };

export const normalizeParams = (params?: Partial<MaterialParams>): MaterialParams => ({
    roughness: clamp01(params?.roughness ?? defaultMaterialParams.roughness),
    metalness: clamp01(params?.metalness ?? defaultMaterialParams.metalness),
    emissive: clamp01(params?.emissive ?? defaultMaterialParams.emissive),
    transparency: clamp01(params?.transparency ?? defaultMaterialParams.transparency),
});


// 3D Preview Components
const Sphere: React.FC<{ color: string; params: MaterialParams }> = ({ color, params }) => {
    return (
        <mesh rotation={[0.2, 0.4, 0]}>
            <sphereGeometry args={[0.75, 64, 64]} />
            <meshPhysicalMaterial
                color={color}
                roughness={params.roughness}
                metalness={params.metalness}
                transmission={params.transparency}
                thickness={1}
                ior={1.45}
                clearcoat={0.6}
                clearcoatRoughness={0.1}
                emissive={color}
                emissiveIntensity={params.emissive * 1.5}
                transparent={params.transparency > 0}
                opacity={1}
            />
        </mesh>
    );
};

export const MaterialPreviewSphere: React.FC<{ color: string; params: MaterialParams }> = ({ color, params }) => {
    return (
        <Canvas
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: true }}
            orthographic
            camera={{ position: [0, 0, 10], zoom: 62 }}
            style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
        >
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 5, 5]} intensity={1.2} />
            <directionalLight position={[-5, 5, -5]} intensity={0.6} />
            <Sphere color={color} params={params} />
        </Canvas>
    );
};

// Main Component
interface MaterialPickerProps {
    initialStyle?: string;
    initialUrl?: string;
    initialParams?: Partial<MaterialParams>;
    onClose: () => void;
    onApply: (data: { style: string; url: string; params: MaterialParams }) => void;
}

const materialPresets = [
    { id: 'mat-soft', label: 'Soft', style: 'linear-gradient(135deg, #8EC5FC 0%, #E0C3FC 100%)' },
    { id: 'mat-metal', label: 'Metal', style: 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)', params: { roughness: 0.2, metalness: 0.9, emissive: 0, transparency: 0 } },
    { id: 'mat-emerald', label: 'Emerald', style: 'linear-gradient(135deg, #34d399 0%, #059669 100%)' },
    { id: 'mat-sunset', label: 'Sunset', style: 'linear-gradient(135deg, #f97316 0%, #fde047 100%)', params: { roughness: 0.4, metalness: 0.1, emissive: 0.5, transparency: 0 } },
    { id: 'mat-void', label: 'Void', style: 'linear-gradient(135deg, #111827 0%, #374151 100%)' },
    { id: 'mat-ice', label: 'Ice', style: 'linear-gradient(135deg, #67e8f9 0%, #3b82f6 100%)', params: { roughness: 0.1, metalness: 0, emissive: 0, transparency: 0.3 } },
    { id: 'mat-glass', label: 'Glass', style: 'linear-gradient(135deg, rgba(200, 225, 255, 0.6) 0%, rgba(120, 180, 255, 0.25) 100%)', params: { roughness: 0.08, metalness: 0, emissive: 0, transparency: 0.8 } },
];

// Helper component for sliders
interface MaterialSliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
}

const MaterialSlider: React.FC<MaterialSliderProps> = ({ label, value, onChange }) => (
    <label className="material-picker-slider">
        <span className="material-picker-slider-label">{label}</span>
        <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={value}
            onChange={(e) => onChange(+e.target.value)}
        />
        <span className="material-picker-slider-value">{Math.round(value * 100)}</span>
    </label>
);

export const MaterialPicker: React.FC<MaterialPickerProps> = ({ initialStyle = '', initialUrl = '', initialParams = {}, onClose, onApply }) => {
    const [draftStyle, setDraftStyle] = useState(initialStyle);
    const [draftUrl, setDraftUrl] = useState(initialUrl);
    const [draftParams, setDraftParams] = useState(() => normalizeParams(initialParams));

    const previewColor = useMemo(() => extractColorFromStyle(draftStyle), [draftStyle]);

    const handleApply = (e: React.MouseEvent) => {
        e.stopPropagation();
        onApply({ style: draftStyle, url: draftUrl, params: draftParams });
    };

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose();
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose();
    };

    const stopPropagation = (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation();

    const handleParamChange = (param: keyof MaterialParams, value: number) => {
        setDraftParams(p => normalizeParams({ ...p, [param]: value }));
    };

    return (
        <div
            className="material-picker-overlay"
            onMouseDown={handleOverlayClick}
            onPointerDown={stopPropagation}
            onClick={stopPropagation}
        >
            <div
                className="material-picker-modal"
                onMouseDown={stopPropagation}
                onPointerDown={stopPropagation}
                onClick={stopPropagation}
            >
                <div className="material-picker-header">
                    <span>Material Editor</span>
                    <button className="material-picker-close" onClick={handleClose}>✕</button>
                </div>
                <div className="material-picker-content">
                    <div className="material-picker-left">
                        <div className="material-picker-grid">
                            {materialPresets.map((preset) => (
                                <button
                                    key={preset.id}
                                    className={`material-picker-swatch ${draftStyle === preset.style ? 'selected' : ''}`}
                                    style={{ background: preset.style }}
                                    title={preset.label}
                                    onClick={() => {
                                        setDraftStyle(preset.style);
                                        setDraftUrl('');
                                        setDraftParams(prev => normalizeParams({ ...prev, ...preset.params }));
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="material-picker-preview">
                        <div className="material-picker-sphere-3d" title="Preview">
                            <MaterialPreviewSphere color={previewColor} params={draftParams} />
                        </div>
                        <div className="material-picker-controls">
                            <MaterialSlider label="Roughness" value={draftParams.roughness} onChange={(v) => handleParamChange('roughness', v)} />
                            <MaterialSlider label="Transparency" value={draftParams.transparency} onChange={(v) => handleParamChange('transparency', v)} />
                            <MaterialSlider label="Metalness" value={draftParams.metalness} onChange={(v) => handleParamChange('metalness', v)} />
                            <MaterialSlider label="Emissive" value={draftParams.emissive} onChange={(v) => handleParamChange('emissive', v)} />
                        </div>
                    </div>
                </div>
                <div className="material-picker-actions">
                    <button className="material-picker-cancel" onClick={handleClose}>Cancel</button>
                    <button className="material-picker-apply" onClick={handleApply}>Apply</button>
                </div>
            </div>
        </div>
    );
};
