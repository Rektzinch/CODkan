# CODkan --- TECHNICAL.md

**Architecture:** Mobile-first PWA + API/backend + PostgreSQL\
**Core Constraint:** COD-only marketplace with local visibility and
transactional negotiation rules.

## 1. Recommended Stack

### Frontend

-   Next.js + TypeScript.
-   React.
-   Tailwind CSS or equivalent token-based CSS system.
-   PWA manifest + service worker.
-   Server rendering where useful for public listing pages.
-   Client-side interaction for negotiation and Deal Room.

### Backend

Practical MVP option: - Supabase/PostgreSQL. - Supabase Auth / phone OTP
provider integration. - Row Level Security. - Realtime for
offers/chat/deal updates. - Object Storage for listing images. -
Edge/server functions for sensitive transactional operations.

Alternative backend can use Node.js + PostgreSQL, but business rules
below remain the same.

### Maps/Geospatial

-   PostgreSQL PostGIS where available.
-   Store latitude/longitude privately.
-   Use geospatial distance queries.
-   Public API returns generalized area, not seller coordinates.

## 2. High-level Architecture

`PWA/Web Client` ↓ `Application/API Layer` ↓
`Auth | Listing | Offer Engine | Deal Engine | Chat | Notification | Moderation`
↓ `PostgreSQL + PostGIS` ↓ `Object Storage`

External: - OTP/SMS provider. - Maps/geocoding provider. - Push
notification provider.

No payment provider is required.

## 3. Core Data Model

### users

-   id UUID PK
-   phone
-   display_name
-   avatar_url
-   status
-   created_at
-   updated_at

### user_locations

-   id
-   user_id
-   area_id
-   latitude
-   longitude
-   geog/geospatial point
-   accuracy
-   updated_at

Coordinates are private.

### areas

-   id
-   province
-   regency_city
-   district
-   village optional
-   centroid
-   slug

### categories

-   id
-   parent_id nullable
-   name
-   slug
-   status

### listings

-   id UUID
-   seller_id
-   category_id
-   title
-   description
-   price
-   condition
-   negotiable boolean
-   area_id
-   location_point private
-   visibility_radius_km
-   status
-   created_at
-   updated_at
-   sold_at nullable

### listing_media

-   id
-   listing_id
-   type
-   storage_path
-   sort_order
-   width
-   height
-   created_at

### buyer_listing_state

Critical table.

-   id
-   buyer_id
-   listing_id
-   offers_used
-   status (`eligible`, `dealing`, `exhausted`, `kicked`, `blocked`)
-   kicked_by
-   reason
-   created_at
-   updated_at

Unique: `UNIQUE(buyer_id, listing_id)`

### offers

-   id
-   listing_id
-   buyer_id
-   seller_id
-   amount
-   attempt_number
-   source (`buyer`, `seller_counter`)
-   parent_offer_id nullable
-   status
-   created_at
-   responded_at

Buyer attempts must have unique constraint equivalent to:
`UNIQUE(listing_id, buyer_id, attempt_number)` for buyer-originated
offers.

### deals

-   id
-   listing_id
-   seller_id
-   buyer_id
-   accepted_offer_id
-   final_price
-   status
-   contact_unlocked_at
-   created_at
-   completed_at
-   cancelled_at

Only one active deal per listing.

### cod_schedules

-   id
-   deal_id
-   proposed_by
-   scheduled_at
-   location_name
-   location_address
-   latitude
-   longitude
-   notes
-   status
-   created_at

### deal_confirmations

-   id
-   deal_id
-   user_id
-   confirmation_type
-   created_at

### conversations

-   id
-   listing_id
-   buyer_id
-   seller_id
-   deal_id nullable
-   created_at

### messages

-   id
-   conversation_id
-   sender_id
-   body
-   moderation_state
-   created_at

### favorites

-   user_id
-   listing_id
-   created_at

Unique: `UNIQUE(user_id, listing_id)`

### reports

-   id
-   reporter_id
-   target_user_id nullable
-   listing_id nullable
-   deal_id nullable
-   reason
-   description
-   status
-   created_at

### blocks

-   blocker_id
-   blocked_id
-   created_at

### reputation_events

-   id
-   user_id
-   deal_id
-   event_type
-   weight
-   metadata
-   created_at

### notifications

-   id
-   user_id
-   type
-   entity_type
-   entity_id
-   payload
-   read_at
-   created_at

### audit_logs

-   id
-   actor_id
-   action
-   entity_type
-   entity_id
-   metadata
-   created_at

## 4. Offer Engine

Offer submission MUST be executed server-side in a database transaction.

Pseudo-flow:

``` text
submitOffer(buyer, listing, amount):
  authenticate buyer
  lock listing
  validate listing.status == active
  validate buyer != seller
  validate listing.negotiable
  validate buyer is geographically eligible

  state = lock buyer_listing_state(buyer, listing)

  reject if state.status in [exhausted, kicked, blocked]
  reject if pending buyer offer already exists
  reject if offers_used >= 3

  attempt = offers_used + 1

  insert offer(
    amount,
    attempt_number = attempt,
    source = buyer,
    status = pending
  )

  update state.offers_used = attempt

  notify seller
```

Do not trust an `attempt_number` supplied by client.

## 5. Reject Offer

``` text
rejectOffer(seller, offer):
  authenticate seller
  lock offer + buyer_listing_state
  verify seller owns listing
  verify offer.status == pending

  offer.status = rejected

  if offer.attempt_number == 3:
      state.status = exhausted

  notify buyer
```

After `exhausted`, discovery queries must exclude the listing for that
buyer.

## 6. Counter-offer

Seller counter does not increment `offers_used`.

``` text
counterOffer(seller, buyerOffer, amount):
  validate ownership
  mark buyerOffer = countered
  create offer(
    source = seller_counter,
    amount = amount,
    parent_offer_id = buyerOffer.id
  )
  notify buyer
```

Buyer can: - Accept counter → create deal. - Reject counter → continue
if buyer offers remain.

## 7. Accept Offer & Create Deal

This is a critical atomic operation.

``` text
acceptOffer(actor, offer):
  begin transaction

  lock listing
  lock offer
  validate offer is actionable
  validate listing has no active deal

  mark offer accepted

  create deal(
    listing,
    buyer,
    seller,
    final_price = offer.amount,
    status = deal_created
  )

  listing.status = reserved
  buyer_listing_state.status = dealing

  expire/cancel competing pending offers

  commit

  unlock contact for deal parties
  notify both parties
```

A unique partial index or equivalent backend constraint should prevent
multiple active deals for one listing.

## 8. Kick Logic

Manual seller kick:

``` text
kickBuyer(seller, listing, buyer):
  verify ownership
  verify no completed/active deal requiring resolution
  state.status = kicked
  state.kicked_by = seller
  write audit log
```

Discovery/detail API must check buyer_listing_state. A kicked/exhausted
buyer must not regain access through direct URL.

Admin can inspect abusive kick patterns.

## 9. Geographic Eligibility

Never rely only on frontend filtering.

Backend checks: - Listing area/radius. - Buyer current/verified area. -
Distance if radius mode is active.

Conceptual PostGIS query:

``` sql
ST_DWithin(
  listings.location_point,
  buyer.location_point,
  radius_meters
)
```

Public responses should return: - district/regency. - approximate
distance bucket or rounded distance.

Do not return seller exact coordinates before appropriate authorization.

## 10. Contact Privacy

Contacts should not be embedded in public listing payloads.

Endpoint:

`GET /deals/:dealId/contact`

Authorization: - Authenticated. - User is deal buyer or seller. - Deal
state allows contact unlock.

Response can contain the counterpart's approved contact information.

Every access may be audit logged.

## 11. COD-only Enforcement

There is no payment table, wallet, checkout, payout, transfer, or
payment provider.

Application terminology: - `final_price` = agreed cash/COD price. -
`deal` ≠ paid transaction. - `completed` = both parties confirm physical
exchange.

Chat moderation can flag: - Bank account patterns. - Payment links. -
Requests to transfer before meeting.

Flagging should not blindly block normal numeric conversation; use
context/rules and provide moderation review paths.

## 12. Deal State Machine

Allowed states:

``` text
deal_created
  ↓
scheduling
  ↓
scheduled
  ↓
meeting
  ↓
completed
```

Alternative:

``` text
deal_created/scheduling/scheduled/meeting
  → cancelled
  → disputed/reported
```

State transitions must be validated server-side.

## 13. Completion

Completion requires confirmation from both parties.

``` text
confirmCompletion(user, deal):
  insert confirmation unique(deal_id, user_id)

  if seller_confirmed AND buyer_confirmed:
      deal.status = completed
      listing.status = sold
      listing.sold_at = now()
      generate reputation events
```

Idempotency is required.

## 14. Listing Visibility Query

Exclude: - removed. - sold. - hidden. - blocked relationships. - listing
owner where inappropriate. - buyer state `kicked`. - buyer state
`exhausted`. - outside geographic eligibility.

Reserved listings can either be hidden globally or shown as
`Sedang Deal`; MVP recommendation: hide them from discovery to reduce
dead-end interactions.

## 15. Realtime

Realtime subscriptions are useful for: - New offer. - Offer response. -
Counter-offer. - Deal creation. - Chat. - Schedule update. - Completion
state.

Realtime is convenience, not source of truth. Client must refetch
authoritative state after reconnect.

## 16. Notifications

Use event-driven notification creation.

Example domain events: - `offer.created` - `offer.rejected` -
`offer.accepted` - `offer.countered` - `buyer.exhausted` -
`deal.created` - `cod.schedule.proposed` - `cod.schedule.accepted` -
`deal.completed` - `deal.cancelled`

Channels: - In-app. - Web Push/PWA. - Optional SMS/WhatsApp notification
integration later.

## 17. Media

Upload flow: 1. Client requests signed upload. 2. Validate MIME/size. 3.
Compress/resize image. 4. Strip unnecessary EXIF metadata, especially
location metadata. 5. Generate thumbnail. 6. Store object path. 7.
Persist media row.

Do not expose original EXIF GPS.

## 18. Security

Required: - RLS/authorization on every user-owned table. - Server-side
offer/deal transitions. - Rate limits. - OTP abuse protection. - CSRF
strategy where applicable. - Secure cookies/session handling. - Input
validation. - HTML sanitization. - Storage MIME validation. - Signed
URLs where media is private. - Audit logs. - Database constraints for
business invariants.

Never rely on disabled UI buttons as authorization.

## 19. Example Authorization Rules

User can: - Read active geographically eligible listings. - Modify only
own listing. - Read own offers and offers received on own listing. -
Create buyer offer only for self. - Read deal only if participant. -
Read contact only if participant and unlocked. - Modify COD schedule
only if participant. - Create report as self.

Admin privileges should be separated from normal user roles.

## 20. Concurrency

Critical race conditions: - Seller accepts two buyers simultaneously. -
Buyer sends multiple requests quickly. - Offer #3 duplicated. - Listing
edited while deal is being accepted. - Both users confirm completion
repeatedly.

Mitigation: - DB transactions. - Row locks. - Unique constraints. -
Idempotency keys for mutation endpoints. - Partial unique index for
active deal. - Server-generated attempt counters.

## 21. Suggested API Surface

``` text
POST   /auth/otp
POST   /auth/verify

GET    /feed
GET    /search
GET    /listings/:id
POST   /listings
PATCH  /listings/:id
DELETE /listings/:id

POST   /listings/:id/offers
GET    /listings/:id/offers
POST   /offers/:id/accept
POST   /offers/:id/reject
POST   /offers/:id/counter

POST   /listings/:id/buyers/:buyerId/kick

GET    /deals/:id
GET    /deals/:id/contact
POST   /deals/:id/schedule
POST   /deals/:id/schedule/accept
POST   /deals/:id/confirm
POST   /deals/:id/cancel

GET    /conversations
POST   /conversations/:id/messages

POST   /favorites/:listingId
DELETE /favorites/:listingId

POST   /reports
POST   /users/:id/block
```

Exact routing can follow framework conventions.

## 22. PWA

Required: - Installable manifest. - App icons. - Service worker. -
Offline shell. - Cached static assets. - Graceful offline state. - Push
notifications where supported.

Do not allow offline mutation to falsely display an offer/deal as
successful. Queueing critical negotiation mutations is risky; require
confirmed server response.

## 23. Search

MVP: - PostgreSQL full-text/trigram search. - Category and geographic
filters.

Later: - Typo tolerance. - Search suggestions. - Ranking based on
distance + freshness + relevance.

Avoid adding external search infrastructure before scale requires it.

## 24. Observability

Track: - API latency. - Failed mutations. - Offer transaction
conflicts. - OTP failures. - Media failures. - Realtime disconnects. -
Database errors. - Moderation events.

Product events: - listing_viewed - offer_started - offer_submitted -
offer_rejected - offer_accepted - deal_created - cod_scheduled -
deal_completed - deal_cancelled

Do not put raw phone numbers or precise coordinates in analytics events.

## 25. Testing

### Unit

-   Offer attempt calculation.
-   State transition validation.
-   Geographic eligibility.
-   Reputation event rules.

### Integration

-   3 rejected offers → exhausted.
-   Counter does not consume buyer attempt.
-   Accepted offer creates exactly one deal.
-   Competing offer acceptance fails.
-   Kicked buyer cannot reopen listing.
-   Contact inaccessible before deal.
-   Contact accessible only to participants.
-   Dual confirmation completes transaction.

### E2E

-   Seller creates listing.
-   Buyer discovers locally.
-   Buyer negotiates.
-   Seller accepts.
-   Deal Room opens.
-   COD scheduled.
-   Both confirm.
-   Listing becomes sold.

### Security

-   IDOR.
-   RLS bypass.
-   Unauthorized offer mutation.
-   Direct URL access after kick.
-   Location leakage.
-   Contact leakage.
-   Upload abuse.
-   Rate-limit bypass.

## 26. Deployment

Recommended environments: - Local. - Preview/staging. - Production.

Required: - Separate secrets. - Database migrations. - Storage
policies. - Environment validation. - Error monitoring. - Automated CI
checks.

Never run destructive schema changes directly without migration and
backup strategy.

## 27. MVP Build Order

Phase 1: Auth → profile → areas → listing CRUD → media.

Phase 2: Local feed → search → filters → listing detail.

Phase 3: Offer engine → 3-attempt enforcement → seller actions →
kick/exhaust.

Phase 4: Deal engine → contact unlock → COD scheduling → completion.

Phase 5: Chat → notifications → reputation → report/block.

Phase 6: Admin → moderation → analytics → PWA hardening →
performance/security audit.

## 28. Non-negotiable Invariants

1.  Buyer cannot submit more than 3 buyer-originated offers per listing.
2.  Seller counter-offer does not consume buyer quota.
3.  Exhausted/kicked buyer cannot access that listing as an eligible
    buyer.
4.  One listing cannot have two active deals.
5.  Contacts are private before deal.
6.  Precise seller location is private.
7.  Deal price cannot be silently changed after acceptance.
8.  Completion requires both parties.
9.  CODkan never represents a deal as paid through the platform.
10. All critical business rules are enforced server-side/database-side,
    not only in UI.
