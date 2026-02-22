interface AuthDividerProps {
  label?: string;
}

export function AuthDivider({ label = 'or' }: AuthDividerProps) {
  return (
    <div className="auth-divider" aria-hidden="true">
      <span>{label}</span>
    </div>
  );
}
