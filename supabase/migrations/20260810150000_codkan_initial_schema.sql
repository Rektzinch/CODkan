create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  phone text,
  area text not null check (char_length(area) between 2 and 120),
  avatar_url text,
  completed_deals integer not null default 0 check (completed_deals >= 0),
  no_shows integer not null default 0 check (no_shows >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 10 and 4000),
  price bigint not null check (price > 0),
  category text not null check (category in ('Elektronik','Komputer','Fashion','Furnitur','Rumah','Hobi','Otomotif','Usaha','Produk Lokal','Lainnya')),
  condition text not null check (condition in ('Baru','Seperti baru','Bekas baik','Bekas')),
  negotiable boolean not null default true,
  area text not null,
  latitude double precision,
  longitude double precision,
  visibility_radius_km integer not null default 10 check (visibility_radius_km between 1 and 100),
  status text not null default 'active' check (status in ('draft','active','reserved','sold','hidden','expired','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sold_at timestamptz
);

create index if not exists listings_feed_idx on public.listings(status, area, created_at desc);
create index if not exists listings_seller_idx on public.listings(seller_id, created_at desc);

create table if not exists public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(listing_id, sort_order)
);

create table if not exists public.buyer_listing_state (
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  offers_used integer not null default 0 check (offers_used between 0 and 3),
  status text not null default 'eligible' check (status in ('eligible','dealing','exhausted','kicked','blocked')),
  kicked_by uuid references public.profiles(id),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (buyer_id, listing_id)
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null check (amount > 0),
  attempt_number integer check (attempt_number between 1 and 3),
  source text not null check (source in ('buyer','seller_counter')),
  parent_offer_id uuid references public.offers(id),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','countered','expired','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create unique index if not exists buyer_offer_attempt_unique
  on public.offers(listing_id, buyer_id, attempt_number)
  where source = 'buyer';
create unique index if not exists buyer_pending_offer_unique
  on public.offers(listing_id, buyer_id)
  where source = 'buyer' and status = 'pending';

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  seller_id uuid not null references public.profiles(id),
  buyer_id uuid not null references public.profiles(id),
  accepted_offer_id uuid not null references public.offers(id),
  final_price bigint not null check (final_price > 0),
  status text not null default 'deal_created' check (status in ('deal_created','scheduling','scheduled','meeting','completed','cancelled','disputed')),
  contact_unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz
);

create unique index if not exists one_active_deal_per_listing
  on public.deals(listing_id)
  where status in ('deal_created','scheduling','scheduled','meeting');

create table if not exists public.cod_schedules (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null unique references public.deals(id) on delete cascade,
  proposed_by uuid not null references public.profiles(id),
  scheduled_at timestamptz not null,
  location_name text not null check (char_length(location_name) between 3 and 160),
  location_address text not null check (char_length(location_address) between 3 and 300),
  notes text check (char_length(notes) <= 500),
  status text not null default 'proposed' check (status in ('proposed','accepted','changed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deal_confirmations (
  deal_id uuid not null references public.deals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  confirmation_type text not null check (confirmation_type in ('received','handed_over')),
  created_at timestamptz not null default now(),
  primary key (deal_id, user_id)
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  entity_type text not null,
  entity_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  target_user_id uuid references public.profiles(id),
  listing_id uuid references public.listings(id),
  deal_id uuid references public.deals(id),
  reason text not null,
  description text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger listings_updated before update on public.listings for each row execute function public.set_updated_at();
create trigger buyer_state_updated before update on public.buyer_listing_state for each row execute function public.set_updated_at();
create trigger cod_schedules_updated before update on public.cod_schedules for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_media enable row level security;
alter table public.buyer_listing_state enable row level security;
alter table public.offers enable row level security;
alter table public.deals enable row level security;
alter table public.cod_schedules enable row level security;
alter table public.deal_confirmations enable row level security;
alter table public.favorites enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;

create policy profiles_public_read on public.profiles for select using (true);
create policy profiles_own_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_own_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy listings_eligible_read on public.listings for select to authenticated using (
  seller_id = (select auth.uid()) or (
    status = 'active'
    and area = (select area from public.profiles where id = (select auth.uid()))
    and not exists (select 1 from public.blocks b where (b.blocker_id = seller_id and b.blocked_id = (select auth.uid())) or (b.blocker_id = (select auth.uid()) and b.blocked_id = seller_id))
    and not exists (select 1 from public.buyer_listing_state s where s.buyer_id = (select auth.uid()) and s.listing_id = id and s.status in ('exhausted','kicked','blocked'))
  )
);
create policy listings_own_insert on public.listings for insert to authenticated with check (seller_id = (select auth.uid()));
create policy listings_own_update on public.listings for update to authenticated using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
create policy listings_own_delete on public.listings for delete to authenticated using (seller_id = (select auth.uid()) and status not in ('reserved','sold'));

create policy media_visible on public.listing_media for select to authenticated using (exists (select 1 from public.listings l where l.id = listing_id));
create policy media_owner_write on public.listing_media for insert to authenticated with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));
create policy media_owner_delete on public.listing_media for delete to authenticated using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));

create policy state_participants_read on public.buyer_listing_state for select to authenticated using (buyer_id = (select auth.uid()) or exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));

create policy offers_participants_read on public.offers for select to authenticated using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()));
create policy deals_participants_read on public.deals for select to authenticated using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()));
create policy deals_participants_update on public.deals for update to authenticated using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid())) with check (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()));
create policy schedules_participants_all on public.cod_schedules for all to authenticated using (exists (select 1 from public.deals d where d.id = deal_id and ((select auth.uid()) in (d.buyer_id,d.seller_id)))) with check (exists (select 1 from public.deals d where d.id = deal_id and ((select auth.uid()) in (d.buyer_id,d.seller_id))));
create policy confirmations_participants_read on public.deal_confirmations for select to authenticated using (exists (select 1 from public.deals d where d.id = deal_id and ((select auth.uid()) in (d.buyer_id,d.seller_id))));
create policy favorites_own_all on public.favorites for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_own_read on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_own_update on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy reports_own_insert on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy reports_own_read on public.reports for select to authenticated using (reporter_id = (select auth.uid()));
create policy blocks_own_all on public.blocks for all to authenticated using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.listings to authenticated;
grant select, insert, delete on public.listing_media to authenticated;
grant select on public.buyer_listing_state, public.offers, public.deals to authenticated;
grant select, insert, update on public.cod_schedules to authenticated;
grant select on public.deal_confirmations to authenticated;
grant select, insert, delete on public.favorites, public.blocks to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert on public.reports to authenticated;

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
  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found or v_listing.status <> 'active' then raise exception 'LISTING_UNAVAILABLE'; end if;
  if v_listing.seller_id = v_user then raise exception 'OWN_LISTING'; end if;
  if not v_listing.negotiable then raise exception 'FIXED_PRICE'; end if;
  if not exists (select 1 from public.profiles where id = v_user and area = v_listing.area) then raise exception 'OUTSIDE_AREA'; end if;
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

create or replace function public.respond_offer(p_offer_id uuid, p_action text, p_counter_amount bigint default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_offer public.offers;
  v_listing public.listings;
  v_deal_id uuid;
  v_counter_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_offer from public.offers where id = p_offer_id for update;
  if not found or v_offer.seller_id <> v_user or v_offer.status <> 'pending' then raise exception 'OFFER_NOT_ACTIONABLE'; end if;
  select * into v_listing from public.listings where id = v_offer.listing_id for update;

  if p_action = 'reject' then
    update public.offers set status='rejected', responded_at=now() where id=p_offer_id;
    if v_offer.attempt_number = 3 then update public.buyer_listing_state set status='exhausted' where buyer_id=v_offer.buyer_id and listing_id=v_offer.listing_id; end if;
    insert into public.notifications(user_id,type,entity_type,entity_id,payload) values (v_offer.buyer_id,'offer.rejected','offer',v_offer.id,jsonb_build_object('attempt',v_offer.attempt_number));
    return null;
  elsif p_action = 'counter' then
    if p_counter_amount is null or p_counter_amount <= 0 then raise exception 'INVALID_COUNTER'; end if;
    update public.offers set status='countered', responded_at=now() where id=p_offer_id;
    insert into public.offers(listing_id,buyer_id,seller_id,amount,source,parent_offer_id,status)
    values(v_offer.listing_id,v_offer.buyer_id,v_offer.seller_id,p_counter_amount,'seller_counter',v_offer.id,'pending') returning id into v_counter_id;
    insert into public.notifications(user_id,type,entity_type,entity_id,payload) values (v_offer.buyer_id,'offer.countered','offer',v_counter_id,jsonb_build_object('amount',p_counter_amount));
    return v_counter_id;
  elsif p_action = 'accept' then
    if v_listing.status <> 'active' then raise exception 'LISTING_UNAVAILABLE'; end if;
    update public.offers set status='accepted', responded_at=now() where id=p_offer_id;
    insert into public.deals(listing_id,seller_id,buyer_id,accepted_offer_id,final_price)
    values(v_offer.listing_id,v_offer.seller_id,v_offer.buyer_id,v_offer.id,v_offer.amount) returning id into v_deal_id;
    update public.listings set status='reserved' where id=v_offer.listing_id;
    update public.buyer_listing_state set status='dealing' where buyer_id=v_offer.buyer_id and listing_id=v_offer.listing_id;
    update public.offers set status='cancelled', responded_at=now() where listing_id=v_offer.listing_id and id<>p_offer_id and status='pending';
    insert into public.notifications(user_id,type,entity_type,entity_id,payload) values (v_offer.buyer_id,'deal.created','deal',v_deal_id,jsonb_build_object('final_price',v_offer.amount));
    return v_deal_id;
  else raise exception 'INVALID_ACTION';
  end if;
end; $$;

create or replace function public.confirm_deal_completion(p_deal_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_deal public.deals; v_count integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_deal from public.deals where id=p_deal_id for update;
  if not found or v_user not in (v_deal.buyer_id,v_deal.seller_id) then raise exception 'DEAL_FORBIDDEN'; end if;
  if v_deal.status not in ('scheduled','meeting') then raise exception 'INVALID_DEAL_STATE'; end if;
  insert into public.deal_confirmations(deal_id,user_id,confirmation_type)
  values(p_deal_id,v_user,case when v_user=v_deal.buyer_id then 'received' else 'handed_over' end) on conflict do nothing;
  select count(*) into v_count from public.deal_confirmations where deal_id=p_deal_id;
  if v_count=2 then
    update public.deals set status='completed',completed_at=now() where id=p_deal_id;
    update public.listings set status='sold',sold_at=now() where id=v_deal.listing_id;
    update public.profiles set completed_deals=completed_deals+1 where id in (v_deal.buyer_id,v_deal.seller_id);
    return 'completed';
  end if;
  return 'waiting_other_party';
end; $$;

create or replace function public.propose_cod_schedule(p_deal_id uuid, p_scheduled_at timestamptz, p_location_name text, p_location_address text, p_notes text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_deal public.deals; v_schedule_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
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

create or replace function public.accept_cod_schedule(p_deal_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_deal public.deals; v_schedule public.cod_schedules;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_deal from public.deals where id=p_deal_id for update;
  if not found or v_user not in (v_deal.buyer_id,v_deal.seller_id) then raise exception 'DEAL_FORBIDDEN'; end if;
  select * into v_schedule from public.cod_schedules where deal_id=p_deal_id for update;
  if not found or v_schedule.status<>'proposed' then raise exception 'SCHEDULE_NOT_ACTIONABLE'; end if;
  if v_schedule.proposed_by=v_user then raise exception 'OTHER_PARTY_MUST_ACCEPT'; end if;
  update public.cod_schedules set status='accepted' where id=v_schedule.id;
  update public.deals set status='scheduled' where id=p_deal_id;
  insert into public.notifications(user_id,type,entity_type,entity_id,payload) values(v_schedule.proposed_by,'cod.schedule.accepted','deal',p_deal_id,jsonb_build_object('scheduled_at',v_schedule.scheduled_at));
  return 'scheduled';
end; $$;

revoke all on function public.submit_offer(uuid,bigint) from public, anon;
revoke all on function public.respond_offer(uuid,text,bigint) from public, anon;
revoke all on function public.confirm_deal_completion(uuid) from public, anon;
revoke all on function public.propose_cod_schedule(uuid,timestamptz,text,text,text) from public, anon;
revoke all on function public.accept_cod_schedule(uuid) from public, anon;
grant execute on function public.submit_offer(uuid,bigint) to authenticated;
grant execute on function public.respond_offer(uuid,text,bigint) to authenticated;
grant execute on function public.confirm_deal_completion(uuid) to authenticated;
grant execute on function public.propose_cod_schedule(uuid,timestamptz,text,text,text) to authenticated;
grant execute on function public.accept_cod_schedule(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('listing-media','listing-media',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy listing_media_public_read on storage.objects for select using (bucket_id='listing-media');
create policy listing_media_owner_insert on storage.objects for insert to authenticated with check (bucket_id='listing-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy listing_media_owner_update on storage.objects for update to authenticated using (bucket_id='listing-media' and owner_id=(select auth.uid())::text) with check (bucket_id='listing-media' and owner_id=(select auth.uid())::text);
create policy listing_media_owner_delete on storage.objects for delete to authenticated using (bucket_id='listing-media' and owner_id=(select auth.uid())::text);

alter publication supabase_realtime add table public.offers;
alter publication supabase_realtime add table public.deals;
alter publication supabase_realtime add table public.notifications;
