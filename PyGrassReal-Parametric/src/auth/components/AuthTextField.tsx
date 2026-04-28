import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, Ref } from 'react';

interface AuthTextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  rightSlot?: ReactNode;
  inputRef?: Ref<HTMLInputElement>;
}

export function AuthTextField({
  label,
  value,
  onValueChange,
  error,
  rightSlot,
  inputRef,
  ...inputProps
}: AuthTextFieldProps) {
  const generatedFieldId = useId();
  const fieldId = inputProps.id ?? generatedFieldId;
  const errorId = `${fieldId}-error`;
  const ariaDescribedBy = [inputProps['aria-describedby'], error ? errorId : undefined]
    .filter(Boolean)
    .join(' ') || undefined;
  const ariaInvalid = error ? true : inputProps['aria-invalid'];

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
          className="auth-field-input"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          ref={inputRef}
          {...inputProps}
          id={fieldId}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
        />
        {rightSlot ? <span className="auth-field-right">{rightSlot}</span> : null}
      </div>
      {error ? (
        <p id={errorId} className="auth-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
