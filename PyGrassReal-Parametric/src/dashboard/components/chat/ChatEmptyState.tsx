import React from 'react';
import './ChatEmptyState.css';

// Using actual logos from src/assets/
import logoWithText from '../../../assets/logo-with-text.png';

export const ChatEmptyState = React.memo(() => {
  return (
    <div className="chat-empty-state">
      <div className="chat-empty-logo-wrapper">
        <img
          src={logoWithText}
          alt="PyGrassReal-Ai Logo"
          className="chat-empty-logo"
        />
      </div>
    </div>
  );
});

ChatEmptyState.displayName = 'ChatEmptyState';
