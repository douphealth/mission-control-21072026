create table if not exists public.mc_automations (
  id text primary key,
  owner_id uuid references auth.users(id) default auth.uid() not null,
  data jsonb not null,
  status text generated always as (data->>'status') stored,
  next_run_at timestamptz generated always as (nullif(data->>'nextRunAt','')::timestamptz) stored,
  updated_at timestamptz default now() not null
);

create table if not exists public.mc_automation_runs (
  id text primary key,
  owner_id uuid references auth.users(id) default auth.uid() not null,
  automation_id text not null,
  idempotency_key text not null,
  status text not null,
  scheduled_for timestamptz not null,
  data jsonb not null,
  created_at timestamptz default now() not null,
  unique(owner_id, idempotency_key)
);

create table if not exists public.mc_approval_requests (
  id text primary key,
  owner_id uuid references auth.users(id) default auth.uid() not null,
  automation_id text not null,
  run_id text not null,
  status text not null,
  data jsonb not null,
  requested_at timestamptz default now() not null
);

create table if not exists public.mc_integration_health (
  id text primary key,
  owner_id uuid references auth.users(id) default auth.uid() not null,
  integration text not null,
  status text not null,
  data jsonb not null,
  last_checked_at timestamptz default now() not null
);

create index if not exists mc_automations_due_idx on public.mc_automations(owner_id, status, next_run_at);
create index if not exists mc_runs_automation_idx on public.mc_automation_runs(owner_id, automation_id, scheduled_for desc);
create index if not exists mc_approvals_pending_idx on public.mc_approval_requests(owner_id, status, requested_at);

alter table public.mc_automations enable row level security;
alter table public.mc_automation_runs enable row level security;
alter table public.mc_approval_requests enable row level security;
alter table public.mc_integration_health enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['mc_automations','mc_automation_runs','mc_approval_requests','mc_integration_health'] loop
    execute format('drop policy if exists owner_only on public.%I', table_name);
    execute format(
      'create policy owner_only on public.%I for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())',
      table_name
    );
  end loop;
end $$;
