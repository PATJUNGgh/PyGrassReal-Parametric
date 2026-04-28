export type AuthErrorKind = 'auth' | 'network' | 'unknown';

export interface AuthResult {
  ok: boolean;
  message?: string;
  errorKind?: AuthErrorKind;
}

export type AuthNoticeTone = 'success' | 'error';

export interface AuthNotice {
  tone: AuthNoticeTone;
  message: string;
}
