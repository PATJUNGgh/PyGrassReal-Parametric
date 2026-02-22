import type { AuthNoticeTone } from '../types/auth.types';

interface AuthMessageProps {
  tone: AuthNoticeTone;
  message: string;
}

export function AuthMessage({ tone, message }: AuthMessageProps) {
  return <p className={`auth-message ${tone === 'error' ? 'is-error' : 'is-success'}`}>{message}</p>;
}
