import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, ChevronDown, FileImage, FileText, Paperclip, Video, X } from 'lucide-react';
import { ChatLayout } from './components/chat/ChatLayout';
import { ChatEmptyState } from './components/chat/ChatEmptyState';
import { ChatMessageList } from './components/chat/ChatMessageList';
import ChatComposer from './components/chat/ChatComposer';
import { useChatAssistant } from './hooks/useChatAssistant';
import { useBunnyUpload } from './hooks/useBunnyUpload';
import { ChatAssistantHeader } from './components/chat/ChatAssistantHeader';
import { ChatHistoryDrawer } from './components/chat/ChatHistoryDrawer';
import { useToasts } from './hooks/useToasts';
import { ToastStack } from './components/ToastStack';
import { localizeText, useLanguage } from '../i18n/language';
import type { ChatAttachment, ChatAttachmentKind } from './types/chat.types';
import { getDashboardSessionId, getDashboardUserId } from './services/dashboard.chat.api';
import { CHAT_LIMITS } from './data/chatData';
import { supabase } from '../lib/supabaseClient';
import Modal from './components/Modal';
import './ChatAssistantPage.css';

interface ChatAssistantPageProps {
  onUpgradePlan: () => void;
}

const FILES_PANEL_UI = {
  title: { th: 'ไฟล์ในแชท', en: 'Files in Chat' },
  hint: {
    th: 'ไฟล์รูปภาพ วิดีโอ และเอกสารที่ส่งในบทสนทนานี้แล้ว',
    en: 'Images, videos, and documents that were already sent in this conversation.',
  },
  close: { th: 'ปิด', en: 'Close' },
  empty: { th: 'ยังไม่มีไฟล์ที่ส่งในแชทนี้', en: 'No sent files in this chat yet.' },
  sent: { th: 'ส่งแล้ว', en: 'Sent' },
};

const ROOM_NAME_STORAGE_KEY = 'dashboard_chat_room_names';
const AUTO_ROOM_NAME_MAX_LENGTH = 60;

const ROOM_NAME_UI = {
  navLabel: { th: 'Chat Room Name', en: 'Chat room name' },
  defaultName: { th: 'New Chat Room', en: 'New Chat Room' },
  editName: { th: 'Rename', en: 'Rename' },
  deleteRoom: { th: 'Delete', en: 'Delete' },
  menuLabel: { th: 'Room actions', en: 'Room actions' },
  renamePrompt: { th: 'Rename chat room', en: 'Rename chat room' },
  renameInputLabel: { th: 'Room name', en: 'Room name' },
  renameInputPlaceholder: { th: 'Enter room name', en: 'Enter room name' },
  renameSave: { th: 'Save', en: 'Save' },
  actionCancel: { th: 'Cancel', en: 'Cancel' },
  deleteTitle: { th: 'Delete chat room', en: 'Delete chat room' },
  deleteDescription: { th: 'This action creates a new room immediately.', en: 'This action creates a new room immediately.' },
  deleteConfirmAction: { th: 'Delete room', en: 'Delete room' },
  deleteConfirm: { th: 'Delete this room and start a new one?', en: 'Delete this room and start a new one?' },
};

type SessionViewOptions = {
  clearPendingAttachments?: boolean;
  clearSentFiles?: boolean;
};

const parseRoomNameMap = (): Record<string, string> => {
  try {
    const rawValue = window.localStorage.getItem(ROOM_NAME_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
  } catch {
    return {};
  }
};

const saveRoomNameMap = (map: Record<string, string>) => {
  try {
    window.localStorage.setItem(ROOM_NAME_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore localStorage write failures.
  }
};

const deriveRoomNameFromMessage = (rawText: string): string => {
  const normalizedText = rawText.replace(/\s+/g, ' ').trim();
  if (!normalizedText) {
    return '';
  }
  if (normalizedText.length <= AUTO_ROOM_NAME_MAX_LENGTH) {
    return normalizedText;
  }
  return `${normalizedText.slice(0, AUTO_ROOM_NAME_MAX_LENGTH - 3).trimEnd()}...`;
};

const getAttachmentKind = (mimeType: string): ChatAttachmentKind => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'file';
};

const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const createAttachment = (file: File): ChatAttachment => {
  const kind = getAttachmentKind(file.type);
  return {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: file.name,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    kind,
    previewUrl: kind === 'image' ? URL.createObjectURL(file) : undefined,
    _file: file,
    createdAt: Date.now(),
  };
};

const revokeAttachmentPreview = (attachment: ChatAttachment) => {
  if (attachment.previewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(attachment.previewUrl);
  }
};

export const ChatAssistantPage: React.FC<ChatAssistantPageProps> = ({ onUpgradePlan }) => {
  const { language } = useLanguage();
  const { toasts, pushToast, getErrorMessage } = useToasts();
  const assistant = useChatAssistant({ pushToast, getErrorMessage });
  const { uploadFile, isUploading } = useBunnyUpload();
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [sentFiles, setSentFiles] = useState<ChatAttachment[]>([]);
  const [isFilesPanelOpen, setIsFilesPanelOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => getDashboardSessionId());
  const [roomName, setRoomName] = useState<string>(() => {
    const initialSessionId = getDashboardSessionId();
    const roomNameMap = parseRoomNameMap();
    return roomNameMap[initialSessionId] || localizeText(language, ROOM_NAME_UI.defaultName);
  });
  const [isRoomMenuOpen, setIsRoomMenuOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const pendingAttachmentsRef = useRef<ChatAttachment[]>([]);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const openPresetsOnMount = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('focus') === 'presets';
  }, []);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => {
    return () => {
      pendingAttachmentsRef.current.forEach(revokeAttachmentPreview);
    };
  }, []);

  const clearPendingAttachments = useCallback(() => {
    setPendingAttachments((previous) => {
      previous.forEach(revokeAttachmentPreview);
      return [];
    });
  }, []);

  const syncSessionTitle = useCallback((sessionId: string, title: string) => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      return;
    }

    void supabase
      .from('chat_sessions')
      .upsert(
        {
          id: sessionId,
          user_id: getDashboardUserId(),
          title: normalizedTitle,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      .then(({ error }) => {
        if (error) {
          console.error('[ChatAssistantPage] Failed to sync chat session', error);
        }
      });
  }, []);

  const switchToSession = useCallback((nextSessionId: string, options: SessionViewOptions = {}) => {
    const {
      clearPendingAttachments: shouldClearPendingAttachments = true,
      clearSentFiles: shouldClearSentFiles = true,
    } = options;

    setIsFilesPanelOpen(false);
    if (shouldClearPendingAttachments) {
      clearPendingAttachments();
    }
    if (shouldClearSentFiles) {
      setSentFiles([]);
    }

    setActiveSessionId(nextSessionId);
    const roomNameMap = parseRoomNameMap();
    setRoomName(roomNameMap[nextSessionId] || localizeText(language, ROOM_NAME_UI.defaultName));
    setIsRoomMenuOpen(false);
    setIsRenameModalOpen(false);
    setIsDeleteModalOpen(false);
    setRenameDraft('');
  }, [clearPendingAttachments, language]);

  const handleNewChat = useCallback(() => {
    const nextSessionId = assistant.handleNewChat();
    switchToSession(nextSessionId);
  }, [assistant.handleNewChat, switchToSession]);

  const handleSelectChat = useCallback((sessionId: string) => {
    assistant.loadSession(sessionId);
    switchToSession(sessionId);
    if (assistant.isHistoryOpen) {
      assistant.toggleHistory();
    }
  }, [assistant, switchToSession]);

  const handleFilesSelected = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setPendingAttachments((previous) => [...previous, ...files.map(createAttachment)]);
  }, []);

  const handleRemovePendingAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments((previous) => {
      const target = previous.find((file) => file.id === attachmentId);
      if (target) {
        revokeAttachmentPreview(target);
      }
      return previous.filter((file) => file.id !== attachmentId);
    });
  }, []);

  const handleSendWithUpload = useCallback(async (
    text: string,
    searchMode: 'auto' | 'off',
  ) => {
    let sessionIdForSend = activeSessionId;
    let roomNameForSend = roomName;

    if (assistant.messages.length >= CHAT_LIMITS.SESSION_MESSAGE_LIMIT) {
      sessionIdForSend = assistant.handleNewChat({ suppressToast: true });
      roomNameForSend = localizeText(language, ROOM_NAME_UI.defaultName);
      switchToSession(sessionIdForSend, {
        clearPendingAttachments: false,
        clearSentFiles: true,
      });
      pushToast?.(
        localizeText(language, {
          th: `เริ่มหัวข้อใหม่อัตโนมัติหลังครบ ${CHAT_LIMITS.SESSION_MESSAGE_LIMIT} ข้อความแล้ว`,
          en: `Started a new topic automatically after ${CHAT_LIMITS.SESSION_MESSAGE_LIMIT} messages`,
        }),
        'success',
      );
    }

    let finalText = text;
    const filesToUpload = pendingAttachmentsRef.current.filter((attachment) => Boolean(attachment._file));
    const uploadedAttachmentIds = new Set<string>();
    const uploadedHistoryItems: ChatAttachment[] = [];

    if (filesToUpload.length > 0) {
      pushToast?.(language === 'th' ? 'กำลังอัปโหลดไฟล์...' : 'Uploading files...', 'success');
      const uploadedLinks: string[] = [];

      for (const attachment of filesToUpload) {
        try {
          const result = await uploadFile(attachment._file as File);
          uploadedAttachmentIds.add(attachment.id);
          uploadedHistoryItems.push({
            ...attachment,
            cdnUrl: result.cdnUrl,
            storagePath: result.storagePath,
            previewUrl: attachment.kind === 'image' ? result.cdnUrl : undefined,
            _file: undefined,
          });
          uploadedLinks.push(`[${attachment.name}](${result.cdnUrl})`);
        } catch {
          pushToast?.(
            language === 'th'
              ? `อัปโหลด "${attachment.name}" ไม่สำเร็จ`
              : `Failed to upload "${attachment.name}"`,
            'error',
          );
        }
      }

      if (uploadedLinks.length > 0) {
        const uploadedLinksBlock = uploadedLinks.join('\n');
        const separator = finalText.trim() ? '\n\n' : '';
        finalText = `${uploadedLinksBlock}${separator}${finalText}`;
      }
    }

    if (uploadedAttachmentIds.size > 0) {
      setPendingAttachments((previous) =>
        previous.filter((file) => {
          const isUploaded = uploadedAttachmentIds.has(file.id);
          if (isUploaded) {
            revokeAttachmentPreview(file);
          }
          return !isUploaded;
        }),
      );
      setSentFiles((previous) => [...uploadedHistoryItems, ...previous]);
    }

    if (!finalText.trim()) {
      return;
    }

    const nextAutoRoomName = deriveRoomNameFromMessage(text);
    const roomNameMap = parseRoomNameMap();
    const existingStoredRoomName = roomNameMap[sessionIdForSend]?.trim() || '';
    let effectiveRoomName = existingStoredRoomName || roomNameForSend.trim();

    if (nextAutoRoomName && !existingStoredRoomName) {
      effectiveRoomName = nextAutoRoomName;
      setRoomName(nextAutoRoomName);
      roomNameMap[sessionIdForSend] = nextAutoRoomName;
      saveRoomNameMap(roomNameMap);
    }

    const fallbackRoomName = localizeText(language, ROOM_NAME_UI.defaultName);
    syncSessionTitle(sessionIdForSend, effectiveRoomName || fallbackRoomName);

    await assistant.handleSend(finalText, searchMode);
  }, [
    activeSessionId,
    assistant.handleNewChat,
    assistant.handleSend,
    assistant.messages.length,
    language,
    pushToast,
    roomName,
    switchToSession,
    syncSessionTitle,
    uploadFile,
  ]);

  const hasSentFiles = sentFiles.length > 0;
  const composerPosition = assistant.isEmpty ? 'centered' : 'bottom';
  const composerPlacementClass =
    assistant.isEmpty && pendingAttachments.length > 0
      ? `${composerPosition} with-pending-attachments`
      : composerPosition;
  const filesPanelTitle = localizeText(language, FILES_PANEL_UI.title);
  const roomMenuLabel = localizeText(language, ROOM_NAME_UI.menuLabel);

  const saveActiveRoomName = useCallback((nextName: string) => {
    const trimmedName = nextName.trim();
    const roomNameMap = parseRoomNameMap();
    if (trimmedName) {
      roomNameMap[activeSessionId] = trimmedName;
      syncSessionTitle(activeSessionId, trimmedName);
    } else {
      delete roomNameMap[activeSessionId];
    }
    saveRoomNameMap(roomNameMap);
  }, [activeSessionId, syncSessionTitle]);

  const handleEditRoomName = useCallback(() => {
    setRenameDraft(roomName);
    setIsRoomMenuOpen(false);
    setIsRenameModalOpen(true);
  }, [roomName]);

  const handleDeleteRoom = useCallback(() => {
    setIsRoomMenuOpen(false);
    setIsDeleteModalOpen(true);
  }, []);

  const handleRenameModalClose = useCallback(() => {
    setIsRenameModalOpen(false);
  }, []);

  const handleRenameRoomSubmit = useCallback(() => {
    const nextName = renameDraft.trim();
    if (!nextName) {
      return;
    }
    setRoomName(nextName);
    saveActiveRoomName(nextName);
    setIsRenameModalOpen(false);
  }, [renameDraft, saveActiveRoomName]);

  const handleDeleteModalClose = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  const handleConfirmDeleteRoom = useCallback(() => {
    saveActiveRoomName('');
    setIsDeleteModalOpen(false);
    handleNewChat();
  }, [handleNewChat, saveActiveRoomName]);

  useEffect(() => {
    if (!isRoomMenuOpen) {
      return;
    }

    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('.chat-room-chip')) {
        setIsRoomMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', onDocumentMouseDown);
    return () => window.removeEventListener('mousedown', onDocumentMouseDown);
  }, [isRoomMenuOpen]);

  useEffect(() => {
    if (!isRenameModalOpen) {
      return;
    }

    const timerId = window.setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [isRenameModalOpen]);

  return (
    <div className="chat-page-root">
      <div className="chat-header-container">
        <ChatAssistantHeader
          onNewChat={handleNewChat}
          onToggleHistory={assistant.toggleHistory}
          isHistoryOpen={assistant.isHistoryOpen}
          currentModel={assistant.currentModel}
          onModelChange={assistant.setCurrentModel}
          onUpgradePlan={onUpgradePlan}
        />
      </div>

      <ChatHistoryDrawer
        isOpen={assistant.isHistoryOpen}
        onClose={assistant.toggleHistory}
        onNewProject={handleNewChat}
        onSelectChat={handleSelectChat}
        pushToast={pushToast}
        getErrorMessage={getErrorMessage}
      />

      {!assistant.isEmpty && (
        <div className="chat-topic-nav" role="navigation" aria-label={localizeText(language, ROOM_NAME_UI.navLabel)}>
          <div className="chat-room-chip">
            <button
              type="button"
              className={`chat-topic-nav-btn room-dropdown ${isRoomMenuOpen ? 'is-open' : ''}`}
              aria-label={roomMenuLabel}
              title={roomName}
              aria-haspopup="menu"
              aria-expanded={isRoomMenuOpen}
              onClick={(event) => {
                event.stopPropagation();
                setIsRoomMenuOpen((prev) => !prev);
              }}
            >
              <span className="chat-room-label">{roomName}</span>
              <ChevronDown size={14} className="chat-topic-menu-icon" aria-hidden="true" />
            </button>

            {isRoomMenuOpen && (
              <div className="chat-topic-dropdown" role="menu">
                <button type="button" className="chat-topic-dropdown-btn" onClick={handleEditRoomName}>
                  {localizeText(language, ROOM_NAME_UI.editName)}
                </button>
                <button type="button" className="chat-topic-dropdown-btn danger" onClick={handleDeleteRoom}>
                  {localizeText(language, ROOM_NAME_UI.deleteRoom)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {hasSentFiles && (
        <button
          type="button"
          className={`chat-files-toggle-btn ${isFilesPanelOpen ? 'is-active' : ''}`}
          onClick={() => setIsFilesPanelOpen((prev) => !prev)}
          title={filesPanelTitle}
          aria-label={filesPanelTitle}
        >
          <Paperclip size={16} />
          <span className="chat-files-toggle-label">{filesPanelTitle}</span>
          {sentFiles.length > 0 && <span className="chat-files-toggle-count">{sentFiles.length}</span>}
        </button>
      )}

      <aside className={`chat-files-drawer ${isFilesPanelOpen ? 'is-open' : ''}`} aria-hidden={!isFilesPanelOpen}>
        <div className="chat-files-drawer-header">
          <div>
            <h3>{filesPanelTitle}</h3>
            <p>{localizeText(language, FILES_PANEL_UI.hint)}</p>
          </div>
          <button
            type="button"
            className="chat-files-drawer-close"
            onClick={() => setIsFilesPanelOpen(false)}
            aria-label={localizeText(language, FILES_PANEL_UI.close)}
            title={localizeText(language, FILES_PANEL_UI.close)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="chat-files-drawer-body">
          {sentFiles.length === 0 ? (
            <p className="chat-files-empty">{localizeText(language, FILES_PANEL_UI.empty)}</p>
          ) : (
            <ul className="chat-files-list">
              {sentFiles.map((file) => (
                <li key={file.id} className="chat-files-item">
                  <div className={`chat-files-item-preview kind-${file.kind}`} aria-hidden="true">
                    {file.kind === 'image' ? (
                      file.previewUrl ? (
                        <img src={file.previewUrl} alt={file.name} />
                      ) : (
                        <FileImage size={18} />
                      )
                    ) : file.kind === 'video' ? (
                      <Video size={18} />
                    ) : (
                      <FileText size={18} />
                    )}
                  </div>
                  <div className="chat-files-item-content">
                    <p className="chat-files-item-name" title={file.name}>{file.name}</p>
                    <p className="chat-files-item-size">{formatFileSize(file.size)}</p>
                    <span className="chat-files-item-status uploaded">
                      <CheckCircle size={11} /> {localizeText(language, FILES_PANEL_UI.sent)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {isFilesPanelOpen && (
        <button
          type="button"
          className="chat-files-backdrop"
          onClick={() => setIsFilesPanelOpen(false)}
          aria-label={localizeText(language, FILES_PANEL_UI.close)}
        />
      )}

      <Modal
        isOpen={isRenameModalOpen}
        onClose={handleRenameModalClose}
        title={localizeText(language, ROOM_NAME_UI.renamePrompt)}
        footer={(
          <>
            <button type="button" className="is-secondary" onClick={handleRenameModalClose}>
              {localizeText(language, ROOM_NAME_UI.actionCancel)}
            </button>
            <button
              type="submit"
              form="chat-room-rename-form"
              className="is-primary"
              disabled={!renameDraft.trim()}
            >
              {localizeText(language, ROOM_NAME_UI.renameSave)}
            </button>
          </>
        )}
      >
        <form
          id="chat-room-rename-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleRenameRoomSubmit();
          }}
        >
          <label htmlFor="chat-room-name-input">{localizeText(language, ROOM_NAME_UI.renameInputLabel)}</label>
          <input
            id="chat-room-name-input"
            ref={renameInputRef}
            value={renameDraft}
            maxLength={60}
            placeholder={localizeText(language, ROOM_NAME_UI.renameInputPlaceholder)}
            onChange={(event) => setRenameDraft(event.target.value)}
          />
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        title={localizeText(language, ROOM_NAME_UI.deleteTitle)}
        footer={(
          <>
            <button type="button" className="is-secondary" onClick={handleDeleteModalClose}>
              {localizeText(language, ROOM_NAME_UI.actionCancel)}
            </button>
            <button type="button" className="is-danger" onClick={handleConfirmDeleteRoom}>
              {localizeText(language, ROOM_NAME_UI.deleteConfirmAction)}
            </button>
          </>
        )}
      >
        <p>{localizeText(language, ROOM_NAME_UI.deleteConfirm)}</p>
        <p>{localizeText(language, ROOM_NAME_UI.deleteDescription)}</p>
      </Modal>

      <ChatLayout>
        {assistant.isEmpty ? (
          <ChatEmptyState />
        ) : (
          <ChatMessageList
            messages={assistant.messages}
            isGenerating={assistant.isGenerating}
            currentModel={assistant.currentModel}
          />
        )}

        <div className={`chat-composer-sticky ${composerPlacementClass}`}>
          <ChatComposer
            onSend={handleSendWithUpload}
            onStop={assistant.handleStop}
            isGenerating={assistant.isGenerating || isUploading}
            forceInternetOff={assistant.isFreeTier}
            position={composerPosition}
            onFilesSelected={handleFilesSelected}
            pendingAttachmentCount={pendingAttachments.length}
            pendingAttachments={pendingAttachments}
            onRemovePendingAttachment={handleRemovePendingAttachment}
            pushToast={pushToast}
            getErrorMessage={getErrorMessage}
            openPresetsOnMount={openPresetsOnMount}
          />
        </div>
      </ChatLayout>
      <ToastStack toasts={toasts} />
    </div>
  );
};
