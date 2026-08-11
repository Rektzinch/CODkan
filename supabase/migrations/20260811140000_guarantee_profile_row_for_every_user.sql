-- Deals could never be created for an account that had not completed onboarding.
--
-- listings.seller_id, offers.seller_id and deals.seller_id all reference
-- public.profiles(id), but a profile row was only ever created by the onboarding
-- screen. respond_offer('accept') therefore hit a foreign-key violation on the
-- deals insert and rolled the whole transaction back: the offer stayed 'pending',
-- the listing stayed 'active', and no Deal Room appeared. The raw Postgres error
-- was the only thing the user saw.
--
-- Guarantee a profile for every auth user at signup instead, and let onboarding
-- fill in the details.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, area)
  values (
    new.id,
    coalesce(nullif(split_part(new.email, '@', 1), ''), 'Pengguna'),
    'Belum diatur'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill accounts that signed up before this trigger existed.
insert into public.profiles (id, display_name, area)
select u.id,
       coalesce(nullif(split_part(u.email, '@', 1), ''), 'Pengguna'),
       'Belum diatur'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Onboarding now updates the row the trigger made, so it needs a sentinel the app
-- can recognise as "not yet completed" rather than relying on the row's absence.
-- Adding the onboarded column changes the OUT row type, which create or replace
-- cannot do; the function has to be dropped first.
drop function if exists public.my_profile();

create function public.my_profile()
returns table (
  id uuid, display_name text, phone text, area text, avatar_url text,
  completed_deals integer, no_shows integer, created_at timestamptz,
  onboarded boolean
)
language sql security definer set search_path = '' as $$
  select p.id, p.display_name, p.phone, p.area, p.avatar_url,
         p.completed_deals, p.no_shows, p.created_at,
         (p.area is distinct from 'Belum diatur') as onboarded
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- A listing may only go live from a profile that finished onboarding, otherwise it
-- would carry the 'Belum diatur' sentinel as its area and match no buyer's market.
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
  if not exists (select 1 from public.profiles where id = v_user and area is distinct from 'Belum diatur') then
    raise exception 'PROFILE_INCOMPLETE';
  end if;
  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found or v_listing.status <> 'active' then raise exception 'LISTING_UNAVAILABLE'; end if;
  if v_listing.seller_id = v_user then raise exception 'OWN_LISTING'; end if;
  if not v_listing.negotiable and p_amount <> v_listing.price then raise exception 'FIXED_PRICE'; end if;
  if not exists (select 1 from public.profiles where id = v_user and area_key = v_listing.area_key) then raise exception 'OUTSIDE_AREA'; end if;
  if exists (select 1 from public.blocks where (blocker_id = v_listing.seller_id and blocked_id = v_user) or (blocker_id = v_user and blocked_id = v_listing.seller_id)) then raise exception 'BLOCKED'; end if;

  insert into public.buyer_listing_state(buyer_id, listing_id) values (v_user, p_listing_id) on conflict do nothing;
  select * into v_state from public.buyer_listing_state where buyer_id = v_user and listing_id = p_listing_id for update;
  if v_state.status in ('exhausted','kicked','blocked') or v_state.offers_used >= 3 then raise exception 'OFFER_LIMIT_REACHED'; end if;
  if exists (select 1 from public.offers where listing_id = p_listing_id and buyer_id = v_user and status = 'pending') then raise exception 'PENDING_OFFER_EXISTS'; end if;

  v_attempt := v_state.offers_used + 1;
  insert into public.offers(listing_id,buyer_id,seller_id,amount,attempt_number,source)
  values (p_listing_id,v_user,v_listing.seller_id,p_amount,v_attempt,'buyer') returning * into v_offer;
  update public.buyer_listing_state set offers_used = v_attempt where buyer_id = v_user and listing_id = p_listing_id;
  insert into public.notifications(user_id,type,entity_type,entity_id,payload)
  values (v_listing.seller_id,'offer.created','offer',v_offer.id,jsonb_build_object('amount',p_amount,'attempt',v_attempt));
  return v_offer;
end; $$;

-- Two sellers accepting offers on one listing at the same time hit
-- one_active_deal_per_listing and surfaced a raw unique-violation string. Name the
-- condition so the app can translate it.
create or replace function public.respond_offer(p_offer_id uuid, p_action text, p_counter_amount bigint default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_offer public.offers;
  v_listing public.listings;
  v_responder uuid;
  v_other uuid;
  v_deal_id uuid;
  v_counter_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_offer from public.offers where id = p_offer_id for update;
  if not found or v_offer.status <> 'pending' then raise exception 'OFFER_NOT_ACTIONABLE'; end if;

  v_responder := case when v_offer.source = 'seller_counter' then v_offer.buyer_id else v_offer.seller_id end;
  if v_responder <> v_user then raise exception 'OFFER_NOT_ACTIONABLE'; end if;
  v_other := case when v_user = v_offer.buyer_id then v_offer.seller_id else v_offer.buyer_id end;

  select * into v_listing from public.listings where id = v_offer.listing_id for update;

  if p_action = 'reject' then
    update public.offers set status='rejected', responded_at=now() where id=p_offer_id;
    if v_offer.source = 'buyer' and v_offer.attempt_number = 3 then
      update public.buyer_listing_state set status='exhausted' where buyer_id=v_offer.buyer_id and listing_id=v_offer.listing_id;
    end if;
    insert into public.notifications(user_id,type,entity_type,entity_id,payload)
    values (v_other,'offer.rejected','offer',v_offer.id,jsonb_build_object('attempt',v_offer.attempt_number));
    return null;

  elsif p_action = 'counter' then
    if v_offer.source = 'seller_counter' then raise exception 'INVALID_ACTION'; end if;
    if p_counter_amount is null or p_counter_amount <= 0 then raise exception 'INVALID_COUNTER'; end if;
    update public.offers set status='countered', responded_at=now() where id=p_offer_id;
    insert into public.offers(listing_id,buyer_id,seller_id,amount,attempt_number,source,parent_offer_id,status)
    values(v_offer.listing_id,v_offer.buyer_id,v_offer.seller_id,p_counter_amount,v_offer.attempt_number,'seller_counter',v_offer.id,'pending')
    returning id into v_counter_id;
    insert into public.notifications(user_id,type,entity_type,entity_id,payload)
    values (v_offer.buyer_id,'offer.countered','offer',v_counter_id,jsonb_build_object('amount',p_counter_amount));
    return v_counter_id;

  elsif p_action = 'accept' then
    if v_listing.status <> 'active' then raise exception 'LISTING_UNAVAILABLE'; end if;
    if exists (
      select 1 from public.deals d
      where d.listing_id = v_offer.listing_id
        and d.status in ('deal_created','scheduling','scheduled','meeting')
    ) then raise exception 'DEAL_ALREADY_EXISTS'; end if;

    update public.offers set status='accepted', responded_at=now() where id=p_offer_id;
    insert into public.deals(listing_id,seller_id,buyer_id,accepted_offer_id,final_price)
    values(v_offer.listing_id,v_offer.seller_id,v_offer.buyer_id,v_offer.id,v_offer.amount) returning id into v_deal_id;
    update public.listings set status='reserved' where id=v_offer.listing_id;
    update public.buyer_listing_state set status='dealing' where buyer_id=v_offer.buyer_id and listing_id=v_offer.listing_id;
    update public.offers set status='cancelled', responded_at=now()
      where listing_id=v_offer.listing_id and id<>p_offer_id and status='pending';
    insert into public.notifications(user_id,type,entity_type,entity_id,payload)
    values (v_other,'deal.created','deal',v_deal_id,jsonb_build_object('final_price',v_offer.amount));
    return v_deal_id;

  else raise exception 'INVALID_ACTION';
  end if;
end; $$;

-- Completion required status 'scheduled' or 'meeting', but nothing ever set
-- 'meeting' and a pair who agreed COD outside the app could never close the deal.
create or replace function public.confirm_deal_completion(p_deal_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_deal public.deals; v_count integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_deal from public.deals where id=p_deal_id for update;
  if not found or v_user not in (v_deal.buyer_id,v_deal.seller_id) then raise exception 'DEAL_FORBIDDEN'; end if;
  if v_deal.status not in ('deal_created','scheduling','scheduled','meeting') then raise exception 'INVALID_DEAL_STATE'; end if;
  insert into public.deal_confirmations(deal_id,user_id,confirmation_type)
  values(p_deal_id,v_user,case when v_user=v_deal.buyer_id then 'received' else 'handed_over' end) on conflict do nothing;
  select count(*) into v_count from public.deal_confirmations where deal_id=p_deal_id;
  if v_count=2 then
    update public.deals set status='completed',completed_at=now() where id=p_deal_id;
    update public.listings set status='sold',sold_at=now() where id=v_deal.listing_id;
    update public.profiles set completed_deals=completed_deals+1 where id in (v_deal.buyer_id,v_deal.seller_id);
    insert into public.notifications(user_id,type,entity_type,entity_id,payload)
    values(case when v_user=v_deal.buyer_id then v_deal.seller_id else v_deal.buyer_id end,'deal.completed','deal',p_deal_id,'{}'::jsonb);
    return 'completed';
  end if;
  insert into public.notifications(user_id,type,entity_type,entity_id,payload)
  values(case when v_user=v_deal.buyer_id then v_deal.seller_id else v_deal.buyer_id end,'deal.confirmation','deal',p_deal_id,'{}'::jsonb);
  return 'waiting_other_party';
end; $$;

revoke all on function public.submit_offer(uuid,bigint) from public, anon;
revoke all on function public.respond_offer(uuid,text,bigint) from public, anon;
revoke all on function public.confirm_deal_completion(uuid) from public, anon;
grant execute on function public.submit_offer(uuid,bigint) to authenticated;
grant execute on function public.respond_offer(uuid,text,bigint) to authenticated;
grant execute on function public.confirm_deal_completion(uuid) to authenticated;
