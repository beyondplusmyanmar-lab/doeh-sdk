# Epic: Merchant Mobile Starter Kit — Spec / Plan (M1)

> Status: **M1 APPROVED** (2026-06-23). Authored 2026-06-23.
> Principle this spec enforces: **lock capability to the real platform surface.**
> Every screen maps to a *shipped* SDK/API operation, or it is explicitly *gated*
> on a named future platform epic. No screen assumes a surface that does not exist.
>
> **Locked decision (prod auth):** **Option 1 — ship a reference token broker.**
> v1 is genuinely store-publishable for production: the app never holds `sk_live_`;
> a thin merchant-run broker exchanges device login/attestation for short-lived
> tokens and holds the secret server-side. This unblocks production now while
> preserving a clean later migration to a platform `pk_`/device-token primitive
> (M8) — at which point merchants swap only the auth adapter.

## Goal

A merchant's developer should be able to **clone** the template, configure
**branding** and a **key**, run **EAS Build**, and **publish under their own
Apple/Google accounts**. DOEH does **not** build or own the merchant's app — it
provides the SDK, APIs, sandbox, template, and docs.

---

## 0. Why this spec pushes back on the proposed E2/E4

`spec-first` exists to avoid baking in assumptions about capabilities that don't
exist. The verified platform surface (2026-06-23) is:

- **SDK modules:** `delivery`, `loyalty` (stable, 0.4.0) + `marketplace`,
  `orders`, `rider` (`@experimental`). Nothing else.
- **No public catalog-read** (browse categories / products / search). `orders`
  *resolves* prices from a server-side catalog but exposes **no way to discover
  SKUs** — the client must already know them (`EDGE_UNKNOWN_SKU` otherwise).
- **No consumer identity / login.** The platform authenticates **merchants** via
  `sk_` keys with server-derived scope. Loyalty members are identified by a
  merchant-supplied **member id**, not an authenticated end-user session.
- **No publishable key.** `sk_` is the secret merchant credential; there is no
  `pk_`-style restricted/publishable key.

Consequence: of the six proposed screens, only **Loyalty** (and the local-only
Splash / Profile-theming) is end-to-end shippable today.

---

## 1. Reality reconciliation (capability ↔ surface)

| Capability | SDK module | Public API | Status |
|---|---|---|---|
| Splash / branding / theme | client only | — | ✅ shippable now |
| **Loyalty** balance / earn / redeem / history | `loyalty` (stable 0.4.0) | `/v1/loyalty/members/{id}` (+ earn/redeem) | ✅ shippable now |
| Profile: language / theme / logout | client only | — | ✅ shippable now |
| Profile: shop info | — | no public shop-read | ⚠ partial (omit or hardcode in v1) |
| Delivery / rider tracking | `delivery` / `rider` | yes | ✅ optional, not in v1 |
| Checkout (submit order) | `orders` (`@experimental`) | `/v1/orders` — **not live in prod** | ⚠ sandbox/experimental only |
| **Catalog** browse (categories / products / search) | — none | — none | ⛔ **GATED:** needs *Catalog-Read* epic |
| **Cart** | client state | depends on Catalog + `orders` | ⛔ blocked by Catalog |
| **Consumer login** (OTP / email / guest) | — none | — none | ⛔ **GATED:** needs *Consumer-Identity* epic |

**Conclusion:** the only complete consumer vertical the platform can back today is
**loyalty**. The full commerce app (catalog → cart → checkout → consumer login) is
mostly gated on **three platform primitives that do not yet exist** (see §11).

---

## 2. Scope decision

- **v1 = `doeh-loyalty-template`** — a single-vertical, brandable, SDK-first
  **Loyalty Starter** the merchant clones and owns. This is what M2–M7 deliver.
- **North star = "Merchant Mobile Starter Kit"** — the full commerce app. It is
  *not* v1; it is what the v1 frame **grows into** when the gated surfaces (§11)
  ship. We build the durable frame now (architecture / branding / env /
  distribution / docs) and run **loyalty** as the first vertical slice through it,
  so adding catalog/cart/identity later is additive, not a rewrite.

This honours the stated objective exactly: ship a production-ready template for
the capability we actually have, without pretending to have the rest.

---

## 3. Security contract  ← the most important section (corrects E4)

1. `sk_` is a **secret** merchant key: the key **is** the shop, full scope. It is
   **not** publishable.
2. `EXPO_PUBLIC_*` values are **compiled into the app binary** and trivially
   extractable. Therefore `EXPO_PUBLIC_API_KEY=sk_live_…` ships a shop-wide secret
   to every downloader. **Forbidden.**
3. Two honest modes:
   - **Sandbox / demo:** `EXPO_PUBLIC_API_KEY=sk_test_…` *may* be embedded —
     acceptable because sandbox data is isolated, reset daily, and carries no real
     money/PII. This is the out-of-the-box clone-and-run experience.
   - **Production (LOCKED — Option 1):** the secret **must** live server-side. The
     merchant runs a **thin token broker** that holds `sk_live_` and issues
     short-lived tokens to the app; the template **ships a reference broker** (M5)
     and documents the pattern, so a merchant can publish a real production app
     today. The app holds no `sk_live_`. When DOEH later ships a publishable/
     restricted key or device-token exchange (M8), the broker becomes optional and
     merchants swap only the auth adapter.

   Production flow:
   ```
   Expo App ──login / device attestation──▶ Merchant Broker ──sk_live_──▶ DOEH API ──▶ DOEH Core
   ```
   DOEH provides: template, SDK, **sample broker**, docs, sandbox, EAS guides.
   Merchant owns: Apple/Google accounts, broker deployment, domain, secrets.
4. **`EXPO_PUBLIC_SHOP_ID` is dropped** — it contradicts the SDK invariant
   "the key is the shop, no shopId anywhere."

This is the real gate between "sandbox template" and "store-publishable production
app," and it links directly to the Developer-Org / OAuth roadmap.

---

## 4. E1 — SDK-first architecture (refined)

```
Merchant App  →  @beyondplusmm/doehpos-sdk  →  Edge API  →  DOEH Core
```

- The template imports the SDK and uses **only shipped operations**. No direct
  HTTP for SDK-covered capabilities.
- Where a capability has **no SDK op** (catalog, identity), the template does
  **not** hand-roll HTTP against a non-existent endpoint. The screen is stubbed
  behind a **feature flag that is OFF** until the platform epic ships. This is the
  mechanism that keeps false assumptions out of the binary.
- Benefit: the SDK evolves; the app does not.

## 5. E2 — Screens (v1 scope)

Shippable v1: **Splash → Loyalty → Profile** (+ a key-entry/onboarding screen for
the sandbox key). Gated screens (Login, Catalog, Cart) are present as
**flagged-off stubs** with a one-line "requires platform capability X" note, so the
frame is visibly ready for them.

Loyalty screen SDK calls (all shipped in 0.4.0):
```
sdk.loyalty.getMember(id)   // balance + ledger (history)
sdk.loyalty.earn(id, { points })
sdk.loyalty.redeem(id, { points })   // InsufficientPointsError / MemberNotFoundError
```
Member id is the key (`^[A-Za-z0-9_]+$`); a phone number is a valid id and a QR
just encodes it — there is no search op. "Earn by purchase amount" is a
**merchant-configured points-per-currency ratio** applied client-side before
`earn()`, because `earn` takes points, not currency.

## 6. E3 — Branding contract (adopted, tightened)

Typed, build-validated config (`brand.ts`/`brand.json` + schema). A missing/invalid
field **fails the build**, not the store review.
```
name, primaryColor, logo, splash, bundleId, iosTeamId, androidPackage
```

## 7. E4 — Environment contract (corrected per §3)

```
EXPO_PUBLIC_ENV=sandbox|production
EXPO_PUBLIC_API_KEY=sk_test_…     # sandbox ONLY; unset in production
EXPO_PUBLIC_BROKER_URL=…          # production ONLY (token broker)
# no EXPO_PUBLIC_SHOP_ID (key is the shop); no sk_live_ ever in EXPO_PUBLIC_*
```

## 8. E5 — Distribution contract (adopted)

Merchant owns: Apple Developer account, Google Play account, EAS project.
DOEH provides: SDK, template, docs, examples, sandbox.

## 9. E6 — Reference structure (reconciled)

Two **distinct** artifacts — do not conflate:
- **`apps/expo-reference`** (in the SDK repo) = **teaching** reference,
  multi-capability, teaching-unit-per-screen (loyalty, orders, idempotency,
  settings already exist). Stays as-is; this is the "expose SDK concepts" surface.
- **`doeh-loyalty-template`** (new standalone public repo) = **clonable product**
  the merchant owns and brands. Single-vertical (loyalty) in v1. This is the
  "hide SDK concepts, ship a real app" surface.

The proposed `apps/expo-reference/{loyalty,orders,catalog,…}` subfolders describe
the **teaching** reference's growth, not the template.

## 10. E7 — Documentation (adopted)

Merchant guide: `clone → pnpm install → edit brand → paste sk_test_ → eas build →
submit to App Store → submit to Google Play`, plus the production token-broker
section from §3.

---

## 11. Milestones (revised)

| # | Scope | Status |
|---|---|---|
| **M1** | **This spec approved (Option 1 locked)** | ✅ |
| M2 | `doeh-loyalty-template` scaffold (Expo, SDK-first, sandbox `sk_test_`) | ⏳ |
| M3 | Branding system (typed config + schema + theming) | ⏳ |
| M4 | Loyalty vertical wired (getMember/earn/redeem/history) — green against sandbox | ⏳ |
| M5 | **Reference token broker + docs** (the real production gate — see §11a) | ⏳ |
| M6 | EAS build pipeline docs | ⏳ |
| M7 | Merchant onboarding guide | ⏳ |
| M8 | **Publishable-key / device-token platform epic** (broker → `pk_`; adapter swap) | 🔮 future |

Out of this epic, tracked as dependent platform epics (§12): Catalog, Cart,
Consumer login.

### 11a. M5 scope — reference token broker (kept intentionally small)

**Included:** minimal broker example · issue short-lived access tokens · holds
`sk_live_` server-side · token refresh · revocation example · Docker example ·
deployment examples.

**Excluded** (explicitly *not* M5; merchant- or future-platform-owned): user
management · multi-tenant billing · social login · push notifications · analytics
· device attestation · hosted DOEH identity.

The broker exists to make production deployment possible **now**. It is a
reference, not a product DOEH operates — merchants deploy and own it. M8
eventually makes it optional.

## 12. Open platform dependencies (must exist before the "full commerce app")

1. **Catalog-Read API** — public browse of categories/products/search. Blocks
   E2 Screen 3 and (transitively) the cart/checkout vertical.
2. **Consumer-Identity** — OTP/email/guest member auth. Blocks E2 Screen 2.
3. **Publishable key / device-token exchange** — **not a v1 blocker** under
   Option 1: the M5 reference broker unblocks production publishing today. This
   primitive (M8) is the *later* simplification that retires the broker; merchants
   then swap only the auth adapter. Ties to the Developer-Org / OAuth roadmap.

This spec does **not** assume any of the three. The v1 template is designed so
each lands additively when its epic ships. Only Catalog-Read (1) and
Consumer-Identity (2) actually gate the "full commerce app" north star; (3) is an
optimization, not a gate.
