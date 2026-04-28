import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Globe, Image as ImageIcon, Video, FileText } from 'lucide-react';
import { type PresetItem, CHAT_COMPOSER_UI } from '../../data/chatData';
import { localizeText, useLanguage } from '../../../i18n/language';
import { useChatPresets } from '../../hooks/useChatPresets';
import { useAutoResizeTextarea } from '../../hooks/useAutoResizeTextarea';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import type { ChatAttachment } from '../../types/chat.types';
import { QuickPresetsMenu } from './QuickPresetsMenu';
import { PresetsModal } from './PresetsModal';
import { AttachmentMenu } from './AttachmentMenu';
import { ComposerActions } from './ComposerActions';
import './ChatComposer.css';

interface ChatComposerProps {
  onSend: (text: string, searchMode: 'auto' | 'off') => void;
  onFilesSelected?: (files: File[]) => void;
  pendingAttachmentCount?: number;
  pendingAttachments?: Pick<ChatAttachment, 'id' | 'name' | 'kind' | 'previewUrl' | 'size'>[];
  onRemovePendingAttachment?: (id: string) => void;
  onStop?: () => void;
  isGenerating?: boolean;
  position?: 'centered' | 'bottom';
  pushToast?: (message: string, tone?: 'success' | 'error') => void;
  getErrorMessage?: (error: unknown) => string;
  openPresetsOnMount?: boolean;
  forceInternetOff?: boolean;
}

const ChatComposer = React.memo(({
  onSend,
  onFilesSelected,
  pendingAttachmentCount = 0,
  pendingAttachments = [],
  onRemovePendingAttachment,
  onStop,
  isGenerating,
  position = 'bottom',
  pushToast,
  getErrorMessage,
  openPresetsOnMount = false,
  forceInternetOff = false,
}: ChatComposerProps) => {
  const { language } = useLanguage();
  const [input, setInput] = useState('');
  const [activeMenu, setActiveMenu] = useState<'none' | 'attachment' | 'quickPresets'>('none');
  const [isWebSearchHovered, setIsWebSearchHovered] = useState(false);
  const [webSearchMode, setWebSearchMode] = useState<'auto' | 'off'>(() => (forceInternetOff ? 'off' : 'auto'));
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [presetModalView, setPresetModalView] = useState<'list' | 'new'>('list');
  const previousForceInternetOffRef = useRef(forceInternetOff);

  const {
    filteredPresets,
    presetSearchText,
    setPresetSearchText,
    editingPresetId,
    pendingDeletePresetId,
    newPromptContent,
    setNewPromptContent,
    newPromptTriggerWord,
    setNewPromptTriggerWord,
    handleRandomPrompt,
    handleCreatePrompt,
    handleDeletePreset,
    presetItems,
    startEditing,
    resetForm
  } = useChatPresets(language, { pushToast, getErrorMessage });

  const textareaRef = useAutoResizeTextarea(input, 200);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const effectivePendingCount =
    pendingAttachments.length > 0 ? pendingAttachments.length : pendingAttachmentCount;
  const hasPendingAttachments = effectivePendingCount > 0;
  const canSend = (input || '').trim().length > 0 || hasPendingAttachments;
  const [isFileDragOver, setIsFileDragOver] = useState(false);

  const menuRef = useClickOutside<HTMLDivElement>(() => {
    setActiveMenu('none');
    setIsWebSearchHovered(false);
  });

  useBodyScrollLock(isPresetsModalOpen);

  useEffect(() => {
    if (!openPresetsOnMount) {
      return;
    }
    setPresetModalView('list');
    setIsPresetsModalOpen(true);
    setActiveMenu('none');
    setIsWebSearchHovered(false);
  }, [openPresetsOnMount]);

  useEffect(() => {
    if (forceInternetOff) {
      setWebSearchMode('off');
      previousForceInternetOffRef.current = true;
      return;
    }

    if (previousForceInternetOffRef.current) {
      // After upgrading from Free to Starter+, return to the default online mode.
      setWebSearchMode('auto');
    }

    previousForceInternetOffRef.current = false;
  }, [forceInternetOff]);

  useEffect(() => {
    if (!isPresetsModalOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPresetsModalOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isPresetsModalOpen]);

  useEffect(() => {
    const preventFileNavigation = (event: DragEvent) => {
      const hasFiles = Array.from(event.dataTransfer?.types ?? []).includes('Files');
      if (!hasFiles) return;
      event.preventDefault();
    };

    window.addEventListener('dragover', preventFileNavigation);
    window.addEventListener('drop', preventFileNavigation);
    return () => {
      window.removeEventListener('dragover', preventFileNavigation);
      window.removeEventListener('drop', preventFileNavigation);
    };
  }, []);

  // --- Core Handlers ---

  const collectValidFiles = useCallback((incomingFiles: File[]) => {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const validFiles: File[] = [];

    for (const file of incomingFiles) {
      if (file.size > MAX_SIZE) {
        pushToast?.(`File "${file.name}" is too large (max 10MB)`, 'error');
        continue;
      }
      validFiles.push(file);
    }

    return validFiles;
  }, [pushToast]);

  const handleSend = useCallback(() => {
    const trimmedInput = input.trim();
    if (!canSend || isGenerating) return;
    if (!isGenerating) {
      onSend(trimmedInput, webSearchMode);
      setInput('');
    }
  }, [input, canSend, isGenerating, onSend, webSearchMode]);

  const handleSetWebSearchMode = useCallback((mode: 'auto' | 'off') => {
    if (forceInternetOff) {
      setWebSearchMode('off');
      setActiveMenu('none');
      return;
    }

    setWebSearchMode(mode);
    setActiveMenu('none');
  }, [forceInternetOff]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // --- UI Actions ---

  const toggleMenu = useCallback((menu: 'attachment' | 'quickPresets') => {
    setActiveMenu(prev => prev === menu ? 'none' : menu);
    if (menu !== 'attachment') setIsWebSearchHovered(false);
  }, []);

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
    setActiveMenu('none');
  }, []);

  /**
   * Applies a preset content to the composer input and restores focus.
   * Uses requestAnimationFrame to ensure the DOM update is finished before focusing.
   */
  const handleApplyQuickPreset = useCallback((preset: PresetItem) => {
    setInput(localizeText(language, preset.content));
    setActiveMenu('none');

    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [language, textareaRef]);

  const handleOpenPresetsModal = useCallback(() => {
    setActiveMenu('none');
    setIsWebSearchHovered(false);
    setPresetModalView('list');
    setIsPresetsModalOpen(true);
  }, []);

  const handleClosePresetsModal = useCallback(() => {
    setIsPresetsModalOpen(false);
    resetForm();
  }, [resetForm]);

  const handleEditPresetAction = useCallback((preset: PresetItem) => {
    startEditing(preset);
    setPresetModalView('new');
  }, [startEditing]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const validFiles = collectValidFiles(Array.from(files));

    if (validFiles.length > 0) {
      onFilesSelected?.(validFiles);
    }

    e.target.value = '';
  }, [collectValidFiles, onFilesSelected]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardFiles = Array.from(e.clipboardData.files ?? []);
    if (clipboardFiles.length === 0) return;

    const validFiles = collectValidFiles(clipboardFiles);
    if (validFiles.length === 0) return;

    e.preventDefault();
    onFilesSelected?.(validFiles);
    pushToast?.(
      language === 'th'
        ? `แนบไฟล์จากคลิปบอร์ด ${validFiles.length} ไฟล์แล้ว`
        : `Attached ${validFiles.length} file(s) from clipboard.`,
      'success',
    );
  }, [collectValidFiles, language, onFilesSelected, pushToast]);

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    const hasFiles = Array.from(event.dataTransfer.types || []).includes('Files');
    if (!hasFiles) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsFileDragOver(true);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    const hasFiles = Array.from(event.dataTransfer.types || []).includes('Files');
    if (!hasFiles) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    const hasFiles = Array.from(event.dataTransfer.types || []).includes('Files');
    if (!hasFiles) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsFileDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    const droppedFiles = Array.from(event.dataTransfer.files || []);
    if (droppedFiles.length === 0) return;

    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsFileDragOver(false);

    const validFiles = collectValidFiles(droppedFiles);
    if (validFiles.length === 0) return;

    onFilesSelected?.(validFiles);
    pushToast?.(
      language === 'th'
        ? `แนบไฟล์แล้ว ${validFiles.length} ไฟล์`
        : `Attached ${validFiles.length} file(s).`,
      'success',
    );
  }, [collectValidFiles, language, onFilesSelected, pushToast]);

  return (
    <div className="chat-composer-pill-wrapper">
      <div
        className={`chat-composer-pill-container ${isFileDragOver ? 'is-file-drag-over' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        />

        {pendingAttachments.length > 0 && (
          <div className="composer-pending-attachments" aria-label="Pending attachments">
            {pendingAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="composer-pending-attachment-item"
                title={attachment.name}
              >
                <div className={`composer-pending-attachment-thumb kind-${attachment.kind}`} aria-hidden="true">
                  {attachment.kind === 'image' && attachment.previewUrl ? (
                    <img src={attachment.previewUrl} alt={attachment.name} />
                  ) : attachment.kind === 'image' ? (
                    <ImageIcon size={15} />
                  ) : attachment.kind === 'video' ? (
                    <Video size={15} />
                  ) : (
                    <FileText size={15} />
                  )}
                </div>
                <button
                  type="button"
                  className="composer-pending-attachment-remove"
                  aria-label={`Remove attachment ${attachment.name}`}
                  onClick={() => onRemovePendingAttachment?.(attachment.id)}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          className="composer-textarea no-scrollbar"
          placeholder={localizeText(language, CHAT_COMPOSER_UI.placeholder)}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          maxLength={4000}
        />

        <div className="composer-toolbar">
          <div className="toolbar-left" ref={menuRef}>
            <div className="composer-attach-wrapper">
              <button
                className={`toolbar-attach-btn ${activeMenu === 'attachment' ? 'active-menu' : ''}`}
                onClick={() => toggleMenu('attachment')}
                title={localizeText(language, CHAT_COMPOSER_UI.attachFile)}
                type="button"
              >
                <span className="composer-icon-span">
                  <Plus size={20} strokeWidth={2} />
                </span>
              </button>

              {activeMenu === 'attachment' && (
                <AttachmentMenu
                  position={position}
                  webSearchMode={webSearchMode}
                  isWebSearchHovered={isWebSearchHovered}
                  lockWebSearchOff={forceInternetOff}
                  onAttachClick={handleAttachClick}
                  onOpenQuickPresets={() => toggleMenu('quickPresets')}
                  onWebSearchHover={setIsWebSearchHovered}
                  onSetWebSearchMode={handleSetWebSearchMode}
                />
              )}
            </div>

            {webSearchMode === 'off' && (
              <button
                className="internet-off-pill"
                onClick={() => {
                  if (forceInternetOff) {
                    return;
                  }
                  setWebSearchMode('auto');
                  pushToast?.(language === 'th' ? 'Switched to auto online' : 'Switched to auto online', 'success');
                }}
                title={language === 'th' ? 'หยุดรับข้อมูลออนไลน์ชั่วคราว (คลิกเพื่อเปิด)' : 'Stop getting information online'}
                type="button"
                disabled={forceInternetOff}
              >
                <div className="off-pill-icon-container">
                  <Globe size={14} className="icon-normal" />
                  <X size={14} className="icon-hover" />
                </div>
                <span>Internet off</span>
              </button>
            )}

            {activeMenu === 'quickPresets' && (
              <QuickPresetsMenu
                presetItems={presetItems}
                position={position}
                onApply={handleApplyQuickPreset}
                onOpenModal={handleOpenPresetsModal}
              />
            )}
          </div>

          <ComposerActions
            isGenerating={!!isGenerating}
            input={input}
            canSend={canSend}
            onSend={handleSend}
            onStop={onStop}
          />
        </div>
      </div>
      <p className="composer-disclaimer">
        {localizeText(language, CHAT_COMPOSER_UI.disclaimer)}
      </p>

      {isPresetsModalOpen && createPortal(
        <PresetsModal
          view={presetModalView}
          onClose={handleClosePresetsModal}
          onSetView={setPresetModalView}
          searchText={presetSearchText}
          onSearchChange={setPresetSearchText}
          filteredPresets={filteredPresets}
          editingId={editingPresetId}
          pendingDeleteId={pendingDeletePresetId}
          onEdit={handleEditPresetAction}
          onDelete={handleDeletePreset}
          newContent={newPromptContent}
          onNewContentChange={setNewPromptContent}
          newTrigger={newPromptTriggerWord}
          onNewTriggerChange={setNewPromptTriggerWord}
          onRandom={handleRandomPrompt}
          onSave={() => handleCreatePrompt() && setPresetModalView('list')}
        />,
        document.body
      )}
    </div>
  );
});

ChatComposer.displayName = 'ChatComposer';

export default ChatComposer;
