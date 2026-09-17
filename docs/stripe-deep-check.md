# ExpenseIntel Deep Check — Stripe sandbox integration

**Status: draft sandbox checkout plus payment verification/order-recording code. Not a live paid product; no report delivery exists yet.** Keep this pull request unmerged until reviewed, tested and the Deep Check deliverable is actually implemented.

## Existing Stripe sandbox objects

- Product: `prod_VHL404cILPAsKY` — ExpenseIntel Deep Check.
- One-time USD price: `price_1UGmOSFq94edrQR47gq0QAFZ` — $19.00.
- Payment Link ID: `plink_1UGmP1Fq94edrQR4Z8rmJUmT`.
- Test-only URL: `https://buy.stripe.com/test_cNi14nejc8Y5b7A1rz6wE00`.
- Link currently uses a Stripe-hosted confirmation message. It has **not** been reconfigured to redirect to the newly drafted `/deep-check/complete/` page. Managed Payments and automatic tax remain disabled in sandbox pending tax classification and compliance review.

## Implemented changes in this draft PR

1. `/deep-check/` sandbox-only landing page and a test CTA from the planned $19 Deep Check pricing card. No changes to the free Check engine.
2. `lib/deep-check-payments.js`: sandbox-only Stripe session/product/amount validation, raw webhook HMAC signature verification with five-minute timestamp tolerance, safe lookup with expanded latest charge, rejection of unverified, disputed or refunded purchases, and server-side Supabase helper.
3. `api/stripe-webhook.js`: accepts signed sandbox checkout success events, writes eligible order records once (unique session key), and records refund/dispute state. Errors return a retryable status. Do not expose this endpoint until its signing secret and database credentials are configured.
4. `supabase/deep-check-orders.sql`: private, service-role-only sandbox order ledger. **The matching migration was applied to the existing ExpenseIntel Supabase project**, project ref `tzwjiokoxfsruvobkiok`. RLS is enabled with no public read policies intentionally.
5. `api/deep-check-status.js` and `/deep-check/complete/`: read-only sandbox confirmation. They check Stripe directly and the private order ledger. The endpoint returns no purchaser email, private report, entitlement token, or customer secrets. Confirmation explicitly states no report will be delivered.
6. `tests/deep-check-payments.test.cjs` exercises amount, correct link, test/live separation, payment status, refund/dispute and signature validation. GitHub Actions workflow includes syntax checks and Node tests, but an end-to-end payment test has not been completed yet.

## Configuration that must be done securely BEFORE these new server routes can operate

Set these as **server-only** Vercel environment variables for the intended preview/test environment (never commit their values, put in browser JavaScript, or paste into chat):

- `STRIPE_SECRET_KEY`: sandbox/test secret key (sk_test_ or suitably permissioned rk_test_).
- `STRIPE_WEBHOOK_SECRET`: signing secret from the *specific Stripe sandbox webhook destination*.
- `SUPABASE_URL`: `https://tzwjiokoxfsruvobkiok.supabase.co`.
- `SUPABASE_SERVICE_ROLE_KEY`: private server-side Supabase key for ExpenseIntel; NEVER prefix with `NEXT_PUBLIC_` or `VITE_`.

Deploy a reviewable preview build and configure the sandbox webhook destination to the HTTPS `/api/stripe-webhook` URL of **that build**, with events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `charge.dispute.created`. Verify Stripe webhook deliveries and database order state. Do not point a webhook at unconfigured main/production code.

Once a stable deployed test page is confirmed, update the **sandbox** Payment Link after-completion redirect to `https://<test-host>/deep-check/complete/?session_id={CHECKOUT_SESSION_ID}` and rerun the checkout/status flow. Until then the link displays Stripe's hosted test-only confirmation. Never infer paid status from a redirect query parameter by itself.

## Tests to run before merging

- CI syntax and Node test suite must pass; inspect the GitHub Actions result.
- On preview verify `/pricing/` CTA leads to the sandbox `/deep-check/` page, which points to a Stripe `test_` checkout.
- Submit a Stripe *test card only*: $19 one-time payment appears in **sandbox**, a signed event creates exactly one Supabase row, repeated events do not duplicate/reopen orders, and status endpoint returns paid but `reportReady: false`.
- Test failed or incomplete payment, incorrect link or amount, tampered/expired signature, refunds and disputes. Check Stripe's webhook delivery log and database status.
- Verify no customer email/order records can be read with public Supabase keys or by browsing public pages.

## Hard blockers for real revenue

- Define/build a **real distinctive Deep Check** report workflow beyond the free Check (inputs, reliable results, export, regeneration/history). Payment alone is not delivery.
- Add authenticated buyer identity, order ownership checks, report storage/access only for entitled purchasers and reliable report delivery. Current confirmation page deliberately discloses no report and does not grant an entitlement.
- Configure/verify Stripe webhook, server secrets and environment isolation; add reconciliation, support/refunds and customer communication. Validate a full test purchase end to end.
- Finish merchant identity, tax/product classification, payment fees, checkout disclosures, terms, privacy/quote retention and refund policy. Determine if Managed Payments is appropriate before enabling it.
- Provision **separate live Stripe resources and bank payouts** when approved, then make a controlled live deployment. Never reuse this sandbox price/link/ledger logic for live orders unchanged.

Stripe reference: https://docs.stripe.com/checkout/fulfillment?payment-ui=stripe-hosted and https://docs.stripe.com/testing/overview.
