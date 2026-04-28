import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AuthCard } from './components/AuthCard';
import { AuthLayout } from './components/AuthLayout';
import { AuthMessage } from './components/AuthMessage';
import { AuthPrimaryButton } from './components/AuthPrimaryButton';
import { AuthTextField } from './components/AuthTextField';
import { AuthFootnote } from './components/AuthFootnote';
import { requestPasswordReset } from './services/auth.api';
import type { AuthNotice } from './types/auth.types';
import { focusFirstInvalidField } from './utils/focus';
import { getEmailResult, validateEmail } from './utils/Authvalidation';
import { authLogger } from './utils/logger';
import { localizeText, useLanguage } from '../i18n/language';

interface ForgotPasswordPageProps {
  onNavigate: (path: string) => void;
  onToast?: (message: string, tone?: 'success' | 'error') => void;
}

export default function ForgotPasswordPage({ onNavigate, onToast }: ForgotPasswordPageProps) {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [notice, setNotice] = useState<AuthNotice | null>(null);

  const emailError = touched || hasSubmitted ? validateEmail(email, language) : undefined;

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (!touched) {
      setTouched(true);
    }
  };

  const resetFormState = () => {
    setHasSubmitted(false);
    setTouched(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    setNotice(null);

    const emailResult = getEmailResult(email, language);
    if (emailResult.error) {
      authLogger.info('auth.validation.failed', { action: 'password_reset', fields: ['email'] });
      focusFirstInvalidField([{ hasError: true, ref: emailInputRef }]);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(emailResult.value);
      const message =
        result.message ??
        (result.ok
          ? localizeText(language, {
              th: 'หากมีอีเมลนี้ในระบบ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปให้แล้ว',
              en: 'If this email exists, we sent a reset link.',
            })
          : localizeText(language, {
              th: 'ไม่สามารถส่งลิงก์รีเซ็ตได้ กรุณาลองใหม่อีกครั้ง',
              en: 'Unable to send reset link. Please try again.',
            }));

      if (!result.ok && result.errorKind === 'network') {
        onToast?.(message, 'error');
      }

      setNotice({
        tone: result.ok ? 'success' : 'error',
        message,
      });
      if (result.ok) {
        resetFormState();
      }
    } catch (error) {
      authLogger.error('auth.password_reset.exception', {
        action: 'password_reset',
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
        title={localizeText(language, { th: 'ลืมรหัสผ่าน', en: 'Forgot password' })}
        subtitle={localizeText(language, {
          th: 'ใส่อีเมลของคุณแล้วเราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปให้',
          en: 'Enter your email and we will send a reset link.',
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
              onBlur={() => setTouched(true)}
            />

            <AuthPrimaryButton type="submit" loading={isSubmitting}>
              {localizeText(language, { th: 'ส่งลิงก์รีเซ็ต', en: 'Send reset link' })}
            </AuthPrimaryButton>
          </form>

          <AuthFootnote
            text={localizeText(language, { th: 'จำรหัสผ่านได้แล้วใช่ไหม?', en: 'Remembered your password?' })}
            actionText={localizeText(language, { th: 'กลับไปยังหน้าล็อกอิน', en: 'Back to login' })}
            onClick={() => {
              resetFormState();
              onNavigate('/auth/login');
            }}
            disabled={isSubmitting}
          />
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
