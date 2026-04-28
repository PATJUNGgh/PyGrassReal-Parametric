import React, { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Plus, X, ChevronDown, MessageSquare } from 'lucide-react';
import { useAutoResizeTextarea } from '../../../dashboard/hooks/useAutoResizeTextarea';
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
    const [isCollapsed, setIsCollapsed] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const textareaRef = useAutoResizeTextarea(draft, 200);

    // Reset collapse state when overlay gets enabled/disabled
    useEffect(() => {
        if (!enabled) {
            setIsCollapsed(false);
        }
    }, [enabled]);

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

    const handleAttachClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleSend = useCallback(() => {
        onSubmit();
    }, [onSubmit]);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onSubmit();
            }
        },
        [onSubmit],
    );

    if (!enabled || typeof document === 'undefined') {
        return null;
    }

    const hasText = draft.trim().length > 0;
    const imageCountLabel = isReadingImage
        ? 'Reading image...'
        : pendingImages.length > 0
            ? `${pendingImages.length} image(s)`
            : null;

    if (isCollapsed) {
        return createPortal(
            <div className={styles.overlay} data-no-selection="true" onPointerDown={(event) => event.stopPropagation()}>
                <button
                    type="button"
                    className={styles.expandBtn}
                    onClick={() => setIsCollapsed(false)}
                    title="Open Prompt"
                    aria-label="Open Prompt"
                >
                    <MessageSquare size={24} strokeWidth={2.2} />
                </button>
            </div>,
            document.body
        );
    }

    return createPortal(
        <div className={styles.overlay} data-no-selection="true" onPointerDown={(event) => event.stopPropagation()}>
            <div className={styles.pillWrapper} onPointerDown={(event) => event.stopPropagation()}>
                <div className={styles.pillContainer}>
                    {/* Image previews row (above textarea if any) */}
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

                    {/* Textarea */}
                    <textarea
                        ref={textareaRef}
                        value={draft}
                        className={styles.composerTextarea}
                        placeholder="Type prompt..."
                        onChange={(event) => onDraftChange(event.target.value)}
                        onKeyDown={handleKeyDown}
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
                            const imageFiles = Array.from(event.clipboardData.files).filter((file) =>
                                file.type.startsWith('image/'),
                            );
                            if (imageFiles.length === 0) return;
                            event.preventDefault();
                            event.stopPropagation();
                            void appendFiles(imageFiles);
                        }}
                    />

                    {/* Bottom Toolbar */}
                    <div className={styles.composerToolbar}>
                        <div className={styles.toolbarLeft}>
                            {/* Attach / Add image button */}
                            <button
                                type="button"
                                className={styles.attachBtn}
                                onClick={handleAttachClick}
                                title="Attach image"
                                aria-label="Attach image"
                            >
                                <Plus size={20} strokeWidth={2} />
                            </button>

                            {/* Image count badge */}
                            {imageCountLabel && (
                                <span className={styles.imageCountBadge}>{imageCountLabel}</span>
                            )}
                        </div>

                        <div className={styles.toolbarRight}>
                            {/* Collapse button */}
                            <button
                                type="button"
                                className={styles.collapseBtn}
                                onClick={() => setIsCollapsed(true)}
                                title="Hide Prompt"
                                aria-label="Hide Prompt"
                            >
                                <ChevronDown size={20} strokeWidth={2.5} />
                            </button>

                            {/* Send button */}
                            <button
                                type="button"
                                className={`${styles.sendBtn} ${hasText ? styles.active : ''}`}
                                onClick={handleSend}
                                disabled={!hasText}
                                title="Send prompt"
                                aria-label="Send prompt"
                            >
                                <span className={styles.iconSpan}>
                                    <ArrowUp size={20} strokeWidth={2.5} />
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Disclaimer text outside the pill */}
                <p className={styles.disclaimer}>
                    AI may produce inaccurate information. Please verify important data.
                </p>
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className={styles.hiddenInput}
                onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    void appendFiles(files);
                    event.target.value = '';
                }}
            />
        </div>,
        document.body,
    );
};
