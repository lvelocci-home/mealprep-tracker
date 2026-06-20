/*
 * Strava proxy — Cloudflare Worker.
 * Holds the Strava OAuth secret + refresh token so the public front-end never sees them.
 * Returns a trimmed activities list to the app, gated by a personal APP_TOKEN.
 *
 * Secrets (set via `wrangler secret put`):
 *   STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN, APP_TOKEN
 * Vars (wrangler.toml):
 *   ALLOWED_ORIGIN   e.g. https://lvelocci-home.github.io
 * KV (optional, for rotating refresh tokens):
 *   TOKENS           binding; key "refresh" persists the latest refresh token
 */

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    const url = new URL(request.url);
    if (url.pathname !== "/activities") {
      return json({ error: "not found" }, 404, cors);
    }

    // --- auth gate: personal token in Authorization: Bearer <APP_TOKEN> ---
    const auth = request.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!env.APP_TOKEN || token !== env.APP_TOKEN) {
      return json({ error: "unauthorized" }, 401, cors);
    }

    try {
      const access = await getAccessToken(env);
      const after = url.searchParams.get("after") || "";
      const perPage = url.searchParams.get("per_page") || "30";
      let api = `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`;
      if (after) api += `&after=${after}`;
      const r = await fetch(api, { headers: { Authorization: `Bearer ${access}` } });
      if (!r.ok) return json({ error: "strava " + r.status }, 502, cors);
      const acts = await r.json();
      const trimmed = acts.map((a) => ({
        id: a.id,
        type: a.sport_type || a.type,
        name: a.name,
        date: a.start_date_local,
        durationMin: Math.round((a.moving_time || 0) / 60),
        distanceKm: a.distance ? +(a.distance / 1000).toFixed(2) : 0,
        calories: a.calories ?? a.kilojoules ? Math.round((a.kilojoules || 0) * 0.239) : null,
        avgHR: a.average_heartrate ? Math.round(a.average_heartrate) : null,
        maxHR: a.max_heartrate ? Math.round(a.max_heartrate) : null,
      }));
      return json({ activities: trimmed, synced: Date.now() }, 200, cors);
    } catch (e) {
      return json({ error: String(e) }, 500, cors);
    }
  },
};

async function getAccessToken(env) {
  // Prefer a KV-stored refresh token (rotates); fall back to the secret.
  let refresh = env.STRAVA_REFRESH_TOKEN;
  if (env.TOKENS) {
    const stored = await env.TOKENS.get("refresh");
    if (stored) refresh = stored;
  }
  const body = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID,
    client_secret: env.STRAVA_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refresh,
  });
  const r = await fetch("https://www.strava.com/oauth/token", { method: "POST", body });
  if (!r.ok) throw new Error("token refresh " + r.status);
  const t = await r.json();
  // Strava may rotate the refresh token — persist the new one if we have KV.
  if (env.TOKENS && t.refresh_token && t.refresh_token !== refresh) {
    await env.TOKENS.put("refresh", t.refresh_token);
  }
  return t.access_token;
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}
