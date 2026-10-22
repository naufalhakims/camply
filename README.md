# Camply

A full-stack adventure trip booking platform. Travelers discover trips, book them, and pay in a
provider test environment; organizers manage their own trips; admins have operational tools.

Portfolio project. No real customers, payments, or production traffic.

## Stack

React 19 + TypeScript, Vite 8, Tailwind CSS 4, Supabase (Auth, PostgreSQL, RLS, Edge Functions).
Stripe test mode and Cloudinary are planned; provider and account availability still need to be checked
before implementing payments or uploads.

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

Implemented: Supabase email/password sign-up, sign-in and sign-out; traveler profile editing; published
trip discovery with destination, start-date and maximum-price filters; trip details; and booking history.
Reservations are created through a database function that snapshots price and serializes capacity checks.
Each booking can contain multiple seats, holds seats for 15 minutes, and starts as `pending_payment`.

Database migrations for `profiles`, `trips`, and `bookings` enforce row ownership with RLS and restrict
client writes with Postgres grants and trusted database functions. The 30-assertion SQL authorization suite is in
`supabase/tests/rls.test.sql`.

Payment is still in progress, so `pending_payment` bookings cannot be paid or confirmed yet. Do not
treat the UI or written SQL test suite as proof that remote RLS is applied; apply migrations to the
Supabase project and run the database tests in an environment with Docker.
