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

// ── Orders (Sales Submission) capability — @experimental ─────────────────────
// A submission is a basket of {sku, qty}; the server owns pricing/tax/inventory/
// totals. Clients NEVER send prices or a grand total. Currency is branch-native
// (token-derived) and returned in the response. See openapi/orders.yaml.

export type FulfillmentType = "pickup" | "delivery" | "dine_in";

/** One requested line: WHAT and HOW MANY only — never a price, name, or station. */
export interface OrderLineInput {
  sku: string;
  /** Integer >= 1. */
  qty: number;
  /** Optional catalog modifier ids; priced server-side. */
  modifier_ids?: string[];
}

export interface Customer {
  /** E.164, e.g. +95912345678. */
  phone?: string;
}

export interface Fulfillment {
  type?: FulfillmentType;
}

/** Request body for POST /v1/orders. No currency, no prices, no total. */
export interface SalesSubmission {
  lines: OrderLineInput[];
  customer?: Customer;
  fulfillment?: Fulfillment;
}

/** A line as resolved and priced by the server. */
export interface OrderLine {
  sku: string;
  name?: string;
  qty: number;
  unit_price_minor: number;
  line_total_minor: number;
  tax_minor?: number;
}

export interface OrderTotals {
  currency: Currency;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  grand_total_minor: number;
}

/** Settlement state of a submitted order. V1 is always "unpaid" (pay_later). */
export type PaymentStatus = "unpaid" | "paid";

export interface SubmittedOrder {
  id: string;
  status: OrderStatus;
  /** V1: always "unpaid" — a submission is purchase intent, not settlement. */
  payment_status: PaymentStatus;
  shop_id: number;
  branch_id: number;
  lines: OrderLine[];
  totals: OrderTotals;
  customer?: Customer;
  fulfillment?: Fulfillment;
  created_at_utc: string;
  /** created_at rendered in the branch's native timezone. */
  created_at_local: string;
  idempotency_key?: string;
}

export interface SubmissionResponse {
  ok: boolean;
  /** true if this was an idempotent replay (HTTP 200 instead of 201). */
  idempotent?: boolean;
  order: SubmittedOrder;
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
