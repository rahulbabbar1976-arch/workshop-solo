import { PrismaClient } from '../generated/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { workUnitAsyncStorage } from 'next/dist/server/app-render/work-unit-async-storage.external';
import crypto from 'crypto';
import path from 'path';

// Cookie encryption key — MUST be set in environment, no fallback allowed
const COOKIE_SECRET = process.env.COOKIE_SECRET;
if (!COOKIE_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: COOKIE_SECRET environment variable is not set. The server cannot start safely.');
}
const SECRET = COOKIE_SECRET || 'dev-only-insecure-key-do-not-use-in-production-32b';

// Derive a 32-byte key from the secret
function getDerivedKey(): Buffer {
  return crypto.scryptSync(SECRET, 'autobot-salt-v1', 32);
}

// Encrypt string — uses a random IV each time (stored as hex prefix)
export function encryptDbPath(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getDerivedKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Decrypt string — reads the IV from the hex prefix
export function decryptDbPath(encryptedText: string): string {
  try {
    const [ivHex, ciphertext] = encryptedText.split(':');
    if (!ivHex || !ciphertext) return 'dev.db';
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getDerivedKey(), iv);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return 'dev.db';
  }
}

// Cache of Prisma client instances per database path
const clientCache: Record<string, PrismaClient> = {};

export function getPrismaForDb(dbPath: string): PrismaClient {
  // Normalize path to prevent directory traversal
  const cleanPath = path.basename(dbPath);
  const finalPath = cleanPath.startsWith('dev') ? `./${cleanPath}` : './dev.db';
  const key = path.normalize(finalPath);
  
  if (!clientCache[key]) {
    const adapter = new PrismaBetterSqlite3({
      url: `file:${key}`
    });
    clientCache[key] = new PrismaClient({ adapter });
  }
  return clientCache[key];
}

// Proxy that routes to the correct database instance dynamically
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    let dbPath = 'dev.db';
    try {
      const store = (workUnitAsyncStorage as any).getStore();
      if (store) {
        // Read cookies from request store synchronously
        const cookies = store.userspaceMutableCookies || store.cookies;
        if (cookies) {
          const dbCookie = cookies.get('workshop_db_path');
          if (dbCookie?.value) {
            dbPath = decryptDbPath(dbCookie.value);
          }
        }
      }
    } catch (e) {
      // Fallback to default if not in request context
    }

    const client = getPrismaForDb(dbPath);
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

export default prisma;
export * from '../generated/client';
