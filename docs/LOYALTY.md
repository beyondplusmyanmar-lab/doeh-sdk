# Loyalty — stable

A shop-scoped points ledger. Three operations, one member resource:

```ts
import { DoehClient } from "@beyondplusmm/doehpos-sdk";
const doeh = new DoehClient({ apiKey: process.env.DOEH_API_KEY, environment: "sandbox" });

await doeh.loyalty.earn("LOYALTY_DEMO_001", { points: 1000, reason: "signup" });
await doeh.loyalty.redeem("LOYALTY_DEMO_001", { points: 300, reason: "reward" });
const { account } = await doeh.loyalty.getMember("LOYALTY_DEMO_001");
console.log(account.balance); // 700
```

| Method | Endpoint | Notes |
|---|---|---|
| `loyalty.earn(id, { points, reason? })` | `POST /v1/loyalty/members/{id}/earn` | Auto-provisions the member. Idempotent. |
| `loyalty.redeem(id, { points, reason? })` | `POST /v1/loyalty/members/{id}/redeem` | Rejects over-balance. Idempotent (no double-spend). |
| `loyalty.getMember(id)` | `GET /v1/loyalty/members/{id}` | Balance + recent ledger. |

## Contract invariants

- **Shop-scoped.** A member's balance is keyed by `(shop_id, member_id)` and is
  shared across all of a shop's branches, isolated across shops. The shop is
  derived from your API key — you never send a shop id.
- **Integer points, never negative.** `points` is a whole number ≥ 1.
- **`earn` auto-provisions.** There is no "create member" step; the first `earn`
  creates the account. Member ids must match `^[A-Za-z0-9_]+$` (no hyphens); the
  SDK validates this client-side before any request.
- **Idempotent mutations.** Pass `{ idempotencyKey }` (or let the SDK mint one).
  A retried `redeem` with the same key **never double-spends** — it returns the
  original result with `idempotent: true`.
- **Append-only ledger.** Entries are immutable; the balance is maintained
  alongside.

## Typed errors

Catch classes, never parse `code` strings:

```ts
import { InsufficientPointsError, MemberNotFoundError } from "@beyondplusmm/doehpos-sdk";

try {
  await doeh.loyalty.redeem("LOYALTY_DEMO_001", { points: 5000 });
} catch (e) {
  if (e instanceof InsufficientPointsError) {
    console.log(`not enough points — balance is ${e.body.balance}`); // 409, nothing deducted
  }
}
```

| Error | HTTP | When |
|---|---|---|
| `MemberNotFoundError` | 404 `EDGE_MEMBER_NOT_FOUND` | read/redeem before any `earn` |
| `InsufficientPointsError` | 409 `EDGE_INSUFFICIENT_POINTS` | redeem exceeds balance (no deduction; `body.balance` = current) |
| `ScopeDeniedError` | 403 `API_KEY_SCOPE_DENIED` | key lacks `loyalty:*` scope |

## Run it against the sandbox

1. **Get a test key.** Mint one scoped to loyalty (self-serve via the developer
   portal, or by CLI on a shop you own):

   ```bash
   php artisan api-client:mint --shop=<id> --target-env=test \
     --scopes=loyalty:read,loyalty:write --all-branches
   ```

2. **Replay the golden lifecycle** (earn → balance → redeem → insufficient-points
   guard → idempotent redeem) against `sandbox-api.doehpos.com`:

   ```bash
   export DOEH_API_KEY=sk_test_...
   pnpm --filter @beyondplusmm/doehpos-sdk test:integration:loyalty
   ```

The canonical lifecycle is fixed in
[`examples/golden-path/loyalty.json`](../examples/golden-path/loyalty.json) and
drift-gated by `examples/golden-path/loyalty.test.mjs`; the same steps are what
the integration runner asserts live and what the reference app's loyalty screen
demonstrates.

## Status

**Stable** since 0.2.0 (graduated once exercised by the Expo reference app).
`redeem` + the `Insufficient`/`MemberNotFound` typed errors close the parity gap
with the edge and OpenAPI contract.
