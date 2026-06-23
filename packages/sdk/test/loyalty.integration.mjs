// Live loyalty integration check — replays the golden loyalty lifecycle
// (examples/golden-path/loyalty.json) against the real sandbox edge. Proves the
// SDK's earn/redeem/getMember produce the contract's observable behavior:
// auto-provision, shop-scoped balance arithmetic, the insufficient-points guard,
// and redeem idempotency (no double-spend).
//
//   export DOEH_API_KEY=sk_test_...        # a key with loyalty:read,loyalty:write scope
//   export DOEH_API_BASE=https://sandbox-api.doehpos.com   # optional; defaults to sandbox
//   node test/loyalty.integration.mjs
//
// Uses a FRESH random member id each run so absolute balances match the golden
// fixture deterministically regardless of prior runs. Exits 0 iff every step passes.
import {
  DoehClient,
  MemberNotFoundError,
  InsufficientPointsError,
} from "../dist/index.js";

const KEY = process.env.DOEH_API_KEY;
const BASE = process.env.DOEH_API_BASE;
let pass = 0,
  fail = 0;
const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? `  — ${detail}` : ""}`);
  ok ? pass++ : fail++;
};

const opts = BASE ? { baseUrl: BASE } : { environment: "sandbox" };

async function main() {
  console.log(`loyalty integration → ${BASE ?? "sandbox"}`);
  if (!KEY) {
    console.log("  (no DOEH_API_KEY set — nothing to do)");
    return finish();
  }

  const c = new DoehClient({ apiKey: KEY, ...opts });
  const member = "LOYALTY_INT_" + Math.random().toString(16).slice(2, 10);
  console.log(`  member = ${member}`);

  // 0. read a never-seen member -> 404 EDGE_MEMBER_NOT_FOUND
  try {
    await c.loyalty.getMember(member);
    check("fresh member read -> 404", false, "no error thrown");
  } catch (e) {
    check("fresh member read -> 404 EDGE_MEMBER_NOT_FOUND", e instanceof MemberNotFoundError, e?.code ?? `${e}`);
  }

  // 1. earn 1000 -> auto-provisions, balance 1000
  const e1 = await c.loyalty.earn(member, { points: 1000, reason: "signup bonus" });
  check("earn 1000 -> balance 1000", e1.ok === true && e1.account.balance === 1000, `balance=${e1.account.balance}`);

  // 2. earn 200 -> balance 1200
  const e2 = await c.loyalty.earn(member, { points: 200, reason: "purchase" });
  check("earn 200 -> balance 1200", e2.account.balance === 1200, `balance=${e2.account.balance}`);

  // 3. read back -> balance 1200
  const r = await c.loyalty.getMember(member);
  check("getMember -> balance 1200", r.account.balance === 1200, `balance=${r.account.balance}`);

  // 4. redeem 300 -> balance 900
  const rd = await c.loyalty.redeem(member, { points: 300, reason: "reward" });
  check("redeem 300 -> balance 900", rd.account.balance === 900, `balance=${rd.account.balance}`);

  // 5. redeem 5000 (over balance) -> 409, no deduction, balance reported = 900
  try {
    await c.loyalty.redeem(member, { points: 5000 });
    check("redeem over balance -> 409", false, "no error thrown");
  } catch (e) {
    const balanceOk = e instanceof InsufficientPointsError && e.body?.balance === 900;
    check("redeem over balance -> 409 EDGE_INSUFFICIENT_POINTS (balance unchanged)", balanceOk, `code=${e?.code} balance=${e?.body?.balance}`);
  }
  const after = await c.loyalty.getMember(member);
  check("balance still 900 after rejected redeem", after.account.balance === 900, `balance=${after.account.balance}`);

  // 6. redeem idempotency — same key twice deducts once (900 -> 800, replay stays 800)
  const idem = "loy-int-" + Math.random().toString(16).slice(2, 10);
  const i1 = await c.loyalty.redeem(member, { points: 100 }, { idempotencyKey: idem });
  const i2 = await c.loyalty.redeem(member, { points: 100 }, { idempotencyKey: idem });
  check(
    "redeem idempotency: same key deducts once (balance 800, replay flagged)",
    i1.account.balance === 800 && i2.account.balance === 800 && i2.idempotent === true,
    `b1=${i1.account.balance} b2=${i2.account.balance} idem=${i2.idempotent}`,
  );

  return finish();
}

function finish() {
  console.log(`\nResult: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("\nFATAL", e);
  process.exit(1);
});
