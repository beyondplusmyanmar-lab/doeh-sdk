# Changelog

All notable changes to `@beyondplusmm/doehpos-sdk` are documented here. This project adheres to
[Semantic Versioning](https://semver.org/). The stable surface is `delivery`;
`@experimental` modules may change in a minor release until they graduate.

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
