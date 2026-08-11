-- Audit fixes: contact privacy, reputation integrity, area matching, deal cancellation.

-- 1. Area matching is normalized so "Somba Opu, Gowa" and "somba opu,  gowa" are one market.
alter table public.profiles
  add column if not exists area_key text
  generated always as (lower(btrim(regexp_replace(area, '\s+', ' ', 'g')))) stored;

alter table public.listings
  add column if not exists area_key text
  generated always as (lower(btrim(regexp_replace(area, '\s+', ' ', 'g')))) stored;

create index if not exists listings_area_key_idx on public.listings(area_key, status, created_at desc);
create index if not exists offers_seller_status_idx on public.offers(seller_id, status, created_at desc);

drop policy if exists listings_eligible_read on public.listings;
create policy listings_eligible_read
on public.listings
for select
to authenticated
using (
  seller_id = (select auth.uid())
  or exists (
    select 1 from public.deals d
    where d.listing_id = id and (select auth.uid()) in (d.buyer_id, d.seller_id)
  )
  or (
    status = 'active'
    and area_key = (select p.area_key from public.profiles p where p.id = (select auth.uid()))
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = seller_id and b.blocked_id = (select auth.uid()))
         or (b.blocker_id = (select auth.uid()) and b.blocked_id = seller_id)
    )
    and not exists (
      select 1 from public.buyer_listing_state s
      where s.buyer_id = (select auth.uid())
        and s.listing_id = id
        and s.status in ('exhausted', 'kicked', 'blocked')
    )
  )
);

-- 2. Phone numbers must not be world-readable, and reputation counters must not be
--    writable by their owner. Column-level grants replace the blanket table grant.
revoke select, insert, update on public.profiles from authenticated;
grant select (id, display_name, area, area_key, avatar_url, completed_deals, no_shows, created_at, updated_at)
  on public.profiles to authenticated;
grant insert (id, display_name, phone, area, avatar_url) on public.profiles to authenticated;
grant update (display_name, phone, area, avatar_url) on public.profiles to authenticated;

create or replace function public.my_profile()
returns table (
  id uuid, display_name text, phone text, area text, avatar_url text,
  completed_deals integer, no_shows integer, created_at timestamptz
)
language sql security definer set search_path = '' as $$
  select p.id, p.display_name, p.phone, p.area, p.avatar_url,
         p.completed_deals, p.no_shows, p.created_at
  from public.profiles p
  where p.id = auth.uid();
$$;

-- Counterparty contact unlocks only once a deal exists, per PRD contact-unlock rule.
create or replace function public.my_deal_contacts()
returns table (deal_id uuid, display_name text, phone text)
language sql security definer set search_path = '' as $$
  select d.id, p.display_name, p.phone
  from public.deals d
  join public.profiles p
    on p.id = case when d.buyer_id = auth.uid() then d.seller_id else d.buyer_id end
  where auth.uid() in (d.buyer_id, d.seller_id)
    and d.status in ('deal_created', 'scheduling', 'scheduled', 'meeting', 'completed');
$$;

-- 3. Area gate must use the same normalization as the read policy, and a fixed-price
--    listing must still be purchasable at the asking price instead of being a dead end.
create or replace function public.submit_offer(p_listing_id uuid, p_amount bigint)
returns public.offers
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_listing public.listings;
  v_state public.buyer_listing_state;
  v_offer public.offers;
  v_attempt integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found or v_listing.status <> 'active' then raise exception 'LISTING_UNAVAILABLE'; end if;
  if v_listing.seller_id = v_user then raise exception 'OWN_LISTING'; end if;
  if not v_listing.negotiable and p_amount <> v_listing.price then raise exception 'FIXED_PRICE'; end if;
  if not exists (select 1 from public.profiles where id = v_user and area_key = v_listing.area_key) then raise exception 'OUTSIDE_AREA'; end if;
  if exists (select 1 from public.blocks where (blocker_id = v_listing.seller_id and blocked_id = v_user) or (blocker_id = v_user and blocked_id = v_listing.seller_id)) then raise exception 'BLOCKED'; end if;

  insert into public.buyer_listing_state(buyer_id, listing_id) values (v_user, p_listing_id) on conflict do nothing;
  select * into v_state from public.buyer_listing_state where buyer_id = v_user and listing_id = p_listing_id for update;
  if v_state.status in ('exhausted','kicked','blocked') or v_state.offers_used >= 3 then raise exception 'OFFER_LIMIT_REACHED'; end if;
  if exists (select 1 from public.offers where listing_id = p_listing_id and buyer_id = v_user and source = 'buyer' and status = 'pending') then raise exception 'PENDING_OFFER_EXISTS'; end if;
  v_attempt := v_state.offers_used + 1;
  insert into public.offers(listing_id,buyer_id,seller_id,amount,attempt_number,source)
  values (p_listing_id,v_user,v_listing.seller_id,p_amount,v_attempt,'buyer') returning * into v_offer;
  update public.buyer_listing_state set offers_used = v_attempt where buyer_id = v_user and listing_id = p_listing_id;
  insert into public.notifications(user_id,type,entity_type,entity_id,payload) values (v_listing.seller_id,'offer.created','offer',v_offer.id,jsonb_build_object('amount',p_amount,'attempt',v_attempt));
  return v_offer;
end; $$;

-- 4. A COD schedule may never be proposed in the past.
create or replace function public.propose_cod_schedule(p_deal_id uuid, p_scheduled_at timestamptz, p_location_name text, p_location_address text, p_notes text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_deal public.deals; v_schedule_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_scheduled_at is null or p_scheduled_at <= now() then raise exception 'SCHEDULE_IN_PAST'; end if;
  select * into v_deal from public.deals where id=p_deal_id for update;
  if not found or v_user not in (v_deal.buyer_id,v_deal.seller_id) then raise exception 'DEAL_FORBIDDEN'; end if;
  if v_deal.status not in ('deal_created','scheduling','scheduled') then raise exception 'INVALID_DEAL_STATE'; end if;
  insert into public.cod_schedules(deal_id,proposed_by,scheduled_at,location_name,location_address,notes,status)
  values(p_deal_id,v_user,p_scheduled_at,p_location_name,p_location_address,p_notes,'proposed')
  on conflict(deal_id) do update set proposed_by=excluded.proposed_by,scheduled_at=excluded.scheduled_at,location_name=excluded.location_name,location_address=excluded.location_address,notes=excluded.notes,status='proposed',updated_at=now()
  returning id into v_schedule_id;
  update public.deals set status='scheduling' where id=p_deal_id;
  insert into public.notifications(user_id,type,entity_type,entity_id,payload)
  values(case when v_user=v_deal.buyer_id then v_deal.seller_id else v_deal.buyer_id end,'cod.schedule.proposed','deal',p_deal_id,jsonb_build_object('scheduled_at',p_scheduled_at,'location_name',p_location_name));
  return v_schedule_id;
end; $$;

-- 5. Without a cancel path a stalled deal pins its listing in 'reserved' forever.
create or replace function public.cancel_deal(p_deal_id uuid, p_reason text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_deal public.deals; v_other uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_deal from public.deals where id=p_deal_id for update;
  if not found or v_user not in (v_deal.buyer_id,v_deal.seller_id) then raise exception 'DEAL_FORBIDDEN'; end if;
  if v_deal.status not in ('deal_created','scheduling','scheduled','meeting') then raise exception 'INVALID_DEAL_STATE'; end if;
  v_other := case when v_user = v_deal.buyer_id then v_deal.seller_id else v_deal.buyer_id end;

  update public.deals set status='cancelled', cancelled_at=now() where id=p_deal_id;
  update public.cod_schedules set status='cancelled' where deal_id=p_deal_id;
  update public.listings set status='active' where id=v_deal.listing_id and status='reserved';
  update public.buyer_listing_state
    set status = case when offers_used >= 3 then 'exhausted' else 'eligible' end
    where buyer_id=v_deal.buyer_id and listing_id=v_deal.listing_id;
  -- Backing out of an agreed meeting is the no-show signal the reputation counter tracks.
  if v_deal.status in ('scheduled','meeting') then
    update public.profiles set no_shows = no_shows + 1 where id = v_user;
  end if;
  insert into public.notifications(user_id,type,entity_type,entity_id,payload)
  values(v_other,'deal.cancelled','deal',p_deal_id,jsonb_build_object('reason',p_reason,'by',v_user));
  return 'cancelled';
end; $$;

revoke all on function public.my_profile() from public, anon;
revoke all on function public.my_deal_contacts() from public, anon;
revoke all on function public.cancel_deal(uuid,text) from public, anon;
grant execute on function public.my_profile() to authenticated;
grant execute on function public.my_deal_contacts() to authenticated;
grant execute on function public.cancel_deal(uuid,text) to authenticated;
grant execute on function public.submit_offer(uuid,bigint) to authenticated;
grant execute on function public.propose_cod_schedule(uuid,timestamptz,text,text,text) to authenticated;

-- 6. Schedule and confirmation changes must reach the counterparty in realtime.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='cod_schedules') then
    alter publication supabase_realtime add table public.cod_schedules;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='deal_confirmations') then
    alter publication supabase_realtime add table public.deal_confirmations;
  end if;
end $$;
