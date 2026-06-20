/**
 * Delivery — the stable, reference-app-exercised vertical.
 *
 *   POST /v1/delivery/orders        create (idempotent with an Idempotency-Key)
 *   GET  /v1/delivery/orders/{id}   read back
 *
 * Scope is derived from the key server-side; there is no shop/branch argument.
 */
import type { Transport } from "../transport.js";
import type { CallOptions, OrderCreate, OrderResponse } from "../types.js";
import { generateIdempotencyKey } from "../idempotency.js";

/** Path ids must match this server-side pattern; we fail fast client-side. */
const PATH_ID = /^[A-Za-z0-9_]+$/;

export class DeliveryModule {
  constructor(private readonly transport: Transport) {}

  /**
   * Create a delivery order. Returns 201 on first write, or 200 with
   * `idempotent: true` when an Idempotency-Key replays an existing order.
   *
   * If you do not pass `idempotencyKey`, the SDK mints one for THIS call only —
   * which is not retry-safe across a process restart. For offline-safe creates,
   * mint and persist the key yourself (or use OfflineQueue).
   */
  async create(input: OrderCreate, opts: CallOptions = {}): Promise<OrderResponse> {
    if (!Number.isInteger(input.amount_minor) || input.amount_minor < 1) {
      // Mirror the server's EDGE_INVALID_AMOUNT rule so obvious mistakes fail
      // locally without burning a rate-limited request. Server remains the SoT.
      throw new RangeError("amount_minor must be an integer >= 1 (minor units)");
    }
    const { body } = await this.transport.request<OrderResponse>({
      method: "POST",
      path: "/v1/delivery/orders",
      body: input,
      idempotencyKey: opts.idempotencyKey ?? generateIdempotencyKey("delivery"),
      traceId: opts.traceId,
      signal: opts.signal,
    });
    return body;
  }

  /** Read a delivery order by id. */
  async get(id: string, opts: CallOptions = {}): Promise<OrderResponse> {
    if (!PATH_ID.test(id)) {
      throw new RangeError(`invalid order id ${JSON.stringify(id)} (must match ${PATH_ID})`);
    }
    const { body } = await this.transport.request<OrderResponse>({
      method: "GET",
      path: `/v1/delivery/orders/${id}`,
      traceId: opts.traceId,
      signal: opts.signal,
    });
    return body;
  }
}
