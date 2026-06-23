/**
 * Loyalty — stable.
 *
 *   POST /v1/loyalty/members/{id}/earn     award points (auto-provisions the member)
 *   POST /v1/loyalty/members/{id}/redeem   spend points (rejects over-balance)
 *   GET  /v1/loyalty/members/{id}          read the member's balance + ledger
 *
 * Balances are SHOP-scoped — shared across a shop's branches, isolated across
 * shops. `earn` auto-provisions the member account; member ids must match
 * [A-Za-z0-9_]+ (no hyphens). Both mutations are idempotent with an
 * Idempotency-Key — a retried `redeem` never double-spends. Redeeming more than
 * the balance throws `InsufficientPointsError` (409) and writes no ledger entry.
 * Graduated from @experimental in 0.2.0 once exercised by the Expo reference app.
 */
import type { Transport } from "../transport.js";
import type { CallOptions } from "../types.js";
import { generateIdempotencyKey } from "../idempotency.js";

/** Body for both `earn` and `redeem` (the contract's `PointsOp`). */
export interface PointsInput {
  points: number;
  reason?: string;
}
/** @deprecated alias retained for back-compat; use {@link PointsInput}. */
export type EarnInput = PointsInput;
export type RedeemInput = PointsInput;

export interface AccountResponse {
  ok: boolean;
  idempotent?: boolean;
  account: { balance: number; [k: string]: unknown };
}

const MEMBER_ID = /^[A-Za-z0-9_]+$/;

export class LoyaltyModule {
  constructor(private readonly transport: Transport) {}

  /** Award points to a member (auto-provisions the account). Idempotent with an Idempotency-Key. */
  async earn(memberId: string, input: PointsInput, opts: CallOptions = {}): Promise<AccountResponse> {
    return this.points("earn", memberId, input, opts);
  }

  /**
   * Spend points from a member's balance. Idempotent with an Idempotency-Key (a
   * retried redeem never double-spends). Throws `InsufficientPointsError` (409,
   * `code: EDGE_INSUFFICIENT_POINTS`) if `points` exceeds the balance — no points
   * are deducted and no ledger entry is written; the current balance is on
   * `err.body.balance`.
   */
  async redeem(memberId: string, input: RedeemInput, opts: CallOptions = {}): Promise<AccountResponse> {
    return this.points("redeem", memberId, input, opts);
  }

  /** Read a member's balance + recent ledger back by id. */
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

  // earn and redeem are the same signed POST /{id}/{verb} shape — only the verb
  // (and the server-side guard) differ.
  private async points(
    verb: "earn" | "redeem",
    memberId: string,
    input: PointsInput,
    opts: CallOptions,
  ): Promise<AccountResponse> {
    if (!MEMBER_ID.test(memberId)) throw new RangeError(`invalid member id ${JSON.stringify(memberId)}`);
    const { body } = await this.transport.request<AccountResponse>({
      method: "POST",
      path: `/v1/loyalty/members/${memberId}/${verb}`,
      body: input,
      idempotencyKey: opts.idempotencyKey ?? generateIdempotencyKey("loyalty"),
      traceId: opts.traceId,
      signal: opts.signal,
    });
    return body;
  }
}
