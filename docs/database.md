# Database

The schema includes `profiles`, `trips`, `bookings`, and demo-only `payments`. Migrations live in `supabase/migrations/`
and are the source of truth — never edit the database by hand.

## ERD

```
auth.users (Supabase Auth — credentials live here, not duplicated)
    │
    │ 1:1  ON DELETE CASCADE
    ▼
profiles
    id            uuid  PK → auth.users(id)
    display_name  text  NOT NULL, 1..80
    avatar_url    text
    bio           text  ≤ 500
    role          text  NOT NULL DEFAULT 'traveler'  CHECK (traveler | organizer | admin)
    created_at    timestamptz
    updated_at    timestamptz
    │
    │ 1:N  ON DELETE CASCADE
    ▼
trips
    id                    uuid  PK DEFAULT gen_random_uuid()
    organizer_id          uuid  NOT NULL → profiles(id)
    slug                  text  NOT NULL UNIQUE  CHECK (kebab-case)
    title                 text  NOT NULL, 3..140
    description           text  ≤ 5000
    destination           text  NOT NULL, 2..120
    category             text  NOT NULL DEFAULT 'other'  CHECK (nature | beach | city | culture | adventure | other)
    starts_at             timestamptz  NOT NULL
    ends_at               timestamptz  NOT NULL
    price                 numeric(12,2)  NOT NULL  CHECK (>= 0)
    currency              char(3)  NOT NULL DEFAULT 'IDR'  CHECK (upper-case)
    capacity              integer  NOT NULL  CHECK (> 0)
    status                text  NOT NULL DEFAULT 'draft'  CHECK (draft | published | cancelled)
    cover_image_url       text
    cover_image_public_id text
    created_at            timestamptz
    updated_at            timestamptz

    CHECK (ends_at > starts_at)

INDEX (status, starts_at)   -- public listing
INDEX (category, starts_at) WHERE status = 'published' -- category discovery
INDEX (organizer_id)        -- "my trips" dashboard

profiles
    │ 1:N (traveler)                       trips
    └────────── bookings ──────────────────┘
                   id            uuid PK
                   traveler_id   uuid → profiles(id)
                   trip_id       uuid → trips(id)
                   quantity      integer > 0
                   total_amount  numeric(14,2), price snapshot
                   currency      char(3), price snapshot
                   status        pending_payment | confirmed | cancelled | expired
                   expires_at    timestamptz, temporary hold deadline
                   created_at / updated_at

INDEX (traveler_id, created_at DESC)  -- booking history
INDEX (trip_id, status, expires_at)   -- capacity calculation
UNIQUE (traveler_id, trip_id) WHERE status IN (pending_payment, confirmed)
                                      -- one active booking per traveler/trip

bookings 1:0..1 payments
    booking_id         uuid UNIQUE → bookings(id)
    provider           mock
    provider_reference deterministic mock reference
    amount / currency  copied from the booking price snapshot
    status             succeeded
    created_at

trips 1:0..1 trip_game_rooms
    prompt       text  organizer-defined, 10..500
    status       open | completed
    │
    └── 1:N trip_game_responses
            author_id          private, not readable by client roles
            body               text  1..500
            moderation_status  visible | hidden
            UNIQUE (room_id, author_id)  -- one response per traveler
            │
            └── 1:N trip_game_reports
                    reporter_id  private, not readable by client roles
                    reason       text  5..400
                    status       open | resolved | dismissed
```

## Decisions and why

**Roles are explicit and protected.** At signup, a user may choose `traveler` or `organizer`.
The database trigger accepts only the exact `organizer` value; missing, invalid, or `admin`
metadata becomes `traveler`. After profile creation, the browser cannot change `profiles.role`.
The browser receives the current user's role through `current_app_role()`. Admin assignment remains
restricted to a trusted Supabase project owner. Organizers can manage their own trips and view their
participants/bookings. Admins can review all trips, bookings, and payment outcomes.

**Public trip discovery includes only upcoming published trips.** Once `starts_at` passes, public
reads and booking attempts stop. The trip remains in its organizer's dashboard under the archive;
the database record and booking history are retained.

**`role` is protected by column grants, not RLS.** RLS decides *rows*; it cannot express
"this column is not yours". The guard is:

```sql
revoke all on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, bio) on public.profiles to authenticated;
```

Supabase grants `ALL` on new `public` tables to `anon`/`authenticated` by default, so the
explicit `revoke` is what makes the narrower `grant` meaningful. Without it,
`UPDATE profiles SET role = 'admin'` on your own row would succeed. The role getter only returns
the caller's own role; RLS reads the protected value inside a pinned `SECURITY DEFINER` function.

**`organizer_id` is not an updatable column.** A client cannot reassign trip ownership.
Ownership transfer, if ever needed, must be a deliberate server-side operation.

**Trip creation requires the organizer role.** The browser sends the current user's ID when creating
a trip; the insert policy checks both `role IN ('organizer','admin')` and `organizer_id = auth.uid()`.
RLS rejects traveler inserts and forged owners. The column has no `UPDATE` grant, so ownership cannot
be reassigned.

**Ownership changes are blocked on both sides.** The update policy carries `WITH CHECK`
in addition to `USING`, so a row cannot be edited *into* someone else's ownership. The
insert policy's `WITH CHECK (organizer_id = auth.uid())` is what stops a user creating a
trip owned by somebody else.

**Money is `numeric(12,2)` plus a currency code.** Never float. Never a bare number.

**`profiles` holds nothing sensitive.** No email, phone, address, or date of birth. Auth
owns credentials; duplicating them here would create a second copy to secure.

**`trip_participants` is deliberately not built yet.** It is derivable from confirmed
bookings, and a second source of truth for "who is on this trip" invites divergence. Add
it only when the social game needs per-trip state that bookings cannot carry.

**Bookings keep price snapshots.** One booking can hold multiple seats. The database copies
`trips.price` and `trips.currency` when the reservation is created, so later price edits never
change an existing booking. A traveler may have one active booking for a trip; after cancelling
or expiring it, they may create another. Historical rows remain.

**Capacity is reserved atomically.** `reserve_trip_seats()` locks the trip row, expires stale holds,
counts confirmed seats and unexpired pending holds, then inserts the booking. Other requests for the
same trip wait on the same row lock, so two simultaneous requests cannot both take the final seats.
Pending holds last 15 minutes. `get_trip_seats_remaining()` is only a display hint; the reservation
function always checks capacity again. Organizers cannot lower capacity below currently held or
confirmed seats.

**Trip game access comes from confirmed bookings.** One room can be created for a published trip by
its organizer (or an admin). Only a traveler can participate, report, and read participant-visible
responses, and only while a confirmed booking exists for the trip. An organizer can read and moderate
the room for their own trip but cannot submit a response or report. Each traveler can submit one
500-character response. Room completion
is one-way and stops new responses while leaving visible responses readable.

**Responses and reports remain anonymous to client queries.** Column-level `SELECT` grants exclude
`trip_game_responses.author_id` and `trip_game_reports.reporter_id`, including for trip organizers.
Security-definer functions use those identifiers only to enforce one response per member, prevent
self-reporting, and limit access. Organizers of the trip and admins can hide or restore a response
and resolve/dismiss reports; other participants see only visible responses and cannot see who filed
a report.

**Booking writes use narrow database functions.** Clients have `SELECT` only on `bookings`; direct
inserts or status/price edits are denied. `reserve_trip_seats()` takes only trip ID and quantity,
derives traveler identity from `auth.uid()`, and reads price/capacity from the database. Travelers
can release their own pending hold through `cancel_pending_booking()`. The current
`complete_mock_payment()` function confirms an unexpired booking owned by the caller and writes a
single mock receipt atomically. The reservation, cancellation, and payment functions reject any
caller whose database role is not `traveler`. Repeating a successful traveler payment returns the
existing receipt. This is a demo
only: it does not verify or collect a real payment and must be replaced with provider verification.

## Where the authorization lives

| Rule | Enforced by |
| --- | --- |
| Anyone reads published trips | RLS `SELECT` policy on `trips` |
| Owner reads own drafts | second (permissive, OR'd) `SELECT` policy |
| Only owner edits/deletes own trip | RLS `UPDATE`/`DELETE` policies |
| Only organizers/admins create trips | role helper + `INSERT` ownership RLS policy |
| Organizers manage only owned trips | role helper + ownership RLS policies |
| Organizers view owned trip bookings/payments | related trip ownership policies |
| Admins review all trips/bookings/payments | admin-only `SELECT`/trip management policies |
| Can't create a trip owned by another | `WITH CHECK` on insert |
| Can't reassign ownership | `organizer_id` absent from `UPDATE` grant |
| Can't self-promote to admin | `role` absent from `UPDATE` grant |
| Can't read `role` at all | `role` absent from `SELECT` grant |
| Every user has a profile | `on_auth_user_created` trigger (`SECURITY DEFINER`) |
| Travelers read only their bookings | RLS `SELECT` policy on `bookings` |
| Booking creation and price snapshots | `reserve_trip_seats()` (`SECURITY DEFINER`) |
| Only travelers create/cancel/pay for bookings | role check in reservation, cancellation, and mock-payment RPCs |
| Booking capacity | trip row lock + current reservation count in that function |
| Booking cancel | `cancel_pending_booking()` checks `auth.uid()` and pending state |
| Mock checkout | `complete_mock_payment()` checks owner and expiry, then writes a mock receipt atomically |
| Only travelers participate in trip game | `trip_game_is_member()` and `submit_trip_game_response()` role checks |
| Payment receipt privacy | RLS allows only the booking's traveler to read it; clients cannot insert or update receipts |
| Public remaining seats | `get_trip_seats_remaining()` (read-only display hint) |

Only Admin assignment is restricted to the project owner. Organizer selection is part of signup;
it is written by the database trigger and cannot be edited later. The owner can grant Admin in
Supabase SQL Editor, for example:

```sql
update public.profiles
set role = 'organizer'
where id = (select id from auth.users where email = 'account@example.com');
```

Replace the email with the intended account. Never add a browser control that edits
`profiles.role` after signup or place a service-role key in the frontend.

## Testing

`supabase/tests/rls.test.sql` runs against the real policies and real grants, inside one
transaction that rolls back. It covers default roles, traveler/organizer/admin boundaries, profile/trip
isolation, booking/payment privacy, price snapshots, trip creation and publishing, mock payment ownership
and idempotency, booking state, duplicate active reservations, capacity limits, and cancellation.

```powershell
npm run test:db      # npx supabase test db
npx supabase test db --linked
```

The linked pgTAP runner uses Docker. If Docker is unavailable, the same SQL file can be submitted
through the Supabase Management API without the container runner:

```powershell
npx supabase db query --linked --file supabase/tests/rls.test.sql
```

The suite ends with `finish(true)`, so this fallback returns an error if an assertion fails; all
fixtures remain inside the test transaction and are rolled back.

`supabase/tests/trip_game.test.sql` verifies confirmed-booking eligibility, organizer ownership,
author and reporter privacy, one response per participant, self-report and duplicate-report blocks,
moderation, report review, and room completion. Run it against the linked project without Docker:

```powershell
npx supabase db query --linked --file supabase/tests/trip_game.test.sql
```

Two traps this suite guards against, both of which produce false passes:

1. **`auth.uid()` reads `request.jwt.claim.sub`**, not the `request.jwt.claims` JSON blob.
   Set the wrong one and `auth.uid()` is `NULL`, so every "cannot access" assertion passes
   because *nothing* matches. The suite asserts impersonation works before relying on it.
2. **`set_config('role', ...)` is rejected inside a `SECURITY DEFINER` function.**
   Identity switching uses inline `set local role` + `reset role` instead.
