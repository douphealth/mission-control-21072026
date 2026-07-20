-- Run only after adding a user_id uuid column to each Mission Control table.
-- This replaces anonymous allow-all access with authenticated row ownership.

alter table mc_websites add column if not exists user_id uuid references auth.users(id);
alter table mc_tasks add column if not exists user_id uuid references auth.users(id);
alter table mc_repos add column if not exists user_id uuid references auth.users(id);
alter table mc_build_projects add column if not exists user_id uuid references auth.users(id);
alter table mc_links add column if not exists user_id uuid references auth.users(id);
alter table mc_notes add column if not exists user_id uuid references auth.users(id);
alter table mc_payments add column if not exists user_id uuid references auth.users(id);
alter table mc_ideas add column if not exists user_id uuid references auth.users(id);
alter table mc_credentials add column if not exists user_id uuid references auth.users(id);
alter table mc_custom_modules add column if not exists user_id uuid references auth.users(id);
alter table mc_habits add column if not exists user_id uuid references auth.users(id);
alter table mc_settings add column if not exists user_id uuid references auth.users(id);

create or replace function public.install_owner_policy(table_name text)
returns void
language plpgsql
security definer
as $$
begin
  execute format('drop policy if exists "allow_all_mc" on %I', table_name);
  execute format('drop policy if exists "owner_access" on %I', table_name);
  execute format(
    'create policy "owner_access" on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
    table_name
  );
end;
$$;

select public.install_owner_policy(name)
from unnest(array[
  'mc_websites', 'mc_tasks', 'mc_repos', 'mc_build_projects', 'mc_links',
  'mc_notes', 'mc_payments', 'mc_ideas', 'mc_credentials',
  'mc_custom_modules', 'mc_habits', 'mc_settings'
]) as name;

drop function public.install_owner_policy(text);

create index if not exists mc_tasks_user_id_idx on mc_tasks(user_id);
create index if not exists mc_websites_user_id_idx on mc_websites(user_id);
create index if not exists mc_credentials_user_id_idx on mc_credentials(user_id);
