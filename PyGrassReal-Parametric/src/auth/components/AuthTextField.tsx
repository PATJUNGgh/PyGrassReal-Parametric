import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface AuthTextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  rightSlot?: ReactNode;
}

export function AuthTextField({
  label,
  value,
  onValueChange,
  error,
  rightSlot,
  ...inputProps
}: AuthTextFieldProps) {
  const fieldId = useId();

  return (
    <div className="auth-field">
      <label className="auth-field-label" htmlFor={fieldId}>
        {label}
      </label>
      <div
        className={[
          'auth-field-control',
          error ? 'is-error' : '',
          rightSlot ? 'has-right-slot' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <input
          id={fieldId}
          className="auth-field-input"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          {...inputProps}
        />
        {rightSlot ? <span className="auth-field-right">{rightSlot}</span> : null}
      </div>
      {error ? (
        <p className="auth-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
