export interface AuthResult {
  ok: boolean;
  message?: string;
}

export type AuthNoticeTone = 'success' | 'error';

export interface AuthNotice {
  tone: AuthNoticeTone;
  message: string;
}
