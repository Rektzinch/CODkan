-- Expose the new profile controls through the authenticated profile RPC.
-- The function's return shape changes, so PostgreSQL requires a drop and recreate.

drop function if exists public.my_profile();

create function public.my_profile()
returns table (
  id uuid, display_name text, phone text, area text, avatar_url text,
  completed_deals integer, no_shows integer, created_at timestamptz,
  onboarded boolean, notifications_enabled boolean, deletion_requested_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.phone, p.area, p.avatar_url,
         p.completed_deals, p.no_shows, p.created_at,
         (p.area is distinct from 'Belum diatur') as onboarded,
         p.notifications_enabled, p.deletion_requested_at
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;
