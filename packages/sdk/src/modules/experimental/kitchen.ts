/**
 * Kitchen — EXPERIMENTAL.
 *
 * @experimental Schema/golden-client-derived; not yet exercised by the Expo
 * reference app. Shapes may change before they graduate to the stable contract.
 * Promotion rule: experimental -> reference-app exercised -> stable.
 */
import type { Transport } from "../../transport.js";
import type { CallOptions } from "../../types.js";
import { generateIdempotencyKey } from "../../idempotency.js";

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

  /** @experimental */
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

  /** @experimental */
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
