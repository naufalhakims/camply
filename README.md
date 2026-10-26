# Camply

A full-stack adventure trip booking platform. Travelers discover trips, book them, and complete a
mock payment; signed-in users can create and publish trips they own.

Portfolio project. No real customers, payments, or production traffic.

## Stack

React 19 + TypeScript, Vite 8, Tailwind CSS 4, Supabase (Auth, PostgreSQL, RLS, Edge Functions), and
Cloudinary signed uploads for organizer trip covers. The current mock payment does not collect or
transfer money.

## Application routes

The React app uses client-side routes, so each screen has a shareable URL:

| Path | Screen | Access |
| --- | --- | --- |
| `/` | Trip discovery and landing page | Public |
| `/login` | Sign-in and account creation | Public |
| `/trips/:slug` | Trip details and booking | Public; booking is for signed-in travelers only |
| `/bookings` | Traveler booking history | Traveler |
| `/organizer` | Trip, participant, and game-room management | Organizer or admin |
| `/organizer/bookings` | Full participant booking list | Organizer or admin |
| `/profile` | Profile settings | Signed-in user |
| `/admin` | Operational overview | Admin |
| `/trip-game/:roomId` | Trip story room | Confirmed traveler participant; organizer/admin can moderate |

These are browser page routes, not a separate application server. The frontend uses the Supabase
client API, database functions, and the `sign-cloudinary-upload` Edge Function for backend work.
Deployments must serve `index.html` as a fallback for these client-side paths.

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

To enable organizer cover uploads, add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET` under Supabase Dashboard → Edge Functions → Secrets. You can also set them
from PowerShell (replace the placeholders locally; do not send the secret values in chat or commit
them):

```powershell
npx supabase secrets set `
  CLOUDINARY_CLOUD_NAME="<cloud-name>" `
  CLOUDINARY_API_KEY="<api-key>" `
  CLOUDINARY_API_SECRET="<api-secret>" `
  --project-ref <project-ref>
npx supabase functions deploy sign-cloudinary-upload --project-ref <project-ref>
```

The signing function checks the caller's Supabase session and organizer/admin role before returning
a short-lived signed upload request. The Cloudinary API secret stays in Supabase; it is never
included in the browser environment. Cover uploads accept JPG, PNG, and WebP; the form limits files
to 8 MB. Verify with an organizer upload; a traveler must receive `403` from the signing function.

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
and participant booking visibility with Cloudinary cover uploads; an admin operations summary; published trip discovery with destination,
start-date and maximum-price filters; trip details; booking history; and an anonymous prompt room for
confirmed trip participants with organizer moderation and reporting.
Trips disappear from public discovery when their start time passes and remain in the organizer archive.
Only traveler accounts can create/cancel bookings, make the mock payment, or submit/report game responses.
Organizers can still create game rooms and moderate responses for trips they own. Reservations are created
through a database function that snapshots price and serializes capacity checks.
Each booking can contain multiple seats, holds seats for 15 minutes, and starts as `pending_payment`.

The landing page includes clickable trip categories (nature, beach, city, culture, adventure, and other),
summer travel photography credited to Unsplash photographers, and category filters. Organizers choose a
category when creating or editing a trip. Apply `20261027000011_trip_categories.sql` before using this
feature; existing trips default to `other` until organizers reclassify them.

The interface supports Indonesian and English. Visitors can switch languages in the navigation bar;
the selection is saved in the browser. User-written trip titles, descriptions, prompts, and responses
remain in the language their authors entered.

Database migrations for `profiles`, `trips`, `bookings`, and `payments` enforce row ownership with RLS
and restrict client writes with Postgres grants and trusted database functions. The 51-assertion SQL
authorization suite is in `supabase/tests/rls.test.sql`.

The trip game schema and 22-assertion authorization suite are in
`supabase/migrations/20261022000008_trip_game.sql` and `supabase/tests/trip_game.test.sql`.
Role restrictions for booking, mock payment, and game participation are in
`supabase/migrations/20261022000009_traveler_only_actions.sql`, with regression cases in
`supabase/tests/traveler_only_actions.test.sql`.

The checkout currently uses a clearly labeled mock payment. It records a demo receipt and confirms the
booking atomically, but does not collect or transfer money. Replace this flow with a provider-verified
server-side integration before production. Apply pending migrations with `npx supabase db push --linked`
and run the linked SQL suite with `npx supabase test db --linked`. If Docker is unavailable,
`npx supabase db query --linked --file supabase/tests/rls.test.sql` runs the rollback-safe suite
through the Supabase Management API.
