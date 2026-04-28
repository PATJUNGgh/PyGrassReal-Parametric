import { Eye, EyeOff } from 'lucide-react';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AuthCard } from './components/AuthCard';
import { AuthDivider } from './components/AuthDivider';
import { AuthLayout } from './components/AuthLayout';
import { AuthMessage } from './components/AuthMessage';
import { AuthPrimaryButton } from './components/AuthPrimaryButton';
import { AuthTextField } from './components/AuthTextField';
import { AuthFootnote } from './components/AuthFootnote';
import { signIn } from './services/auth.api';
import type { AuthNotice } from './types/auth.types';
import { usePasswordVisibility } from './hooks/usePasswordVisibility';
import { focusFirstInvalidField } from './utils/focus';
import { clearAuthFailures, getAuthRateLimitStatus, recordAuthFailure } from './utils/rateLimit';
import { getEmailResult, getLoginPasswordResult, validateEmail, validateLoginPassword } from './utils/Authvalidation';
import { authLogger } from './utils/logger';
import { localizeText, type LanguageCode, useLanguage } from '../i18n/language';

interface LoginPageProps {
  onNavigate: (path: string) => void;
  onAuthenticated?: () => void;
  onToast?: (message: string, tone?: 'success' | 'error') => void;
}

const getRateLimitMessage = (lang: LanguageCode, seconds: number): string =>
  localizeText(lang, {
    th: `มีการพยายามเข้าสู่ระบบมากเกินไป กรุณารอ ${seconds} วินาทีก่อนลองใหม่`,
    en: `Too many sign-in attempts. Please wait ${seconds} seconds and try again.`,
  });

export default function LoginPage({ onNavigate, onAuthenticated, onToast }: LoginPageProps) {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const passwordVisibility = usePasswordVisibility();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [notice, setNotice] = useState<AuthNotice | null>(null);

  const emailError = touched.email || hasSubmitted ? validateEmail(email, language) : undefined;
  const passwordError = touched.password || hasSubmitted ? validateLoginPassword(password, language) : undefined;

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (!touched.email) {
      setTouched((prev) => ({ ...prev, email: true }));
    }
  };

  const resetFormState = () => {
    setHasSubmitted(false);
    setTouched({ email: false, password: false });
    setNotice(null);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (!touched.password) {
      setTouched((prev) => ({ ...prev, password: true }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    setNotice(null);

    const blockedStatus = getAuthRateLimitStatus('login');
    if (blockedStatus) {
      authLogger.warn('auth.rate_limit.blocked', {
        action: 'login',
        retryAfterSeconds: blockedStatus.retryAfterSeconds,
      });
      const blockedMessage = getRateLimitMessage(language, blockedStatus.retryAfterSeconds);
      setNotice({ tone: 'error', message: blockedMessage });
      onToast?.(blockedMessage, 'error');
      return;
    }

    const emailResult = getEmailResult(email, language);
    const passwordResult = getLoginPasswordResult(password, language);

    if (emailResult.error || passwordResult.error) {
      const fields: string[] = [];
      if (emailResult.error) {
        fields.push('email');
      }
      if (passwordResult.error) {
        fields.push('password');
      }
      authLogger.info('auth.validation.failed', { action: 'login', fields });
      focusFirstInvalidField([
        { hasError: Boolean(emailResult.error), ref: emailInputRef },
        { hasError: Boolean(passwordResult.error), ref: passwordInputRef },
      ]);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn(emailResult.value, passwordResult.value);
      if (!result.ok) {
        const message =
          result.message ??
          localizeText(language, {
            th: 'ไม่สามารถเข้าสู่ระบบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
            en: 'Unable to sign in right now. Please try again.',
          });

        if (result.errorKind === 'network') {
          onToast?.(message, 'error');
        } else {
          const blockedAfterFailure = recordAuthFailure('login');
          if (blockedAfterFailure) {
            authLogger.warn('auth.rate_limit.blocked', {
              action: 'login',
              retryAfterSeconds: blockedAfterFailure.retryAfterSeconds,
            });
            const blockedMessage = getRateLimitMessage(language, blockedAfterFailure.retryAfterSeconds);
            setNotice({ tone: 'error', message: blockedMessage });
            onToast?.(blockedMessage, 'error');
            return;
          }
        }

        setNotice({
          tone: 'error',
          message,
        });
        return;
      }

      clearAuthFailures('login');
      resetFormState();
      if (onAuthenticated) {
        onAuthenticated();
      } else {
        onNavigate('/dashboard');
      }
    } catch (error) {
      authLogger.error('auth.sign_in.exception', {
        action: 'login',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      const message = localizeText(language, {
        th: 'เกิดข้อผิดพลาดของเครือข่าย กรุณาลองใหม่อีกครั้ง',
        en: 'A network error occurred. Please try again.',
      });
      onToast?.(message, 'error');
      setNotice({ tone: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title={localizeText(language, { th: 'ยินดีต้อนรับกลับมา', en: 'Welcome back' })}
        subtitle={localizeText(language, {
          th: 'เข้าสู่ระบบเพื่อไปยังแดชบอร์ดและตัวแก้ไขโหนดของคุณ',
          en: 'Sign in to continue to your dashboard and node editor.',
        })}
      >
        <div className="auth-stack">
          {notice ? <AuthMessage tone={notice.tone} message={notice.message} /> : null}

          <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
            <AuthTextField
              label={localizeText(language, { th: 'อีเมล', en: 'Email' })}
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onValueChange={handleEmailChange}
              disabled={isSubmitting}
              error={emailError}
              inputRef={emailInputRef}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            />

            <AuthTextField
              label={localizeText(language, { th: 'รหัสผ่าน', en: 'Password' })}
              type={passwordVisibility.type}
              autoComplete="current-password"
              value={password}
              onValueChange={handlePasswordChange}
              disabled={isSubmitting}
              error={passwordError}
              inputRef={passwordInputRef}
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              rightSlot={
                <button
                  type="button"
                  className="auth-field-icon"
                  onClick={passwordVisibility.toggleVisibility}
                  aria-label={passwordVisibility.isVisible ? 'Hide password' : 'Show password'}
                >
                  {passwordVisibility.isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <div className="auth-link-row">
              <button
                type="button"
                className="auth-link-button"
                onClick={() => {
                  resetFormState();
                  onNavigate('/auth/forgot');
                }}
                disabled={isSubmitting}
              >
                {localizeText(language, { th: 'ลืมรหัสผ่าน?', en: 'Forgot password?' })}
              </button>
            </div>

            <AuthPrimaryButton type="submit" loading={isSubmitting}>
              {localizeText(language, { th: 'เข้าสู่ระบบ', en: 'Sign in' })}
            </AuthPrimaryButton>
          </form>

          <AuthDivider label={localizeText(language, { th: 'หรือ', en: 'or' })} />

          <AuthFootnote
            text={localizeText(language, { th: 'ยังไม่มีบัญชีใช่ไหม?', en: 'New to PyGrassReal?' })}
            actionText={localizeText(language, { th: 'สร้างบัญชี', en: 'Create account' })}
            onClick={() => {
              resetFormState();
              onNavigate('/auth/register');
            }}
            disabled={isSubmitting}
          />
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
