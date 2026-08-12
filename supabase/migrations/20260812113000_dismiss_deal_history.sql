-- A terminal deal remains as an audit record, but each participant may remove it
-- from their own history independently.

alter table public.deals
  add column if not exists buyer_history_deleted_at timestamptz,
  add column if not exists seller_history_deleted_at timestamptz;

create or replace function public.dismiss_deal_history(p_deal_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_deal public.deals;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_deal
  from public.deals
  where id = p_deal_id
  for update;

  if not found or v_user not in (v_deal.buyer_id, v_deal.seller_id) then
    raise exception 'DEAL_FORBIDDEN';
  end if;
  if v_deal.status not in ('completed', 'cancelled') then
    raise exception 'DEAL_NOT_ARCHIVABLE';
  end if;

  update public.deals
  set buyer_history_deleted_at = case when v_user = buyer_id then now() else buyer_history_deleted_at end,
      seller_history_deleted_at = case when v_user = seller_id then now() else seller_history_deleted_at end
  where id = p_deal_id;

  return 'dismissed';
end;
$$;

revoke all on function public.dismiss_deal_history(uuid) from public, anon;
grant execute on function public.dismiss_deal_history(uuid) to authenticated;
