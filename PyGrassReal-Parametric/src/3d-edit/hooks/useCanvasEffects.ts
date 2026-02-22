import { useState } from 'react';

export interface MagicEffect {
    id: string;
    x: number;
    y: number;
    color: string;
}

export interface FireEffect {
    id: string;
    x: number;
    y: number;
}

export interface LightningEffect {
    id:string;
    source: { x: number; y: number };
    target: { x: number; y: number };
}

export function useCanvasEffects() {
    const [magicEffects, setMagicEffects] = useState<MagicEffect[]>([]);
    const [fireEffects, setFireEffects] = useState<FireEffect[]>([]);
    const [lightningEffects, setLightningEffects] = useState<LightningEffect[]>([]);

    return {
        magicEffects,
        fireEffects,
        lightningEffects,
        setMagicEffects,
        setFireEffects,
        setLightningEffects,
    };
}
