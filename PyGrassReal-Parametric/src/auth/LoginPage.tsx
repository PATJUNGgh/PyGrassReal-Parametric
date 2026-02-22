import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { AuthCard } from './components/AuthCard';
import { AuthDivider } from './components/AuthDivider';
import { AuthLayout } from './components/AuthLayout';
import { AuthMessage } from './components/AuthMessage';
import { AuthPrimaryButton } from './components/AuthPrimaryButton';
import { AuthTextField } from './components/AuthTextField';
import { signIn } from './services/auth.api';
import type { AuthNotice } from './types/auth.types';

interface LoginPageProps {
  onNavigate: (path: string) => void;
  onAuthenticated?: () => void;
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

const validatePassword = (password: string): string | undefined => {
  if (!password) {
    return 'Password is required.';
  }

  return undefined;
};

export default function LoginPage({ onNavigate, onAuthenticated }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [notice, setNotice] = useState<AuthNotice | null>(null);

  const emailError = hasSubmitted ? validateEmail(email) : undefined;
  const passwordError = hasSubmitted ? validatePassword(password) : undefined;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    setNotice(null);

    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    if (nextEmailError || nextPasswordError) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn(email.trim(), password);
      if (!result.ok) {
        setNotice({
          tone: 'error',
          message: result.message ?? 'Unable to sign in right now. Please try again.',
        });
        return;
      }

      if (onAuthenticated) {
        onAuthenticated();
      } else {
        onNavigate('/dashboard');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard title="Welcome back" subtitle="Sign in to continue to your dashboard and node editor.">
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

            <AuthTextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onValueChange={setPassword}
              disabled={isSubmitting}
              error={passwordError}
              rightSlot={
                <button
                  type="button"
                  className="auth-field-icon"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <div className="auth-link-row">
              <button
                type="button"
                className="auth-link-button"
                onClick={() => onNavigate('/auth/forgot')}
                disabled={isSubmitting}
              >
                Forgot password?
              </button>
            </div>

            <AuthPrimaryButton type="submit" loading={isSubmitting}>
              Sign in
            </AuthPrimaryButton>
          </form>

          <AuthDivider />

          <p className="auth-footnote">
            New to PyGrassReal?{' '}
            <button
              type="button"
              className="auth-inline-link"
              onClick={() => onNavigate('/auth/register')}
              disabled={isSubmitting}
            >
              Create account
            </button>
          </p>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
