-- The deal branch of listings_eligible_read never matched, so a buyer lost read
-- access to a listing the moment accepting an offer flipped it to 'reserved'.
--
-- Inside `select 1 from public.deals d where d.listing_id = id`, the unqualified
-- `id` binds to the innermost scope in view - public.deals has its own `id`
-- column - so the predicate evaluated as `d.listing_id = d.id` and was
-- effectively never true. Qualifying the outer reference as listings.id restores
-- the intent: both participants keep reading the listing behind their deal.
--
-- The buyer_listing_state subquery below uses the same bare-`id` shape but is
-- correct as written, because that table has no `id` column of its own. It is
-- qualified here anyway so the policy no longer depends on that coincidence.

drop policy if exists listings_eligible_read on public.listings;
create policy listings_eligible_read
on public.listings
for select
to authenticated
using (
  seller_id = (select auth.uid())
  or exists (
    select 1 from public.deals d
    where d.listing_id = listings.id
      and (select auth.uid()) in (d.buyer_id, d.seller_id)
  )
  or (
    status = 'active'
    and area_key = (select p.area_key from public.profiles p where p.id = (select auth.uid()))
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = listings.seller_id and b.blocked_id = (select auth.uid()))
         or (b.blocker_id = (select auth.uid()) and b.blocked_id = listings.seller_id)
    )
    and not exists (
      select 1 from public.buyer_listing_state s
      where s.buyer_id = (select auth.uid())
        and s.listing_id = listings.id
        and s.status in ('exhausted', 'kicked', 'blocked')
    )
  )
);
