-- Gives every account a row in public.profiles the moment it is created, so the database is
-- ready for an account's game without the app having to make that row itself.
-- The function runs with elevated rights but only ever inserts the new user's own id, and no
-- player role can call it directly: only the trigger on auth.users runs it.
-- The last statement fills in a profile for each account made before this trigger existed. It
-- adds rows only and never changes or removes one that is already there.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id)
select u.id from auth.users u
on conflict (id) do nothing;
