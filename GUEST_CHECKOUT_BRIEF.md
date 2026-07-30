# Guest Checkout — Enhanced Brief

*Covers both documents (Guest Checkout + Returning Customer Email UX) as one feature, since that's what they are. Enhanced against the actual schema, RLS policies, and Edge Functions — not assumptions.*

---

## The single most important finding: a real, previously-unidentified bug this change would hit immediately

**The `orders` RLS policy is `USING (user_id = auth.uid())`.** For a guest, `auth.uid()` is `NULL`. In Postgres, `NULL = NULL` is not `true` — it's `NULL`, which RLS treats as "no access." This means:

- **The order confirmation page would show empty/broken for every single guest, immediately after their first purchase.** `OrderConfirmationPage` calls `fetchOrderById()`, a direct client-side query using the anon key — subject to this exact policy. This isn't a future "track your order" edge case; it's the very first thing every guest would hit, on their very first order, seconds after paying.
- The original brief's "Order History" section correctly anticipated guests needing a secure lookup mechanism for *returning later* — but didn't flag that the *immediate* post-checkout confirmation has the identical problem, arguably more urgently since 100% of guests hit it, not just ones checking status days later.

**This means the order confirmation page needs to stop being a direct client query for guest orders** — it needs the same treatment the second document already correctly prescribes for the account-existence check: a secure server-side lookup (Edge Function, service-role, validating a token/order-number rather than relying on RLS matching a `NULL` to a `NULL`).

---

## Corrections to Document 1 (Guest Checkout)

### "Choose the safest architecture" — already decided, no work needed here

`orders.user_id` is **already nullable** (`UUID REFERENCES auth.users(id)`, no `NOT NULL`). The brief frames this as an open decision between "nullable user_id / guest_email field / customer_type / guest flag" — it isn't open. The schema already supports a null `user_id`. Nothing to migrate for this specific piece.

### The actual schema blocker: `payment_intents.user_id` is `NOT NULL`

This is the real constraint standing in the way, and it's one level upstream of `orders` — `create-razorpay-order` creates a `payment_intents` row keyed to `user_id` *before* any order exists, and that column is hard `NOT NULL`. A minimal additive migration is needed here: make `payment_intents.user_id` nullable, and add a `guest_email TEXT` column alongside it (parallel to how `orders.shipping_address` already carries guest contact info — see next section) so a payment intent can be identified either way.

### Guest identity doesn't need a new table — it already has a home

`orders.shipping_address` (JSONB, already `NOT NULL`) already stores `firstName`/`lastName`/`phone`/`email` as a snapshot at checkout time — this is already how `OrderDetailPage` falls back to customer contact info when no `customers` row link exists. **A guest order can represent its customer's identity entirely through this existing field, with `user_id` left null — no new "guest" table needed.**

What *is* missing: an explicit way to tell "guest" and "registered" orders apart at a glance (for the admin dashboard's requested Guest/Registered badge and filter) without inferring it from `user_id IS NULL` every time. Two real options, worth deciding rather than defaulting to one:

- **Option A (zero migration):** infer guest status from `user_id IS NULL` everywhere it's needed (admin badge, filter). Simpler, no schema change, slightly more query logic scattered around.
- **Option B (small additive migration):** add `orders.customer_type TEXT DEFAULT 'registered'` (or similar), set explicitly at order creation. Cleaner to query/filter/index, costs one migration.

### A confirmed, concrete break in the email path

`fulfillOrder.ts` currently resolves the customer's email by querying the `customers` table by `user_id` — and if no row is found, it logs `"No customers row (or no email on it) for user_id ..."` and (based on the surrounding logic) does not fall back to anything else. **Since `customers.user_id` is `NOT NULL UNIQUE`, a guest order can never have a `customers` row at all** — meaning, unmodified, this lookup will fail for every guest order, every time, silently breaking order confirmation emails specifically for the customer segment this whole feature is meant to serve. This function needs an explicit guest branch: when `intent.user_id` is null, read `intent.shipping_address.email`/`.firstName`/`.lastName` directly instead of querying `customers`.

### `create-razorpay-order`'s auth requirement is real and absolute today

`getRequestUser(req)` is called unconditionally, and a missing user returns a hard `401` before anything else runs — `user.id` then flows directly into both the Razorpay order's `notes` and the `payment_intents` row. This function needs a genuine branch, not a tweak: authenticated path unchanged, new guest path that skips the `getRequestUser` requirement entirely and validates/uses an email from the request body instead. This is exactly the kind of "nothing should assume `auth.uid()` exists" work the original brief called for — confirming it's real, load-bearing work, not a formality.

---

## Corrections to Document 2 (Returning Customer Email UX)

### Confirmed: no account-existence-check mechanism exists anywhere

Searched the whole codebase for anything resembling this — nothing. This needs to be built from scratch, exactly as the document specifies (Edge Function, service-role, minimal response, no `auth.users` exposed to the browser). Worth being extra deliberate here given this document's own explicit warning about email enumeration: the response shape should be reduced to the absolute minimum — realistically just `{ exists: boolean }` — and rate-limited, since even a boolean-only endpoint is a textbook enumeration vector if it's uncapped.

### This is the same underlying pattern as the confirmation-page fix above

Both documents independently arrive at "guests can't be trusted to standard RLS-gated client queries, route sensitive lookups through a secure server-side function instead." Worth building **one consistent pattern** for this rather than two similar-but-slightly-different Edge Functions: a small shared convention for "secure, minimal-response, guest-safe lookup" that the account-existence check, the order-confirmation fetch, and the future "track your order" feature can all follow the same way.

---

## Unified architecture, given both documents are one feature

**New/modified Edge Functions:**
1. `create-razorpay-order` — add a guest branch (email-only, no `getRequestUser` requirement)
2. `verify-razorpay-payment` / `razorpay-webhook` → `fulfillOrder.ts` — add the guest customer-identity fallback described above
3. A new **account-existence-check** function (Document 2)
4. A new (or modified) **guest-safe order lookup** function — covers both the immediate post-checkout confirmation page *and* the later "track your order" feature, rather than building these as two separate things

**Minimal additive migration:**
- `payment_intents.user_id` → nullable
- `payment_intents.guest_email` → new nullable column
- Decide Option A vs B above for `orders`' guest/registered distinction

**Frontend:**
- Remove/branch the `handleCompleteOrder` login redirect — this is a single conditional, not a page-level guard, since checkout was never actually gated at the route level
- New email-entry step per Document 2's flow (validate → check → optionally show sign-in suggestion)
- `OrderConfirmationPage` switches from direct `fetchOrderById` client query to the new guest-safe lookup function when handling a guest order

---

## Everything else in both original documents still applies

The RLS/security posture requirements, the "never associate an order merely because email strings match" rule, the Shiprocket compatibility requirements (already straightforward — Shiprocket only ever needed `shipping_address`, which every order already has regardless of guest/registered status), the cart/coupon/step preservation-through-login requirements, and the full testing matrix in both documents are all still exactly right — none of that needed correcting, only the architecture sections above did.
