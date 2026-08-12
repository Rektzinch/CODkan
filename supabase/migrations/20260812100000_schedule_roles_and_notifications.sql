-- COD scheduling must be seller-led: the seller sends the initial proposal,
-- then the buyer may accept, reject, or submit one alternative proposal.
-- All state transitions and notifications are enforced server-side.

create or replace function public.propose_cod_schedule(
  p_deal_id uuid,
  p_scheduled_at timestamptz,
  p_location_name text,
  p_location_address text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_deal public.deals;
  v_schedule public.cod_schedules;
  v_schedule_id uuid;
  v_recipient uuid;
  v_notification_type text;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_scheduled_at is null or p_scheduled_at <= now() then
    raise exception 'SCHEDULE_IN_PAST';
  end if;
  if char_length(btrim(coalesce(p_location_name, ''))) not between 3 and 160 then
    raise exception 'INVALID_SCHEDULE_LOCATION';
  end if;
  if char_length(btrim(coalesce(p_location_address, ''))) not between 3 and 300 then
    raise exception 'INVALID_SCHEDULE_ADDRESS';
  end if;
  if char_length(coalesce(p_notes, '')) > 500 then
    raise exception 'INVALID_SCHEDULE_NOTES';
  end if;

  select * into v_deal
  from public.deals
  where id = p_deal_id
  for update;

  if not found or v_user not in (v_deal.buyer_id, v_deal.seller_id) then
    raise exception 'DEAL_FORBIDDEN';
  end if;
  if v_deal.status not in ('deal_created', 'scheduling') then
    raise exception 'INVALID_DEAL_STATE';
  end if;

  select * into v_schedule
  from public.cod_schedules
  where deal_id = p_deal_id
  for update;

  if v_user = v_deal.seller_id then
    -- Only the seller can make the first proposal. A seller may start again
    -- only after the previous proposal was rejected/cancelled.
    if found and v_schedule.status = 'proposed' then
      raise exception 'SCHEDULE_AWAITING_BUYER_RESPONSE';
    end if;
    if found and v_schedule.status = 'accepted' then
      raise exception 'SCHEDULE_NOT_ACTIONABLE';
    end if;

    insert into public.cod_schedules(
      deal_id, proposed_by, scheduled_at, location_name, location_address, notes, status
    )
    values (
      p_deal_id, v_user, p_scheduled_at, btrim(p_location_name),
      btrim(p_location_address), nullif(btrim(p_notes), ''), 'proposed'
    )
    on conflict (deal_id) do update
      set proposed_by = excluded.proposed_by,
          scheduled_at = excluded.scheduled_at,
          location_name = excluded.location_name,
          location_address = excluded.location_address,
          notes = excluded.notes,
          status = 'proposed',
          updated_at = now()
    returning id into v_schedule_id;

    v_recipient := v_deal.buyer_id;
    v_notification_type := 'cod.schedule.proposed';
  elsif v_user = v_deal.buyer_id then
    -- A buyer cannot start scheduling. They can only propose an alternative
    -- while an initial seller proposal is still pending.
    if not found or v_schedule.status <> 'proposed' or v_schedule.proposed_by <> v_deal.seller_id then
      raise exception 'SELLER_MUST_PROPOSE_FIRST';
    end if;

    update public.cod_schedules
      set proposed_by = v_user,
          scheduled_at = p_scheduled_at,
          location_name = btrim(p_location_name),
          location_address = btrim(p_location_address),
          notes = nullif(btrim(p_notes), ''),
          status = 'proposed',
          updated_at = now()
      where id = v_schedule.id
      returning id into v_schedule_id;

    v_recipient := v_deal.seller_id;
    v_notification_type := 'cod.schedule.countered';
  else
    raise exception 'DEAL_FORBIDDEN';
  end if;

  update public.deals
    set status = 'scheduling'
    where id = p_deal_id;

  insert into public.notifications(user_id, type, entity_type, entity_id, payload)
  values (
    v_recipient,
    v_notification_type,
    'deal',
    p_deal_id,
    jsonb_build_object(
      'scheduled_at', p_scheduled_at,
      'location_name', btrim(p_location_name),
      'location_address', btrim(p_location_address)
    )
  );

  return v_schedule_id;
end;
$$;

create or replace function public.accept_cod_schedule(p_deal_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_deal public.deals;
  v_schedule public.cod_schedules;
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
  if v_deal.status <> 'scheduling' then
    raise exception 'INVALID_DEAL_STATE';
  end if;

  select * into v_schedule
  from public.cod_schedules
  where deal_id = p_deal_id
  for update;

  if not found or v_schedule.status <> 'proposed' then
    raise exception 'SCHEDULE_NOT_ACTIONABLE';
  end if;
  if v_schedule.proposed_by = v_user then
    raise exception 'OTHER_PARTY_MUST_RESPOND';
  end if;
  if v_schedule.scheduled_at <= now() then
    raise exception 'SCHEDULE_IN_PAST';
  end if;

  update public.cod_schedules
    set status = 'accepted', updated_at = now()
    where id = v_schedule.id;
  update public.deals
    set status = 'scheduled'
    where id = p_deal_id;

  insert into public.notifications(user_id, type, entity_type, entity_id, payload)
  values (
    v_schedule.proposed_by,
    'cod.schedule.accepted',
    'deal',
    p_deal_id,
    jsonb_build_object('scheduled_at', v_schedule.scheduled_at)
  );

  return 'scheduled';
end;
$$;

create or replace function public.reject_cod_schedule(p_deal_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_deal public.deals;
  v_schedule public.cod_schedules;
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
  if v_deal.status <> 'scheduling' then
    raise exception 'INVALID_DEAL_STATE';
  end if;

  select * into v_schedule
  from public.cod_schedules
  where deal_id = p_deal_id
  for update;

  if not found or v_schedule.status <> 'proposed' then
    raise exception 'SCHEDULE_NOT_ACTIONABLE';
  end if;
  if v_schedule.proposed_by = v_user then
    raise exception 'OTHER_PARTY_MUST_RESPOND';
  end if;

  update public.cod_schedules
    set status = 'cancelled', updated_at = now()
    where id = v_schedule.id;
  update public.deals
    set status = 'deal_created'
    where id = p_deal_id;

  insert into public.notifications(user_id, type, entity_type, entity_id, payload)
  values (
    v_schedule.proposed_by,
    'cod.schedule.rejected',
    'deal',
    p_deal_id,
    '{}'::jsonb
  );

  return 'deal_created';
end;
$$;

-- Keep unread-count queries fast and expose only the current user's notifications.
create index if not exists notifications_unread_by_user_idx
  on public.notifications(user_id, created_at desc)
  where read_at is null;

create or replace function public.my_notifications(p_limit integer default 30)
returns table (
  id uuid,
  type text,
  entity_type text,
  entity_id uuid,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select n.id, n.type, n.entity_type, n.entity_id, n.payload, n.read_at, n.created_at
  from public.notifications n
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 50));
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  update public.notifications
    set read_at = now()
    where user_id = auth.uid()
      and read_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.propose_cod_schedule(uuid, timestamptz, text, text, text) from public, anon;
revoke all on function public.accept_cod_schedule(uuid) from public, anon;
revoke all on function public.reject_cod_schedule(uuid) from public, anon;
revoke all on function public.my_notifications(integer) from public, anon;
revoke all on function public.mark_all_notifications_read() from public, anon;

grant execute on function public.propose_cod_schedule(uuid, timestamptz, text, text, text) to authenticated;
grant execute on function public.accept_cod_schedule(uuid) to authenticated;
grant execute on function public.reject_cod_schedule(uuid) to authenticated;
grant execute on function public.my_notifications(integer) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- Keep all frontend subscriptions available after a fresh database restore.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
