/**
 * Orders (Sales Submission) — EXPERIMENTAL.
 *
 * @experimental The server-priced sales-submission capability. A submission is a
 * basket of {sku, qty}; the server resolves prices from the catalog, applies
 * tax/discounts/promotions/loyalty, deducts inventory, records COGS, and computes
 * all totals. Clients NEVER send prices or a grand total, and never a currency
 * (it is branch-native, derived from the token). This is the typed surface for
 * `POST /v1/orders` (see openapi/orders.yaml).
 *
 * Additive to and independent of the legacy money-total `delivery.create`. Stays
 * @experimental until the edge façade over the POS sale aggregate exists and the
 * capability is exercised live (promotion rule: observed-live + reference-app).
 */
import type { Transport } from "../../transport.js";
import type { CallOptions, SalesSubmission, SubmissionResponse } from "../../types.js";
import { generateIdempotencyKey } from "../../idempotency.js";

/** Path ids must match this server-side pattern; we fail fast client-side. */
const PATH_ID = /^[A-Za-z0-9_]+$/;

export class OrdersModule {
  constructor(private readonly transport: Transport) {}

  /**
   * Submit a sale by line items. Returns 201 on first write, or 200 with
   * `idempotent: true` when an Idempotency-Key replays an existing order.
   *
   * Client-side validation is intentionally minimal — it mirrors only the
   * obvious structural rules (non-empty basket, positive integer quantities)
   * so mistakes fail without burning a request. The server remains the source
   * of truth for SKUs, pricing, stock, and totals.
   */
  async submit(input: SalesSubmission, opts: CallOptions = {}): Promise<SubmissionResponse> {
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new RangeError("a submission requires at least one line");
    }
    for (const line of input.lines) {
      if (!line || typeof line.sku !== "string" || line.sku.length === 0) {
        throw new RangeError("each line requires a non-empty sku");
      }
      if (!Number.isInteger(line.qty) || line.qty < 1) {
        throw new RangeError(`line ${JSON.stringify(line.sku)} qty must be an integer >= 1`);
      }
    }
    const { body } = await this.transport.request<SubmissionResponse>({
      method: "POST",
      path: "/v1/orders",
      body: input,
      idempotencyKey: opts.idempotencyKey ?? generateIdempotencyKey("orders"),
      traceId: opts.traceId,
      signal: opts.signal,
    });
    return body;
  }

  /** Read a submitted order (resolved lines + totals) by id. */
  async get(id: string, opts: CallOptions = {}): Promise<SubmissionResponse> {
    if (!PATH_ID.test(id)) {
      throw new RangeError(`invalid order id ${JSON.stringify(id)} (must match ${PATH_ID})`);
    }
    const { body } = await this.transport.request<SubmissionResponse>({
      method: "GET",
      path: `/v1/orders/${id}`,
      traceId: opts.traceId,
      signal: opts.signal,
    });
    return body;
  }
}
