import { useState } from 'react';
import type { FormEvent } from 'react';
import { AuthCard } from './components/AuthCard';
import { AuthLayout } from './components/AuthLayout';
import { AuthMessage } from './components/AuthMessage';
import { AuthPrimaryButton } from './components/AuthPrimaryButton';
import { AuthTextField } from './components/AuthTextField';
import { requestPasswordReset } from './services/auth.api';
import type { AuthNotice } from './types/auth.types';

interface ForgotPasswordPageProps {
  onNavigate: (path: string) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (email: string): string | undefined => {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return 'Email is required.';
  }

  if (!EMAIL_PATTERN.test(trimmedEmail)) {
    return 'Please enter a valid email address.';
  }

  return undefined;
};

export default function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [notice, setNotice] = useState<AuthNotice | null>(null);

  const emailError = hasSubmitted ? validateEmail(email) : undefined;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    setNotice(null);

    const nextEmailError = validateEmail(email);
    if (nextEmailError) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(email.trim());
      setNotice({
        tone: result.ok ? 'success' : 'error',
        message:
          result.message ??
          (result.ok
            ? 'If this email exists, we sent a reset link.'
            : 'Unable to send reset link. Please try again.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard title="Forgot password" subtitle="Enter your email and we will send a reset link.">
        <div className="auth-stack">
          {notice ? <AuthMessage tone={notice.tone} message={notice.message} /> : null}

          <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
            <AuthTextField
              label="Email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onValueChange={setEmail}
              disabled={isSubmitting}
              error={emailError}
            />

            <AuthPrimaryButton type="submit" loading={isSubmitting}>
              Send reset link
            </AuthPrimaryButton>
          </form>

          <p className="auth-footnote">
            Remembered your password?{' '}
            <button
              type="button"
              className="auth-inline-link"
              onClick={() => onNavigate('/auth/login')}
              disabled={isSubmitting}
            >
              Back to login
            </button>
          </p>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
