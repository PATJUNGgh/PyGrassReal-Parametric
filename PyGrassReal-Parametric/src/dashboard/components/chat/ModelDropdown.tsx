import React, { useState } from 'react';
import { ChevronDown, Sparkles, Zap } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import type { ChatModel } from '../../types/chat.types';
export type { ChatModel };
import './ModelDropdown.css';

interface ModelDropdownProps {
  currentModel: ChatModel;
  onModelChange: (model: ChatModel) => void;
  direction?: 'up' | 'down';
}

const MODELS = [
  { id: 'hanuman' as ChatModel, name: 'Hanuman-Ai', icon: <Sparkles size={14} /> },
  { id: 'phraram' as ChatModel, name: 'Phraram-Ai', icon: <Zap size={14} /> },
];

export const ModelDropdown: React.FC<ModelDropdownProps> = ({
  currentModel,
  onModelChange,
  direction = 'up'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));

  const activeModel = MODELS.find(m => m.id === currentModel) || MODELS[0];

  return (
    <div className={`model-dropdown-wrapper is-${direction}`} ref={dropdownRef}>
      <button
        className={`model-dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="model-icon">{activeModel.icon}</span>
        <span className="model-name">{activeModel.name}</span>
        <ChevronDown size={14} className={`chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className="model-dropdown-menu">
          {MODELS.map((model) => (
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
              <span className="model-icon">{model.icon}</span>
              <span className="model-name">{model.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
