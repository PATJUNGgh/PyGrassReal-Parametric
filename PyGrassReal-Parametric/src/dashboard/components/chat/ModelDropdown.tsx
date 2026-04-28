import React, { useState } from 'react';
import { ChevronDown, Bot } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import type { ChatModel } from '../../types/chat.types';
import { CHAT_MODELS } from '../../data/chatData';
import './ModelDropdown.css';

export type { ChatModel };

interface ModelDropdownProps {
  currentModel: ChatModel;
  onModelChange: (model: ChatModel) => void;
  direction?: 'up' | 'down';
}

export const ModelDropdown = React.memo(({
  currentModel,
  onModelChange,
  direction = 'up'
}: ModelDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));

  const activeModel = CHAT_MODELS.find(m => m.id === currentModel) || CHAT_MODELS[0];

  return (
    <div className={`model-dropdown-wrapper is-${direction}`} ref={dropdownRef}>
      <button
        className={`model-dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="model-icon ai-bot-wrapper">
          <Bot size={14} className="ai-bot-icon" />
        </span>
        <span className="model-name">{activeModel.name}</span>
        <ChevronDown size={14} className={`chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className="model-dropdown-menu">
          {CHAT_MODELS.map((model) => (
            <button
              key={model.id}
              className={`model-option ${currentModel === model.id ? 'active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onModelChange(model.id);
                setIsOpen(false);
              }}
              type="button"
            >
              <span className="model-icon ai-bot-wrapper">
                <Bot size={14} className="ai-bot-icon" />
              </span>
              <span className="model-name">{model.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

ModelDropdown.displayName = 'ModelDropdown';
