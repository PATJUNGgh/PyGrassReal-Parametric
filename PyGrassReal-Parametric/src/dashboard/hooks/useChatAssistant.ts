import { useState, useRef, useCallback } from 'react';
import type { Message, ChatModel } from '../types/chat.types';

export function useChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<ChatModel>('hanuman');
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSend = useCallback(async (content: string) => {
    if (!content.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Simulate network delay with abort support
      await new Promise((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timeout);
          controller.signal.removeEventListener('abort', onAbort);
          reject(new Error('Aborted'));
        };
        const timeout = setTimeout(() => {
          controller.signal.removeEventListener('abort', onAbort);
          resolve(null);
        }, 2000);
        controller.signal.addEventListener('abort', onAbort);
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I received your request using **${currentModel}** model: "${userMessage.content}". This is the new AI Assistant UI. Real integration is coming soon!`,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      if ((err as Error).message === 'Aborted') {
        console.log('AI generation aborted by user');
      } else {
        console.error('Failed to get AI response', err);
      }
    } finally {
      setIsGenerating(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [isGenerating, currentModel]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, []);

  const handleNewChat = useCallback(() => {
    handleStop();
    setMessages([]);
  }, [handleStop]);

  const toggleHistory = useCallback(() => {
    setIsHistoryOpen(prev => !prev);
  }, []);

  const isEmpty = messages.length === 0;

  return {
    messages,
    isGenerating,
    isHistoryOpen,
    currentModel,
    setCurrentModel,
    handleSend,
    handleStop,
    handleNewChat,
    toggleHistory,
    isEmpty,
  };
}
