-- Break the listings -> buyer_listing_state -> listings RLS cycle.
-- Sellers do not need direct reads here; offer/deal RPCs run as security definer.
drop policy if exists state_participants_read on public.buyer_listing_state;
drop policy if exists state_buyer_read on public.buyer_listing_state;

create policy state_buyer_read
on public.buyer_listing_state
for select
to authenticated
using (buyer_id = (select auth.uid()));
