-- Every price change needs a decision from the party who did not propose it.
--
-- respond_offer authorized only on seller_id, but a 'seller_counter' row carries the
-- same seller_id as the buyer offer it answers. A seller could therefore counter at
-- any price and then accept their own counter, binding the buyer to a deal they never
-- agreed to. Route each offer to the side that must answer it instead.

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

  -- A buyer offer is answered by the seller; a seller counter is answered by the buyer.
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
    -- Only the seller counters. The buyer's answer to a counter is accept or reject,
    -- otherwise the two sides could volley forever outside the three-attempt limit.
    if v_offer.source = 'seller_counter' then raise exception 'INVALID_ACTION'; end if;
    if p_counter_amount is null or p_counter_amount <= 0 then raise exception 'INVALID_COUNTER'; end if;
    update public.offers set status='countered', responded_at=now() where id=p_offer_id;
    insert into public.offers(listing_id,buyer_id,seller_id,amount,source,parent_offer_id,status)
    values(v_offer.listing_id,v_offer.buyer_id,v_offer.seller_id,p_counter_amount,'seller_counter',v_offer.id,'pending')
    returning id into v_counter_id;
    insert into public.notifications(user_id,type,entity_type,entity_id,payload)
    values (v_offer.buyer_id,'offer.countered','offer',v_counter_id,jsonb_build_object('amount',p_counter_amount));
    return v_counter_id;

  elsif p_action = 'accept' then
    if v_listing.status <> 'active' then raise exception 'LISTING_UNAVAILABLE'; end if;
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

-- A pending seller counter is the buyer's turn to decide, so it must also block a
-- fresh buyer offer that would sidestep that decision.
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
  if exists (select 1 from public.offers where listing_id = p_listing_id and buyer_id = v_user and status = 'pending') then raise exception 'PENDING_OFFER_EXISTS'; end if;

  v_attempt := v_state.offers_used + 1;
  insert into public.offers(listing_id,buyer_id,seller_id,amount,attempt_number,source)
  values (p_listing_id,v_user,v_listing.seller_id,p_amount,v_attempt,'buyer') returning * into v_offer;
  update public.buyer_listing_state set offers_used = v_attempt where buyer_id = v_user and listing_id = p_listing_id;
  insert into public.notifications(user_id,type,entity_type,entity_id,payload)
  values (v_listing.seller_id,'offer.created','offer',v_offer.id,jsonb_build_object('amount',p_amount,'attempt',v_attempt));
  return v_offer;
end; $$;

create index if not exists offers_buyer_status_idx on public.offers(buyer_id, status, created_at desc);

revoke all on function public.respond_offer(uuid,text,bigint) from public, anon;
revoke all on function public.submit_offer(uuid,bigint) from public, anon;
grant execute on function public.respond_offer(uuid,text,bigint) to authenticated;
grant execute on function public.submit_offer(uuid,bigint) to authenticated;
