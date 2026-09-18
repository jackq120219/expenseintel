# ExpenseIntel $39 Assisted Bid Review — test integration

## What exists (not live payments)
- Stripe test product `prod_VHPatigt5ahE40` and fixed one-time $39 test price `price_1UGqlCFq94edrQR4E3ak61Iw`. The connected account is **sandbox only**, and no real charges or payouts can occur through this integration.
- `/bid-review/order/` is a noindex test-only intake form for two **fictional bid summaries**, not real confidential documents. A draft is stored privately in `ei_bid_review_orders` in the dedicated ExpenseIntel Supabase project before the server starts Stripe-hosted Checkout.
- `STRIPE_BID_REVIEW_TEST_KEY` rejects live keys. The server fixes the product/price; a customer cannot choose the amount. Only the random order ID goes in Stripe metadata, never private proposal content.
- A dedicated signed `/api/bid-review-webhook` matches paid $39 sandbox sessions to private orders and records refunds/disputes. `/bid-review/order/complete/` independently checks Stripe + private order status. No actual service report is delivered in sandbox.
- The public `/bid-review/` keeps the $39 offer clearly **pre-launch**, with no test checkout button shown to real visitors. The earlier $19 Deep Check sandbox PR is separate and unmerged.

## Owner configuration / testing
1. In Vercel project `expenseintel` **Preview only**, set `STRIPE_BID_REVIEW_TEST_KEY` (test secret or restricted test key with Checkout Session read/write permission), `SUPABASE_URL` for the dedicated ExpenseIntel database, and `SUPABASE_SERVICE_ROLE_KEY`. Never share private keys in chat, public code, logs or URLs. Vercel automatically supplies `VERCEL_URL`.
2. Redeploy Preview after adding variables. Open `/bid-review/order/` on the new preview host and fill it with fictional data. Confirm the server creates exactly a $39 **test** Checkout Session.
3. In the Stripe **sandbox**, add a webhook endpoint pointing to the exact preview URL ending `/api/bid-review-webhook`. Listen for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `charge.dispute.created`. Add its dedicated signing secret to Vercel **Preview** as `STRIPE_BID_REVIEW_WEBHOOK_SECRET`, redeploy. This is distinct from the $19 webhook.
4. Pay with a Stripe test card. Confirm the private database order changes from `awaiting_payment` to `paid` and the success page independently confirms it. Test cancel, wrong amount, repeated webhooks, forged signatures, refunds and disputes. Do not use actual proposal contents in test mode.
5. Manually verify accessible website navigation, smartphone layout, form validation, printed five-page PDF, real custom domain and basic email CTA before mass outreach. A deployment marked READY and passing CI do **not** equal a tested customer payment.

## Before real $39 sales
- Owner authorization to connect a **live Stripe** account; create separate live product/price/webhook. Current code intentionally rejects all live keys; do not put a live secret in a test variable.
- Secure actual contractor PDF upload (private object store with signed uploads/downloads, size/type limits, malware handling and a documented retention/deletion policy) and a clear manual order fulfillment workflow. The sandbox currently supports fictional **text summaries only**.
- Clear support contact, terms, cancellations/refunds, tax handling where applicable, and explicit realistic delivery timeframe. Monitor orders, review the actual documents, prepare the 2–5-page PDF, deliver privately and mark orders fulfilled. Check for reversals before delivery.
- Rate-limiting/spam prevention, customer access security, operation alerts, refund and dispute edge-case testing, bank payout configuration and one successful end-to-end live-mode test before customer outreach that promises paid fulfillment.

## Website review and corrections
- Source inspection found the public Bid Review page initially had `noindex,nofollow`, prefilled fictional dollar amounts, an inaccurate static five-year chart label and a print rule that could expose empty reports. These have been corrected in this PR: `index,follow` plus canonical metadata, blank required bid amounts with a separate demo button, selected-horizon chart label and a print guard.
- The free calculator is still client-side and explicitly does **not** read private PDF proposals or verify contractor quality, pricing or binding contract scope. Keep those limitations visible.
- Five project CI checks passed after the edits, and Vercel preview deployment reported READY; interactive browser/custom-domain verification could not be completed through the available protected fetch environment. Check the production custom domain and all links in a normal browser before 100 emails. Do not represent 'perfect' or production payment readiness without those checks.
- Dedicated Supabase table intentionally has RLS enabled without public policies and no anon/authenticated grants; it is server-only. Supabase's security advisor also flags an existing unrelated public `ei_comparable_stats` SECURITY DEFINER function; review separately before any broad security-completeness claim.
