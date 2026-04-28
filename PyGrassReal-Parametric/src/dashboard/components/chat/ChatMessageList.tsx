import React, { useRef, useEffect, useCallback, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Message } from "../../types/chat.types";
import type { ChatModel } from "../../types/chat.types";
import { localizeText, useLanguage } from "../../../i18n/language";
import { CHAT_UI, CHAT_MODELS } from "../../data/chatData";
import { MessageBubble } from "./MessageBubble";

import { extractTeamSummary, cleanAgentContent } from "../../utils/agentParser";
import "./ChatMessageList.css";

import hanumanIcon from "../../../assets/Profile-Ai/HANUMAN-AI-512.png";
import phraramIcon from "../../../assets/Profile-Ai/PHRARAM-AI-512.png";
import phralakIcon from "../../../assets/Profile-Ai/PHRALAK-AI-512.png";
import phipekIcon from "../../../assets/Profile-Ai/PHIPEK-AI-512.png";

const AGENT_AVATAR_MAP: Record<string, string> = {
  hanuman: hanumanIcon,
  phraram: phraramIcon,
  phralak: phralakIcon,
  phipek: phipekIcon,
};

function getAgentAvatar(agentName: string): string {
  const key = agentName.toLowerCase();
  for (const [pattern, icon] of Object.entries(AGENT_AVATAR_MAP)) {
    if (key.includes(pattern)) return icon;
  }
  return phraramIcon;
}

interface ChatMessageListProps {
  messages: Message[];
  isGenerating?: boolean;
  currentModel?: ChatModel;
}

const getModelInfo = (modelId?: ChatModel, currentModel?: ChatModel) => {
  const id = modelId || currentModel || "hanuman";
  return CHAT_MODELS.find((m) => m.id === id) ?? CHAT_MODELS[0];
};

export const ChatMessageList = React.memo(
  ({
    messages,
    isGenerating,
    currentModel,
  }: ChatMessageListProps) => {
    const { language } = useLanguage();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [initialMsgIds, setInitialMsgIds] = useState<Set<string>>(
      () => new Set(messages.map((m) => m.id)),
    );
    const [expandedMsgIds, setExpandedMsgIds] = useState<Set<string>>(
      new Set(),
    );
    const prevMessagesRef = useRef(messages);

    useEffect(() => {
      const isAppending =
        messages.length > 0 &&
        prevMessagesRef.current.length > 0 &&
        messages[0].id === prevMessagesRef.current[0].id;

      if (!isAppending && messages.length > 0) {
        setInitialMsgIds(new Set(messages.map((m) => m.id)));
      }
      prevMessagesRef.current = messages;
    }, [messages]);

    const scrollToBottom = useCallback(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const toggleSubAgents = useCallback((msgId: string) => {
      setExpandedMsgIds((prev) => {
        const next = new Set(prev);
        if (next.has(msgId)) next.delete(msgId);
        else next.add(msgId);
        return next;
      });
    }, []);

    useEffect(() => {
      scrollToBottom();
    }, [messages, isGenerating, scrollToBottom]);

    return (
      <div className="chat-messages-scroll-area">
        <div className="chat-messages-inner chat-messages-inner-spacer">
          {messages.map((msg) => {
            // ตรวจสอบว่ามี TEAM_SUMMARY ใน content ของข้อความนี้หรือไม่
            const teamSummary =
              msg.role === "assistant" && msg.content
                ? extractTeamSummary(msg.content)
                : null;

            // สร้าง headerAddon
            // ถ้ามี TEAM_SUMMARY → แสดงกล่องสรุปทีม
            // ถ้าไม่มี → Fallback เป็น Accordion เดิม (Tool Logs)
            const headerAddon = teamSummary ? (
              <div className="team-summary-box">
                <div className="team-summary-title">📋 สรุปการทำงานของทีม</div>
                {teamSummary.map((item) => (
                  <div key={item.agentName} className="team-summary-item">
                    <img
                      src={getAgentAvatar(item.agentName)}
                      alt={item.agentName}
                      className="team-summary-avatar"
                    />
                    <span className="team-summary-agent">{item.agentName}</span>
                    <span className="team-summary-sep">—</span>
                    <span className="team-summary-desc">{item.summary}</span>
                  </div>
                ))}
              </div>
            ) : msg.subAgentMessages && msg.subAgentMessages.length > 0 ? (
              <div className="sub-agent-accordion-container">
                <button
                  className="sub-agent-toggle-btn"
                  onClick={() => toggleSubAgents(msg.id)}
                >
                  {expandedMsgIds.has(msg.id) ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  <span>
                    {expandedMsgIds.has(msg.id)
                      ? "ซ่อนรายละเอียดการทำงาน (Tool Logs)"
                      : `ดูรายละเอียดการทำงาน (${msg.subAgentMessages.length} ขั้นตอน)`}
                  </span>
                </button>

                {expandedMsgIds.has(msg.id) && (
                  <div className="sub-agent-messages">
                    {msg.subAgentMessages.map((sub) => (
                      <div key={sub.id} className="sub-agent-bubble">
                        <div className="sub-agent-avatar">
                          <img
                            src={getAgentAvatar(sub.agentName)}
                            alt={sub.agentName}
                          />
                        </div>
                        <div className="sub-agent-info">
                          <span className="sub-agent-name">
                            {sub.agentName}
                          </span>
                          <div className="sub-agent-content">
                            {sub.content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null;

            return (
              <React.Fragment key={msg.id}>
                <MessageBubble
                  messageId={msg.id}
                  role={msg.role}
                  content={msg.role === "assistant" ? cleanAgentContent(msg.content || '') : msg.content}
                  modelInfo={
                    msg.role === "assistant"
                      ? getModelInfo(msg.model, currentModel)
                      : null
                  }
                  animateTypewriter={!initialMsgIds.has(msg.id)}
                  headerAddon={headerAddon}
                  showUserAvatar={false}
                />
              </React.Fragment>
            );
          })}


          {isGenerating && (
            <MessageBubble
              role="assistant"
              isLoading
              loadingText={localizeText(language, CHAT_UI.thinking)}
              modelInfo={getModelInfo(undefined, currentModel)}
            />
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
    );
  },
);

ChatMessageList.displayName = "ChatMessageList";
