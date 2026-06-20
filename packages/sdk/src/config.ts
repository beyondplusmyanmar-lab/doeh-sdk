/**
 * Environment configuration.
 *
 * "single shop" is NOT a config concept here. The shop/branch scope is derived
 * from the API key server-side — the client never sends scope. One key == one
 * shop. To act as a different shop, use a different key.
 */
export type Environment = "sandbox" | "production";

/** Base URLs per environment, taken verbatim from the validated golden client. */
export const BASE_URLS: Record<Environment, string> = {
  sandbox: "https://sandbox-api.doehpos.com",
  production: "https://api.doehpos.com",
};

/** Default SDK version string surfaced in the (mandatory) User-Agent. */
export const SDK_VERSION = "0.1.0";

export const DEFAULTS = {
  /** Per-request timeout. */
  timeoutMs: 15_000,
  /**
   * Max retry attempts. Retries apply ONLY to transport failures and HTTP 429
   * (the fleet rate limiter is a deliberately tight shared token bucket).
   * No other status is ever retried.
   */
  maxRetries: 4,
  /** Linear backoff base; attempt N waits roughly backoffBaseMs * N. */
  backoffBaseMs: 1_000,
} as const;
