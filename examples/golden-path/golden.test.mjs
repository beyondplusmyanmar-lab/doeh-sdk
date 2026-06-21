// Golden-path drift gate.
//
// examples/golden-path/order.json is the SINGLE source of truth for the canonical Orders example.
// Every surface must agree with it; this test fails CI if any one drifts:
//   • OpenAPI  — openapi/orders.yaml request/response `examples.golden.value` must equal the fixture.
//   • SDK code — examples/quickstart/orders.ts must submit the fixture's exact basket.
//   • Internal — the fixture's resolved money must be self-consistent (lines → subtotal → grand total).
//
// The portal renders the same fixture (vendored via developer-portal/sync-sdk-examples.sh), so the
// developer docs are a projection of this file too.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import yaml from "js-yaml";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(here, "order.json"), "utf8"));
const spec = yaml.load(readFileSync(join(here, "../../openapi/orders.yaml"), "utf8"));
const quickstart = readFileSync(join(here, "../quickstart/orders.ts"), "utf8");

const jsonContent = (node) => node.content["application/json"];

test("OpenAPI request example equals the golden fixture", () => {
  const ex = jsonContent(spec.paths["/v1/orders"].post.requestBody).examples.golden.value;
  assert.deepStrictEqual(ex, fixture.request);
});

test("OpenAPI 201 response example equals the golden fixture", () => {
  const ex = jsonContent(spec.paths["/v1/orders"].post.responses["201"]).examples.golden.value;
  assert.deepStrictEqual(ex, fixture.response);
});

test("SDK quickstart submits the golden basket", () => {
  for (const { sku, qty } of fixture.request.lines) {
    const needle = `{ sku: "${sku}", qty: ${qty} }`;
    assert.ok(
      quickstart.includes(needle),
      `examples/quickstart/orders.ts must contain ${needle} (golden basket drift)`,
    );
  }
});

test("golden response money is internally consistent", () => {
  const { lines, totals } = fixture.response.order;
  let subtotal = 0;
  let tax = 0;
  for (const l of lines) {
    assert.strictEqual(l.line_total_minor, l.unit_price_minor * l.qty, `line ${l.sku} total`);
    subtotal += l.line_total_minor;
    tax += l.tax_minor ?? 0;
  }
  assert.strictEqual(totals.subtotal_minor, subtotal, "subtotal = sum of line totals");
  assert.strictEqual(totals.tax_minor, tax, "tax = sum of line tax");
  assert.strictEqual(
    totals.grand_total_minor,
    totals.subtotal_minor - totals.discount_minor + totals.tax_minor,
    "grand total = subtotal - discount + tax",
  );
});
