-- Lets a signed-in player delete their own account from the game, with no admin key in the app.
-- The function runs with elevated rights but can only ever remove the caller's own user row.
-- Every game table references auth.users with "on delete cascade", so their rows go with it.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
