/**
 * Simple in-memory rate limiter.
 *
 * NOTE: Because Next.js edge runtime isolates each request, this store is only
 * useful in the Node.js runtime (API routes, server actions, etc.).  For edge
 * middleware, use an external KV store (e.g. Upstash Redis).
 */

type BucketEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, BucketEntry>();

/**
 * Returns `true` if the request is allowed, `false` if it should be blocked.
 *
 * @param key        Unique key for this rate-limit bucket (e.g. `"login:1.2.3.4"`)
 * @param maxRequests Maximum number of requests allowed in the window
 * @param windowMs   Window duration in milliseconds
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();

  // ── Clean up expired entries ───────────────────────────────────────────────
  for (const [k, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(k);
    }
  }

  // ── Get or create bucket ───────────────────────────────────────────────────
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    // First request in this window (or window just expired)
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= maxRequests) {
    // Over limit
    return false;
  }

  // Increment and allow
  existing.count += 1;
  return true;
}

// ── Preset helpers ─────────────────────────────────────────────────────────────

/** Max 5 login attempts per 15 minutes per IP. */
export function rateLimitLogin(ip: string): boolean {
  return rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
}

/** Max 3 OTP requests per 30 minutes per IP. */
export function rateLimitOtp(ip: string): boolean {
  return rateLimit(`otp:${ip}`, 3, 30 * 60 * 1000);
}

/** Max 120 general API requests per minute per IP. */
export function rateLimitApi(ip: string): boolean {
  return rateLimit(`api:${ip}`, 120, 60 * 1000);
}
