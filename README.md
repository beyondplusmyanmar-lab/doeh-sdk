# Doeh POS — SDK & Expo reference

Public developer artifacts for the Doeh POS API: a typed SDK and an Expo
reference app you can fork and adapt to your own merchant, rider, or
marketplace integration.

```
doeh-sdk/
├── packages/
│   └── sdk/                 # @beyondplusmm/doehpos-sdk — the stable public contract (H.1, DONE)
├── apps/
│   └── expo-reference/      # Expo single-shop demo (H.2, DONE)
├── examples/
│   └── minimal-node/        # smallest real consumer
├── openapi/                 # the public API specs (source of the types)
├── docs/
├── pnpm-workspace.yaml
└── package.json
```

## What DOEH is

DOEH is an **application platform**, not a merchant application. It exposes
**composable business capabilities** — delivery, loyalty, marketplace,
rider — as independent SDK modules over a stable contract.

- **Consume one capability or many.** A delivery app may use only
  `client.delivery`; a loyalty kiosk only `client.loyalty`. The modules don't
  depend on each other.
- **DOEH prescribes no client UI or client-side workflow.** You build the screens
  and the flow; ship it to the app stores under your own branding.
- **Integrity-critical orchestration is server-owned.** When a business action
  fans out (an order → kitchen ticket → loyalty → accounting), that is the
  server's job as business truth — not a chain of calls composed on the device.
  Clients compose *capabilities*, not transactions.

> **The principle, stated plainly.** SDK capabilities are composable primitives.
> Consumers may compose user experiences. Integrity-critical business workflows
> remain server-owned. DOEH APIs expose capabilities, not distributed transactions.

The artifacts here serve that model: the **SDK** is typed transport, the
**Expo reference app** is a teaching client that intentionally exposes SDK
concepts (`minor units`, idempotency, `ScopeDeniedError`), and the OpenAPI specs
are the contract. Apps you build to *use* DOEH should hide those concepts behind
your own domain layer.

## Install

The SDK is published on npm:

```bash
npm install @beyondplusmm/doehpos-sdk
# or
pnpm add @beyondplusmm/doehpos-sdk
# or
yarn add @beyondplusmm/doehpos-sdk
```

- **npm:** https://www.npmjs.com/package/@beyondplusmm/doehpos-sdk
- Download the raw tarball: `npm pack @beyondplusmm/doehpos-sdk`

## Build from source

```bash
pnpm install
pnpm --filter @beyondplusmm/doehpos-sdk build
pnpm --filter @beyondplusmm/doehpos-sdk test              # offline unit tests

export DOEH_API_KEY=sk_test_...
pnpm --filter @beyondplusmm/doehpos-sdk test:integration  # live sandbox matrix
```

## Reference applications

Two runnable consumers ship in this repo. The Expo app is the **mobile golden
client** — the canonical, end-to-end integration to fork and adapt.

### Mobile golden client — `apps/expo-reference`

An Expo Router app demonstrating the full integration, exercised against the
published SDK (`expo export` builds it into a real native bundle):

- SDK initialization
- Secure API key storage (`expo-secure-store`)
- Delivery order creation and read-back
- Offline queue with idempotent replay
- Automatic flush on reconnect
- Typed error handling (catch `InvalidAmountError` etc. — never parse `code`)
- Sandbox ↔ production cutover is config-only

```bash
# from the repo root — the app imports the *built* workspace SDK
pnpm install
pnpm --filter @beyondplusmm/doehpos-sdk build
cd apps/expo-reference
npx expo start          # press i / a / w for iOS / Android / web
```

Then open **Settings**, paste an `sk_test_` key, and Save. For a step-by-step
walkthrough (including the offline-queue demo), see the
[five-minute quickstart](docs/QUICKSTART.md).

### Minimal backend consumer — `examples/minimal-node`

The smallest real Node consumer of the SDK — start here for a server-side
integration.

> The original first-party Python golden client (`doeh_demo_client.py`) lives in
> the product repo's `developer-portal/examples/golden-client`; it is the source
> this SDK was ported from (see Provenance below), not shipped here.

## Provenance

The SDK is a faithful port of the first-party **golden client** (originally a
single dependency-free Python script that onboards exactly as a partner would,
and was observed passing 14/14 live against `sandbox-api.doehpos.com`). Porting
rather than reinventing is deliberate: it keeps the public surface from drifting
away from the contract that was empirically proven.

## Contract integrity

> **Invariant.** The golden fixture is the sole source of truth for example
> behavior. OpenAPI examples, SDK quickstarts, and portal content are
> projections validated against it by CI.

See [`docs/CONTRACT-HIERARCHY.md`](docs/CONTRACT-HIERARCHY.md) for the layer
model and the rule that resolves conflicts between surfaces.

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| **H.1** | `@beyondplusmm/doehpos-sdk`: transport, typed error ABI, idempotency, offline queue, **delivery** module; kitchen/loyalty/marketplace/rider `@experimental` | ✅ done |
| **H.2** | Expo reference app: paste `sk_test_`, create/read order, offline replay, double-tap dedupe, config-only cutover | ✅ done |
| **H.3** | Public release: npm package + GitHub + docs (fork-and-go) | ✅ done |

## License

MIT.
