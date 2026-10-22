# Database

Two tables so far: `profiles` and `trips`. Migrations live in `supabase/migrations/`
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
    role          text  NOT NULL DEFAULT 'traveler'  CHECK (traveler | admin)
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
```

## Decisions and why

**No `organizer` role.** `trips.organizer_id` already expresses "organizer". Making it a
role would add a role-assignment problem and a second source of truth for the same fact.
Any authenticated user who creates a trip owns it. `role` is therefore only
`traveler | admin`.

**`role` is protected by column grants, not RLS.** RLS decides *rows*; it cannot express
"this column is not yours". The guard is:

```sql
revoke all on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, bio) on public.profiles to authenticated;
```

Supabase grants `ALL` on new `public` tables to `anon`/`authenticated` by default, so the
explicit `revoke` is what makes the narrower `grant` meaningful. Without it,
`UPDATE profiles SET role = 'admin'` on your own row would succeed.

**`organizer_id` is not an updatable column.** A client cannot reassign trip ownership.
Ownership transfer, if ever needed, must be a deliberate server-side operation.

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

**Booking writes use narrow database functions.** Clients have `SELECT` only on `bookings`; direct
inserts or status/price edits are denied. `reserve_trip_seats()` takes only trip ID and quantity,
derives traveler identity from `auth.uid()`, and reads price/capacity from the database. Travelers
can release their own pending hold through `cancel_pending_booking()`. Confirmed-booking cancellation
and payment status transitions wait for the payment/refund milestone.

## Where the authorization lives

| Rule | Enforced by |
| --- | --- |
| Anyone reads published trips | RLS `SELECT` policy on `trips` |
| Owner reads own drafts | second (permissive, OR'd) `SELECT` policy |
| Only owner edits/deletes own trip | RLS `UPDATE`/`DELETE` policies |
| Can't create a trip owned by another | `WITH CHECK` on insert |
| Can't reassign ownership | `organizer_id` absent from `UPDATE` grant |
| Can't self-promote to admin | `role` absent from `UPDATE` grant |
| Can't read `role` at all | `role` absent from `SELECT` grant |
| Every user has a profile | `on_auth_user_created` trigger (`SECURITY DEFINER`) |
| Travelers read only their bookings | RLS `SELECT` policy on `bookings` |
| Booking creation and price snapshots | `reserve_trip_seats()` (`SECURITY DEFINER`) |
| Booking capacity | trip row lock + current reservation count in that function |
| Booking cancel | `cancel_pending_booking()` checks `auth.uid()` and pending state |
| Public remaining seats | `get_trip_seats_remaining()` (read-only display hint) |

Admin powers are **not yet implemented**. `role = 'admin'` exists in the constraint, but
nothing grants admin capabilities — that needs its own deliberate policy pass.

## Testing

`supabase/tests/rls.test.sql` runs against the real policies and real grants, inside one
transaction that rolls back. It covers profile/trip isolation, booking privacy, price snapshots,
booking state, duplicate active reservations, capacity limits, and cancellation.

```powershell
npm run test:db      # npx supabase test db
```

Two traps this suite guards against, both of which produce false passes:

1. **`auth.uid()` reads `request.jwt.claim.sub`**, not the `request.jwt.claims` JSON blob.
   Set the wrong one and `auth.uid()` is `NULL`, so every "cannot access" assertion passes
   because *nothing* matches. The suite asserts impersonation works before relying on it.
2. **`set_config('role', ...)` is rejected inside a `SECURITY DEFINER` function.**
   Identity switching uses inline `set local role` + `reset role` instead.
