# Wellness Tracker

A personal, single-file web app for meal prep, nutrition, training, and progress tracking —
built to run a structured weekly routine (shop → prep → eat to macros → train → check in).

**Live:** https://lvelocci-home.github.io/mealprep-tracker/

It works offline, installs to a phone home screen, and keeps all personal data private
(see [Privacy](#privacy)).

---

## Features

- **🏠 Dashboard** — daily greeting, a yearly vision, today's focus, water tracking (in oz,
  custom goal), an activity streak, and tap-through summaries of the day.
- **🛒 Shop** — a weekly grocery list grouped by store aisle, generated from the active meal
  plan; check items off as you shop, fold in pantry staples, add extras, and hand the list
  to your phone via a QR/link.
- **🍽️ Food** — log meals by tapping them off (MyFitnessPal-style) and watch macro rings
  fill toward your daily target. Expand any meal for exact ingredient quantities. Add
  off-plan foods by hand or via the free [Open Food Facts](https://world.openfoodfacts.org)
  database. Per-day notes.
- **🏋️ Train** — workout programs with sets/reps, warm-up and cardio notes, per-day
  check-off, exercise demo links, a weekly summary, and recent activity pulled from Strava.
- **📊 Progress** — bi-weekly check-ins (weight, body measurements, and a 4-week fitness
  test) with trend charts and improvement indicators.
- **⚙️ Data** — cross-device cloud sync, a read-only progress link for an accountability
  partner, import/export, and Strava connection — all opt-in.

## How it's built

- **Front end:** one self-contained `index.html` — vanilla HTML/CSS/JS, no framework, no
  build step. Hosted free on GitHub Pages.
- **Storage:** the browser's `localStorage` by default. Optional cloud sync to your own
  private database.
- **Strava (optional):** a tiny [Cloudflare Worker](worker/) proxies the Strava API so the
  OAuth secret stays server-side, never in the front end.
- **Cloud sync + sharing (optional):** a small [Node/Express + Postgres API](server/)
  (deployable free on Render + Supabase) syncs your data across devices and serves a
  read-only "progress + consistency" page ([`share.html`](share.html)) to a partner.

## Privacy

The **repo and the deployed website contain only code — no personal health data.**

- Your data (weight, measurements, food log, workouts) lives in your **browser's local
  storage** on your own devices.
- If you turn on **cloud sync**, that data syncs to **your own private database**, reachable
  only with a **private token** you choose (every request is token-authenticated; without it
  the API returns `401`).
- All **secrets** (Strava OAuth secret, database credentials, app tokens) live as
  environment variables on Cloudflare/Render — **never committed** to this repo.
- The optional **share link** is the one outward-facing surface: anyone with that specific
  unguessable link can *view* (not edit) your progress. Share it only with your partner; it
  can be revoked anytime in the app.

Personal seed data (check-in history) lives in a git-ignored `myseed.json` that stays on the
owner's device and is never committed.

## Setup

- **Use it:** just open the live URL (or `index.html` locally).
- **Strava sync:** follow [`worker/README.md`](worker/README.md) (free Cloudflare Worker +
  a Strava API app).
- **Cloud sync + partner sharing:** follow [`server/README.md`](server/README.md) (free
  Render web service + Supabase Postgres).

## Repo layout

```
index.html        the app (single file)
share.html        read-only partner progress page
worker/           Strava proxy (Cloudflare Worker)
server/           cloud sync + sharing API (Render + Supabase)
.gitignore        keeps personal data (myseed.json) out of the repo
```

## Tech

Vanilla JS · HTML · CSS · SVG charts · `localStorage` · Open Food Facts API ·
Cloudflare Workers · Node/Express · PostgreSQL (Supabase) · Render · GitHub Pages.

---

*Personal project. Not affiliated with any coaching brand; meal/workout plans are the
owner's own.*
