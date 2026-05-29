import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/client.js';

export type DB = PrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __tabswitch_prisma__: PrismaClient | undefined;
}

let cached: PrismaClient | null = null;

function connect(): PrismaClient {
  if (cached) return cached;

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Add it to apps/web/.env.local — or skip auth-only routes (e.g. /ideas) and just play the games.',
    );
  }

  if (globalThis.__tabswitch_prisma__) {
    cached = globalThis.__tabswitch_prisma__;
    return cached;
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  cached = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__tabswitch_prisma__ = cached;
  }
  return cached;
}

/**
 * Lazy Prisma proxy. The actual Postgres connection (and the
 * `DATABASE_URL` check) is deferred until the first property access on the
 * returned object — so module-level `const db = getDb()` calls (e.g. in
 * `lib/auth.ts`) don't blow up when `DATABASE_URL` is unset and the
 * current request doesn't touch the DB.
 *
 * In dev with HMR we cache on globalThis to avoid leaking connections.
 */
export function getDb(): DB {
  return new Proxy({} as DB, {
    get(_target, prop) {
      return Reflect.get(connect() as object, prop);
    },
  });
}
