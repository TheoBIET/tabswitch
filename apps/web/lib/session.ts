import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { ulid } from './ulid.js';

/** Must match `COOKIE_NAME` / `JWT_ISSUER` / `JWT_AUDIENCE` in apps/server/src/auth.ts. */
const COOKIE_NAME = 'tabswitch_session';
const JWT_ISSUER = 'tabswitch';
const JWT_AUDIENCE = 'tabswitch-server';

function secretKey(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error('SESSION_SECRET missing or too short (32+ chars)');
  }
  return new TextEncoder().encode(s);
}

export interface SessionPayload {
  playerId: string;
  userId?: string;
}

export async function signSession(playerId: string, userId?: string): Promise<string> {
  return await new SignJWT({ playerId, ...(userId ? { userId } : {}) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime('30d')
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (typeof payload.playerId !== 'string') return null;
    const out: SessionPayload = { playerId: payload.playerId };
    if (typeof payload.userId === 'string') out.userId = payload.userId;
    return out;
  } catch {
    return null;
  }
}

/**
 * Get-or-mint the player session, re-signing the JWT whenever the supplied
 * `userId` differs from what's currently encoded in the cookie (e.g. the user
 * just signed in or signed out via NextAuth).
 *
 * Safe to call on every server-rendered request; it only writes the cookie
 * when the encoded payload actually changes.
 */
export async function getOrCreateSession(
  opts: { userId?: string } = {},
): Promise<{ playerId: string; token: string }> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  let playerId: string | null = null;
  let currentUserId: string | undefined;

  if (existing) {
    const sess = await verifySession(existing);
    if (sess) {
      playerId = sess.playerId;
      currentUserId = sess.userId;
    }
  }

  if (!playerId) {
    playerId = ulid();
  }

  const needsRefresh = !existing || currentUserId !== opts.userId;
  if (!needsRefresh && existing) {
    return { playerId, token: existing };
  }

  const token = await signSession(playerId, opts.userId);
  try {
    store.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  } catch {
    // Next 15 forbids cookies().set() outside Server Actions / Route Handlers.
    // Callers from Server Components fall through silently — the JWT will be
    // refreshed the next time /api/auth/session is hit.
  }
  return { playerId, token };
}

export const SESSION_COOKIE = COOKIE_NAME;
