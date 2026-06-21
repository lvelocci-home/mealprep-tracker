/*
 * Wellness Tracker API — tiny Express + Postgres service.
 * Stores each user's app state (keyed by a private token) and serves a read-only
 * "progress + consistency" subset via share links.
 *
 * Env vars (set on Render):
 *   DATABASE_URL    Supabase Postgres connection string (URI)
 *   ALLOWED_ORIGIN  e.g. https://lvelocci-home.github.io  (your GitHub Pages origin)
 */
import express from "express";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const app = express();
app.use(express.json({ limit: "3mb" }));
app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", ORIGIN);
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.set("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

async function init() {
  await pool.query(`create table if not exists app_state(
    user_token text primary key,
    state jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
  );`);
  await pool.query(`create table if not exists shares(
    share_token text primary key,
    user_token text not null,
    scope text not null default 'consistency',
    created_at timestamptz not null default now()
  );`);
}

function authToken(req, res) {
  const t = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!t || t.length < 8) { res.status(401).json({ error: "unauthorized" }); return null; }
  return t;
}
const rid = (p) => p + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);

// --- personal sync ---
app.get("/api/state", async (req, res) => {
  const t = authToken(req, res); if (!t) return;
  try {
    const r = await pool.query("select state, updated_at from app_state where user_token=$1", [t]);
    res.json(r.rows[0] || { state: null, updated_at: null });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.put("/api/state", async (req, res) => {
  const t = authToken(req, res); if (!t) return;
  try {
    const state = req.body.state || {};
    await pool.query(
      `insert into app_state(user_token, state, updated_at) values($1,$2,now())
       on conflict(user_token) do update set state=$2, updated_at=now()`,
      [t, state]
    );
    res.json({ ok: true, updated_at: new Date().toISOString() });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// --- sharing ---
app.post("/api/share", async (req, res) => {
  const t = authToken(req, res); if (!t) return;
  try {
    let r = await pool.query("select share_token from shares where user_token=$1 limit 1", [t]);
    let token = r.rows[0] && r.rows[0].share_token;
    if (!token) {
      token = rid("s_");
      await pool.query("insert into shares(share_token, user_token, scope) values($1,$2,'consistency')", [token, t]);
    }
    res.json({ share_token: token });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.delete("/api/share", async (req, res) => {
  const t = authToken(req, res); if (!t) return;
  try { await pool.query("delete from shares where user_token=$1", [t]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: String(e) }); }
});

// read-only progress + consistency subset (no auth; the share token is the key)
app.get("/api/share/:token", async (req, res) => {
  try {
    const sr = await pool.query("select user_token from shares where share_token=$1", [req.params.token]);
    if (!sr.rows[0]) return res.status(404).json({ error: "not found" });
    const r = await pool.query("select state, updated_at from app_state where user_token=$1", [sr.rows[0].user_token]);
    const st = (r.rows[0] && r.rows[0].state) || {};
    res.json({
      name: st.profileName || null,
      vision: st.vision || "",
      updated_at: (r.rows[0] && r.rows[0].updated_at) || null,
      checkins: st.checkins || [],
      trainingLog: st.trainingLog || {},
      foodLog: st.foodLog || {},
      water: st.water || {},
      waterGoal: st.waterGoal || 126,
    });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.get("/", (req, res) => res.json({ ok: true, service: "wellness-tracker-api" }));

init()
  .then(() => app.listen(process.env.PORT || 3000, () => console.log("API up")))
  .catch((e) => { console.error("init failed", e); process.exit(1); });
