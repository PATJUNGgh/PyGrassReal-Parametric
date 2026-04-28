import React from 'react';
import './ChatLayout.css';

interface ChatLayoutProps {
  children: React.ReactNode;
}

export const ChatLayout = React.memo(({ children }: ChatLayoutProps) => {
  return (
    <div className="chat-layout-wrapper">
      <div className="chat-layout-container">
        {children}
      </div>
    </div>
  );
});

ChatLayout.displayName = 'ChatLayout';
