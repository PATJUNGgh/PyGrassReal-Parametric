import React, { useRef, useEffect } from 'react';
import { User, Bot, Loader2 } from 'lucide-react';
import type { Message } from '../../types/chat.types';
import './ChatMessageList.css';

interface ChatMessageListProps {
  messages: Message[];
  isGenerating?: boolean;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({ messages, isGenerating }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  return (
    <div className="chat-messages-scroll-area">
      <div className="chat-messages-inner" style={{ paddingBottom: '180px' }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`message-bubble-row ${msg.role}`}>
            <div className="message-icon-wrapper">
              {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>
            <div className="message-bubble-content">
              <div className="message-role-label">
                {msg.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div className="message-text-body">{msg.content}</div>
            </div>
          </div>
        ))}
        {isGenerating && (
          <div className="message-bubble-row assistant generating">
            <div className="message-icon-wrapper">
              <Bot size={18} />
            </div>
            <div className="message-bubble-content">
              <div className="message-role-label">Assistant</div>
              <div className="message-text-body">
                <Loader2 size={16} className="animate-spin" />
                <span style={{ marginLeft: '8px', opacity: 0.7 }}>Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
