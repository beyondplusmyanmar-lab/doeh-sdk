# Changelog

All notable changes to `@beyondplusmm/doehpos-sdk` are documented here. This project adheres to
[Semantic Versioning](https://semver.org/). The stable surface is `delivery`;
`@experimental` modules may change in a minor release until they graduate.

## Unreleased

### Added

- **loyalty `redeem`** — `client.loyalty.redeem(memberId, { points })` spends
  points (`POST /v1/loyalty/members/{id}/redeem`). Idempotent with an
  Idempotency-Key — a retried redeem never double-spends. Closes the parity gap
  where the edge and OpenAPI exposed `redeem` but the SDK shipped only `earn` +
  `getMember`. The loyalty surface (earn / redeem / getMember) now matches the
  contract.
- **`InsufficientPointsError`** (409, `EDGE_INSUFFICIENT_POINTS`) — thrown when a
  redeem exceeds the balance; no points are deducted and no ledger entry written.
  The current balance is on `err.body.balance`.
- **`MemberNotFoundError`** (404, `EDGE_MEMBER_NOT_FOUND`) — thrown when reading a
  member that has no account in the shop yet (earn auto-provisions).
- **`PointsInput`** / **`RedeemInput`** types (shared `PointsOp` shape); `EarnInput`
  kept as a back-compat alias.
- First **loyalty unit tests** (earn / redeem / getMember request shaping,
  idempotency, member-id validation, and the 409 → typed-error mapping).

## 0.3.0

### Removed (breaking)

- **kitchen** capability — `client.kitchen`, `KitchenModule`, and the
  `TicketCreate` / `TicketResponse` types are removed. Kitchen is an
  operator-facing subsystem (KDS, printers, prep queues, staff workflows), not a
  third-party developer capability, so it no longer ships in the developer SDK or
  the Merchant API docs. Pre-1.0 breaking change per SemVer (a `0.x` minor may
  break). Apps that used `client.kitchen` must remove those calls; `0.2.0`
  remains available on npm with kitchen if needed during migration. The stable
  surface is now `delivery` and `loyalty`.

### Added (experimental)

- **orders** capability (`client.orders.submit` / `.get`, `POST /v1/orders`) —
  `@experimental`. A server-priced **sales submission**: the client sends a
  basket of `{ sku, qty }`; the server resolves prices/tax/inventory/totals.
  Clients never send prices, a grand total, or a currency. Additive to and
  independent of the legacy money-total `delivery.create`. New typed errors:
  `EmptyOrderError`, `UnknownSkuError`, `UnpricedSkuError`,
  `InsufficientStockError`. **Not live** until the edge façade over the POS sale
  aggregate exists — stays `@experimental` until exercised end to end.

## 0.2.0

### Changed

- **kitchen** and **loyalty** graduated from `@experimental` to **stable** — now
  exercised end to end by the Expo reference app (`apps/expo-reference`). Their
  module files moved from `modules/experimental/` to `modules/`; the public
  import surface (`import { KitchenModule, LoyaltyModule } from "@beyondplusmm/doehpos-sdk"`)
  is unchanged.
- `marketplace` and `rider` remain `@experimental` until exercised by the
  reference app.

## 0.1.0

Initial release — a typed port of the validated golden client.

### Added

- `DoehClient` with `environment: "sandbox" | "production"` (cutover is config
  only; no shop concept — scope is derived from the key).
- **delivery** module (stable): `create`, `get`.
- **kitchen / loyalty / marketplace / rider** modules (`@experimental`,
  schema-derived, not yet reference-app-exercised).
- Typed error ABI: `ApiKeyInvalidError`, `ApiKeyExpiredError`,
  `ApiKeyRevokedError`, `EnvMismatchError`, `ScopeDeniedError`,
  `TransportDisabledError`, `OrderNotFoundError`, `ReplayError`,
  `InvalidAmountError`, `UnsupportedCurrencyError`, `BadBodyError`,
  `RateLimitedError`, plus `DoehTransportError`.
- `OfflineQueue` with pluggable `QueueStorage` — mints one idempotency key per
  mutation and reuses it on every attempt; dead-letters terminal failures.
- Retry policy limited to transport failures and HTTP 429 (linear backoff).
- Mandatory `User-Agent`; `Idempotency-Key` and `Trace-Id` headers.
