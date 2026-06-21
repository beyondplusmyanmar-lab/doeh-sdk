# doeh-expo-reference

A single-shop merchant app built on [`@beyondplusmm/doehpos-sdk`](../../packages/sdk). It is
**executable documentation**: fork it, paste a sandbox key, and you have a
working delivery integration to adapt.

## Run

```bash
# from the repo root
pnpm install
pnpm --filter @beyondplusmm/doehpos-sdk build      # the app imports the built SDK
cd apps/expo-reference
npx expo start                     # press i / a / w for iOS / Android / web
```

Then open **Settings**, paste a `sk_test_` key, keep the environment on
`sandbox`, and Save. (Optional: copy `.env.example` to `.env` and set
`EXPO_PUBLIC_DOEH_API_KEY` to prefill it during development.)

## What it demonstrates

| Acceptance criterion | Where |
| --- | --- |
| Login with a sandbox key (secure storage) | `app/settings.tsx` → `src/store/credentials.tsx` (expo-secure-store) |
| Create a delivery order | `app/create.tsx` → `src/hooks/useCreateOrder.ts` |
| Read an order back | `app/order/[id].tsx` → `src/hooks/useOrder.ts` |
| Idempotent replay works | `app/idempotency.tsx` (two sends, one key, `idempotent=true`) |
| Offline replay works | `src/hooks/useOnlineFlush.ts` + the offline queue (`@beyondplusmm/doehpos-sdk`) |
| Validation rendered nicely | `app/create.tsx` outcome card (typed errors) |
| Survives API restart | retries are transport/429-only; the queue holds the rest |
| Sandbox → production is config-only | `app/settings.tsx` environment toggle |
| Loyalty earn + balance read-back | `app/loyalty.tsx` → `src/hooks/useLoyalty.ts` |

> **Loyalty module.** `app/loyalty.tsx` exercises the `client.loyalty` surface.
> The calls are direct — not routed through the delivery offline queue — and
> surface typed errors, including `ScopeDeniedError` when the key lacks the module.

## Architecture

```
expo-router screens (app/)
        │  thin: forms + render outcomes
        ▼
hooks (src/hooks/)            ← React Query cache + mutations
        │
        ▼
@beyondplusmm/doehpos-sdk  DoehClient + OfflineQueue
        │
        ▼
sandbox-api.doehpos.com
```

Key choices, all inherited from the SDK contract:

- **No shop concept.** The key is the shop; there is no shop selector, owner
  dashboard, or `shopId` anywhere.
- **Every create flows through the offline queue** (enqueue → flush), so the
  online and offline paths are identical and retries are safe by construction
  (one idempotency key, minted once, reused forever).
- **React Query does not retry** — the SDK already retries transport failures
  and 429; double-retrying would be wrong.
- **The key lives in SecureStore**, the offline queue (order amounts, not
  secrets) in AsyncStorage.

## Notes

- Versions are pinned for Expo SDK 52. Run `npx expo install --check` after
  `pnpm install` to align any native module versions for your toolchain.
- On some React Native runtimes `crypto.randomUUID` is absent; the SDK falls
  back to a v4 UUID automatically. For stronger keys, add `expo-crypto` and a
  global polyfill.
- This app has not been launched against a simulator in this repo's CI; it is
  provided as a complete, typed starting point.
