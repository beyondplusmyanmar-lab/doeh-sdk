# Five-minute quickstart

Run the **mobile golden client** ([`apps/expo-reference`](../apps/expo-reference))
against the live sandbox and watch the offline queue replay an order. No
production access required — everything below uses a sandbox (`sk_test_`) key.

## Prerequisites

- Node.js >= 18 and [pnpm](https://pnpm.io) 9+
- The [Expo Go](https://expo.dev/go) app on your phone (iOS or Android), or a
  simulator/emulator
- A sandbox API key — mint one from the developer portal
  (https://developers.doehpos.com/portal). It looks like `sk_test_...`.

## Steps

```bash
# 1. Clone and install the workspace
git clone https://github.com/beyondplusmyanmar-lab/doeh-sdk.git
cd doeh-sdk
pnpm install

# 2. Build the SDK (the app imports the built workspace package)
pnpm build

# 3. Start the reference app
pnpm --filter doeh-expo-reference start
#    (equivalently: cd apps/expo-reference && npx expo start)
```

4. **Scan the QR code** printed in the terminal with Expo Go (or press `i` / `a`
   for a simulator).
5. Open **Settings**, paste your `sk_test_` key, keep the environment on
   **sandbox**, and Save. (Scope is derived from the key — there is no shop
   selector.)
6. Go to **Create a delivery order**, submit, and watch the **read-back** on the
   order detail screen.

## See the offline queue work

This is the part worth showing off:

7. Turn on **airplane mode** (or kill Wi-Fi).
8. Create another order — it is **queued locally**, with its idempotency key
   minted once and persisted. The home screen shows `N order(s) queued offline`.
9. **Reconnect.** The queue flushes automatically; the order is created exactly
   once (the same key is reused on replay, so reconnect mid-flight never
   duplicates).

## Going to production

No code change — flip the environment to `production` in **Settings** and use an
`sk_live_` key instead of `sk_test_`. Sandbox and production differ only in
configuration.

## Next

- Typed error handling, idempotency, and the queue API are documented in the
  [SDK README](../packages/sdk/README.md).
- For a server-side integration, see [`examples/minimal-node`](../examples/minimal-node).
