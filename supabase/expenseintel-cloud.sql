-- ExpenseIntel Cloud Projects schema blueprint.
-- Apply only to a dedicated ExpenseIntel Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.ei_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  proposed_use text,
  project_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ei_project_evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ei_projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source_type text,
  source_strength text,
  source_date date,
  categories jsonb not null default '[]'::jsonb,
  claims jsonb not null default '[]'::jsonb,
  excerpt text,
  content_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.ei_project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ei_projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  title text not null,
  detail text,
  event_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ei_projects_owner_idx on public.ei_projects(owner_id, updated_at desc);
create index if not exists ei_evidence_project_idx on public.ei_project_evidence(project_id, created_at desc);
create index if not exists ei_events_project_idx on public.ei_project_events(project_id, created_at desc);

alter table public.ei_projects enable row level security;
alter table public.ei_project_evidence enable row level security;
alter table public.ei_project_events enable row level security;

create policy "owners manage projects" on public.ei_projects
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "owners manage project evidence" on public.ei_project_evidence
for all using (auth.uid() = owner_id) with check (
  auth.uid() = owner_id and exists (
    select 1 from public.ei_projects p where p.id = project_id and p.owner_id = auth.uid()
  )
);

create policy "owners manage project events" on public.ei_project_events
for all using (auth.uid() = owner_id) with check (
  auth.uid() = owner_id and exists (
    select 1 from public.ei_projects p where p.id = project_id and p.owner_id = auth.uid()
  )
);

create or replace function public.ei_touch_project()
returns trigger language plpgsql security invoker as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ei_projects_touch on public.ei_projects;
create trigger ei_projects_touch before update on public.ei_projects
for each row execute function public.ei_touch_project();
