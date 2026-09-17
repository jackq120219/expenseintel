# ExpenseIntel Deep Check — Stripe integration

Status: **sandbox proof of checkout only**. No live payments, no report entitlement or automated delivery.

## Created in the Queenan Capital Stripe sandbox

- Product: `prod_VHL404cILPAsKY` — ExpenseIntel Deep Check.
- One-time USD price: `price_1UGmOSFq94edrQR47gq0QAFZ` — $19.00.
- Test Payment Link: `plink_1UGmP1Fq94edrQR4Z8rmJUmT`.
- Hosted URL: `https://buy.stripe.com/test_cNi14nejc8Y5b7A1rz6wE00`.
- This Payment Link has Managed Payments disabled for this sandbox test because the account default requires a product tax code. Configure tax classification and tax obligations before offering a live product. Automatic tax is not enabled on this test link.

## What this change does

- Adds `/deep-check/`, a clearly labeled, noindex sandbox test-checkout page.
- Routes the featured Deep Check pricing CTA to that page and labels it as sandbox-only.
- The customer goes directly to Stripe-hosted Checkout. The app does not collect card details or need a secret API key for this preliminary Payment Links flow.
- On successful test payment, Stripe displays a test-only confirmation; **nothing is fulfilled yet**.

## Before accepting real orders

1. Define and implement the actual Deep Check deliverable: what inputs are needed, what report is generated, and what is different from the free Check. Ensure promised PDF/report/history features work before advertising them as delivered.
2. Add a secure order and entitlement data model (e.g. Supabase) with the Checkout Session ID as a unique key; use a server-side Stripe webhook endpoint with raw body signature verification (`STRIPE_WEBHOOK_SECRET`), idempotent event handling, and handling for `checkout.session.completed` plus asynchronous payment success/failure when enabled. Only mark an order paid when confirmed by Stripe; never trust a browser redirect or query parameter alone.
3. Deliver access to the actual report only for an authenticated, paid order. Verify the order belongs to the requester; do not expose guessable public report links. Reconcile refunds and disputes with access and support policies.
4. Add receipt/contact details, terms and refund policy, a data-retention policy for uploaded quotes, secure uploads, and a support route. Check business identity, applicable tax treatment, and product tax code. If using Managed Payments, confirm eligibility and fee/tax implications before enabling.
5. Create a separate live-mode product/price and live payment link, test the entire fulfillment lifecycle, and only then replace the sandbox link and sandbox wording. Store any server API secret or webhook signing secret in Vercel environment variables, never in browser JavaScript, GitHub, or chat.

## Test checklist

- Open `/pricing/`, confirm Deep Check CTA says `Try $19 test checkout` and links to `/deep-check/`.
- Open `/deep-check/`, confirm the test-only label and price.
- Follow the Stripe test link, verify order summary is $19 one-time, and use a documented Stripe test card; never submit a real card.
- Check success and cancellation flows. Confirm no actual fulfillment is promised or unlocked.
- Do not merge as a public paid launch. This is a sandbox proof of checkout only.
