/**
 * Idempotency keys.
 *
 * The single most important mobile invariant: a create's idempotency key is
 * minted ONCE — when the mutation is first created — and reused on every
 * attempt, across process restarts and network boundaries. Regenerating a key
 * per attempt produces duplicate orders the instant a retry happens. The
 * OfflineQueue enforces this; callers doing manual retries must do the same.
 */

/** A UUID source. Defaults to the platform crypto; injectable for RN/tests. */
export type UuidFn = () => string;

function platformUuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Last-resort fallback (e.g. older RN without a crypto polyfill). Not
  // cryptographically strong, but collision-safe enough for an idempotency key.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate an idempotency key. The optional prefix makes server logs readable
 * (e.g. "delivery"). Stays within the 200-char header limit.
 */
export function generateIdempotencyKey(prefix?: string, uuid: UuidFn = platformUuid): string {
  const id = uuid();
  return prefix ? `${prefix}-${id}` : id;
}
