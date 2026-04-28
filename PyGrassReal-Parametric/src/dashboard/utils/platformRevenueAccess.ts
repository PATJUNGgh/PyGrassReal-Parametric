const normalizeEmail = (email: string | null | undefined): string => {
  return (email ?? '').trim().toLowerCase();
};

export const getPlatformRevenueAllowedEmails = (): Set<string> => {
  const raw = import.meta.env.VITE_PLATFORM_REVENUE_ALLOWED_EMAILS ?? '';

  return new Set(
    raw
      .split(',')
      .map((email) => normalizeEmail(email))
      .filter(Boolean)
  );
};

export const hasPlatformRevenueAccess = (email: string | null | undefined): boolean => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return false;
  }

  return getPlatformRevenueAllowedEmails().has(normalizedEmail);
};
