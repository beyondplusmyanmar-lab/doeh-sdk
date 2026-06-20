# @beyondplusmm/doehpos-sdk

Official TypeScript SDK for the **Doeh POS public API**. A typed port of the
validated [golden client](../../README.md#provenance) — the SDK exists so the
public integration surface can never drift from the contract that was proven
live (14/14) against the sandbox.

## Install

```bash
npm install @beyondplusmm/doehpos-sdk
# or
pnpm add @beyondplusmm/doehpos-sdk
# or
yarn add @beyondplusmm/doehpos-sdk
```

- **npm:** https://www.npmjs.com/package/@beyondplusmm/doehpos-sdk
- **GitHub:** https://github.com/beyondplusmyanmar-lab/doeh-sdk
- Download the raw tarball: `npm pack @beyondplusmm/doehpos-sdk`

## Usage

```ts
import { DoehClient } from "@beyondplusmm/doehpos-sdk";

const client = new DoehClient({ apiKey: "sk_test_…", environment: "sandbox" });

const { order } = await client.delivery.create({ currency: "MMK", amount_minor: 1500 });
const { order: same } = await client.delivery.get(order.id);
```

## Design invariants

1. **No shop concept.** Scope (shop/branch) is derived from the key server-side.
   One key == one shop. There is no `shopId` argument anywhere — to act as a
   different shop, use a different key.
2. **Money is integer minor units.** `1500` == `15.00`. Never a decimal.
3. **Idempotency is owned by the create.** Pass `idempotencyKey` to make a create
   safely retryable. For offline-safe retries, mint the key **once** and reuse it
   on every attempt — `OfflineQueue` does this for you.
4. **Retries are narrow.** Only transport failures and HTTP `429` (the fleet rate
   limiter) are retried, with linear backoff. Every other status — including 4xx
   validation and 5xx — is terminal and surfaces immediately.
5. **Typed error ABI.** Catch classes, never parse `code` strings:
   `ApiKeyInvalidError`, `ApiKeyRevokedError`, `EnvMismatchError`,
   `ScopeDeniedError`, `TransportDisabledError`, `OrderNotFoundError`,
   `ReplayError`, `InvalidAmountError`, `UnsupportedCurrencyError`,
   `BadBodyError`, `RateLimitedError`, plus `DoehTransportError`.
6. **Mandatory User-Agent.** The edge/WAF rejects default library agents; the SDK
   always sends one. Pass `userAgent` to identify your app in server logs.

## Offline queue

```ts
import { OfflineQueue, MemoryStorage } from "@beyondplusmm/doehpos-sdk";

// On React Native, back this with an AsyncStorage-backed QueueStorage.
const queue = new OfflineQueue(client.delivery, new MemoryStorage());

await queue.enqueue({ currency: "MMK", amount_minor: 1500 }); // mints + persists the key
// ...later, when connectivity returns:
const result = await queue.flush(); // reuses the same key — exactly one order
```

- `succeeded` — accepted this flush.
- `remaining` — still pending (offline / rate-limited); retried next flush.
- `deadLettered` — terminal failures (e.g. validation); removed, never looped.

## Stability

`delivery`, `kitchen`, and `loyalty` are the **stable** surface — all exercised
by the Expo reference app (`kitchen`/`loyalty` graduated in 0.2.0). `marketplace`
and `rider` remain **`@experimental`** — generated from their OpenAPI specs and
the golden client, but not yet exercised by the reference app. Modules graduate
experimental → reference-app-exercised → stable. Evidence promotes an API;
a schema only permits it.

## Sandbox boundary

Against the sandbox, create + read-back + idempotency are fully real. Downstream
fulfillment propagation is intentionally absent, so an order's `status` does not
transition there. Cutover to production is `environment: "production"` + a
`sk_live_` key — no code change.

## Scripts

| command | what |
| --- | --- |
| `pnpm build` | compile `src` → `dist` (ESM + types) |
| `pnpm test` | offline unit tests (fake fetch; no network) |
| `pnpm test:integration` | live delivery matrix against the sandbox (needs `DOEH_API_KEY`) |
