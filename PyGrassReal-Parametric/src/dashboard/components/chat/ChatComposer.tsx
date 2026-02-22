import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  ArrowUp,
  Square,
  Paperclip,
  Box,
  Globe,
  ChevronRight,
  Check,
  Search,
  Dices,
  Pencil,
  Trash2,
  X
} from 'lucide-react';
import './ChatComposer.css';

interface ChatComposerProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  isGenerating?: boolean;
  position?: 'centered' | 'bottom';
}

interface PresetItem {
  id: string;
  triggerWord: string;
  content: string;
}

const MOCK_PRESETS: PresetItem[] = [
  {
    id: 'preset-1',
    triggerWord: '/brief',
    content: 'Summarize this topic in 5 concise bullet points with practical examples.'
  },
  {
    id: 'preset-2',
    triggerWord: '/email',
    content: 'Write a professional email draft with clear subject, body, and CTA.'
  },
  {
    id: 'preset-3',
    triggerWord: '/translate-th',
    content: 'Translate the following text to Thai while preserving technical meaning.'
  },
  {
    id: 'preset-4',
    triggerWord: '/qa',
    content: 'Generate test cases for this feature including edge cases and failure paths.'
  },
  {
    id: 'preset-5',
    triggerWord: '/plan',
    content: 'Create a step-by-step implementation plan with deliverables and risks.'
  },
  {
    id: 'preset-6',
    triggerWord: '/fix',
    content: 'Diagnose the bug from logs and propose a minimal, safe patch.'
  },
  {
    id: 'preset-7',
    triggerWord: '/docs',
    content: 'Write concise documentation with setup, usage, and troubleshooting sections.'
  },
  {
    id: 'preset-8',
    triggerWord: '/review',
    content: 'Review the code for regressions, security risks, and missing test coverage.'
  }
];

const RANDOM_PROMPT_TEMPLATES: Array<Pick<PresetItem, 'triggerWord' | 'content'>> = [
  {
    triggerWord: '/professional-translation',
    content: 'Translate the input into professional Thai with clear and natural business tone.'
  },
  {
    triggerWord: '/meeting-summary',
    content: 'Summarize this meeting transcript into key decisions, owners, and deadlines.'
  },
  {
    triggerWord: '/fix-commit',
    content: 'Propose a minimal code fix and draft a concise commit message.'
  },
  {
    triggerWord: '/spec-review',
    content: 'Review this spec for ambiguity, missing edge cases, and implementation risks.'
  }
];

const ChatComposer = ({
  onSend,
  onStop,
  isGenerating,
  position = 'bottom'
}: ChatComposerProps) => {
  const [input, setInput] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isQuickPresetsOpen, setIsQuickPresetsOpen] = useState(false);
  const [isWebSearchHovered, setIsWebSearchHovered] = useState(false);
  const [webSearchMode, setWebSearchMode] = useState<'auto' | 'off'>('auto');
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [presetModalView, setPresetModalView] = useState<'list' | 'new'>('list');
  const [presetItems, setPresetItems] = useState<PresetItem[]>(() => {
    try {
      const storedPresets = localStorage.getItem('chatPresets');
      // If no stored presets, use MOCK_PRESETS as initial values
      return storedPresets ? JSON.parse(storedPresets) : MOCK_PRESETS;
    } catch (error) {
      console.error('Failed to parse chat presets from localStorage', error);
      return MOCK_PRESETS; // Fallback to mock presets on error
    }
  });
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [pendingDeletePresetId, setPendingDeletePresetId] = useState<string | null>(null);
  const [presetSearchText, setPresetSearchText] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [newPromptTriggerWord, setNewPromptTriggerWord] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxHeight = 200;

  // Save presets to localStorage whenever presetItems changes
  useEffect(() => {
    try {
      localStorage.setItem('chatPresets', JSON.stringify(presetItems));
    } catch (error) {
      console.error('Failed to save chat presets to localStorage', error);
    }
  }, [presetItems]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setIsQuickPresetsOpen(false);
        setIsWebSearchHovered(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isPresetsModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPresetsModalOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isPresetsModalOpen]);

  const filteredPresets = useMemo(() => {
    const normalizedSearch = presetSearchText.trim().toLowerCase();
    if (!normalizedSearch) return presetItems;

    return presetItems.filter((item) =>
      item.triggerWord.toLowerCase().includes(normalizedSearch) ||
      item.content.toLowerCase().includes(normalizedSearch)
    );
  }, [presetItems, presetSearchText]);

  const handleSend = () => {
    if (input.trim() && !isGenerating) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleAttachClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    setIsMenuOpen(false);
    setIsQuickPresetsOpen(false);
  };

  const handleOpenQuickPresetsMenu = () => {
    setIsMenuOpen(false);
    setIsWebSearchHovered(false);
    setIsQuickPresetsOpen(true);
  };

  const handleOpenPresetsModal = () => {
    setIsMenuOpen(false);
    setIsQuickPresetsOpen(false);
    setIsWebSearchHovered(false);
    setPresetModalView('list');
    setIsPresetsModalOpen(true);
  };

  const handleClosePresetsModal = () => {
    setIsPresetsModalOpen(false);
    setPresetModalView('list');
    setEditingPresetId(null);
    setPendingDeletePresetId(null);
  };

  const handleApplyQuickPreset = (preset: PresetItem) => {
    setInput(preset.content);
    setIsQuickPresetsOpen(false);
    setIsMenuOpen(false);
    setIsWebSearchHovered(false);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const clearNewPromptForm = () => {
    setNewPromptContent('');
    setNewPromptTriggerWord('');
  };

  const handleOpenNewPromptView = () => {
    clearNewPromptForm();
    setEditingPresetId(null);
    setPendingDeletePresetId(null);
    setPresetModalView('new');
  };

  const handleCancelNewPrompt = () => {
    clearNewPromptForm();
    setEditingPresetId(null);
    setPresetModalView('list');
  };

  const handleRandomPrompt = () => {
    const randomTemplate = RANDOM_PROMPT_TEMPLATES[
      Math.floor(Math.random() * RANDOM_PROMPT_TEMPLATES.length)
    ];

    setNewPromptContent(randomTemplate.content);
    setNewPromptTriggerWord(randomTemplate.triggerWord);
  };

  const handleCreatePrompt = () => {
    const normalizedContent = newPromptContent.trim();
    const normalizedTriggerRaw = newPromptTriggerWord.trim();

    if (!normalizedContent || !normalizedTriggerRaw) return;

    const normalizedTrigger = normalizedTriggerRaw.startsWith('/')
      ? normalizedTriggerRaw
      : `/${normalizedTriggerRaw}`;

    if (editingPresetId) {
      setPresetItems((prev) => prev.map((item) => (
        item.id === editingPresetId
          ? { ...item, triggerWord: normalizedTrigger, content: normalizedContent }
          : item
      )));
    } else {
      const createdPrompt: PresetItem = {
        id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        triggerWord: normalizedTrigger,
        content: normalizedContent
      };

      setPresetItems((prev) => [createdPrompt, ...prev]);
    }

    setEditingPresetId(null);
    setPendingDeletePresetId(null);
    setPresetSearchText('');
    clearNewPromptForm();
    setPresetModalView('list');
  };

  const handleEditPreset = (preset: PresetItem) => {
    setEditingPresetId(preset.id);
    setPendingDeletePresetId(null);
    setNewPromptContent(preset.content);
    setNewPromptTriggerWord(preset.triggerWord);
    setPresetModalView('new');
  };

  const handleDeletePreset = (presetId: string) => {
    if (pendingDeletePresetId === presetId) {
      setPresetItems((prev) => prev.filter((item) => item.id !== presetId));
      setPendingDeletePresetId(null);
      return;
    }

    setPendingDeletePresetId(presetId);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      console.log('Selected file:', files[0].name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-composer-pill-wrapper">
      <div className="chat-composer-pill-container">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          multiple
        />

        <textarea
          ref={textareaRef}
          className="composer-textarea no-scrollbar"
          placeholder="Ask anything..."
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div className="composer-toolbar">
          <div className="toolbar-left" ref={menuRef}>
            <div className="composer-attach-wrapper">
              <button
                className={`toolbar-attach-btn ${isMenuOpen ? 'active-menu' : ''}`}
                onClick={() => {
                  setIsMenuOpen((prev) => !prev);
                  setIsWebSearchHovered(false);
                  setIsQuickPresetsOpen(false);
                }}
                title="Attach file"
                type="button"
              >
                <span className="composer-icon-span">
                  <Plus size={20} strokeWidth={2} />
                </span>
              </button>

              {isMenuOpen && (
                <div className={`attach-dropdown-menu ${position === 'centered' ? 'is-bottom' : 'is-top'}`}>
                  <button className="attach-menu-item" onClick={handleAttachClick} type="button">
                    <Paperclip size={16} strokeWidth={2} />
                    <span>Add files and photos</span>
                  </button>
                  <button className="attach-menu-item" onClick={handleOpenQuickPresetsMenu} type="button">
                    <Box size={16} strokeWidth={2} />
                    <span>Presets</span>
                  </button>

                  <div
                    className="attach-menu-item has-submenu"
                    onMouseEnter={() => setIsWebSearchHovered(true)}
                    onMouseLeave={() => setIsWebSearchHovered(false)}
                  >
                    <div className="menu-item-content">
                      <Globe size={16} strokeWidth={2} />
                      <span>Web search</span>
                    </div>
                    <ChevronRight size={16} className="submenu-arrow" />

                    {isWebSearchHovered && (
                      <div className="attach-submenu">
                        <button
                          className="submenu-item"
                          onClick={() => { setWebSearchMode('auto'); setIsMenuOpen(false); }}
                          type="button"
                        >
                          <div className="submenu-text">
                            <span className="submenu-title">Auto</span>
                            <span className="submenu-desc">Browses the web when needed</span>
                          </div>
                          {webSearchMode === 'auto' && <Check size={16} className="submenu-check" />}
                        </button>
                        <button
                          className="submenu-item"
                          onClick={() => { setWebSearchMode('off'); setIsMenuOpen(false); }}
                          type="button"
                        >
                          <div className="submenu-text">
                            <span className="submenu-title">Off</span>
                            <span className="submenu-desc">No web access</span>
                          </div>
                          {webSearchMode === 'off' && <Check size={16} className="submenu-check" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {isQuickPresetsOpen && (
              <div
                className={`quick-presets-menu ${position === 'centered' ? 'is-bottom' : 'is-top'}`}
                role="dialog"
                aria-label="Quick presets menu"
              >
                <div className="quick-presets-header">
                  <span>Presets</span>
                  <button
                    className="quick-presets-setting-btn"
                    onClick={handleOpenPresetsModal}
                    type="button"
                  >
                    Setting
                  </button>
                </div>

                <div className="quick-presets-list">
                  {presetItems.length > 0 ? (
                    presetItems.map((preset) => (
                      <button
                        className="quick-preset-item"
                        key={preset.id}
                        onClick={() => handleApplyQuickPreset(preset)}
                        type="button"
                      >
                        <span className="quick-preset-trigger">{preset.triggerWord}</span>
                        <span className="quick-preset-preview">{preset.content}</span>
                      </button>
                    ))
                  ) : (
                    <div className="quick-preset-empty">No presets available.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="toolbar-right">
            {isGenerating ? (
              <button
                className="composer-stop-btn"
                onClick={onStop}
                title="Stop"
                type="button"
              >
                <Square
                  size={14}
                  strokeWidth={2.2}
                  fill="var(--dash-danger)"
                  color="var(--dash-danger)"
                />
              </button>
            ) : (
              <button
                className={`composer-send-btn ${input.trim() ? 'active' : ''}`}
                onClick={handleSend}
                disabled={!input.trim()}
                title="Send message"
                type="button"
              >
                <span className="composer-icon-span">
                  <ArrowUp size={20} strokeWidth={2.5} />
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="composer-disclaimer">AI can make mistakes. Check important info.</p>

      {isPresetsModalOpen && createPortal(
        <div
          className="preset-modal-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleClosePresetsModal();
            }
          }}
        >
          <div
            className="preset-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preset-modal-title"
          >
            <div className="preset-modal-header">
              <h2 id="preset-modal-title">{presetModalView === 'list' ? 'Presets' : 'New prompts'}</h2>
              <button
                className="preset-modal-close-btn"
                onClick={handleClosePresetsModal}
                aria-label="Close presets modal"
                type="button"
              >
                <X size={18} strokeWidth={2.4} />
              </button>
            </div>

            {presetModalView === 'list' ? (
              <>
                <div className="preset-modal-tools">
                  <label className="preset-search-field" aria-label="Search saved prompts">
                    <Search size={16} strokeWidth={2} />
                    <input
                      type="text"
                      value={presetSearchText}
                      onChange={(event) => setPresetSearchText(event.target.value)}
                      placeholder="Search Saved Prompts"
                    />
                  </label>
                  <button className="preset-add-button" onClick={handleOpenNewPromptView} type="button">
                    + Add Prompts
                  </button>
                </div>

                <div className="preset-table-container">
                  <div className="preset-table-header">
                    <span>Trigger Word</span>
                    <span>Content</span>
                  </div>

                  <div className="preset-table-body">
                    {filteredPresets.length > 0 ? (
                      filteredPresets.map((preset) => (
                        <div className="preset-table-row" key={preset.id}>
                          <span className="preset-trigger-word">
                            <span className="preset-trigger-tag">{preset.triggerWord}</span>
                          </span>
                          <span className="preset-content">{preset.content}</span>
                          <div className={`preset-row-actions ${pendingDeletePresetId === preset.id ? 'is-active' : ''}`}>
                            <button
                              className="preset-row-action-btn"
                              onClick={() => handleEditPreset(preset)}
                              title="Edit preset"
                              type="button"
                            >
                              <Pencil size={14} strokeWidth={2.1} />
                            </button>
                            <button
                              className={`preset-row-action-btn preset-row-action-delete ${pendingDeletePresetId === preset.id ? 'is-confirming' : ''}`}
                              onClick={() => handleDeletePreset(preset.id)}
                              title={pendingDeletePresetId === preset.id ? 'Confirm delete' : 'Delete preset'}
                              type="button"
                            >
                              <Trash2 size={14} strokeWidth={2.1} />
                              {pendingDeletePresetId === preset.id && <span>Confirm</span>}
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="preset-table-empty">No saved prompts found.</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="preset-create-panel">
                <p className="preset-create-subtitle">
                  You can set frequently used content as prompts
                </p>

                <button className="preset-random-button" onClick={handleRandomPrompt} type="button">
                  <Dices size={15} strokeWidth={2.2} />
                  <span>Random One</span>
                </button>

                <div className="preset-create-form">
                  <label className="preset-form-label" htmlFor="new-prompt-content">Content</label>
                  <textarea
                    id="new-prompt-content"
                    className="preset-content-input"
                    value={newPromptContent}
                    onChange={(event) => setNewPromptContent(event.target.value)}
                    placeholder="e.g. Rewrite this text into a concise and professional response."
                  />

                  <label className="preset-form-label" htmlFor="new-prompt-trigger-word">Trigger Word</label>
                  <div className="preset-trigger-input-wrapper">
                    <input
                      id="new-prompt-trigger-word"
                      className="preset-trigger-input"
                      type="text"
                      value={newPromptTriggerWord}
                      onChange={(event) => setNewPromptTriggerWord(event.target.value)}
                      placeholder="Enter 'Professional translation' in the dialog box..."
                    />
                  </div>
                </div>

                <div className="preset-create-actions">
                  <button
                    className="preset-action-btn preset-action-cancel"
                    onClick={handleCancelNewPrompt}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="preset-action-btn preset-action-new"
                    onClick={handleCreatePrompt}
                    disabled={!newPromptContent.trim() || !newPromptTriggerWord.trim()}
                    type="button"
                  >
                    {editingPresetId ? 'Save' : 'New'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ChatComposer;
