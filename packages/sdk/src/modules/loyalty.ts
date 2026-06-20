/**
 * Loyalty — stable.
 *
 *   POST /v1/loyalty/members/{id}/earn   award points (auto-provisions the member)
 *   GET  /v1/loyalty/members/{id}        read the member's balance
 *
 * `earn` auto-provisions the member account. Member ids must match [A-Za-z0-9_]+
 * (no hyphens). Graduated from @experimental in 0.2.0 once exercised by the Expo
 * reference app.
 */
import type { Transport } from "../transport.js";
import type { CallOptions } from "../types.js";
import { generateIdempotencyKey } from "../idempotency.js";

export interface EarnInput {
  points: number;
  reason?: string;
}
export interface AccountResponse {
  ok: boolean;
  idempotent?: boolean;
  account: { balance: number; [k: string]: unknown };
}

const MEMBER_ID = /^[A-Za-z0-9_]+$/;

export class LoyaltyModule {
  constructor(private readonly transport: Transport) {}

  /** Award points to a member (auto-provisions the account). Idempotent with an Idempotency-Key. */
  async earn(memberId: string, input: EarnInput, opts: CallOptions = {}): Promise<AccountResponse> {
    if (!MEMBER_ID.test(memberId)) throw new RangeError(`invalid member id ${JSON.stringify(memberId)}`);
    const { body } = await this.transport.request<AccountResponse>({
      method: "POST",
      path: `/v1/loyalty/members/${memberId}/earn`,
      body: input,
      idempotencyKey: opts.idempotencyKey ?? generateIdempotencyKey("loyalty"),
      traceId: opts.traceId,
      signal: opts.signal,
    });
    return body;
  }

  /** Read a member's balance back by id. */
  async getMember(memberId: string, opts: CallOptions = {}): Promise<AccountResponse> {
    if (!MEMBER_ID.test(memberId)) throw new RangeError(`invalid member id ${JSON.stringify(memberId)}`);
    const { body } = await this.transport.request<AccountResponse>({
      method: "GET",
      path: `/v1/loyalty/members/${memberId}`,
      traceId: opts.traceId,
      signal: opts.signal,
    });
    return body;
  }
}
