/**
 * Authentication module
 * Passcode-based auth with bcrypt, JWT sessions in httpOnly cookies
 * Rate limiting and lockout protection
 */

import { AUTH_COOKIE_MAX_AGE, AUTH_COOKIE_NAME, AUTH_SECRET, LOCKOUT_DURATION_MS, LOGIN_RATE_LIMIT_MAX } from '@/lib/config';
import { Member, Role, SessionPayload } from '@/types';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const encoder = new TextEncoder();
const secretKey = encoder.encode(AUTH_SECRET);

/**
 * Hash a passcode with bcrypt
 */
export async function hashPasscode(passcode: string): Promise<{ hash: string; salt: string }> {
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(passcode, salt);
  return { hash, salt };
}

/**
 * Verify a passcode against its hash
 */
export async function verifyPasscode(passcode: string, hash: string): Promise<boolean> {
  return bcrypt.compare(passcode, hash);
}

/**
 * Create a session JWT
 */
export async function createSession(payload: Omit<SessionPayload, 'iat' | 'exp'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + parseInt(AUTH_COOKIE_MAX_AGE, 10))
    .sign(secretKey);
}

/**
 * Verify and decode a session JWT
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256']
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: parseInt(AUTH_COOKIE_MAX_AGE, 10),
    path: '/'
  });
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

/**
 * Get current session from cookie
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Check if member is locked out
 */
export function isLockedOut(member: Member): boolean {
  if (!member.lockedUntil) return false;
  return new Date() < member.lockedUntil;
}

/**
 * Record failed login attempt
 */
export function recordFailedAttempt(member: Member): Partial<Member> {
  const attempts = member.loginAttempts + 1;

  const updates: Partial<Member> = {
    loginAttempts: attempts,
    lockedUntil: null
  };

  if (attempts >= LOGIN_RATE_LIMIT_MAX) {
    updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
  }

  return updates;
}
/**
 * Record successful login
 */
export function recordSuccessfulLogin(member: Member): Partial<Member> {
  return {
    loginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date()
  };
}

/**
 * Generate a secure random passcode for elder (6+ digits)
 */
export function generateElderPasscode(): string {
  const digits = '0123456789';
  let passcode = '';
  for (let i = 0; i < 6; i++) {
    passcode += digits[Math.floor(Math.random() * digits.length)];
  }
  return passcode;
}

/**
 * Generate a secure random passcode for caretaker/family (8+ chars)
 */
export function generateMemberPasscode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let passcode = '';
  for (let i = 0; i < 12; i++) {
    passcode += chars[Math.floor(Math.random() * chars.length)];
  }
  return passcode;
}

/**
 * Validate passcode format for role
 */
export function validatePasscodeFormat(passcode: string, role: Role): boolean {
  if (role === 'elder') {
    return /^\d{6,}$/.test(passcode);
  }
  return passcode.length >= 8;
}

/**
 * Extract session from request headers (for API routes)
 */
export async function getSessionFromHeaders(headers: Headers): Promise<SessionPayload | null> {
  const cookieHeader = headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const token = cookies[AUTH_COOKIE_NAME];
  if (!token) return null;

  return verifySession(token);
}

/**
 * Require valid session (throws if invalid)
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    const error = new Error('Unauthorized') as Error & { code: string };
    error.code = 'UNAUTHORIZED';
    throw error;
  }
  return session;
}
