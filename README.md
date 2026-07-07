# RacquetIn

Premium badminton e-commerce storefront — React 19, Vite, Three.js hero, Zustand, Supabase.

## Stack

- React 19 + Vite 8 + React Router 7
- Three.js (raw, not R3F) for the homepage hero — GLB model with Draco compression
- Framer Motion, Zustand
- Supabase (Postgres, Auth, Storage) as the backend
- Razorpay for payments — server-verified via Supabase Edge Functions (see "Payments" below)

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your real values — see below
npm run dev             # http://localhost:5173
```

### Environment variables

Copy `.env.example` to `.env` and fill in real values. At minimum, the app
**requires** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — `src/lib/supabase.js`
throws a clear error at startup if either is missing, rather than silently
falling back to a placeholder. Every other variable in `.env.example` is
optional; the app degrades gracefully if they're absent (e.g. checkout will
show "payment gateway not configured" without a Razorpay key).

| Variable | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key (safe for the client — protected by RLS, not secrecy) |
| `VITE_RAZORPAY_KEY_ID` | No | Enables the Razorpay checkout button. Public key — safe on the client. |
| `RAZORPAY_KEY_SECRET` | No | **Frontend .env only for local convenience** — the Edge Functions read their own copy as a Supabase secret (see "Payments" below). Never actually used by the Vite build. |
| `VITE_TAX_RATE`, `VITE_FREE_SHIPPING_THRESHOLD`, `VITE_SHIPPING_COST` | No | Used only to *display* an estimate in the cart/checkout UI before payment. The real, authoritative total is always recomputed server-side in `create-razorpay-order` — the frontend's numbers are never trusted. |
| `VITE_APP_URL`, `VITE_APP_NAME` | No | Used in email templates / metadata |
| `RESEND_API_KEY`, `VITE_FROM_EMAIL` | No | Not yet wired to any email-sending code — reserved for order confirmation emails |
| `VITE_ADMIN_EMAIL_DOMAIN` | No | Reserved for restricting admin signups by domain — not yet enforced in code |

See **"Payments"** below for the separate set of server-side secrets the
Edge Functions need (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`) — those are set via `supabase secrets set`, not
this `.env` file, since this `.env` only ever reaches the browser bundle.

### Database setup

Run these in the Supabase SQL editor, in order, against a fresh project:

```
supabase/schema.sql          -- tables, RLS policies, triggers, functions
supabase/seed_products.sql   -- seeds the product catalogue (regenerate with scripts/gen-seed.mjs)
```

Then create your first admin by inserting a row into `admin_users` with your
own `auth.users` id and a role of `'admin'` or `'super_admin'`.

If you plan to use product image uploads from the admin, uncomment and run
the storage bucket statements at the bottom of `schema.sql`
(`product-images`, `site-assets`).

## Payments

Checkout is a **server-verified** flow — the browser never creates an order
or decides a payment succeeded. Three Supabase Edge Functions in
`supabase/functions/` do all of the sensitive work:

- **`create-razorpay-order`** — re-prices the cart from the `products` table
  (ignores any price the client sends), creates a real Razorpay order, and
  stores the priced snapshot in `payment_intents` keyed by that order id.
- **`verify-razorpay-payment`** — recomputes the Razorpay signature itself
  and rejects on any mismatch; only on success does it create the real
  `orders`/`order_items` rows (from the stored intent, not the request body),
  decrement stock, record the `payments` row, and create a `shipments`
  placeholder.
- **`razorpay-webhook`** — a public endpoint authenticated only by the
  webhook signature. Logs every event to `payment_events` and acts as a
  safety net that fulfills the order the same way if the client never
  completes the verify call (e.g. the tab closed right after paying).

### 1. Run the migration

In the Supabase SQL editor:

```
supabase/migration_payments.sql
```

Creates `payment_intents`, `payments`, `payment_events`, `shipments`, adds
`payment_verified`/`payment_method` to `orders`, and sets RLS so the client
can only ever *read* its own payment data — there is deliberately no
INSERT/UPDATE policy for anything but the service role, which is what makes
"only Edge Functions write payments" true at the database level, not just
in application code. (Already folded into `schema.sql` too, for fresh
deployments.)

### 2. Deploy the Edge Functions

```bash
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
supabase functions deploy razorpay-webhook --no-verify-jwt
```

`--no-verify-jwt` on the webhook is required — Razorpay calls it directly
with no Supabase session, so it must skip Supabase's own JWT gate. The other
two functions read the *user's* JWT themselves (see `_shared/supabaseClients.ts`),
which is a separate, stricter check than Supabase's platform-level gate.

### 3. Set the Edge Function secrets

```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxxxx
supabase secrets set RAZORPAY_KEY_SECRET=xxxxx
supabase secrets set RAZORPAY_WEBHOOK_SECRET=xxxxx
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` don't need to be set manually
— the Supabase platform injects both into every deployed function
automatically. `TAX_RATE` / `FREE_SHIPPING_THRESHOLD` / `SHIPPING_COST` are
optional (see `.env.example` for defaults matching the frontend's display).

### 4. Configure Razorpay Test Mode (local development)

1. In the [Razorpay Dashboard](https://dashboard.razorpay.com), toggle to
   **Test Mode** (top-right switch).
2. Settings → API Keys → generate a **Test** key pair. Use that as both
   `VITE_RAZORPAY_KEY_ID`/`RAZORPAY_KEY_ID` (same value) — test keys start
   with `rzp_test_`.
3. Test-mode payments never touch real money. Use Razorpay's published
   [test card/UPI numbers](https://razorpay.com/docs/payments/payments/test-card-upi-details/)
   to simulate success and failure.
4. No production keys, webhook, or domain are required to develop and test
   the entire flow end-to-end in test mode.

### 5. Configure the webhook (Razorpay Dashboard)

Settings → Webhooks → Add New Webhook:
- **URL**: `https://<your-project-ref>.supabase.co/functions/v1/razorpay-webhook`
- **Secret**: generate one and use the same value for `RAZORPAY_WEBHOOK_SECRET`
- **Active events**: `payment.captured`, `payment.failed`, `payment.authorized`, `refund.processed`

### 6. Testing locally

```bash
supabase start                    # local Postgres + Auth + Storage stack
supabase functions serve          # serves all three functions on localhost, reading .env/.env.local for secrets
```

Point your local `.env` at the local Supabase stack's URL/anon key (printed
by `supabase start`), keep `VITE_RAZORPAY_KEY_ID` as a **test** key, and run
`npm run dev` as normal — the checkout flow will call your locally-served
functions. For webhook testing locally, use the
[Razorpay CLI](https://razorpay.com/docs/webhooks/test/) or a tunnel (ngrok/Cloudflare
Tunnel) pointed at `supabase functions serve`'s port, since Razorpay's
servers can't reach `localhost` directly.

### What's still needed before going live

- Swap test keys for live keys (`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/
  `VITE_RAZORPAY_KEY_ID`) and point the webhook at your production domain.
- A real refund **action** — the schema/status support exists
  (`payments.status` includes `refunded`/`partially_refunded`, the webhook
  already updates them), but there's no admin button that calls Razorpay's
  refund API yet.
- Coupon/discount calculation — `payment_intents.discount` and
  `orders.discount` exist and are wired through, but `create-razorpay-order`
  currently always computes `discount: 0`; real coupon logic needs to be
  added there.
- Order confirmation emails (see `RESEND_API_KEY` above — still unused).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run preview` — preview the production build locally
- `npm run lint` — oxlint
- `node scripts/check-config-integrity.mjs` — verifies `package.json`, `vite.config.js`, and `.env` are present and non-empty/valid. Not wired into `npm run dev` (kept standalone deliberately, so nothing new gets added to `package.json`'s scripts) — run it manually if you suspect the issue below.

## Troubleshooting: package.json / vite.config.js / .env going empty

If you see Vite repeatedly restart and then `package.json` (or `vite.config.js`
or `.env`) becomes empty, **nothing in this project's own code does that** —
verified by searching the whole repo for any `writeFile`/`writeFileSync`/
`outputFile`/`cat >` targeting those three files. The only file-write call
anywhere in the app is `scripts/gen-seed.mjs`, and it only ever writes
`supabase/seed_products.sql`.

That means the cause is external to the project. In rough order of likelihood:

1. **Disk full.** A process that truncates a file before writing new content,
   then fails partway through because there's no space left, leaves you with
   an empty file. Check free disk space first.
2. **A second tool/process editing the same folder** — another AI coding
   session, an editor's auto-format/auto-fix-on-save, a scaffolding CLI, etc.
   running concurrently with `npm run dev` can race with Vite's file watcher.
3. **Cloud sync** (Dropbox/OneDrive/Google Drive/iCloud Drive) on this folder
   — sync conflicts can briefly clobber a file with an empty or stale copy.
4. **Antivirus/endpoint security** scanning and quarantining newly written
   files.

Run `node scripts/check-config-integrity.mjs` to check all three at once —
it tells you exactly which file is empty/invalid instead of chasing Vite's
restart-loop output.

## Known limitations

See `racketin-launch-audit.md` (if included in this archive) for a full,
code-grounded production-readiness audit — payment signature verification,
admin CRUD screens, and per-page SEO meta tags are the biggest gaps as of
the last audit pass.
