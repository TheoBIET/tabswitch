import { z } from 'zod';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

// Load .env from the realtime package root (Node 22+ has loadEnvFile, but fallback to manual parse).
function loadEnvFile(file: string): void {
  try {
    if (!fs.existsSync(file)) return;
    // Prefer native if available.
    const maybeLoadEnvFile = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile;
    if (typeof maybeLoadEnvFile === 'function') {
      maybeLoadEnvFile.call(process, file);
      return;
    }
    const txt = fs.readFileSync(file, 'utf8');
    for (const rawLine of txt.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    /* tolerated */
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env'));

const EnvSchema = z.object({
  PORT: z
    .string()
    .default('4000')
    .transform((v) => Number(v))
    .pipe(z.number().int().positive()),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 chars (matched with web app)'),
  REDIS_URL: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
