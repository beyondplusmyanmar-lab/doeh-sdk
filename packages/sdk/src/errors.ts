/**
 * Typed error ABI.
 *
 * The public API's error codes are a stable, append-only contract. Consumers
 * should NEVER parse `code` strings — they catch typed classes instead:
 *
 *     try { await client.delivery.create(...) }
 *     catch (e) {
 *       if (e instanceof InvalidAmountError) { ... }
 *       if (e instanceof ApiKeyRevokedError) { ... }
 *     }
 */
import type { ErrorBody } from "./types.js";

/** Base for everything thrown by the SDK. */
export class DoehError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    // Restore prototype chain for transpiled-to-ES5 consumers.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * The request never produced an HTTP response (network down, DNS, TLS, timeout,
 * aborted). These are the failures the SDK retries.
 */
export class DoehTransportError extends DoehError {
  readonly cause?: unknown;
  /** True if the failure was a timeout/abort. */
  readonly timeout: boolean;
  constructor(message: string, opts: { cause?: unknown; timeout?: boolean } = {}) {
    super(message);
    this.cause = opts.cause;
    this.timeout = opts.timeout ?? false;
  }
}

/** Any non-2xx HTTP response, carrying the stable `code` and correlation ids. */
export class DoehApiError extends DoehError {
  readonly status: number;
  readonly code: string;
  readonly step?: string;
  readonly traceId?: string;
  readonly body: unknown;
  constructor(
    status: number,
    code: string,
    opts: { step?: string; traceId?: string; body?: unknown } = {},
  ) {
    super(`HTTP ${status} ${code}`);
    this.status = status;
    this.code = code;
    this.step = opts.step;
    this.traceId = opts.traceId;
    this.body = opts.body;
  }
}

// ── 401 — authentication (API_KEY_* ABI) ─────────────────────────────────────
export class ApiKeyInvalidError extends DoehApiError {}
export class ApiKeyExpiredError extends DoehApiError {}
export class ApiKeyRevokedError extends DoehApiError {}
export class EnvMismatchError extends DoehApiError {} // API_KEY_ENV_MISMATCH

// ── 403 — authenticated but not permitted ────────────────────────────────────
export class ScopeDeniedError extends DoehApiError {} // API_KEY_SCOPE_DENIED
export class TransportDisabledError extends DoehApiError {} // EDGE_TRANSPORT_DISABLED

// ── 404 / 409 / 422 / 400 ────────────────────────────────────────────────────
export class OrderNotFoundError extends DoehApiError {} // EDGE_ORDER_NOT_FOUND
export class ReplayError extends DoehApiError {} // EDGE_REPLAYED
export class InvalidAmountError extends DoehApiError {} // EDGE_INVALID_AMOUNT
export class UnsupportedCurrencyError extends DoehApiError {} // EDGE_UNSUPPORTED_CURRENCY
export class BadBodyError extends DoehApiError {} // EDGE_BAD_BODY

// ── 422 — sales submission / catalog (Orders capability, @experimental) ───────
export class EmptyOrderError extends DoehApiError {} // EDGE_EMPTY_ORDER
export class UnknownSkuError extends DoehApiError {} // EDGE_UNKNOWN_SKU
export class UnpricedSkuError extends DoehApiError {} // EDGE_UNPRICED_SKU
export class InsufficientStockError extends DoehApiError {} // EDGE_INSUFFICIENT_STOCK
export class FulfillmentNotAvailableError extends DoehApiError {} // EDGE_FULFILLMENT_NOT_AVAILABLE (V1: delivery not yet served)

// ── loyalty ──────────────────────────────────────────────────────────────────
// 404: the member has no account in this shop (earn auto-provisions, so this is
// only seen on a read/redeem before any earn).
export class MemberNotFoundError extends DoehApiError {} // EDGE_MEMBER_NOT_FOUND
// 409: redeeming more than the balance — no points deducted, no ledger entry
// written. The current balance is carried on `body.balance`.
export class InsufficientPointsError extends DoehApiError {} // EDGE_INSUFFICIENT_POINTS

// ── 429 — rate limited (retried internally; only surfaced when retries exhaust)
export class RateLimitedError extends DoehApiError {}

/** Map a stable error code to its typed class. Unknown codes -> DoehApiError. */
const CODE_TO_CLASS: Record<string, typeof DoehApiError> = {
  API_KEY_INVALID: ApiKeyInvalidError,
  API_KEY_EXPIRED: ApiKeyExpiredError,
  API_KEY_REVOKED: ApiKeyRevokedError,
  API_KEY_ENV_MISMATCH: EnvMismatchError,
  API_KEY_SCOPE_DENIED: ScopeDeniedError,
  EDGE_TRANSPORT_DISABLED: TransportDisabledError,
  EDGE_ORDER_NOT_FOUND: OrderNotFoundError,
  EDGE_REPLAYED: ReplayError,
  EDGE_INVALID_AMOUNT: InvalidAmountError,
  EDGE_UNSUPPORTED_CURRENCY: UnsupportedCurrencyError,
  EDGE_BAD_BODY: BadBodyError,
  EDGE_EMPTY_ORDER: EmptyOrderError,
  EDGE_UNKNOWN_SKU: UnknownSkuError,
  EDGE_UNPRICED_SKU: UnpricedSkuError,
  EDGE_INSUFFICIENT_STOCK: InsufficientStockError,
  EDGE_FULFILLMENT_NOT_AVAILABLE: FulfillmentNotAvailableError,
  EDGE_MEMBER_NOT_FOUND: MemberNotFoundError,
  EDGE_INSUFFICIENT_POINTS: InsufficientPointsError,
};

/** Build the right typed error from an HTTP status + parsed body. */
export function mapApiError(
  status: number,
  body: unknown,
  traceId?: string,
): DoehApiError {
  const envelope = (body ?? {}) as Partial<ErrorBody>;
  const code = typeof envelope.code === "string" ? envelope.code : `HTTP_${status}`;
  const opts = { step: envelope.step, traceId, body };
  if (status === 429) return new RateLimitedError(status, code, opts);
  const Cls = CODE_TO_CLASS[code] ?? DoehApiError;
  return new Cls(status, code, opts);
}

/**
 * The retry predicate, faithful to the golden client: retry ONLY transport
 * failures and HTTP 429. Every other status (incl. 4xx validation and 5xx) is
 * terminal and surfaces immediately.
 */
export function isRetryable(err: unknown): boolean {
  if (err instanceof DoehTransportError) return true;
  if (err instanceof RateLimitedError) return true;
  return false;
}
