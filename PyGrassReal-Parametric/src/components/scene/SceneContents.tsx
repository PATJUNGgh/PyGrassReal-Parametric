import React from 'react';
import { TransformControls } from '@react-three/drei';
import type { SceneObject, TransformMode } from '../../types/scene';
import { Model } from './Model';
import * as THREE from 'three';

interface SceneContentsProps {
    objects: SceneObject[];
    selectedId: string | null;
    mode: TransformMode | null;
    onSelect: (id: string | null) => void;
    onTransformEnd: (id: string, newTransform: Partial<SceneObject>) => void;
}

export const SceneContents: React.FC<SceneContentsProps> = ({
    objects,
    selectedId,
    mode,
    onSelect,
    onTransformEnd
}) => {
    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
            <gridHelper args={[20, 20]} />

            {objects.map((obj) => (
                <ObjectWrapper
                    key={obj.id}
                    obj={obj}
                    isSelected={obj.id === selectedId}
                    mode={mode}
                    onSelect={onSelect}
                    onTransformEnd={onTransformEnd}
                />
            ))}
        </>
    );
};

interface ObjectWrapperProps {
    obj: SceneObject;
    isSelected: boolean;
    mode: TransformMode | null;
    onSelect: (id: string | null) => void;
    onTransformEnd: (id: string, newTransform: Partial<SceneObject>) => void;
}

const ObjectWrapper: React.FC<ObjectWrapperProps> = ({
    obj,
    isSelected,
    mode,
    onSelect,
    onTransformEnd
}) => {
    const meshRef = React.useRef<THREE.Mesh>(null);

    const handleTransformEnd = () => {
        if (meshRef.current) {
            onTransformEnd(obj.id, {
                position: [meshRef.current.position.x, meshRef.current.position.y, meshRef.current.position.z],
                rotation: [meshRef.current.rotation.x, meshRef.current.rotation.y, meshRef.current.rotation.z],
                scale: [meshRef.current.scale.x, meshRef.current.scale.y, meshRef.current.scale.z],
            });
        }
    };

    return (
        /* If selected and mode is active, wrap in TransformControls */
        isSelected && mode ? (
            <TransformControls
                mode={mode}
                onMouseUp={handleTransformEnd}
            >
                <Model
                    ref={meshRef}
                    data={obj}
                    isSelected={isSelected}
                    onClick={(_e) => onSelect(obj.id)}
                />
            </TransformControls>
        ) : (
            <Model
                ref={meshRef}
                data={obj}
                isSelected={isSelected}
                onClick={(_e) => onSelect(obj.id)}
            />
        )
    );
};
