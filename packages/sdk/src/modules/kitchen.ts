/**
 * Kitchen — stable.
 *
 *   POST /v1/kitchen/tickets        create a ticket (idempotent with an Idempotency-Key)
 *   GET  /v1/kitchen/tickets/{id}   read back
 *
 * Scope is derived from the key server-side; there is no shop/branch argument.
 * Graduated from @experimental in 0.2.0 once exercised by the Expo reference app.
 */
import type { Transport } from "../transport.js";
import type { CallOptions } from "../types.js";
import { generateIdempotencyKey } from "../idempotency.js";

export interface TicketCreate {
  station: string;
  items: string[];
}
export interface TicketResponse {
  ok: boolean;
  idempotent?: boolean;
  ticket: { id: string; [k: string]: unknown };
}

const PATH_ID = /^[A-Za-z0-9_]+$/;

export class KitchenModule {
  constructor(private readonly transport: Transport) {}

  /** Create a kitchen ticket. Idempotent with an Idempotency-Key. */
  async createTicket(input: TicketCreate, opts: CallOptions = {}): Promise<TicketResponse> {
    const { body } = await this.transport.request<TicketResponse>({
      method: "POST",
      path: "/v1/kitchen/tickets",
      body: input,
      idempotencyKey: opts.idempotencyKey ?? generateIdempotencyKey("kitchen"),
      traceId: opts.traceId,
      signal: opts.signal,
    });
    return body;
  }

  /** Read a kitchen ticket back by id. */
  async getTicket(id: string, opts: CallOptions = {}): Promise<TicketResponse> {
    if (!PATH_ID.test(id)) throw new RangeError(`invalid ticket id ${JSON.stringify(id)}`);
    const { body } = await this.transport.request<TicketResponse>({
      method: "GET",
      path: `/v1/kitchen/tickets/${id}`,
      traceId: opts.traceId,
      signal: opts.signal,
    });
    return body;
  }
}
