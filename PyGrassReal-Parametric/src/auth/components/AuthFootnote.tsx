import React from 'react';

interface AuthFootnoteProps {
  text: string;
  actionText: string;
  onClick: () => void;
  disabled?: boolean;
}

export function AuthFootnote({ text, actionText, onClick, disabled }: AuthFootnoteProps) {
  return (
    <p className="auth-footnote">
      {text}{' '}
      <button
        type="button"
        className="auth-inline-link"
        onClick={onClick}
        disabled={disabled}
      >
        {actionText}
      </button>
    </p>
  );
}
