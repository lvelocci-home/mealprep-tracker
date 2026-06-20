# Strava proxy worker

Tiny Cloudflare Worker that lets the app pull your Strava activities (which include your
Apple Watch workouts) without exposing the Strava secret in the public front-end.

## One-time setup

1. **Register a Strava API app** at <https://www.strava.com/settings/api>.
   - Authorization Callback Domain: `localhost` (fine for the one-time token grab).
   - Note your **Client ID** and **Client Secret**.

2. **Get the initial refresh token** (one-time OAuth):
   - Open this in a browser (replace `CLIENT_ID`):
     ```
     https://www.strava.com/oauth/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=http://localhost&approval_prompt=force&scope=activity:read_all
     ```
   - Approve. You'll be redirected to `http://localhost/?...&code=THE_CODE&...` (page won't
     load — just copy `THE_CODE` from the URL).
   - Exchange it for tokens:
     ```bash
     curl -X POST https://www.strava.com/oauth/token \
       -d client_id=CLIENT_ID -d client_secret=CLIENT_SECRET \
       -d code=THE_CODE -d grant_type=authorization_code
     ```
   - Copy the `refresh_token` from the JSON response.

3. **Deploy the worker** (needs a free Cloudflare account):
   ```bash
   cd worker
   npx wrangler login
   npx wrangler secret put STRAVA_CLIENT_ID       # paste Client ID
   npx wrangler secret put STRAVA_CLIENT_SECRET   # paste Client Secret
   npx wrangler secret put STRAVA_REFRESH_TOKEN   # paste refresh_token
   npx wrangler secret put APP_TOKEN              # any long random string YOU choose
   npx wrangler deploy
   ```
   Note the `https://mealprep-strava.<your>.workers.dev` URL.

4. In the app → **Data & Privacy → Connect Strava**, paste the Worker URL and the same
   `APP_TOKEN`. Hit **Sync**.

The `APP_TOKEN` keeps the public Worker URL from being usable by anyone else. The
`ALLOWED_ORIGIN` in `wrangler.toml` limits browser calls to your Pages site.
