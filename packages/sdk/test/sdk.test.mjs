// Offline unit tests for @beyondplusmm/doehpos-sdk. No network: a fake fetch scripts responses
// and records every request so we can assert headers, retry policy, and the
// idempotency-key-reuse invariant. Run with: pnpm test
import test from "node:test";
import assert from "node:assert/strict";

import {
  DoehClient,
  OfflineQueue,
  MemoryStorage,
  mapApiError,
  isRetryable,
  InvalidAmountError,
  ApiKeyRevokedError,
  OrderNotFoundError,
  RateLimitedError,
  DoehTransportError,
} from "../dist/index.js";

// ── a scriptable fake fetch ──────────────────────────────────────────────────
function makeFetch() {
  const calls = [];
  let behavior = () => ({ status: 201, body: { ok: true, order: { id: "ord_default" } } });
  const fn = async (url, init) => {
    calls.push({ url, init, headers: init.headers });
    const r = behavior(calls.length, { url, init });
    if (r instanceof Error) throw r;
    return { status: r.status, text: async () => JSON.stringify(r.body ?? {}) };
  };
  fn.calls = calls;
  fn.setBehavior = (b) => {
    behavior = b;
  };
  return fn;
}

const instantSleep = async () => {};

function client(fetchFn, extra = {}) {
  return new DoehClient({
    apiKey: "sk_test_unit",
    environment: "sandbox",
    fetch: fetchFn,
    sleep: instantSleep,
    ...extra,
  });
}

// ── error mapping (the ABI) ──────────────────────────────────────────────────
test("mapApiError returns typed classes per code", () => {
  assert.ok(mapApiError(422, { code: "EDGE_INVALID_AMOUNT" }) instanceof InvalidAmountError);
  assert.ok(mapApiError(401, { code: "API_KEY_REVOKED" }) instanceof ApiKeyRevokedError);
  assert.ok(mapApiError(404, { code: "EDGE_ORDER_NOT_FOUND" }) instanceof OrderNotFoundError);
  assert.ok(mapApiError(429, { code: "WHATEVER" }) instanceof RateLimitedError);
});

test("retry predicate: only transport + 429", () => {
  assert.equal(isRetryable(new DoehTransportError("net")), true);
  assert.equal(isRetryable(mapApiError(429, {})), true);
  assert.equal(isRetryable(mapApiError(422, { code: "EDGE_INVALID_AMOUNT" })), false);
  assert.equal(isRetryable(mapApiError(401, { code: "API_KEY_INVALID" })), false);
  assert.equal(isRetryable(mapApiError(500, {})), false);
});

// ── request shaping ──────────────────────────────────────────────────────────
test("delivery.create sends bearer auth, UA, idempotency, and JSON body", async () => {
  const f = makeFetch();
  f.setBehavior(() => ({ status: 201, body: { ok: true, order: { id: "ord_abc" } } }));
  const c = client(f);
  const res = await c.delivery.create(
    { currency: "MMK", amount_minor: 1500 },
    { idempotencyKey: "demo-123" },
  );
  assert.equal(res.order.id, "ord_abc");
  const { url, init, headers } = f.calls[0];
  assert.equal(url, "https://sandbox-api.doehpos.com/v1/delivery/orders");
  assert.equal(init.method, "POST");
  assert.equal(headers["Authorization"], "Bearer sk_test_unit");
  assert.match(headers["User-Agent"], /doeh-sdk\/\d/);
  assert.equal(headers["Idempotency-Key"], "demo-123"); // NOT X-Idempotency-Key
  assert.ok(headers["Trace-Id"]);
  assert.deepEqual(JSON.parse(init.body), { currency: "MMK", amount_minor: 1500 });
});

test("delivery.create rejects bad amount client-side (no request sent)", async () => {
  const f = makeFetch();
  const c = client(f);
  await assert.rejects(() => c.delivery.create({ currency: "MMK", amount_minor: 0 }), RangeError);
  assert.equal(f.calls.length, 0);
});

test("delivery.get validates the path id client-side", async () => {
  const f = makeFetch();
  const c = client(f);
  await assert.rejects(() => c.delivery.get("bad-id-with-hyphens!"), RangeError);
  assert.equal(f.calls.length, 0);
});

// ── retry behavior ───────────────────────────────────────────────────────────
test("429 is retried then succeeds", async () => {
  const f = makeFetch();
  f.setBehavior((n) =>
    n < 3
      ? { status: 429, body: { ok: false, code: "EDGE_RATE_LIMITED" } }
      : { status: 201, body: { ok: true, order: { id: "ord_after_429" } } },
  );
  const c = client(f, { maxRetries: 4 });
  const res = await c.delivery.create({ currency: "MMK", amount_minor: 1500 });
  assert.equal(res.order.id, "ord_after_429");
  assert.equal(f.calls.length, 3);
});

test("422 validation is NOT retried", async () => {
  const f = makeFetch();
  f.setBehavior(() => ({ status: 422, body: { ok: false, code: "EDGE_INVALID_AMOUNT" } }));
  const c = client(f, { maxRetries: 4 });
  await assert.rejects(() => c.delivery.create({ currency: "MMK", amount_minor: 1500 }), InvalidAmountError);
  assert.equal(f.calls.length, 1); // tried exactly once
});

test("transport error is retried up to maxRetries then throws", async () => {
  const f = makeFetch();
  f.setBehavior(() => new TypeError("network down"));
  const c = client(f, { maxRetries: 2 });
  await assert.rejects(() => c.delivery.create({ currency: "MMK", amount_minor: 1500 }), DoehTransportError);
  assert.equal(f.calls.length, 3); // 1 initial + 2 retries
});

// ── the central invariant: offline queue reuses ONE key across attempts ──────
test("OfflineQueue mints key once and reuses it across flush attempts", async () => {
  const f = makeFetch();
  // maxRetries:0 so a transport failure surfaces immediately (simulates offline)
  const c = client(f, { maxRetries: 0 });
  const q = new OfflineQueue(c.delivery, new MemoryStorage());

  const m = await q.enqueue({ currency: "MMK", amount_minor: 1500 });
  assert.ok(m.idempotencyKey.startsWith("delivery-"));

  // First flush: offline -> kept, not dead-lettered.
  f.setBehavior(() => new TypeError("offline"));
  let r = await q.flush();
  assert.equal(r.succeeded.length, 0);
  assert.equal(r.deadLettered.length, 0);
  assert.equal(r.remaining.length, 1);
  const keyAttempt1 = f.calls.at(-1).headers["Idempotency-Key"];

  // Second flush: online -> succeeds, queue drains.
  f.setBehavior(() => ({ status: 201, body: { ok: true, order: { id: "ord_synced" } } }));
  r = await q.flush();
  assert.equal(r.succeeded.length, 1);
  assert.equal(r.succeeded[0].response.order.id, "ord_synced");
  assert.equal((await q.pending()).length, 0);
  const keyAttempt2 = f.calls.at(-1).headers["Idempotency-Key"];

  // THE invariant: same key on every attempt.
  assert.equal(keyAttempt1, keyAttempt2);
  assert.equal(keyAttempt1, m.idempotencyKey);
});

test("OfflineQueue dead-letters a terminal 4xx instead of looping forever", async () => {
  const f = makeFetch();
  const c = client(f, { maxRetries: 0 });
  const q = new OfflineQueue(c.delivery, new MemoryStorage());
  await q.enqueue({ currency: "MMK", amount_minor: 1500 });

  f.setBehavior(() => ({ status: 422, body: { ok: false, code: "EDGE_INVALID_AMOUNT" } }));
  const r = await q.flush();
  assert.equal(r.deadLettered.length, 1);
  assert.ok(r.deadLettered[0].error instanceof InvalidAmountError);
  assert.equal((await q.pending()).length, 0); // removed, not retried forever
});

// ── orders (sales submission) capability — @experimental ─────────────────────
test("orders.submit posts a basket to /v1/orders with idempotency + bearer", async () => {
  const f = makeFetch();
  f.setBehavior(() => ({
    status: 201,
    body: { ok: true, order: { id: "ord_sub1", totals: { grand_total_minor: 16800 } } },
  }));
  const c = client(f);
  const submission = { lines: [{ sku: "BURGER001", qty: 2 }, { sku: "COLA001", qty: 1 }] };
  const res = await c.orders.submit(submission, { idempotencyKey: "sub-123" });
  assert.equal(res.order.id, "ord_sub1");
  const { url, init, headers } = f.calls[0];
  assert.equal(url, "https://sandbox-api.doehpos.com/v1/orders");
  assert.equal(init.method, "POST");
  assert.equal(headers["Authorization"], "Bearer sk_test_unit");
  assert.equal(headers["Idempotency-Key"], "sub-123");
  // the basket goes up verbatim — no client-side price or total is ever sent
  assert.deepEqual(JSON.parse(init.body), submission);
  assert.equal(JSON.parse(init.body).amount_minor, undefined);
});

test("orders.submit rejects an empty basket client-side (no request sent)", async () => {
  const f = makeFetch();
  const c = client(f);
  await assert.rejects(() => c.orders.submit({ lines: [] }), RangeError);
  assert.equal(f.calls.length, 0);
});

test("orders.submit rejects a bad line (qty < 1 / empty sku) client-side", async () => {
  const f = makeFetch();
  const c = client(f);
  await assert.rejects(() => c.orders.submit({ lines: [{ sku: "X", qty: 0 }] }), RangeError);
  await assert.rejects(() => c.orders.submit({ lines: [{ sku: "", qty: 1 }] }), RangeError);
  assert.equal(f.calls.length, 0);
});

test("orders catalog error codes map to typed classes", async () => {
  const { UnknownSkuError, UnpricedSkuError, EmptyOrderError, InsufficientStockError } = await import(
    "../dist/index.js"
  );
  assert.ok(mapApiError(422, { code: "EDGE_UNKNOWN_SKU" }) instanceof UnknownSkuError);
  assert.ok(mapApiError(422, { code: "EDGE_UNPRICED_SKU" }) instanceof UnpricedSkuError);
  assert.ok(mapApiError(422, { code: "EDGE_EMPTY_ORDER" }) instanceof EmptyOrderError);
  assert.ok(mapApiError(422, { code: "EDGE_INSUFFICIENT_STOCK" }) instanceof InsufficientStockError);
});
