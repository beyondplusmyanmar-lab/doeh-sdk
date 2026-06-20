/**
 * Wire types, mirrored from the public OpenAPI specs and the golden client.
 *
 * Money is ALWAYS integer minor units (1500 == 15.00). Never a decimal.
 */

export type Currency = "MMK" | "THB" | "USD" | "CNY" | "SGD" | "INR";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "dispatched"
  | "delivered"
  | "cancelled";

/** Request body for POST /v1/delivery/orders. */
export interface OrderCreate {
  currency: Currency;
  /** Integer minor units, >= 1. e.g. 1500 = 15.00. */
  amount_minor: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  shop_id: number;
  branch_id: number;
  currency: Currency;
  amount_minor: number;
  created_at_utc: string;
  /** created_at rendered in the branch's native timezone. */
  created_at_local: string;
  idempotency_key?: string;
}

export interface OrderResponse {
  ok: boolean;
  /** true if this was an idempotent replay (HTTP 200 instead of 201). */
  idempotent?: boolean;
  order: Order;
}

/** The stable error envelope returned for every non-2xx response. */
export interface ErrorBody {
  ok: false;
  /** Stable, append-only error code (part of the API ABI). */
  code: string;
  /** Internal verification step (diagnostic only). */
  step?: string;
}

/** Per-call options that map onto request headers. */
export interface CallOptions {
  /**
   * Idempotency key. STRONGLY recommended on every create. For offline-safe
   * retries the key must be minted once when the mutation is created and reused
   * on every attempt — see OfflineQueue. If omitted on a create, the SDK mints
   * one for this single call only.
   */
  idempotencyKey?: string;
  /** Caller trace id, propagated and echoed on the response. */
  traceId?: string;
  /** Per-call AbortSignal (in addition to the configured timeout). */
  signal?: AbortSignal;
}
