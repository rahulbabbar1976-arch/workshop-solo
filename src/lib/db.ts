import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
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

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Maintain compatibility with existing code calling getPrismaForDb
export function getPrismaForDb(dbPath?: string): PrismaClient {
  return prisma;
}

export default prisma;
