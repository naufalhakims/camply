# Codex Project Context — Camply

## 1. Project Overview

**Project name:** Camply  
**Type:** Full-stack adventure trip booking platform  
**Purpose:** Build a portfolio-quality web application inspired by a real-world travel/camp booking product. The project should demonstrate practical full-stack engineering skills relevant to a Full-Stack Developer Intern role.

Camply allows travelers to discover trips, view trip details, create bookings, complete a payment flow in a payment provider's test environment, and access trip-related social features after booking. Trip organizers manage their trips and participants, while administrators have access to operational tools.

This is a portfolio project. Do not claim real production usage, real customers, or business impact unless those claims become true and are supported by evidence.

## 2. Target Job Requirements

The project should provide demonstrable experience with:

- React and Tailwind CSS
- JavaScript/TypeScript (prefer TypeScript)
- Supabase Auth
- PostgreSQL and relational database design
- Supabase Row Level Security (RLS)
- Supabase Edge Functions
- Booking and traveler profile flows
- Payment integration and webhook handling
- Cloudinary for image uploads
- Clean, tested, documented code
- Mobile-first responsive UI
- Role-based access for travelers, organizers, and admins
- Optional in-trip social game inspired by the job post's “Blind Manifesto” concept

## 3. Proposed Technology Stack

Use this stack unless a technical constraint is identified and explained before changing it:

- **Frontend:** React + TypeScript
- **Build tool:** Vite
- **Styling:** Tailwind CSS
- **Backend platform:** Supabase
  - Supabase Auth
  - PostgreSQL
  - Row Level Security policies
  - Supabase Edge Functions
  - Database migrations
- **Payments:** Start by investigating Stripe test mode and account availability in Indonesia. If it cannot be used, evaluate Airwallex sandbox or another suitable provider. Keep the provider integration isolated so it can be replaced.
- **Image management:** Cloudinary
- **Testing:** Vitest + React Testing Library for frontend logic; use appropriate tests for database policies, Edge Functions, and payment/webhook behavior. Choose tools compatible with the project setup and explain new dependencies.
- **Version control:** Git and GitHub
- **Documentation:** README, environment variable example, database schema/ERD, setup steps, and test instructions.

Do not add a separate backend framework by default. Supabase Edge Functions should handle server-side operations that need trusted credentials or secure business logic.

Before installing packages or changing configuration, inspect the existing repository and versions. Do not overwrite existing work or assume the repository is empty.

## 4. Main User Roles

### Traveler
- Register, sign in, and sign out.
- View and edit their own profile.
- Browse and filter trips.
- View trip details, dates, prices, itinerary, organizer, and remaining capacity.
- Create a booking.
- View only their own bookings and payment status.
- Access trip participant/social features only when eligible under the booking rules.

### Trip Organizer
- Create, update, publish, and manage trips they own.
- Set trip dates, price, capacity, itinerary, and images.
- View participants and booking status for their own trips.
- Access operational actions only for trips they are authorized to manage.

### Admin
- Access administrative operations, subject to a secure server/database authorization design.
- Review trips, bookings, payment status, and support issues.
- Admin privileges must not be granted based only on a client-side role value or editable profile field.

Keep the first version focused. Do not build a large enterprise admin system before the booking and security foundations work.

## 5. Core Features and Priorities

### P0 — Foundation and data security
1. Set up the React/TypeScript/Tailwind project.
2. Configure Supabase and environment variables.
3. Create database migrations and relational schema.
4. Implement authentication and profile handling.
5. Define roles and ownership rules.
6. Enable RLS on every table exposed to the client.
7. Test that one traveler cannot read or modify another traveler's private data.
8. Test that an organizer cannot manage trips belonging to another organizer.

### P1 — Trip discovery and booking
1. Trip listing and trip detail pages.
2. Search/filter by practical fields such as destination, dates, and price.
3. Booking creation with server-side validation.
4. Prevent overbooking and race conditions when capacity is limited.
5. Booking history and booking detail pages.
6. Clear booking states, such as pending payment, confirmed, cancelled, and expired.

### P2 — Payment workflow
1. Select and document a payment provider after checking practical sandbox availability.
2. Create payment sessions/intents through a trusted server-side function.
3. Never trust a price, user ID, booking ownership, or payment status supplied by the browser.
4. Verify webhook authenticity using the provider's official method.
5. Make webhook processing idempotent so duplicate events do not duplicate side effects.
6. Update booking/payment state only after a verified provider event or other trusted server-side verification.
7. Handle pending, successful, failed, cancelled, and expired payment outcomes.
8. Provide a safe local/test workflow and document any provider limitations.

**Security requirement:** Never expose service-role keys, payment secret keys, webhook signing secrets, or other privileged credentials in frontend code, Git, logs, or public documentation.

### P3 — Organizer operations and Cloudinary
1. Organizer dashboard for owned trips.
2. Trip creation/editing and participant management.
3. Booking/payment overview with appropriate access controls.
4. Cloudinary image upload for trip covers and optionally profile images.
5. Keep Cloudinary credentials secure. Use signed uploads or another secure upload approach when required; do not expose privileged secrets in the client.

### P4 — In-trip social game
Implement a small, original social game inspired by the broad idea of an anonymous group statement/prompt game. Do not copy proprietary branding, text, or assets from the employer.

Possible MVP:
- A game room is associated with an eligible trip.
- Only eligible participants can join.
- Participants submit responses under clearly defined rules.
- Other participants see only information permitted by the game rules.
- Enforce membership and visibility through server-side logic and RLS.
- Add clear handling for moderation, inappropriate submissions, and game completion.

This feature is lower priority than secure booking and payment.

### P5 — Quality and polish
- Responsive, mobile-first UI.
- Loading, empty, error, and success states.
- Form validation and helpful error messages.
- Unit/integration tests for critical business logic.
- Accessibility basics and semantic HTML.
- README, ERD, architecture notes, setup instructions, and screenshots/demo.
- GitHub Actions CI may be added once local tests are reliable.

## 6. Initial Database Model (Provisional)

Review and improve this model before implementing migrations. Explain important schema decisions.

Potential tables:

- `profiles`
  - `id` references the authenticated user
  - display name and safe profile fields
  - timestamps
- `trips`
  - organizer/owner ID
  - title, slug, description, destination
  - start/end dates
  - price and currency
  - capacity
  - status (e.g. draft, published, cancelled)
  - cover image metadata/URL
  - timestamps
- `bookings`
  - traveler ID
  - trip ID
  - quantity/number of seats if supported
  - total amount and currency snapshot
  - status
  - timestamps
- `payments`
  - booking ID
  - provider
  - provider reference/ID
  - amount and currency
  - payment status
  - safe metadata only
  - timestamps
- `trip_participants`
  - trip ID
  - traveler ID and/or booking reference
  - eligibility/status
  - timestamps
- Optional later:
  - `trip_game_rooms`
  - `trip_game_prompts`
  - `trip_game_responses`
  - `support_requests`
  - audit/event tables where justified

Important data rules:
- Use foreign keys, appropriate uniqueness constraints, check constraints, and indexes.
- Use numeric/decimal-safe storage for money; never use floating-point arithmetic for financial amounts.
- Store a currency code with every monetary amount.
- Define how price snapshots work so changing a trip's price does not alter existing bookings.
- Decide whether one booking can contain multiple seats and whether duplicate active bookings are allowed.
- Define booking/payment state transitions explicitly.
- Do not assume a client-side check prevents overbooking. Use a database transaction, locking/atomic operation, or another robust server-side strategy.
- Avoid collecting sensitive personal data that is unnecessary for the portfolio project.

## 7. RLS and Authorization Rules

Security must be designed, implemented, and tested—not merely described in the README.

Expected policy intentions (refine these for the final schema):

- A traveler can read/update only their own permitted profile fields.
- A traveler can read only their own private bookings and payment details.
- Public/anonymous users can read only published trip fields intended to be public.
- An organizer can create/manage only trips owned by them.
- An organizer can view bookings/participants only for trips they are authorized to manage, and only fields needed for operations.
- A traveler cannot make themselves an organizer/admin by editing their profile.
- Users cannot mark their own booking as paid or change trusted payment status.
- Payment records and privileged operations are written only through trusted server-side flows.
- Game-room membership and response visibility follow explicit authorization rules.

Do not rely on hiding UI controls as a security measure. Test policies using different user identities and unauthorized operations.

## 8. Engineering Standards

- Prefer simple, readable, maintainable code over unnecessary abstraction.
- Use TypeScript types rather than `any` where practical.
- Separate UI components, feature logic, data access, and server-side operations.
- Keep secrets on the server/Edge Function side.
- Validate all untrusted input on the server, even when it is also validated in the UI.
- Handle errors explicitly; do not silently swallow errors.
- Avoid duplicate business logic across components.
- Use clear naming and small functions.
- Do not add dependencies without a reason.
- Never commit `.env`, credentials, build output, dependency folders, or other generated files.
- Maintain `.gitignore` appropriately.
- Do not claim tests pass unless they have actually been run and the output supports that claim.
- Do not invent metrics, users, deployment status, or production impact.

## 9. Environment Variables and Secrets

Create `.env.example` containing placeholder names only, with no real values. Typical variables may include:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (or the current public/publishable key recommended by the Supabase setup)
- Server/Edge Function secrets configured through the appropriate secure mechanism:
  - payment provider secret key
  - webhook signing secret
  - Cloudinary API secret, if required by the chosen upload flow

Only public client configuration belongs in frontend environment variables. Remember that Vite variables prefixed with `VITE_` are exposed to the browser. Never place privileged keys under a `VITE_` variable.

Confirm current provider conventions from official documentation during implementation instead of relying on assumptions.

## 10. Definition of Done

A feature is not complete merely because its page renders.

For each meaningful feature:
1. Implement the happy path.
2. Handle loading, empty, validation, and failure states.
3. Verify authorization and RLS behavior.
4. Add tests for important business rules and negative cases.
5. Run relevant checks and report the actual result.
6. Update documentation if setup or behavior changed.

Before considering the project portfolio-ready, verify:
- New users can register/sign in/sign out.
- Users cannot access another user's private profile/booking/payment data.
- Organizers cannot modify another organizer's trips.
- Booking capacity cannot be exceeded through concurrent or manipulated requests.
- Browser requests cannot directly forge a paid status.
- Webhook signatures are verified and duplicate events are safe.
- Secrets are not committed or exposed in frontend bundles.
- Core pages work on mobile and desktop.
- A new developer can follow the README to run the project and tests.

## 11. How Codex Should Work With Me

The developer is a final-year Information Technology student building this project to learn and demonstrate full-stack skills. Give practical, step-by-step guidance and explain unfamiliar concepts without assuming prior Supabase or payment-integration experience.

When working in the repository:

1. **Inspect first.** Review the existing files, package scripts, dependencies, Git status, and current implementation before proposing changes.
2. **Work in small milestones.** Do not generate the entire application in one giant response or overwrite multiple unrelated areas at once.
3. **Explain the reason.** Before or alongside meaningful changes, explain what the change accomplishes and why it is needed.
4. **Give exact commands.** Prefer commands that work in Windows PowerShell when shell commands are needed.
5. **Show complete files when useful.** If a file is new or substantially changed, provide its path and complete relevant content, or edit the file directly when repository tools are available.
6. **Verify each milestone.** Run relevant lint, type-check, tests, migrations, or other available checks. Clearly distinguish checks that were run from checks that could not be run.
7. **Do not skip security.** For RLS, payment, webhook, authentication, or role changes, explain the threat being addressed and how to test it.
8. **Avoid assumptions.** If a provider's availability or API behavior may have changed, consult official documentation. If a decision blocks progress, present the best practical option and its trade-offs.
9. **Keep a progress log.** At the end of each milestone, summarize:
   - what was implemented
   - files changed
   - commands/tests run and their actual results
   - known limitations or unresolved issues
   - the next single recommended step
10. **Do not claim completion prematurely.** A working UI alone does not mean the feature is secure or fully tested.

The user prefers direct, honest feedback over uncritical agreement. Correct misunderstandings politely and point out weak design decisions when necessary.

## 12. Suggested First Milestone

Do not start by building every UI page.

First:
1. Inspect the repository and report what exists.
2. Confirm or initialize the React + TypeScript + Vite + Tailwind setup only as needed.
3. Propose a concise architecture and initial ERD.
4. Design the first Supabase migrations and RLS policies for `profiles` and `trips`.
5. Implement and test authentication, public published-trip reads, and organizer ownership rules.
6. Only after the security foundation is verified, continue to bookings.

At the start of work, tell me which step you are on and what you will verify before moving forward.
