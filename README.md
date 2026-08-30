# Srinivasam

A calm, mobile-first rent & water-bill tracker for a single 6-unit property
("Srinivasam"), owned and run by one person. No conventional login — just a
4-digit PIN.

## What's built (Priority 1 + 2 from the spec)

- **PIN auth** — single hashed PIN (bcrypt), signed session cookie (30-day,
  httpOnly), rate-limited with a 5-minute lockout after 5 wrong attempts. No
  Supabase Auth — every table has RLS enabled with zero policies, so only
  the service-role key (used server-side only) can touch the database.
- **Home dashboard** — month-by-month rent position: collected/outstanding,
  a settled-count bar, and a row per unit with its status (Paid / Pending /
  Partially Paid / Overdue / Waived), tap-through to that month's ledger.
- **Tenants** — the 6 fixed units, current tenant + rent, add/end tenancy,
  tenant profile with lease/deposit details, previous-tenant history per
  unit, payment history, and a documents section (rental agreement, ID
  proof, deposit receipt, other) stored in a private bucket via signed URLs.
- **Monthly ledger** — rent + water + adjustments broken out, payment list,
  add/edit/delete a payment, add a charge/credit/waiver adjustment.
- **Payment recording + Claude OCR** — upload a screenshot, Claude extracts
  amount/date/reference/payer/method, owner reviews and edits every field,
  nothing touches the ledger until "Confirm Payment." OCR failure never
  blocks the flow — manual entry always works.
- **Water bill** — one bill per property per month, split equally across
  units occupied that month (historical occupancy, not current), stored
  immutably unless the owner re-enters that month's bill.
- **Reports** — monthly summary (expected/collected/outstanding/collection
  rate + status counts), a financial-year (Apr–Mar) summary, and 5 CSV
  exports (monthly collection, tenant ledger, FY summary, outstanding rent,
  water allocation).
- **WhatsApp-ready schema** — `payments.source`/`sender_phone` and the
  `unmatched` status mean manual uploads and a future WhatsApp webhook share
  one table. The "Needs Review" and "Unmatched Payments" screens under
  **More** already work off this — they'll just stay empty until a webhook
  exists.

## Deliberately deferred / simplified

- **No WhatsApp webhook.** The schema and the two review screens are ready
  for it, but there's no Meta Cloud API integration — that needs a Meta
  Business/WhatsApp account this project doesn't have credentials for.
- **Tap arrows, not swipe**, for month navigation — same end result, less
  client JS.
- **PWA icon is a placeholder monogram SVG**, not a designed app icon —
  swap `public/icon.svg` before shipping.
- **No first-run onboarding wizard.** PIN setup → Home → Tenants tab to add
  each tenant covers the same ground in fewer screens.
- Audit trail covers **payment edits and deletes** (the two the spec calls
  out); it's not a general-purpose change log for every table.

## Setup

1. Create a Supabase project.
2. In the SQL Editor, run the 3 migrations in `supabase/migrations/` in
   order (or `npx supabase db push` if you have the DB password to link the
   CLI). Optionally run `supabase/seed.sql` after for demo data covering
   every status.
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API.
     This is the **service role** key, not the anon key — it must never
     reach the browser, which is why every Supabase call in this app is
     server-only.
   - `SESSION_SECRET` — any long random string, e.g. `openssl rand -hex 32`.
   - `ANTHROPIC_API_KEY` — for OCR. Without it, uploads still work; the
     verify form just comes up blank for the owner to fill in by hand.
4. `npm run dev`, open the app, and set your PIN on first load.

## Notes on the data model

Rent lives on `tenancies` (not `tenants`), so a rent change never rewrites
history. `monthly_ledgers` snapshots rent/water/due-day per tenancy per
month at creation time — regenerating or revisiting a past month never
recomputes it from current values. `payments` is the shared table for
manual uploads, manual entries, and (later) WhatsApp submissions;
`adjustments` is append-only — a correction is a new offsetting row, never
an edit to an old one.
