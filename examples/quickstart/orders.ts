/**
 * DOEH POS SDK — Quickstart: place your first order in three steps.
 *
 *   1. Install:  npm install @beyondplusmm/doehpos-sdk
 *   2. Authenticate with a sandbox key (the key IS the shop — no shopId anywhere).
 *   3. Submit a basket of { sku, qty } and get back a fully resolved order.
 *
 * Run against the sandbox:
 *   export DOEH_API_KEY=sk_test_...
 *   npx tsx examples/quickstart/orders.ts
 *
 * Orders (sales submission) is @experimental and not yet live in production —
 * build against the sandbox today; cut over later by swapping the key (sk_live_)
 * and the environment. You send only { sku, qty }; the server resolves pricing,
 * tax, discounts and inventory and is the source of truth for the order. Money is
 * always an integer in minor units.
 *
 * This file is the canonical, CI-type-checked quickstart and the single source
 * the developer portal's SDK page renders — keep it runnable and minimal.
 */
import { DoehClient, EmptyOrderError, UnknownSkuError } from "@beyondplusmm/doehpos-sdk";

// 1 + 2 · install, then authenticate. A test key only works against the sandbox.
const client = new DoehClient({
  apiKey: process.env.DOEH_API_KEY!, // sk_test_...
  environment: "sandbox", // -> "production" + a sk_live_ key to cut over
});

// 3 · submit a basket — prices, taxes and totals are computed server-side.
try {
  const { order } = await client.orders.submit({
    lines: [
      { sku: "BURGER001", qty: 2 },
      { sku: "COLA001", qty: 1 },
    ],
  });

  // A fully resolved order: server-priced totals in minor units.
  console.log("order:", order.id, order.status);
  console.log("total:", order.totals.grand_total_minor, order.totals.currency);
} catch (err) {
  // Catch typed errors — never parse `code` strings off the wire.
  if (err instanceof EmptyOrderError) {
    console.error("submission had no line items");
  } else if (err instanceof UnknownSkuError) {
    console.error("a line referenced a sku this shop does not sell");
  } else {
    throw err;
  }
}
