import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { AuthCard } from './components/AuthCard';
import { AuthLayout } from './components/AuthLayout';
import { AuthMessage } from './components/AuthMessage';
import { AuthPrimaryButton } from './components/AuthPrimaryButton';
import { AuthTextField } from './components/AuthTextField';
import { register } from './services/auth.api';
import type { AuthNotice } from './types/auth.types';

interface RegisterPageProps {
  onNavigate: (path: string) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateDisplayName = (displayName: string): string | undefined => {
  const trimmedName = displayName.trim();
  if (trimmedName && trimmedName.length < 2) {
    return 'Display name must be at least 2 characters.';
  }

  return undefined;
};

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

  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  return undefined;
};

const validateConfirmPassword = (password: string, confirmPassword: string): string | undefined => {
  if (!confirmPassword) {
    return 'Please confirm your password.';
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }

  return undefined;
};

export default function RegisterPage({ onNavigate }: RegisterPageProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [notice, setNotice] = useState<AuthNotice | null>(null);

  const displayNameError = hasSubmitted ? validateDisplayName(displayName) : undefined;
  const emailError = hasSubmitted ? validateEmail(email) : undefined;
  const passwordError = hasSubmitted ? validatePassword(password) : undefined;
  const confirmPasswordError = hasSubmitted
    ? validateConfirmPassword(password, confirmPassword)
    : undefined;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    setNotice(null);

    const nextDisplayNameError = validateDisplayName(displayName);
    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    const nextConfirmPasswordError = validateConfirmPassword(password, confirmPassword);

    if (nextDisplayNameError || nextEmailError || nextPasswordError || nextConfirmPasswordError) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register(email.trim(), password, displayName.trim() || undefined);
      if (!result.ok) {
        setNotice({
          tone: 'error',
          message: result.message ?? 'Unable to create an account right now.',
        });
        return;
      }

      onNavigate('/auth/login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard title="Create account" subtitle="Set up your workspace access in a few steps.">
        <div className="auth-stack">
          {notice ? <AuthMessage tone={notice.tone} message={notice.message} /> : null}

          <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
            <AuthTextField
              label="Display Name (optional)"
              type="text"
              autoComplete="name"
              value={displayName}
              onValueChange={setDisplayName}
              disabled={isSubmitting}
              error={displayNameError}
            />

            <AuthTextField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onValueChange={setEmail}
              disabled={isSubmitting}
              error={emailError}
            />

            <AuthTextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
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

            <AuthTextField
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onValueChange={setConfirmPassword}
              disabled={isSubmitting}
              error={confirmPasswordError}
              rightSlot={
                <button
                  type="button"
                  className="auth-field-icon"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <AuthPrimaryButton type="submit" loading={isSubmitting}>
              Create account
            </AuthPrimaryButton>
          </form>

          <p className="auth-footnote">
            Already have an account?{' '}
            <button
              type="button"
              className="auth-inline-link"
              onClick={() => onNavigate('/auth/login')}
              disabled={isSubmitting}
            >
              Sign in
            </button>
          </p>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
