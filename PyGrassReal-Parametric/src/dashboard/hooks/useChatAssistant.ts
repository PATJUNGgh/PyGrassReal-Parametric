import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Message, ChatModel, AgentStep, SubAgentMessage } from '../types/chat.types';
import { useProfile } from '../../auth/hooks/useProfile';
import { localizeText, useLanguage } from '../../i18n/language';
import { logStructured, isAbortError, sanitizeInput } from '../utils';
import { CHAT_LIMITS, CHAT_COMPOSER_UI } from '../data/chatData';
import {
  sendDashboardMessage,
  resetDashboardSession,
  getDashboardSessionId,
  type DashboardChatModel,
} from '../services/dashboard.chat.api';
import { getChatMemoryBySessionId } from '../services/dashboard.memory.api';
import { useUserEntitlement } from './useUserEntitlement';
import {
  detectAgentsFromContent,
  parseSystemStatusMessage,
  cleanAgentContent,
  extractProgressLabel
} from '../utils/agentParser';

const createMessage = (role: 'user' | 'assistant', content: string, model?: ChatModel): Message => ({
  id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  role,
  content,
  timestamp: Date.now(),
  model,
});

type SessionResetOptions = {
  suppressToast?: boolean;
};

export function useChatAssistant({ pushToast, getErrorMessage }: {
  pushToast?: (message: string, tone?: 'success' | 'error') => void;
  getErrorMessage?: (error: unknown) => string;
} = {}) {
  const { language } = useLanguage();
  const { id: realUserId } = useProfile();
  const { entitlement } = useUserEntitlement();
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const sessionId = getDashboardSessionId();
      const stored = window.localStorage.getItem(`dashboard_chat_history_${sessionId}`);
      if (stored) {
        return JSON.parse(stored) as Message[];
      }
    } catch (err) {
      console.error('[Dashboard AI] Failed to load local chat history', err);
    }
    return [];
  });
  const messagesRef = useRef(messages);

  const updateMessages = useCallback((nextMessages: Message[] | ((prev: Message[]) => Message[])) => {
    setMessages((prev) => {
      const resolved =
        typeof nextMessages === 'function'
          ? (nextMessages as (prev: Message[]) => Message[])(prev)
          : nextMessages;
      messagesRef.current = resolved;
      return resolved;
    });
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const sessionId = getDashboardSessionId();
    window.localStorage.setItem(`dashboard_chat_history_${sessionId}`, JSON.stringify(messages));
  }, [messages]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<ChatModel>('hanuman');
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentModelRef = useRef(currentModel);
  const isGeneratingRef = useRef(isGenerating);
  const lastSendTimeRef = useRef<number>(0);
  const lastSentContentRef = useRef<string>('');
  // Polling refs
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const polledRowIdsRef = useRef<Set<number>>(new Set());        // rows ที่เคยดึงมาแล้ว
  const pendingAssistantIdRef = useRef<string | null>(null);     // id ของ assistant message ที่กำลัง generate

  // ─── Playback Queue ─────────────────────────────────────────────────────────
  const playbackQueueRef = useRef<SubAgentMessage[]>([]);
  const isProcessingQueueRef = useRef(false);
  const finalResponseRef = useRef<{ output: string; steps?: { agentName: string; label: string }[] } | null>(null);
  const finalResponseReadyRef = useRef(false);
  const placeholderIdRef = useRef<string | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    currentModelRef.current = currentModel;
    isGeneratingRef.current = isGenerating;
  }, [currentModel, isGenerating]);

  const isFreeTier = !entitlement || entitlement.plan_id === 'free';

  // ─── Playback Queue Processor ───────────────────────────────────────────────
  const processQueue = useCallback(() => {
    if (isProcessingQueueRef.current) return;
    if (playbackQueueRef.current.length === 0) {
      // คิวว่าง: ถ้ามี final response รอแสดงอยู่ -> แสดงเลย
      if (finalResponseReadyRef.current && finalResponseRef.current && placeholderIdRef.current) {
        const fr = finalResponseRef.current;
        const pid = placeholderIdRef.current;

        // ดึงลีดเดอร์บอร์ดปัจจุบันมาบังคับเป็น Done ทั้งหมด เพื่อแสดงผลความสำเร็จ
        const finalSteps = agentSteps.map(s => ({ ...s, status: 'done' as const }));
        setAgentSteps(finalSteps);

        // อัปเดต placeholder message ด้วยคำตอบจริง และบันทึกขั้นตอนที่เสร็จสิ้นลงไปด้วย
        const assistantMessage = createMessage('assistant', fr.output, 'phraram');
        assistantMessage.agentSteps = finalSteps;

        updateMessages((prev) =>
          prev.map((m) =>
            m.id === pid
              ? { ...assistantMessage, id: pid, subAgentMessages: m.subAgentMessages }
              : m,
          ),
        );

        setIsGenerating(false);
        setTimeout(() => setAgentSteps([]), 1500);

        // เคลียร์ refs
        finalResponseRef.current = null;
        finalResponseReadyRef.current = false;
        placeholderIdRef.current = null;
        // หมายเหตุ: เราจะไม่เคลียร์ pendingAssistantIdRef ตรงนี้ เพื่อให้ข้อความที่อาจจะหลุดมาทีหลังยังรู้ว่าต้องไปแปะที่ไหน

        // เมื่อประมวลผลเสร็จสิ้นทุกอย่างแล้วจริงๆ ค่อยหยุด Polling
        stopPolling();
      }
      return;
    }

    isProcessingQueueRef.current = true;
    const item = playbackQueueRef.current.shift()!;

    // Step 1: ตั้ง Stepper ของ agent นี้เป็น Active (ทำเครื่อง "กำลังคิด")
    setAgentSteps((prev) =>
      prev.map((step) => {
        if (step.agentName === item.agentName && (step.status === 'pending' || step.status === 'done')) {
          // กรณีที่ Agent ถูกเรียกซ้ำ (เช่น Phraram ทำหลายรอบ) ให้แสดง active อีกครั้ง
          return { ...step, status: 'active' as const };
        }
        // mark ตัวก่อนหน้าว่า done
        if (step.status === 'active' && step.agentName !== item.agentName) {
          return { ...step, status: 'done' as const };
        }
        return step;
      }),
    );

    // Step 2: หน่วงเวลาสั้นๆ (จำลองการประมวลผล)
    const thinkingDelay = 500 + Math.random() * 500; // 0.5 - 1.0 วินาที (เร็วขึ้นเพื่อไม่ให้ Stepper ค้าง)
    setTimeout(() => {
      // ดึงข้อความที่สะอาดแล้ว และ Dynamic Label
      const cleanedContent = cleanAgentContent(item.content, true); // true เพราะเป็น sub-agent message (Tool Log)
      const dynamicLabel = extractProgressLabel(item.content);

      // Step 3: แสดงกล่องข้อความย่อย (Sub-agent Bubble)
      // กรองข้อความที่เป็น "ผลลัพธ์สุดท้าย" ออก เพราะจะซ้ำกับคำตอบหลักของ Phraram ข้างล่าง
      const isResultMessage = /^\[Used tools:/i.test(cleanedContent) || /^\*\*ขออภัย/i.test(cleanedContent) || /^\*\*สรุป/i.test(cleanedContent);

      if (isResultMessage) {
        console.log(`[Queue] Filtered out result-type message from ${item.agentName} (duplicate of main response)`);
      } else if (pendingAssistantIdRef.current) {
        const targetId = pendingAssistantIdRef.current;
        const cleanedItem = { ...item, content: cleanedContent };

        console.log(`[Queue] Appending sub-agent message for agent: ${item.agentName} to message ID: ${targetId}`);

        updateMessages((prev) =>
          prev.map((m) =>
            m.id === targetId
              ? { ...m, subAgentMessages: [...(m.subAgentMessages ?? []), cleanedItem] }
              : m,
          ),
        );
      } else {
        console.warn(`[Queue] Skipped message update for ${item.agentName} because pendingAssistantIdRef is null`);
      }

      // Step 4: ตั้ง Stepper เป็น Done และอัปเดต Label (ถ้ามี)
      setAgentSteps((prev) =>
        prev.map((step) => {
          if (step.agentName === item.agentName && step.status === 'active') {
            return {
              ...step,
              status: 'done' as const,
              label: dynamicLabel || step.label // อัปเดต Label ถ้าเจอ Tag ใหม่จากสมอง AI
            };
          }
          return step;
        }),
      );

      isProcessingQueueRef.current = false;
      // ดำเนินต่อกับไอเท็มถัดไป
      processQueue();
    }, thinkingDelay);
  }, [agentSteps, updateMessages]);

  // ─── Polling helper (ดึงข้อมูลจาก Supabase แล้วเข้า Queue) ────────────────
  const startPolling = useCallback((assistantMsgId: string, startingMaxId: number) => {
    polledRowIdsRef.current = new Set();
    pendingAssistantIdRef.current = assistantMsgId;
    playbackQueueRef.current = [];
    isProcessingQueueRef.current = false;
    finalResponseRef.current = null;
    finalResponseReadyRef.current = false;
    const baselineMaxId = startingMaxId;

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const sessionId = getDashboardSessionId();
        const rows = await getChatMemoryBySessionId(sessionId);

        // กรองเฉพาะแถว ai ที่ id มากกว่า baseline และยังไม่เคยดึงมาก่อน
        const newAiRows = rows.filter(
          (r) => r.message?.type === 'ai' && r.id > baselineMaxId && !polledRowIdsRef.current.has(r.id),
        );
        if (newAiRows.length === 0) return;

        console.log(`[Polling] Found ${newAiRows.length} new AI rows`);

        for (const row of newAiRows) {
          polledRowIdsRef.current.add(row.id);
          const content = row.message?.content ?? '';
          const agents = detectAgentsFromContent(content);

          console.log(`[Polling] Row ID ${row.id} detected agents:`, agents.map(a => a.agentName));

          if (agents.length > 0) {
            // เอาข้อความเข้าคิว เฉพาะ Agent ที่ยังไม่เคยเข้าคิวมาก่อน (ป้องกัน Stepper ซ้ำซ้อน)
            agents.forEach((agent) => {
              const alreadyQueued = playbackQueueRef.current.some(q => q.agentName === agent.agentName);
              if (alreadyQueued) {
                console.log(`[Polling] Skipping duplicate queue entry for ${agent.agentName} (already queued)`);
                return;
              }
              playbackQueueRef.current.push({
                id: `sub-${row.id}-${agent.agentName}`,
                agentName: agent.agentName,
                content,
                timestamp: new Date(row.created_at).getTime(),
              });
            });
          }
        }

        // เตะ processor ให้เริ่มทำงาน (ถ้ายังไม่ได้ทำ)
        processQueue();
      } catch {
        // Polling ไม่ควร throw ให้ silent fail
      }
    }, 2000);
  }, [processQueue]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('[Polling] Stopped polling.');
    }
    // หมายเหตุ: เราจะไม่เคลียร์ pendingAssistantIdRef ตรงนี้ 
    // เพราะ processQueue ยังต้องใช้ ID นี้เพื่อเอาข้อความที่ค้างอยู่ในคิวไปใส่ใน Message Bubble ให้ครบ
  }, []);

  const handleNewChat = useCallback((options: SessionResetOptions = {}) => {
    stopPolling();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const sessionId = resetDashboardSession();
    pendingAssistantIdRef.current = null;
    playbackQueueRef.current = [];
    isProcessingQueueRef.current = false;
    finalResponseRef.current = null;
    finalResponseReadyRef.current = false;
    placeholderIdRef.current = null;
    polledRowIdsRef.current = new Set();
    lastSentContentRef.current = '';
    messagesRef.current = [];

    updateMessages([]);
    setIsGenerating(false);
    setAgentSteps([]);

    if (!options.suppressToast) {
      pushToast?.(language === 'th' ? 'เริ่มการสนทนาใหม่แล้ว' : 'New conversation started', 'success');
    }

    return sessionId;
  }, [language, pushToast, stopPolling, updateMessages]);

  const handleSend = useCallback(async (content: string, searchMode: 'auto' | 'off' = 'auto') => {
    const now = Date.now();
    const trimmedContent = (content || '').trim();

    // Simple 1-second cooldown to prevent double-click spam
    if (now - lastSendTimeRef.current < 1000) return;

    // Harder anti-idempotency: prevent exact same message within 5s
    if (trimmedContent === lastSentContentRef.current && now - lastSendTimeRef.current < 5000) return;

    if (isGeneratingRef.current || !trimmedContent) return;

    if (trimmedContent.length > CHAT_LIMITS.MESSAGE_MAX_LENGTH) {
      pushToast?.(localizeText(language, CHAT_COMPOSER_UI.errorTooLong), 'error');
      return;
    }

    const cleanContent = sanitizeInput(trimmedContent, undefined, { preserveLineBreaks: true });
    if (!cleanContent) return;

    lastSendTimeRef.current = now;
    lastSentContentRef.current = trimmedContent;
    const modelAtTimeOfSend = currentModelRef.current;

    if (searchMode === 'auto' && isFreeTier) {
      const userMessage = createMessage('user', cleanContent);
      const warningMessage = createMessage('assistant', localizeText(language, {
        th: '⚠️ ฟีเจอร์ **ค้นหาเว็บ (Web Search)** สงวนสิทธิ์ใช้งานเฉพาะแพ็คเกจ Starter ขึ้นไป\n\n[ดูรายละเอียดและอัปเกรดแพ็คเกจได้ที่นี่](/pricing?from=chat)',
        en: '⚠️ **Web Search** feature is available for Starter package or higher.\n\n[View details and upgrade here](/pricing?from=chat)'
      }), modelAtTimeOfSend);
      updateMessages((prev) => [...prev, userMessage, warningMessage]);
      return;
    }

    const userMessage = createMessage('user', cleanContent);
    updateMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);

    // ตั้ง Stepper เริ่มต้นสำหรับโหมด Phraram (Multi-Agent)
    // ถ้ารุ่น Phraram, ต้องไปหา ID ล่าสุดก่อน จะได้รู้ว่า baseline ID คืออะไร ก่อนที่ n8n จะแทรก
    let startingMaxId = -1;
    if (modelAtTimeOfSend === 'phraram') {
      try {
        const currentRows = await getChatMemoryBySessionId(getDashboardSessionId());
        startingMaxId = currentRows.length > 0 ? Math.max(...currentRows.map(r => r.id)) : 0;
      } catch (err) {
        console.warn('Could not get initial chat memory max ID, using 0', err);
        startingMaxId = 0;
      }
    }

    // สร้าง placeholder assistant message ก่อน เพื่อให้ polling แนบ subAgentMessages ได้
    let placeholderAssistantId: string | null = null;
    if (modelAtTimeOfSend === 'phraram') {
      setAgentSteps([
        { id: 'step-phraram-analyze', agentName: 'Phraram-Ai', label: 'วิเคราะห์คำสั่งและแบ่งงาน', status: 'active' },
        { id: 'step-hanuman', agentName: 'Hanuman-Ai', label: 'ฝ่ายวิจัยค้นหาข้อมูลและสรุปเนื้อหาเบื้องต้น', status: 'pending' },
        { id: 'step-phralak', agentName: 'Phralak-Ai', label: 'ฝ่ายสร้างสรรค์เอกสารและหัวหน้าทีมโปรแกรมเมอร์', status: 'pending' },
        { id: 'step-phipek', agentName: 'Phipek-Ai', label: 'ฝ่ายตรวจสอบความถูกต้องแบบเข้มงวด (QC & Security)', status: 'pending' },
        { id: 'step-phraram-respond', agentName: 'Phraram-Ai', label: 'ประมวลผลคำตอบสุดท้าย', status: 'pending' },
      ]);
      // สร้าง placeholder ล่วงหน้า
      const placeholderMsg = createMessage('assistant', '', modelAtTimeOfSend);
      placeholderAssistantId = placeholderMsg.id;
      placeholderIdRef.current = placeholderMsg.id;
      updateMessages((prev) => [...prev, placeholderMsg]);
      startPolling(placeholderMsg.id, startingMaxId);
    } else {
      setAgentSteps([]);
    }

    logStructured('User sent message', { user_message_id: userMessage.id, model: modelAtTimeOfSend });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // ส่งข้อความไปยัง n8n Webhook จริง
      const result = await sendDashboardMessage({
        text: cleanContent,
        model: modelAtTimeOfSend as DashboardChatModel,
        searchMode,
        signal: controller.signal,
      }, realUserId); // <--- HERE IS THE FIX: Passing actual user ID

      if (modelAtTimeOfSend === 'phraram') {
        // กัก final response ไว้ รอให้คิว playback ว่างก่อนค่อยแสดง
        // เราจะไม่เรียก stopPolling() ทันทีที่นี่ เพื่อรอให้ Polling รอบสุดท้ายเก็บตกข้อมูลที่อาจจะดีเลย์ใน DB
        finalResponseRef.current = { output: result.output, steps: result.steps };
        finalResponseReadyRef.current = true;

        // เตะ processor ให้ตรวจสอบว่าคิวว่างแล้วหรือยัง (ถ้าว่างมันจะโชว์ final response และหยุด Polling เอง)
        processQueue();
      } else {
        const assistantMessage = createMessage('assistant', result.output, modelAtTimeOfSend);
        updateMessages((prev) => [...prev, assistantMessage]);
        setIsGenerating(false);
      }
    } catch (err) {
      if (!isAbortError(err)) {
        console.error('[Dashboard AI] Failed to get AI response', err);
        pushToast?.(getErrorMessage ? getErrorMessage(err) : 'AI ไม่ตอบสนอง กรุณาลองใหม่', 'error');
      }
      // ลบ placeholder ถ้า error
      if (placeholderAssistantId) {
        updateMessages((prev) => prev.filter((m) => m.id !== placeholderAssistantId));
      }
      setIsGenerating(false);
    } finally {
      // หมายเหตุ: เราย้าย stopPolling() ไปไว้ใน processQueue และ catch block เพื่อความแม่นยำในการเคลียร์คิว
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  }, [getErrorMessage, isFreeTier, language, processQueue, pushToast, realUserId, startPolling, updateMessages]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopPolling();
    setIsGenerating(false);
  }, [stopPolling]);

  const loadSession = useCallback((sessionId: string) => {
    handleStop();
    window.localStorage.setItem('dashboard_chat_session_id', sessionId);
    try {
      const stored = window.localStorage.getItem(`dashboard_chat_history_${sessionId}`);
      if (stored) {
        updateMessages(JSON.parse(stored) as Message[]);
      } else {
        updateMessages([]);
      }
    } catch (err) {
      console.error('[Dashboard AI] Failed to load local chat history for session', err);
      updateMessages([]);
    }
  }, [handleStop, updateMessages]);

  const toggleHistory = useCallback(() => {
    setIsHistoryOpen(prev => !prev);
  }, []);

  const isEmpty = messages.length === 0;

  return useMemo(() => ({
    messages,
    isGenerating,
    isHistoryOpen,
    currentModel,
    setCurrentModel,
    handleSend,
    handleStop,
    handleNewChat,
    loadSession,
    toggleHistory,
    isEmpty,
    agentSteps,
    isFreeTier,
  }), [
    messages,
    isGenerating,
    isHistoryOpen,
    currentModel,
    handleSend,
    handleStop,
    handleNewChat,
    loadSession,
    toggleHistory,
    isEmpty,
    agentSteps,
    isFreeTier,
  ]);
}
