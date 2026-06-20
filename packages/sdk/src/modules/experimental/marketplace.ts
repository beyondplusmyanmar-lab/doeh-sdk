/**
 * Marketplace — EXPERIMENTAL.
 *
 * @experimental Schema/golden-client-derived; not yet exercised by the Expo
 * reference app. Money is integer minor units.
 */
import type { Transport } from "../../transport.js";
import type { CallOptions, Currency } from "../../types.js";
import { generateIdempotencyKey } from "../../idempotency.js";

export interface ListingCreate {
  title: string;
  currency: Currency;
  price_minor: number;
  stock: number;
}
export interface ListingResponse {
  ok: boolean;
  idempotent?: boolean;
  listing: { id: string; [k: string]: unknown };
}

const PATH_ID = /^[A-Za-z0-9_]+$/;

export class MarketplaceModule {
  constructor(private readonly transport: Transport) {}

  /** @experimental */
  async createListing(input: ListingCreate, opts: CallOptions = {}): Promise<ListingResponse> {
    const { body } = await this.transport.request<ListingResponse>({
      method: "POST",
      path: "/v1/marketplace/listings",
      body: input,
      idempotencyKey: opts.idempotencyKey ?? generateIdempotencyKey("market"),
      traceId: opts.traceId,
      signal: opts.signal,
    });
    return body;
  }

  /** @experimental */
  async getListing(id: string, opts: CallOptions = {}): Promise<ListingResponse> {
    if (!PATH_ID.test(id)) throw new RangeError(`invalid listing id ${JSON.stringify(id)}`);
    const { body } = await this.transport.request<ListingResponse>({
      method: "GET",
      path: `/v1/marketplace/listings/${id}`,
      traceId: opts.traceId,
      signal: opts.signal,
    });
    return body;
  }
}
