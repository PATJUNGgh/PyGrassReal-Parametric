import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MOCK_PRESETS, RANDOM_PROMPT_TEMPLATES, type PresetItem, CHAT_HISTORY_UI } from '../data/chatData';
import { localizeText, type LanguageCode } from '../../i18n/language';
import { logStructured, sanitizeInput, isRecord } from '../utils';

export function useChatPresets(language: LanguageCode, { 
  pushToast, 
  getErrorMessage 
}: { 
  pushToast?: (message: string, tone?: 'success' | 'error') => void;
  getErrorMessage?: (error: unknown) => string;
} = {}) {
  const [presetItems, setPresetItems] = useState<PresetItem[]>(() => {
    try {
      const storedPresets = localStorage.getItem('chatPresets');
      if (!storedPresets) return MOCK_PRESETS;
      
      const parsed = JSON.parse(storedPresets);
      // Harden structural validation for LocalizedText
      if (Array.isArray(parsed) && parsed.every(p => 
        p.id && 
        typeof p.triggerWord === 'string' && 
        isRecord(p.content) && 
        typeof p.content.th === 'string' && 
        typeof p.content.en === 'string'
      )) {
        return parsed;
      }
      return MOCK_PRESETS;
    } catch (error) {
      console.error('Failed to parse chat presets from localStorage', error);
      return MOCK_PRESETS;
    }
  });

  const [presetSearchText, setPresetSearchText] = useState('');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [pendingDeletePresetId, setPendingDeletePresetId] = useState<string | null>(null);
  const [newPromptContent, setNewPromptContent] = useState('');
  const [newPromptTriggerWord, setNewPromptTriggerWord] = useState('');
  const lastActionTimeRef = useRef<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem('chatPresets', JSON.stringify(presetItems));
    } catch (error) {
      console.error('Failed to save chat presets to localStorage', error);
    }
  }, [presetItems]);

  const filteredPresets = useMemo(() => {
    const normalizedSearch = (presetSearchText || '').trim().toLowerCase();
    if (!normalizedSearch) return presetItems;

    return presetItems.filter((item) =>
      item.triggerWord.toLowerCase().includes(normalizedSearch) ||
      localizeText(language, item.content).toLowerCase().includes(normalizedSearch)
    );
  }, [presetItems, presetSearchText, language]);

  const handleRandomPrompt = useCallback(() => {
    const randomTemplate = RANDOM_PROMPT_TEMPLATES[
      Math.floor(Math.random() * RANDOM_PROMPT_TEMPLATES.length)
    ];
    setNewPromptContent(localizeText(language, randomTemplate.content));
    setNewPromptTriggerWord(randomTemplate.triggerWord);
  }, [language]);

  const resetForm = useCallback(() => {
    setEditingPresetId(null);
    setPendingDeletePresetId(null);
    setNewPromptContent('');
    setNewPromptTriggerWord('');
  }, []);

  const startEditing = useCallback((preset: PresetItem) => {
    setEditingPresetId(preset.id);
    setNewPromptContent(localizeText(language, preset.content));
    setNewPromptTriggerWord(preset.triggerWord);
    setPendingDeletePresetId(null);
  }, [language]);

  const handleCreatePrompt = useCallback(() => {
    const now = Date.now();
    if (now - lastActionTimeRef.current < 1000) return false;

    const rawContent = (newPromptContent || '').trim();
    const rawTrigger = (newPromptTriggerWord || '').trim();

    if (!rawContent || !rawTrigger) return false;

    // Sanitize trigger: start with /, only alphanumeric/hyphen
    let trigger = rawTrigger.startsWith('/') ? rawTrigger : `/${rawTrigger}`;
    trigger = trigger.replace(/[^\/\w-]/g, ''); // Remove unsafe chars
    
    const cleanContent = sanitizeInput(rawContent, undefined, { preserveLineBreaks: true });
    if (!trigger || !cleanContent) return false;

    const triggerLower = trigger.toLowerCase();

    // Check for duplicates (excluding current editing item)
    const isDuplicate = presetItems.some(item => 
      item.id !== editingPresetId && item.triggerWord.toLowerCase() === triggerLower
    );

    if (isDuplicate) {
      pushToast?.(localizeText(language, CHAT_HISTORY_UI.errorDuplicateTrigger), 'error');
      return false;
    }

    lastActionTimeRef.current = now;
    if (editingPresetId) {
      setPresetItems(prev => prev.map(item => (
        item.id === editingPresetId
          ? { ...item, triggerWord: trigger, content: { ...item.content, [language]: cleanContent } }
          : item
      )));
      pushToast?.(localizeText(language, CHAT_HISTORY_UI.successPresetUpdated));
    } else {
      const newPreset: PresetItem = {
        id: `preset-${crypto.randomUUID?.() || Date.now()}`,
        triggerWord: trigger,
        content: { th: cleanContent, en: cleanContent }
      };
      setPresetItems(prev => [newPreset, ...prev]);
      pushToast?.(localizeText(language, CHAT_HISTORY_UI.successPresetCreated));
    }

    logStructured('Chat preset saved', { trigger, preset_id: editingPresetId || 'new' });
    resetForm();
    return true;
  }, [newPromptContent, newPromptTriggerWord, editingPresetId, presetItems, language, pushToast, resetForm]);

  const handleDeletePreset = useCallback((presetId: string) => {
    if (pendingDeletePresetId === presetId) {
      setPresetItems((prev) => prev.filter((item) => item.id !== presetId));
      setPendingDeletePresetId(null);
      pushToast?.(localizeText(language, CHAT_HISTORY_UI.successPresetDeleted));
    } else {
      setPendingDeletePresetId(presetId);
    }
  }, [pendingDeletePresetId, language, pushToast]);

  return useMemo(() => ({
    presetItems,
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
    startEditing,
    resetForm
  }), [
    presetItems,
    filteredPresets,
    presetSearchText,
    editingPresetId,
    pendingDeletePresetId,
    newPromptContent,
    newPromptTriggerWord,
    handleRandomPrompt,
    handleCreatePrompt,
    handleDeletePreset,
    startEditing,
    resetForm
  ]);
}
