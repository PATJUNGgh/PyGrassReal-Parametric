import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, X } from 'lucide-react';
import type { PendingImageItem } from '../../types/NodeTypes';
import styles from './PromptOverlay.module.css';

interface PromptOverlayProps {
    enabled: boolean;
    draft: string;
    pendingImages: PendingImageItem[];
    onDraftChange: (value: string) => void;
    onAddPendingImage: (item: PendingImageItem) => void;
    onRemovePendingImage: (imageId: string) => void;
    onSubmit: () => void;
    interactionMode?: 'node' | '3d' | 'wire';
}

const createImageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const PromptOverlay: React.FC<PromptOverlayProps> = ({
    enabled,
    draft,
    pendingImages,
    onDraftChange,
    onAddPendingImage,
    onRemovePendingImage,
    onSubmit,
    interactionMode,
}) => {
    const [isReadingImage, setIsReadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const readFileAsDataUrl = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    };

    const appendFiles = async (files: File[]) => {
        const imageFiles = files.filter((file) => file.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        setIsReadingImage(true);

        try {
            for (const file of imageFiles) {
                try {
                    const dataUrl = await readFileAsDataUrl(file);
                    if (!dataUrl) continue;
                    onAddPendingImage({
                        id: createImageId(),
                        name: file.name || 'Image',
                        dataUrl,
                    });
                } catch {
                    // Ignore invalid image read errors.
                }
            }
        } finally {
            setIsReadingImage(false);
        }
    };

    if (!enabled || typeof document === 'undefined' || interactionMode !== '3d') {
        return null;
    }

    return createPortal(
        <div className={styles.overlay} data-no-selection="true" onPointerDown={(event) => event.stopPropagation()}>
            <div className={styles.shell} onPointerDown={(event) => event.stopPropagation()}>
                <div className={styles.composer}>
                    <div className={styles.inputWrap}>
                        <textarea
                            value={draft}
                            className={styles.input}
                            placeholder="Type prompt..."
                            onChange={(event) => onDraftChange(event.target.value)}
                            onDragOver={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                void appendFiles(Array.from(event.dataTransfer.files));
                            }}
                            onPaste={(event) => {
                                const imageFiles = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'));
                                if (imageFiles.length === 0) return;
                                event.preventDefault();
                                event.stopPropagation();
                                void appendFiles(imageFiles);
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    onSubmit();
                                }
                            }}
                        />
                        <button
                            type="button"
                            className={styles.sendButton}
                            onClick={onSubmit}
                            title="Send prompt"
                            aria-label="Send prompt"
                        >
                            <ArrowUp size={18} />
                        </button>
                    </div>
                </div>

                <div className={styles.metaRow}>
                    <span>{isReadingImage ? 'Reading image...' : `${pendingImages.length} image(s) attached`}</span>
                </div>

                {pendingImages.length > 0 && (
                    <div className={styles.imageList}>
                        {pendingImages.map((item) => (
                            <div key={item.id} className={styles.imageItem}>
                                <img src={item.dataUrl} alt={item.name} className={styles.imageThumb} />
                                <button
                                    type="button"
                                    className={styles.removeImageButton}
                                    onClick={() => onRemovePendingImage(item.id)}
                                    title="Remove image"
                                    aria-label="Remove image"
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                        const files = Array.from(event.target.files || []);
                        void appendFiles(files);
                        event.target.value = '';
                    }}
                    style={{ display: 'none' }}
                />
            </div>
        </div>,
        document.body
    );
};
