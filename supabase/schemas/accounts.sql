-- Desired schema only. Generate a reviewed migration before applying to a project.
-- Existing public.profiles / public.saved_styles require reconciliation first.
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) <= 80)
);

create table public.saved_styles (
  user_id uuid not null references auth.users (id) on delete cascade,
  style_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, style_id),
  constraint saved_styles_known_style check (style_id in (
    'glassmorphism', 'neo-brutalism', 'kinetic-type',
    'aurora-shaders', 'claymorphism', 'bento-motion'
  ))
);

-- Both primary keys begin with user_id, indexing the FK and ownership predicate.
alter table public.profiles enable row level security;
alter table public.saved_styles enable row level security;

revoke all on table public.profiles, public.saved_styles from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, delete on table public.saved_styles to authenticated;

create policy profiles_select_owner on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_insert_owner on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_update_owner on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy profiles_delete_owner on public.profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy saved_styles_select_owner on public.saved_styles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy saved_styles_insert_owner on public.saved_styles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy saved_styles_delete_owner on public.saved_styles
  for delete to authenticated using ((select auth.uid()) = user_id);

-- No elevated privileges and no auth.users trigger. Profiles are created lazily.
create function public.set_profile_timestamps()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := pg_catalog.now();
  else
    new.created_at := old.created_at;
  end if;
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

-- Trigger execution is internal; clients cannot call the function as an RPC.
revoke all on function public.set_profile_timestamps() from public, anon, authenticated;
create trigger profiles_timestamps
  before insert or update on public.profiles
  for each row execute function public.set_profile_timestamps();
