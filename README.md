# Doeh POS — SDK & Expo reference

Public developer artifacts for the Doeh POS API: a typed SDK and an Expo
reference app you can fork and adapt to your own merchant, rider, kitchen, or
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

## Provenance

The SDK is a faithful port of the first-party **golden client** (originally a
single dependency-free Python script that onboards exactly as a partner would,
and was observed passing 14/14 live against `sandbox-api.doehpos.com`). Porting
rather than reinventing is deliberate: it keeps the public surface from drifting
away from the contract that was empirically proven.

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| **H.1** | `@beyondplusmm/doehpos-sdk`: transport, typed error ABI, idempotency, offline queue, **delivery** module; kitchen/loyalty/marketplace/rider `@experimental` | ✅ done |
| **H.2** | Expo reference app: paste `sk_test_`, create/read order, offline replay, double-tap dedupe, config-only cutover | ✅ done |
| **H.3** | Public release: npm package + GitHub + docs (fork-and-go) | ✅ done |

## License

MIT.
