# Camply

A full-stack adventure trip booking platform. Travelers discover trips, book them, and complete a
mock payment; signed-in users can create and publish trips they own.

Portfolio project. No real customers, payments, or production traffic.

## Stack

React 19 + TypeScript, Vite 8, Tailwind CSS 4, Supabase (Auth, PostgreSQL, RLS, Edge Functions).
Real payment-provider integration and Cloudinary uploads are planned; the current mock payment does
not collect or transfer money.

## Setup

Requires Node 22+.

```powershell
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Isi `.env` dengan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` dari project Supabase. Perintah
di atas tidak menimpa `.env` yang sudah ada.

`.env` is gitignored. Only `VITE_`-prefixed values reach the browser — never put a secret or
service-role key behind that prefix.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (`tsc -b`) then production build |
| `npm run lint` | ESLint |
| `npm run preview` | Serve the production build locally |
| `npm run test:db` | SQL RLS tests; requires Supabase CLI and Docker |

## Status

Implemented: Supabase email/password sign-up with traveler/organizer selection, sign-in and sign-out;
traveler profile editing; explicit traveler/organizer/admin roles with database-enforced access; organizer trip creation, drafts, publishing
and participant booking visibility; an admin operations summary; published trip discovery with destination,
start-date and maximum-price filters; trip details; and booking history.
Reservations are created through a database function that snapshots price and serializes capacity checks.
Each booking can contain multiple seats, holds seats for 15 minutes, and starts as `pending_payment`.

Database migrations for `profiles`, `trips`, `bookings`, and `payments` enforce row ownership with RLS
and restrict client writes with Postgres grants and trusted database functions. The 51-assertion SQL
authorization suite is in `supabase/tests/rls.test.sql`.

The checkout currently uses a clearly labeled mock payment. It records a demo receipt and confirms the
booking atomically, but does not collect or transfer money. Replace this flow with a provider-verified
server-side integration before production. Apply pending migrations with `npx supabase db push --linked`
and run the linked SQL suite with `npx supabase test db --linked`. If Docker is unavailable,
`npx supabase db query --linked --file supabase/tests/rls.test.sql` runs the rollback-safe suite
through the Supabase Management API.
