import React from 'react';
import './ChatLayout.css';

interface ChatLayoutProps {
  children: React.ReactNode;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ children }) => {
  return (
    <div className="chat-layout-wrapper">
      <div className="chat-layout-container">
        {children}
      </div>
    </div>
  );
};
