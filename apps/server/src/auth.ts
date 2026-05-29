import { SignJWT, jwtVerify } from 'jose';
import * as cookie from 'cookie';
import { env } from './env.js';
import type { Socket } from 'socket.io';
import { ulid } from 'ulid';

const secret = new TextEncoder().encode(env.SESSION_SECRET);
const COOKIE_NAME = 'tabswitch_session';
const JWT_ISSUER = 'tabswitch';
const JWT_AUDIENCE = 'tabswitch-server';

export interface SessionPayload {
  playerId: string;
  /** Present when the web app's session route minted the JWT with a NextAuth userId. */
  userId?: string;
  iat: number;
  exp: number;
}

export async function signSession(playerId: string, userId?: string): Promise<string> {
  return await new SignJWT({ playerId, ...(userId ? { userId } : {}) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime('30d')
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (typeof payload.playerId !== 'string') return null;
    const out: SessionPayload = {
      playerId: payload.playerId,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
    if (typeof payload.userId === 'string') out.userId = payload.userId;
    return out;
  } catch {
    return null;
  }
}

/**
 * Socket.IO middleware: extract playerId from cookie, mint a guest if missing.
 * Stores playerId in socket.data.
 */
export async function authMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  try {
    const rawCookie = socket.handshake.headers.cookie ?? '';
    const parsed = cookie.parse(rawCookie);
    const token = parsed[COOKIE_NAME];

    let sess: SessionPayload | null = null;
    if (token) sess = await verifySession(token);

    if (!sess) {
      const handshakeToken = (socket.handshake.auth as { token?: string })?.token;
      if (handshakeToken) sess = await verifySession(handshakeToken);
    }

    let playerId: string;
    if (sess) {
      playerId = sess.playerId;
    } else {
      playerId = ulid();
      socket.data.guestMinted = true;
    }

    socket.data.playerId = playerId;
    if (sess?.userId) socket.data.userId = sess.userId;
    next();
  } catch (err) {
    next(err as Error);
  }
}
