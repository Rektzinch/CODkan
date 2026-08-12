-- Keep profile controls small: one in-app notification preference and a reviewable
-- account-deletion request. A trigger centralizes preference enforcement for every RPC.

alter table public.profiles
  add column if not exists notifications_enabled boolean not null default true,
  add column if not exists deletion_requested_at timestamptz;

create or replace function public.skip_disabled_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.profiles
    where id = new.user_id
      and notifications_enabled = false
  ) then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_respect_profile_preferences on public.notifications;
create trigger notifications_respect_profile_preferences
  before insert on public.notifications
  for each row execute function public.skip_disabled_notifications();
