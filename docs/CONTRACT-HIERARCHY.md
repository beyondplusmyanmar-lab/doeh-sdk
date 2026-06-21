# Contract Hierarchy Map

This page exists to answer one question and only one question:

> **When two surfaces disagree about how the API behaves, which one is right?**

It is a mental model, not an operations guide. It names the layers, what each
layer is responsible for, and the rule that resolves conflicts between them.

## The layers

The system describes itself through several surfaces. Each is authoritative for
exactly one concern and is a *projection* for everything else.

| Layer | Surface | Authoritative for | Not authoritative for |
|-------|---------|-------------------|-----------------------|
| Behavioral truth | **Golden fixture** | What a correct request/response actually looks like | — |
| Enforcement | **CI drift gate** | Whether the projections still agree with behavioral truth | The behavior itself |
| Structural contract | **OpenAPI** | Shapes, types, fields, status codes | Concrete example values |
| Client interface | **SDK** | How a developer calls the API in code | What the call returns |
| Narrative layer | **Portal** | Explanation, framing, onboarding story | Anything factual about behavior |

Read top to bottom as a chain of authority:

```
Golden fixture        ← behavioral truth (what wins)
      │  is checked by
CI drift gate         ← enforcement (keeps the rest honest)
      │  binds together
OpenAPI · SDK · Portal ← projections of the truth above
```

## The resolution rule

When surfaces conflict, apply these in order:

1. **The golden fixture is the source of truth for behavior.** If any surface
   shows behavior the fixture does not, the surface is wrong — not the fixture.
2. **OpenAPI is the source of truth for structure**, within the bounds the
   fixture demonstrates. Structure and behavior must not contradict each other;
   if they do, that is a defect in the contract, not a choice to be made by a
   reader.
3. **The SDK is never authoritative.** It is how the contract is *called*. A
   hand-written SDK example that diverges from the fixture is a bug.
4. **The portal is never authoritative.** It explains; it does not define. Any
   "convenience truth" authored only in the narrative layer is fiction.

The shortest form of the rule:

> **Behavior is decided by the fixture. Structure is decided by OpenAPI.
> Everything else is a projection and can only ever be wrong, never right, in a
> conflict.**

## Why this map exists

This separation is what prevents the failure mode the system was built to
eliminate: surfaces drifting apart until the documentation becomes a story about
an API that no longer exists. The enforcement layer keeps the projections
aligned mechanically; this page keeps *people* aligned about which surface to
trust when they read a disagreement.

A contributor who internalizes one sentence has internalized this whole page:

> **If you want to change behavior, change the fixture. Everything else
> follows.**
