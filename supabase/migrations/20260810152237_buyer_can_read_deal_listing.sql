-- Keep reserved and sold listings readable by the buyer and seller in Deal Room.
drop policy if exists listings_eligible_read on public.listings;

create policy listings_eligible_read
on public.listings
for select
to authenticated
using (
  seller_id = (select auth.uid())
  or exists (
    select 1
    from public.deals d
    where d.listing_id = id
      and (select auth.uid()) in (d.buyer_id, d.seller_id)
  )
  or (
    status = 'active'
    and area = (select area from public.profiles where id = (select auth.uid()))
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
