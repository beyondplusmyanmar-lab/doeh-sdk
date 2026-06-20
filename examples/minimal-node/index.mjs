// The smallest possible real consumer of @doeh/sdk.
//
//   export DOEH_API_KEY=sk_test_...
//   node examples/minimal-node/index.mjs
//
// Single shop: the key IS the shop. No shopId anywhere.
import { DoehClient } from "@doeh/sdk";

const client = new DoehClient({
  apiKey: process.env.DOEH_API_KEY,
  environment: "sandbox", // -> "production" + a sk_live_ key to cut over
});

const { order } = await client.delivery.create({ currency: "MMK", amount_minor: 1500 });
console.log("created:", order.id, order.status);

const read = await client.delivery.get(order.id);
console.log("read back:", read.order.id, read.order.amount_minor, read.order.currency);
