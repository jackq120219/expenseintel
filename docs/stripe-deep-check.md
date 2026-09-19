# ExpenseIntel Deep Check — Stripe sandbox integration

Status: **draft test implementation; not a live product**. No real charges or payouts. A report workflow is coded, but end-to-end purchase and delivery have **not** been tested because Vercel server secrets, Stripe webhook and Payment Link return URL still need configuration.

## Sandbox resources
- Stripe account: Queenan Capital sandbox (`acct_1UGmIBFq94edrQR4`).
- Product `prod_VHL404cILPAsKY`: ExpenseIntel Deep Check.
- One-time USD $19 price: `price_1UGmOSFq94edrQR47gq0QAFZ`.
- Payment Link `plink_1UGmP1Fq94edrQR4Z8rmJUmT`: https://buy.stripe.com/test_cNi14nejc8Y5b7A1rz6wE00.
- Managed Payments and automatic tax disabled on this test link because the default tax code was missing. Confirm tax classification before any live sale.

## What a successful test purchase is intended to deliver
- A confirmed ExpenseIntel account using the **same email** as checkout unlocks a private, one-decision workspace at `/deep-check/report/?session_id=...` only after the server independently confirms Stripe payment, purchase amount, correct test Payment Link, customer identity and private order status.
- Two options: compare purchase price, extra upfront costs, monthly and yearly costs and user-estimated resale over a 1–10-year horizon.
- A baseline net-cost comparison, a separately identified hypothetical cost-pressure case and hypothetical operating-relief case. Outputs show exact assumptions, not statistical forecasts.
- User-entered quote scope/source notes are compared for potential keyword asymmetries; findings are **questions**, never assertions that a contract excludes something. Category-specific questions and missing evidence are listed.
- Save/revise the same decision privately and print/save as PDF with the browser. This is distinct from the free single-decision Check but is not an independent verified-price service.
- The product does **not** claim source-file OCR, actual contractor vetting, financing quotes, automatic monitoring, professional advice or unlimited distinct decisions. A free Check remains free.

## Security and database changes
- `lib/deep-check-payments.js` validates sandbox-only Stripe session details and raw-body signed webhooks, checks refund/dispute charge state and provides server-only Supabase access.
- `api/stripe-webhook.js` validates signed Stripe test events, writes paid orders idempotently and changes status on refunds/disputes.
- `api/deep-check-status.js` and `/deep-check/complete/` check purchase state and link to the private report. The status endpoint reveals no buyer email, order record or dossier.
- `api/deep-check-report.js` validates confirmed Supabase Auth bearer token against Supabase, insists the verified user email matches Stripe and the private paid order, binds the order to its owner and only then reads/saves the dossier. It rejects a different decision title for the same $19 purchase.
- `public.ei_deep_check_orders` is test-only, row-level security enabled and inaccessible to public/authenticated clients, with server service-role access only. Both the initial orders schema and `deep_check_sandbox_dossiers` migration have been successfully applied to the existing ExpenseIntel Supabase project (`tzwjiokoxfsruvobkiok`).
- No Stripe or Supabase private API keys are in GitHub or the browser. All user-provided figures are clearly identified and not treated as external evidence.

## Remaining configuration — do in order
1. In ExpenseIntel's **Vercel Preview** environment, add `STRIPE_SECRET_KEY` (`sk_test_...` or a permitted `rk_test_...` key able to retrieve Checkout Sessions), `SUPABASE_URL` = `https://tzwjiokoxfsruvobkiok.supabase.co`, and `SUPABASE_SERVICE_ROLE_KEY` from ExpenseIntel Supabase API settings. Redeploy preview. These are server-only secrets: never expose them in browser JavaScript, commit them, or paste them in chat.
2. Once you have the stable HTTPS preview URL, create a **sandbox** Stripe webhook pointing to `https://<preview-host>/api/stripe-webhook`, subscribed to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, and `charge.dispute.created`. Copy its destination-specific `whsec_...` signing secret securely into Vercel Preview variable `STRIPE_WEBHOOK_SECRET`. Redeploy and verify sample webhook deliveries.
3. After the endpoint works, change the existing **test Payment Link** after-completion behavior to redirect to `https://<preview-host>/deep-check/complete/?session_id={CHECKOUT_SESSION_ID}`. Stripe replaces that exact placeholder with the actual session ID. Do not redirect to a route that has not deployed.
4. Allowlist the preview report URL in Supabase Auth redirect settings for email confirmation. Login needs a confirmed account using the checkout email.
5. Run a test-card purchase: free Check → test pricing CTA → sandbox Stripe $19 one-time checkout → signed webhook writes one order → return page recognizes it → same-email login → create dossier → saved retrieval/revision → print/PDF. Also test wrong email, unpaid/wrong-price sessions, webhook retries, refunds/disputes, duplicate callbacks and secret/configuration failures. The current GitHub tests do not substitute for this end-to-end pass.

## Blockers to collecting real money
- Current checkout remains Stripe **test mode**. The full customer flow and payment delivery are not yet tested, so do not merge this draft as a paid launch.
- Publish accurate product terms, support contact, refund policy, privacy/retention/deletion guidance for stored buyer data and tax/merchant disclosures.
- Determine whether this user-input-only comparison earns its $19 price in actual customer tests. If it doesn't, improve the output or change the offer before launch; do not substitute invented market quotes.
- Set up verified merchant identity, live payout instructions, tax code/treatment, separate live product/price/link, live webhook, live environment secrets and separate live order constraints. `validSession`, the table check constraint and the report route intentionally reject live transactions; do not simply turn on live Stripe keys with this code.

CI checks syntax, existing site regressions, payment signature/isolation/refund tests, dossier mathematics/validation and quoted-scope comparison; check the latest branch Actions status. No real or sandbox checkout has been completed end to end by this implementation yet.
