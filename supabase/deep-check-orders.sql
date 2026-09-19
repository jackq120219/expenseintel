-- Apply to the ExpenseIntel Supabase project only after reviewing the draft PR.
-- This contains sandbox transactions only. Never apply live checkout to this table as-is.
create table if not exists public.ei_deep_check_orders (
  session_id text primary key check (session_id like 'cs_test_%'),
  payment_intent_id text unique not null,
  customer_email text not null,
  amount_total integer not null check (amount_total = 1900),
  currency text not null check (currency = 'usd'),
  status text not null check (status in ('paid','refunded','disputed','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ei_deep_check_orders_payment_intent_idx on public.ei_deep_check_orders(payment_intent_id);
alter table public.ei_deep_check_orders enable row level security;
-- Never grant web clients access to purchasers' email addresses or report entitlements.
revoke all on public.ei_deep_check_orders from anon, authenticated;
grant select, insert, update on public.ei_deep_check_orders to service_role;
comment on table public.ei_deep_check_orders is 'Private Stripe sandbox checkout ledger. Server-only; no browser access or public RLS policies.';
