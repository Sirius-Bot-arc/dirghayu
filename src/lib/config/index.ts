/**
 * Configuration constants loaded from environment
 * All secrets must come from environment variables
 */

export const AUTH_SECRET = process.env.AUTH_SECRET ?? '';
export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'dirghayu_session';
export const AUTH_COOKIE_MAX_AGE = process.env.AUTH_COOKIE_MAX_AGE ?? '2592000';

export const LOGIN_RATE_LIMIT_MAX = parseInt(process.env.LOGIN_RATE_LIMIT_MAX ?? '5', 10);
export const LOGIN_RATE_LIMIT_WINDOW_MS = parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS ?? '900000', 10);
export const LOCKOUT_DURATION_MS = parseInt(process.env.LOCKOUT_DURATION_MS ?? '900000', 10);

export const FIRESTORE_ENABLED = process.env.FIRESTORE_ENABLED === 'true';
export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? '';
export const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL ?? '';
export const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? '';

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';

export const SMTP_HOST = process.env.SMTP_HOST ?? '';
export const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? '587', 10);
export const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
export const SMTP_USER = process.env.SMTP_USER ?? '';
export const SMTP_PASS = process.env.SMTP_PASS ?? '';
export const EMAIL_FROM = process.env.EMAIL_FROM ?? 'Dirghayu <noreply@dirghayu.example>';
export const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO ?? 'support@dirghayu.example';

export const CRON_SECRET = process.env.CRON_SECRET ?? '';

export const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE ?? 'Asia/Kolkata';

export const ESCALATION_ELDER_TO_CARETAKER_MIN = parseInt(process.env.ESCALATION_ELDER_TO_CARETAKER_MIN ?? '30', 10);
export const ESCALATION_CARETAKER_TO_FAMILY_MIN = parseInt(process.env.ESCALATION_CARETAKER_TO_FAMILY_MIN ?? '60', 10);

export const ADHERENCE_ON_TIME_WINDOW_MIN = parseInt(process.env.ADHERENCE_ON_TIME_WINDOW_MIN ?? '30', 10);
export const PDC_LOOKBACK_DAYS = parseInt(process.env.PDC_LOOKBACK_DAYS ?? '90', 10);

export const NEXT_PUBLIC_APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Dirghayu';
export const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
export const NODE_ENV = process.env.NODE_ENV ?? 'development';

// Validate required secrets in production
if (NODE_ENV === 'production') {
  const required = [
    'AUTH_SECRET',
    'CRON_SECRET',
    'GEMINI_API_KEY'
  ];
  
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  
  if (AUTH_SECRET.length < 32) {
    throw new Error('AUTH_SECRET must be at least 32 characters');
  }
  
  if (CRON_SECRET.length < 32) {
    throw new Error('CRON_SECRET must be at least 32 characters');
  }
}