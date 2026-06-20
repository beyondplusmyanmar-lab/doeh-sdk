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

## 8. Sequencing after this doc is accepted

S3 façade (pickup/dine_in first — Order only) → idempotency (#1) → S4 outbox (#2)
→ S5 worker (Order→Kitchen→Loyalty) → then additive `delivery` fulfillment (#4) +
Order→Rider. Each step is mechanical given the decisions above.
