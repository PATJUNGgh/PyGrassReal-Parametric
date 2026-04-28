import { z } from 'zod';
import { localizeText, type LanguageCode } from '../../i18n/language';

export const EMAIL_MAX_LENGTH = 254;
export const DISPLAY_NAME_MAX_LENGTH = 60;
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_UPPERCASE_PATTERN = /[A-Z]/;
export const PASSWORD_LOWERCASE_PATTERN = /[a-z]/;
export const PASSWORD_NUMBER_PATTERN = /[0-9]/;
export const PASSWORD_SYMBOL_PATTERN = /[^A-Za-z0-9]/;

const CONTROL_CHARS_PATTERN = /[\p{Cc}\p{Cf}]/gu;
const ZERO_WIDTH_PATTERN = /[\u200B-\u200D\uFEFF]/g;
const MULTI_SPACE_PATTERN = /\s+/g;

export interface FieldValidationResult<T> {
  value: T;
  error?: string;
}

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordStrength {
  score: number;
  maxScore: number;
  label: string;
  requirements: PasswordRequirement[];
  tone: 'weak' | 'fair' | 'good' | 'strong';
}

const sanitizeText = (value: string): string => {
  return value
    .replace(CONTROL_CHARS_PATTERN, '')
    .replace(ZERO_WIDTH_PATTERN, '')
    .trim()
    .replace(MULTI_SPACE_PATTERN, ' ');
};

export const sanitizeEmail = (value: string): string => {
  return value
    .replace(CONTROL_CHARS_PATTERN, '')
    .replace(ZERO_WIDTH_PATTERN, '')
    .trim()
    .toLowerCase();
};

export const sanitizeDisplayName = (value: string): string => {
  return sanitizeText(value);
};

const getMessages = (lang: LanguageCode) => ({
  emailRequired: localizeText(lang, { th: 'กรุณากรอกอีเมล', en: 'Email is required.' }),
  emailInvalid: localizeText(lang, { th: 'กรุณากรอกอีเมลให้ถูกต้อง', en: 'Please enter a valid email address.' }),
  emailTooLong: localizeText(lang, {
    th: `อีเมลต้องยาวไม่เกิน ${EMAIL_MAX_LENGTH} ตัวอักษร`,
    en: `Email must be at most ${EMAIL_MAX_LENGTH} characters.`,
  }),
  displayNameTooShort: localizeText(lang, {
    th: 'ชื่อที่แสดงต้องมีความยาวอย่างน้อย 2 ตัวอักษร',
    en: 'Display name must be at least 2 characters.',
  }),
  displayNameTooLong: localizeText(lang, {
    th: `ชื่อที่แสดงต้องยาวไม่เกิน ${DISPLAY_NAME_MAX_LENGTH} ตัวอักษร`,
    en: `Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters.`,
  }),
  passwordRequired: localizeText(lang, { th: 'กรุณากรอกรหัสผ่าน', en: 'Password is required.' }),
  passwordTooShort: localizeText(lang, {
    th: `รหัสผ่านต้องมีความยาวอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`,
    en: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  }),
  passwordTooLong: localizeText(lang, {
    th: `รหัสผ่านต้องยาวไม่เกิน ${PASSWORD_MAX_LENGTH} ตัวอักษร`,
    en: `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
  }),
  passwordWhitespace: localizeText(lang, {
    th: 'รหัสผ่านต้องไม่มีช่องว่างนำหน้าและท้าย',
    en: 'Password cannot start or end with spaces.',
  }),
  passwordUppercase: localizeText(lang, {
    th: 'รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว',
    en: 'Password must include at least one uppercase letter.',
  }),
  passwordLowercase: localizeText(lang, {
    th: 'รหัสผ่านต้องมีตัวอักษรพิมพ์เล็กอย่างน้อย 1 ตัว',
    en: 'Password must include at least one lowercase letter.',
  }),
  passwordNumber: localizeText(lang, {
    th: 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว',
    en: 'Password must include at least one number.',
  }),
  passwordSymbol: localizeText(lang, {
    th: 'รหัสผ่านต้องมีสัญลักษณ์พิเศษอย่างน้อย 1 ตัว',
    en: 'Password must include at least one special character.',
  }),
  confirmPasswordRequired: localizeText(lang, { th: 'กรุณายืนยันรหัสผ่าน', en: 'Please confirm your password.' }),
  confirmPasswordMismatch: localizeText(lang, { th: 'รหัสผ่านไม่ตรงกัน', en: 'Passwords do not match.' }),
  strengthLabel: localizeText(lang, { th: 'ความแข็งแรงของรหัสผ่าน', en: 'Password strength' }),
  strengthWeak: localizeText(lang, { th: 'อ่อน', en: 'Weak' }),
  strengthFair: localizeText(lang, { th: 'ปานกลาง', en: 'Fair' }),
  strengthGood: localizeText(lang, { th: 'ดี', en: 'Good' }),
  strengthStrong: localizeText(lang, { th: 'แข็งแรง', en: 'Strong' }),
  requirementLength: localizeText(lang, {
    th: `อย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`,
    en: `At least ${PASSWORD_MIN_LENGTH} characters`,
  }),
  requirementUppercase: localizeText(lang, { th: 'มีตัวอักษรพิมพ์ใหญ่', en: 'Uppercase letter' }),
  requirementLowercase: localizeText(lang, { th: 'มีตัวอักษรพิมพ์เล็ก', en: 'Lowercase letter' }),
  requirementNumber: localizeText(lang, { th: 'มีตัวเลข', en: 'Number' }),
  requirementSymbol: localizeText(lang, { th: 'มีสัญลักษณ์พิเศษ', en: 'Special character' }),
  requirementWhitespace: localizeText(lang, { th: 'ไม่มีช่องว่างหัวท้าย', en: 'No leading/trailing spaces' }),
});

const buildEmailSchema = (lang: LanguageCode) => {
  const messages = getMessages(lang);
  return z.preprocess(
    (value) => sanitizeEmail(String(value ?? '')),
    z
      .string()
      .min(1, messages.emailRequired)
      .max(EMAIL_MAX_LENGTH, messages.emailTooLong)
      .email(messages.emailInvalid)
  );
};

const buildDisplayNameSchema = (lang: LanguageCode) => {
  const messages = getMessages(lang);
  return z.preprocess(
    (value) => sanitizeDisplayName(String(value ?? '')),
    z.string().max(DISPLAY_NAME_MAX_LENGTH, messages.displayNameTooLong).superRefine((val, ctx) => {
      if (val.length === 0) return;
      if (val.length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.displayNameTooShort });
      }
    })
  );
};

const buildLoginPasswordSchema = (lang: LanguageCode) => {
  const messages = getMessages(lang);
  return z.string().superRefine((val, ctx) => {
    if (!val) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.passwordRequired });
      return;
    }
    if (val.length > PASSWORD_MAX_LENGTH) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.passwordTooLong });
    }
  });
};

const buildPasswordSchema = (lang: LanguageCode) => {
  const messages = getMessages(lang);
  return z.string().superRefine((val, ctx) => {
    if (!val) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.passwordRequired });
      return;
    }
    if (val.length > PASSWORD_MAX_LENGTH) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.passwordTooLong });
      return;
    }
    if (val !== val.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.passwordWhitespace });
      return;
    }
    if (val.length < PASSWORD_MIN_LENGTH) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.passwordTooShort });
      return;
    }
    if (!PASSWORD_UPPERCASE_PATTERN.test(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.passwordUppercase });
      return;
    }
    if (!PASSWORD_LOWERCASE_PATTERN.test(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.passwordLowercase });
      return;
    }
    if (!PASSWORD_NUMBER_PATTERN.test(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.passwordNumber });
      return;
    }
    if (!PASSWORD_SYMBOL_PATTERN.test(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.passwordSymbol });
    }
  });
};

const buildConfirmPasswordSchema = (password: string, lang: LanguageCode) => {
  const messages = getMessages(lang);
  return z.string().superRefine((val, ctx) => {
    if (!val) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.confirmPasswordRequired });
      return;
    }
    if (val !== password) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: messages.confirmPasswordMismatch });
    }
  });
};

const formatResult = <T>(result: z.SafeParseReturnType<unknown, T>, fallbackValue: T): FieldValidationResult<T> => {
  if (result.success) {
    return { value: result.data };
  }
  const firstError = result.error.issues[0]?.message;
  return { value: fallbackValue, error: firstError };
};

export const getEmailResult = (email: string, lang: LanguageCode): FieldValidationResult<string> => {
  const sanitized = sanitizeEmail(email);
  return formatResult(buildEmailSchema(lang).safeParse(email), sanitized);
};

export const getDisplayNameResult = (displayName: string, lang: LanguageCode): FieldValidationResult<string> => {
  const sanitized = sanitizeDisplayName(displayName);
  return formatResult(buildDisplayNameSchema(lang).safeParse(displayName), sanitized);
};

export const getLoginPasswordResult = (password: string, lang: LanguageCode): FieldValidationResult<string> => {
  return formatResult(buildLoginPasswordSchema(lang).safeParse(password), password);
};

export const getPasswordResult = (password: string, lang: LanguageCode): FieldValidationResult<string> => {
  return formatResult(buildPasswordSchema(lang).safeParse(password), password);
};

export const getConfirmPasswordResult = (
  password: string,
  confirmPassword: string,
  lang: LanguageCode
): FieldValidationResult<string> => {
  return formatResult(buildConfirmPasswordSchema(password, lang).safeParse(confirmPassword), confirmPassword);
};

export const validateEmail = (email: string, lang: LanguageCode): string | undefined => {
  return getEmailResult(email, lang).error;
};

export const validateLoginPassword = (password: string, lang: LanguageCode): string | undefined => {
  return getLoginPasswordResult(password, lang).error;
};

export const validatePassword = (password: string, lang: LanguageCode): string | undefined => {
  return getPasswordResult(password, lang).error;
};

export const validateDisplayName = (displayName: string, lang: LanguageCode): string | undefined => {
  return getDisplayNameResult(displayName, lang).error;
};

export const validateConfirmPassword = (
  password: string,
  confirmPassword: string,
  lang: LanguageCode
): string | undefined => {
  return getConfirmPasswordResult(password, confirmPassword, lang).error;
};

export const getPasswordStrength = (password: string, lang: LanguageCode): PasswordStrength => {
  const messages = getMessages(lang);
  const requirements: PasswordRequirement[] = [
    {
      id: 'length',
      label: messages.requirementLength,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: 'uppercase',
      label: messages.requirementUppercase,
      met: PASSWORD_UPPERCASE_PATTERN.test(password),
    },
    {
      id: 'lowercase',
      label: messages.requirementLowercase,
      met: PASSWORD_LOWERCASE_PATTERN.test(password),
    },
    {
      id: 'number',
      label: messages.requirementNumber,
      met: PASSWORD_NUMBER_PATTERN.test(password),
    },
    {
      id: 'symbol',
      label: messages.requirementSymbol,
      met: PASSWORD_SYMBOL_PATTERN.test(password),
    },
    {
      id: 'whitespace',
      label: messages.requirementWhitespace,
      met: password.length > 0 ? password === password.trim() : false,
    },
  ];

  const score = requirements.filter((item) => item.met).length;
  const maxScore = requirements.length;
  let tone: PasswordStrength['tone'] = 'weak';
  let label = messages.strengthWeak;

  if (score >= maxScore) {
    tone = 'strong';
    label = messages.strengthStrong;
  } else if (score >= Math.ceil(maxScore * 0.75)) {
    tone = 'good';
    label = messages.strengthGood;
  } else if (score >= Math.ceil(maxScore * 0.45)) {
    tone = 'fair';
    label = messages.strengthFair;
  }

  return {
    score,
    maxScore,
    label,
    requirements,
    tone,
  };
};
