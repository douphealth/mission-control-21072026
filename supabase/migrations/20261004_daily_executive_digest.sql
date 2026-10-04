create table if not exists public.mission_control_digest_snapshots (
  user_email text primary key,
  snapshot jsonb not null,
  timezone text not null default 'UTC',
  send_hour smallint not null default 8 check (send_hour between 0 and 23),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  last_sent_at timestamptz,
  last_sent_local_date date
);
alter table public.mission_control_digest_snapshots enable row level security;
revoke all on table public.mission_control_digest_snapshots from anon, authenticated;
comment on table public.mission_control_digest_snapshots is 'Server-only latest Mission Control executive digest snapshot. No credential-vault or note-body data.';
