# Wellness Tracker API (Render + Supabase)

Tiny service that syncs your app data across devices and serves a read-only
"progress + consistency" view to an accountability partner via a share link.

## One-time setup

### 1. Create the database (Supabase — permanently free)
1. Sign up at <https://supabase.com> → **New project** (pick a region near you, set a DB password).
2. When it's ready: **Project Settings → Database → Connection string → URI**.
3. Copy the URI (looks like `postgresql://postgres:...@db.xxxx.supabase.co:5432/postgres`).
   - If your network needs it, use the **Connection pooling** URI instead (port `6543`).

### 2. Deploy the API (Render — free web service)
1. Sign up at <https://render.com> and connect your GitHub.
2. **New → Web Service** → pick the `lvelocci-home/wellness` repo.
3. Settings:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. **Environment variables:**
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Supabase URI from step 1 |
   | `ALLOWED_ORIGIN` | `https://lvelocci-home.github.io` |
5. **Create Web Service.** When live, note the URL (e.g. `https://wellness-tracker-api.onrender.com`).

### 3. Connect the app
- In the app → **Data → Cloud sync**: paste the Render URL and pick a **private token**
  (any long random string — this is your password; use the same on every device).
- Hit **Sync now**. Repeat on your phone with the same URL + token to sync.

### 4. Share with your partner
- **Data → Share progress → Create link.** Send them the link; it opens a read-only page
  with your weight/measurement/fitness trends + workout & food/water consistency.

Notes:
- Render's free web service sleeps after ~15 min idle; the first request then takes
  ~30–60s to wake. Subsequent requests are fast.
- Tables (`app_state`, `shares`) are created automatically on first boot.
