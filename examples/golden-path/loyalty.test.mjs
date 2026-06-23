// Golden-path drift gate — Loyalty.
//
// examples/golden-path/loyalty.json is the single source of truth for the canonical
// loyalty lifecycle (earn -> balance -> redeem -> insufficient-points guard). This
// test fails CI if the fixture's arithmetic or the guard contract drifts. The same
// steps are replayed live against the sandbox by test/golden.integration.mjs and
// demonstrated by the reference app's loyalty screen — so all three stay in lockstep.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(here, "loyalty.json"), "utf8"));

const MEMBER_ID = /^[A-Za-z0-9_]+$/;

test("member id matches the contract pattern (no hyphens)", () => {
  assert.match(fixture.member_id, MEMBER_ID);
});

test("every points value is a positive whole integer", () => {
  for (const step of fixture.steps) {
    const p = step.request.points;
    assert.ok(Number.isInteger(p) && p >= 1, `step ${step.op}: points must be a positive integer`);
  }
});

test("balances are internally consistent: earn adds, redeem subtracts, guard leaves unchanged", () => {
  let balance = 0;
  for (const step of fixture.steps) {
    if (step.op === "earn") {
      balance += step.request.points;
      assert.strictEqual(step.response.account.balance, balance, `after ${step.op} ${step.request.points}`);
    } else if (step.op === "redeem") {
      assert.ok(step.request.points <= balance, `redeem ${step.request.points} must not exceed balance ${balance}`);
      balance -= step.request.points;
      assert.strictEqual(step.response.account.balance, balance, `after redeem ${step.request.points}`);
    } else if (step.op === "redeem-over-balance") {
      // The guard step: must request MORE than the balance and leave it untouched.
      assert.ok(step.request.points > balance, "redeem-over-balance must exceed the balance");
      assert.strictEqual(step.error.status, 409);
      assert.strictEqual(step.error.code, "EDGE_INSUFFICIENT_POINTS");
      assert.strictEqual(step.error.balance, balance, "409 must report the unchanged current balance");
    } else {
      assert.fail(`unknown op ${step.op}`);
    }
  }
});

test("balance never goes negative across the lifecycle", () => {
  let balance = 0;
  for (const step of fixture.steps) {
    if (step.op === "earn") balance += step.request.points;
    else if (step.op === "redeem") balance -= step.request.points;
    assert.ok(balance >= 0, `balance went negative at ${step.op}`);
  }
});
