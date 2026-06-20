# EPIC1-FACADE.md — Sales Submission façade design

Status: **design, pre-implementation.** Encodes the decisions that Slice 3 (the
backend façade) must not re-litigate. Gate 1 is closed; this is Gate 2. No PHP
until this is accepted.

Contract: [`openapi/orders.yaml`](../openapi/orders.yaml) · SDK: `client.orders` (`@experimental`).

## 1. Locked decisions (Gate 1)

| Topic | Decision |
| --- | --- |
| Customer identity | `customer.phone?` only. No `member_id`/`customer_ref` in the public contract. |
| Fulfillment taxonomy | `pickup \| delivery \| dine_in`, snake_case. No `takeaway` (UI maps takeaway→pickup). |
| Error ABI (422) | `EDGE_EMPTY_ORDER`, `EDGE_UNKNOWN_SKU`, `EDGE_UNPRICED_SKU`, `EDGE_INSUFFICIENT_STOCK` — append-only. |
| Compatibility | `delivery.create()` stays additive/untouched forever; `orders` is parallel. |
| Payment (V1) | A submission expresses **purchase intent, not settlement** → created `pay_later`. No payment field in the request; response carries `payment_status` (V1 always `unpaid`). See INV EPIC1-G1-PAY. |

## 2. Topology — façade, not a second order domain

The `orders` capability is a **thin proxy over the existing POS sale aggregate**.
It owns **no** business state (no `edge_gw` order tables — that's the legacy
`delivery.create` path only).

```
client.orders.submit()
        │  POST /v1/orders        (basket: {sku, qty}; no prices/total/currency)
        ▼
edge orders Core  ── thin: verify edge context, forward ──►  PosApiClient
        ▼
pos-shop  SaleService::createSale(shopId, userId, data)   ← SOURCE OF TRUTH
        │  price resolve · tax · promo · loyalty · inventory · COGS · journals
        ▼
  pos_site Order (+ OrderItems)   [+ DeliveryOrder if fulfillment=delivery]
        │
        ▼
  order.created (lines, totals, customer, fulfillment)  →  outbox  →  Slice 5 worker
```

`GET /v1/orders/{id}` reads back through pos-shop (the Order), not from any edge
store. **Pricing/inventory/accounting are never reimplemented at the edge.**

### INV-EPIC1-6 — the edge façade MUST NOT persist sales truth

Enforces the Epic-0 conclusion so no future change recreates an `edge_gw.orders`
shadow.

- **Allowed at the edge:** request validation, an idempotency cache (replay
  mapping only), correlation/trace IDs, observability metadata.
- **Forbidden at the edge:** pricing, inventory, promotions, loyalty accrual,
  accounting journals, **canonical order storage**.

If a behavior would let the edge answer a business question without pos-shop, it
belongs in pos-shop, not the façade.

### EPIC1-G1-PAY — submission expresses intent, not settlement

`POST /v1/orders` expresses **customer purchase intent**, not financial
settlement. Settlement remains POS truth.

- **V1:** every submission is created `pay_later`. The request carries **no**
  payment fields; the response carries `payment_status` (V1 always `unpaid`).
- **Extensible, not unpaid-forever:** this is the V1 implementation of an
  extensible payment model — a `payment.mode` (`pay_later | prepaid`, then a
  provider) may be introduced **additively** later. The contract is not
  redesigned to add it.
- **Inventory is out of scope for Epic 1.** Inventory timing follows existing POS
  `pay_later` behavior (deferred to payment), so `EDGE_INSUFFICIENT_STOCK` does
  **not** fire at submit in V1. Reserve-on-submit is a separate inventory epic;
  Epic 1 does not redefine it.

Consequence: no contract change for payment, no settlement semantics leak into
the SDK, and loyalty can later choose to award on submit / payment / completion.

## 3. Fulfillment truth table

| fulfillment | Create Order (Sale) | Create DeliveryOrder |
| --- | --- | --- |
| `pickup` | ✅ | ❌ |
| `dine_in` | ✅ | ❌ |
| `delivery` | ✅ | ✅ (`DeliveryOrder.order_id` → the Order) |

## 4. Sale ↔ DeliveryOrder mapping

- Every submission creates exactly one pos-shop **`Order`** (the sale).
- `delivery` additionally creates a **`DeliveryOrder`** linked by `order_id`
  (confirmed `belongsTo(Order)`), entering the existing rider/status lifecycle
  (`PENDING → … → DELIVERED`). This is how the future **Order→Rider** workflow
  attaches — DOEH does not invent a parallel fulfillment domain.

## 5. Customer identity strategy

Public contract carries `phone` only. Resolution is **internal**:

```
phone ─► member lookup ─► found  : attach member_id to the Order (loyalty-eligible)
                          missing : guest sale (no member)
```

This keeps internal member identity out of the public ABI and lets the Order→Loyalty
workflow key off the (server-resolved) member without the client knowing it exists.

## 6. Compatibility policy (Gate 3 — satisfied as implemented)

`delivery.create()` and `/v1/delivery/orders` are **permanent and untouched**.
`orders` is purely additive. No deprecation is proposed; if it ever happens it
will be announced with a sunset window, never a breaking removal.

## 7. Slice 3 work items / risks (grounded in the current backend)

These are real gaps found by reading pos-shop — Slice 3 must address them:

1. **Order-level idempotency is missing.** `createSale` is idempotent for
   journals/COGS but **not** for the Order itself — a duplicate POST creates a
   second sale. Slice 3 must enforce idempotency keyed by the edge
   `Idempotency-Key` (per operation/shop/branch) at the façade or in `createSale`,
   returning the original Order (200) on replay.
2. **No domain-event outbox for `order.created`.** pos-shop has a `ledgerOutbox`
   (accounting only). Slice 4 must add an `order.created` outbox on `pos_site`,
   written transactionally with the Order, for the Slice 5 worker.
3. **`createSale` needs a `userId`.** API submissions have no human user — define
   a per-shop API/system user (or map the api-client principal) as the actor.
4. **`delivery` needs address/zone data the contract lacks.** Current
   `fulfillment:{type}` can't populate a `DeliveryOrder` (needs drop address, and
   likely zone/pickup warehouse). `pickup`/`dine_in` work with today's contract;
   **the `delivery` path requires additive `fulfillment` fields** (e.g.
   `address`, `lat/lng`) before it can create a DeliveryOrder. Stage delivery last.
5. **Worker authority.** The Slice 5 worker calling Kitchen/Loyalty Cores needs a
   signed, cross-shop principal (EdgeContextMiddleware + `Authz`); idempotency is
   easy (Cores accept `Idempotency-Key` → deterministic `order_{id}→kitchen`).
6. **Money representation — BLOCKS the response mapping (pre-existing open item).**
   pos-shop stores amounts as **float major units** (`orders.final_amount` = 15.00);
   the public contract is **integer minor units** (`grand_total_minor` = 1500). The
   conversion needs a per-currency exponent map (MMK 0 dp vs THB/USD 2 dp). The edge
   gateway already flags this as unresolved — *"real POS decimal vs minor-unit
   exponent map … open 2B.0 addendum, pinned before 2B.2"*
   (`phase4/core/src/PricingSource.php`, `DatabasePricingSource.php`); there is no
   float↔minor converter anywhere. **Decision required:** pin the canonical
   currency→exponent map (one authoritative source, shared edge/core/contract)
   before the façade can return correct `totals`/`unit_price_minor`. The create
   path does not need it; the response and read-back do.

## 8. Sequencing after this doc is accepted

S3 façade (pickup/dine_in first — Order only) → idempotency (#1) → S4 outbox (#2)
→ S5 worker (Order→Kitchen→Loyalty) → then additive `delivery` fulfillment (#4) +
Order→Rider. Each step is mechanical given the decisions above.
