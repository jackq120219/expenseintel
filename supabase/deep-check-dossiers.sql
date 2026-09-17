-- Stripe SANDBOX ONLY. Apply to the dedicated ExpenseIntel project after the orders table exists.
-- No public grants or RLS policies: exclusively server-side service role access.
alter table public.ei_deep_check_orders
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists decision_title text,
  add column if not exists dossier jsonb,
  add column if not exists dossier_updated_at timestamptz;
create index if not exists ei_deep_check_orders_owner_idx on public.ei_deep_check_orders(owner_id);
revoke all on public.ei_deep_check_orders from anon, authenticated;
alter table public.ei_deep_check_orders enable row level security;
comment on column public.ei_deep_check_orders.dossier is 'User-entered decision comparison and derived report; owner email and verified Stripe test purchase checked server-side before any read/write.';
