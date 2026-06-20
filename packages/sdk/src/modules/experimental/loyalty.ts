/**
 * Loyalty — EXPERIMENTAL.
 *
 * @experimental Schema/golden-client-derived; not yet exercised by the Expo
 * reference app. `earn` auto-provisions the member account. Member ids must
 * match [A-Za-z0-9_]+ (no hyphens).
 */
import type { Transport } from "../../transport.js";
import type { CallOptions } from "../../types.js";
import { generateIdempotencyKey } from "../../idempotency.js";

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

  /** @experimental */
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

  /** @experimental */
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
