-- Run in a disposable local Supabase database after applying the schema.
-- Administrator connection required. All fixtures are rolled back.
-- Passed in PGlite 0.5.8 and, once, on the empty production project (2026-10-01).
-- Do not run against production once real users exist.
begin;

insert into auth.users (id, email) values
  ('a1b23456-1111-4111-8111-111111111111', 'special-rls-owner@example.invalid'),
  ('b2c34567-2222-4222-8222-222222222222', 'special-rls-other@example.invalid');
insert into public.profiles (user_id, display_name) values
  ('b2c34567-2222-4222-8222-222222222222', 'Other user');
insert into public.saved_styles (user_id, style_id) values
  ('b2c34567-2222-4222-8222-222222222222', 'glassmorphism');

set local role anon;
set local request.jwt.claim.sub = '';
set local request.jwt.claims = '{"role":"anon"}';
do $$
declare
  statement text;
begin
  foreach statement in array array[
    'select * from public.profiles',
    'insert into public.profiles(user_id) values (''a1b23456-1111-4111-8111-111111111111'')',
    'update public.profiles set display_name = ''Anonymous''',
    'delete from public.profiles',
    'select * from public.saved_styles',
    'insert into public.saved_styles(user_id, style_id) values (''a1b23456-1111-4111-8111-111111111111'', ''bento-motion'')',
    'update public.saved_styles set style_id = ''bento-motion''',
    'delete from public.saved_styles'
  ] loop
    begin
      execute statement;
      raise exception 'Anonymous operation unexpectedly permitted: %', statement;
    exception when insufficient_privilege then
      null;
    end;
  end loop;
end;
$$;

set local role authenticated;
set local request.jwt.claim.sub = 'a1b23456-1111-4111-8111-111111111111';
set local request.jwt.claims = '{"sub":"a1b23456-1111-4111-8111-111111111111","role":"authenticated"}';

-- This is the same insert/update path used by the client profile upsert.
insert into public.profiles (user_id, display_name)
values ('a1b23456-1111-4111-8111-111111111111', 'Owner')
on conflict (user_id) do update set display_name = excluded.display_name;
insert into public.profiles (user_id, display_name)
values ('a1b23456-1111-4111-8111-111111111111', 'Owner')
on conflict (user_id) do update set
  user_id = excluded.user_id, display_name = excluded.display_name;
insert into public.saved_styles (user_id, style_id)
values ('a1b23456-1111-4111-8111-111111111111', 'bento-motion');
insert into public.saved_styles (user_id, style_id)
values ('a1b23456-1111-4111-8111-111111111111', 'bento-motion')
on conflict (user_id, style_id) do nothing;

do $$
declare
  affected integer;
begin
  if (select count(*) from public.profiles) <> 1
    or (select display_name from public.profiles) <> 'Owner' then
    raise exception 'Owner must read exactly their own profile';
  end if;
  if (select count(*) from public.saved_styles) <> 1
    or (select style_id from public.saved_styles) <> 'bento-motion' then
    raise exception 'Owner must read exactly their own saved style';
  end if;

  update public.profiles set display_name = 'Changed owner'
    where user_id = 'a1b23456-1111-4111-8111-111111111111';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner update was blocked'; end if;

  update public.profiles set display_name = 'Intrusion'
    where user_id = 'b2c34567-2222-4222-8222-222222222222';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-user update was allowed'; end if;
  delete from public.profiles where user_id = 'b2c34567-2222-4222-8222-222222222222';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-user profile delete was allowed'; end if;
  delete from public.saved_styles where user_id = 'b2c34567-2222-4222-8222-222222222222';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Cross-user saved-style delete was allowed'; end if;

  begin
    insert into public.profiles (user_id, display_name)
      values ('b2c34567-2222-4222-8222-222222222222', 'Intrusion');
    raise exception 'Cross-user profile insert was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.saved_styles (user_id, style_id)
      values ('b2c34567-2222-4222-8222-222222222222', 'bento-motion');
    raise exception 'Cross-user saved-style insert was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set user_id = 'b2c34567-2222-4222-8222-222222222222'
      where user_id = 'a1b23456-1111-4111-8111-111111111111';
    raise exception 'Profile ownership transfer was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.saved_styles set style_id = 'claymorphism';
    raise exception 'Saved-style UPDATE was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set display_name = repeat('x', 81);
    raise exception 'Oversized display name was allowed';
  exception when check_violation then null;
  end;
  begin
    insert into public.saved_styles (user_id, style_id)
      values ('a1b23456-1111-4111-8111-111111111111', 'unknown-style');
    raise exception 'Unknown style was allowed';
  exception when check_violation then null;
  end;

  delete from public.saved_styles where style_id = 'bento-motion';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner saved-style delete was blocked'; end if;
  delete from public.profiles;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner profile delete was blocked'; end if;
end;
$$;

-- An authenticated role with no actual user identity must not gain access.
set local request.jwt.claim.sub = '';
set local request.jwt.claims = '{"role":"authenticated"}';
do $$
begin
  if exists (select 1 from public.profiles) or exists (select 1 from public.saved_styles) then
    raise exception 'Missing identity exposed user data';
  end if;
  begin
    insert into public.profiles (user_id)
      values ('a1b23456-1111-4111-8111-111111111111');
    raise exception 'Missing identity allowed profile creation';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.saved_styles (user_id, style_id)
      values ('a1b23456-1111-4111-8111-111111111111', 'bento-motion');
    raise exception 'Missing identity allowed saved-style creation';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
do $$
begin
  if (select display_name from public.profiles
      where user_id = 'b2c34567-2222-4222-8222-222222222222') is distinct from 'Other user' then
    raise exception 'Other profile changed';
  end if;
  if (select count(*) from public.saved_styles
      where user_id = 'b2c34567-2222-4222-8222-222222222222') <> 1 then
    raise exception 'Other saved styles changed';
  end if;
  delete from auth.users where id = 'b2c34567-2222-4222-8222-222222222222';
  if exists (select 1 from public.profiles
      where user_id = 'b2c34567-2222-4222-8222-222222222222')
    or exists (select 1 from public.saved_styles
      where user_id = 'b2c34567-2222-4222-8222-222222222222') then
    raise exception 'Auth user deletion failed to cascade';
  end if;
end;
$$;

rollback;
select 'RLS verification passed; all fixtures rolled back.' as result;
