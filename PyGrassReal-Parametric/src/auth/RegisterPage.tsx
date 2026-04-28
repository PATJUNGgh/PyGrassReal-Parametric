import { Eye, EyeOff } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AuthCard } from './components/AuthCard';
import { AuthLayout } from './components/AuthLayout';
import { AuthMessage } from './components/AuthMessage';
import { AuthPrimaryButton } from './components/AuthPrimaryButton';
import { AuthTextField } from './components/AuthTextField';
import { AuthFootnote } from './components/AuthFootnote';
import { register } from './services/auth.api';
import type { AuthNotice } from './types/auth.types';
import { usePasswordVisibility } from './hooks/usePasswordVisibility';
import { focusFirstInvalidField } from './utils/focus';
import { clearAuthFailures, getAuthRateLimitStatus, recordAuthFailure } from './utils/rateLimit';
import {
  getConfirmPasswordResult,
  getDisplayNameResult,
  getEmailResult,
  getPasswordResult,
  getPasswordStrength,
  validateConfirmPassword,
  validateDisplayName,
  validateEmail,
  validatePassword,
} from './utils/Authvalidation';
import { authLogger } from './utils/logger';
import { localizeText, type LanguageCode, useLanguage } from '../i18n/language';

interface RegisterPageProps {
  onNavigate: (path: string) => void;
  onToast?: (message: string, tone?: 'success' | 'error') => void;
}

const getRateLimitMessage = (lang: LanguageCode, seconds: number): string =>
  localizeText(lang, {
    th: `มีการพยายามสมัครสมาชิกมากเกินไป กรุณารอ ${seconds} วินาทีก่อนลองใหม่`,
    en: `Too many registration attempts. Please wait ${seconds} seconds and try again.`,
  });

export default function RegisterPage({ onNavigate, onToast }: RegisterPageProps) {
  const { language } = useLanguage();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState({
    displayName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const displayNameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  const passwordVisibility = usePasswordVisibility();
  const confirmPasswordVisibility = usePasswordVisibility();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [notice, setNotice] = useState<AuthNotice | null>(null);

  const displayNameError = touched.displayName || hasSubmitted ? validateDisplayName(displayName, language) : undefined;
  const emailError = touched.email || hasSubmitted ? validateEmail(email, language) : undefined;
  const passwordError = touched.password || hasSubmitted ? validatePassword(password, language) : undefined;
  const confirmPasswordError = touched.confirmPassword || hasSubmitted
    ? validateConfirmPassword(password, confirmPassword, language)
    : undefined;

  const passwordStrength = useMemo(() => getPasswordStrength(password, language), [password, language]);
  const strengthPercent = passwordStrength.maxScore
    ? Math.round((passwordStrength.score / passwordStrength.maxScore) * 100)
    : 0;

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (!touched.displayName) {
      setTouched((prev) => ({ ...prev, displayName: true }));
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (!touched.email) {
      setTouched((prev) => ({ ...prev, email: true }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (!touched.password) {
      setTouched((prev) => ({ ...prev, password: true }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (!touched.confirmPassword) {
      setTouched((prev) => ({ ...prev, confirmPassword: true }));
    }
  };

  const resetFormState = () => {
    setHasSubmitted(false);
    setTouched({
      displayName: false,
      email: false,
      password: false,
      confirmPassword: false,
    });
    setNotice(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    setNotice(null);

    const blockedStatus = getAuthRateLimitStatus('register');
    if (blockedStatus) {
      authLogger.warn('auth.rate_limit.blocked', {
        action: 'register',
        retryAfterSeconds: blockedStatus.retryAfterSeconds,
      });
      const blockedMessage = getRateLimitMessage(language, blockedStatus.retryAfterSeconds);
      setNotice({ tone: 'error', message: blockedMessage });
      onToast?.(blockedMessage, 'error');
      return;
    }

    const displayNameResult = getDisplayNameResult(displayName, language);
    const emailResult = getEmailResult(email, language);
    const passwordResult = getPasswordResult(password, language);
    const confirmPasswordResult = getConfirmPasswordResult(password, confirmPassword, language);

    if (
      displayNameResult.error ||
      emailResult.error ||
      passwordResult.error ||
      confirmPasswordResult.error
    ) {
      const fields: string[] = [];
      if (displayNameResult.error) {
        fields.push('displayName');
      }
      if (emailResult.error) {
        fields.push('email');
      }
      if (passwordResult.error) {
        fields.push('password');
      }
      if (confirmPasswordResult.error) {
        fields.push('confirmPassword');
      }
      authLogger.info('auth.validation.failed', { action: 'register', fields });
      focusFirstInvalidField([
        { hasError: Boolean(displayNameResult.error), ref: displayNameInputRef },
        { hasError: Boolean(emailResult.error), ref: emailInputRef },
        { hasError: Boolean(passwordResult.error), ref: passwordInputRef },
        { hasError: Boolean(confirmPasswordResult.error), ref: confirmPasswordInputRef },
      ]);
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedDisplayName = displayNameResult.value.trim();
      const result = await register(
        emailResult.value,
        passwordResult.value,
        normalizedDisplayName ? normalizedDisplayName : undefined
      );

      if (!result.ok) {
        const message =
          result.message ??
          localizeText(language, {
            th: 'ไม่สามารถสร้างบัญชีได้ในขณะนี้',
            en: 'Unable to create an account right now.',
          });

        if (result.errorKind === 'network') {
          onToast?.(message, 'error');
        } else {
          const blockedAfterFailure = recordAuthFailure('register');
          if (blockedAfterFailure) {
            authLogger.warn('auth.rate_limit.blocked', {
              action: 'register',
              retryAfterSeconds: blockedAfterFailure.retryAfterSeconds,
            });
            const blockedMessage = getRateLimitMessage(language, blockedAfterFailure.retryAfterSeconds);
            setNotice({ tone: 'error', message: blockedMessage });
            onToast?.(blockedMessage, 'error');
            return;
          }
        }

        setNotice({ tone: 'error', message });
        return;
      }

      clearAuthFailures('register');
      resetFormState();
      if (result.message) {
        onToast?.(result.message, 'success');
      }
      onNavigate('/auth/login');
    } catch (error) {
      authLogger.error('auth.register.exception', {
        action: 'register',
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
        title={localizeText(language, { th: 'สร้างบัญชี', en: 'Create account' })}
        subtitle={localizeText(language, {
          th: 'ตั้งค่าการเข้าถึงเวิร์กสเปซของคุณในไม่กี่ขั้นตอน',
          en: 'Set up your workspace access in a few steps.',
        })}
      >
        <div className="auth-stack">
          {notice ? <AuthMessage tone={notice.tone} message={notice.message} /> : null}

          <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
            <AuthTextField
              label={localizeText(language, { th: 'ชื่อที่แสดง (ไม่บังคับ)', en: 'Display Name (optional)' })}
              type="text"
              autoComplete="name"
              value={displayName}
              onValueChange={handleDisplayNameChange}
              disabled={isSubmitting}
              error={displayNameError}
              inputRef={displayNameInputRef}
              onBlur={() => setTouched((prev) => ({ ...prev, displayName: true }))}
            />

            <AuthTextField
              label={localizeText(language, { th: 'อีเมล', en: 'Email' })}
              type="email"
              autoComplete="email"
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
              autoComplete="new-password"
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

            <div className="auth-password-strength" aria-live="polite">
              <div className="auth-password-strength-header">
                <span>
                  {localizeText(language, { th: 'ความแข็งแรงของรหัสผ่าน', en: 'Password strength' })}
                </span>
                <strong className={`auth-password-strength-label is-${passwordStrength.tone}`}>
                  {passwordStrength.label}
                </strong>
              </div>
              <div className="auth-password-strength-bar" role="presentation">
                <span
                  className={`auth-password-strength-fill is-${passwordStrength.tone}`}
                  style={{ width: `${strengthPercent}%` }}
                />
              </div>
              <div className="auth-password-strength-list">
                {passwordStrength.requirements.map((item) => (
                  <div key={item.id} className={`auth-password-strength-item ${item.met ? 'is-met' : ''}`}>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <AuthTextField
              label={localizeText(language, { th: 'ยืนยันรหัสผ่าน', en: 'Confirm Password' })}
              type={confirmPasswordVisibility.type}
              autoComplete="new-password"
              value={confirmPassword}
              onValueChange={handleConfirmPasswordChange}
              disabled={isSubmitting}
              error={confirmPasswordError}
              inputRef={confirmPasswordInputRef}
              onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
              rightSlot={
                <button
                  type="button"
                  className="auth-field-icon"
                  onClick={confirmPasswordVisibility.toggleVisibility}
                  aria-label={confirmPasswordVisibility.isVisible ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {confirmPasswordVisibility.isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <AuthPrimaryButton type="submit" loading={isSubmitting}>
              {localizeText(language, { th: 'สร้างบัญชี', en: 'Create account' })}
            </AuthPrimaryButton>
          </form>

          <AuthFootnote
            text={localizeText(language, { th: 'มีบัญชีอยู่แล้วใช่ไหม?', en: 'Already have an account?' })}
            actionText={localizeText(language, { th: 'เข้าสู่ระบบ', en: 'Sign in' })}
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
