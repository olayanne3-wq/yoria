export default async function handler(req, res) {
  const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
  const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

  const host = req.headers?.host || req.headers?.["x-forwarded-host"];
  const BASE_URL = `https://${host}`;
  const REDIRECT_URI = `${BASE_URL}/api/strava/callback`;

  // Extraire le path après /api/strava
  const path = (req.url || "")
    .replace(/^\/api\/strava/, "")
    .split("?")[0] || "/";

  // ── /auth ────────────────────────────────────────────────────────────────
  if (path === "/auth" || path === "/" || path === "") {
    const state = req.query?.state || "";
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "activity:read_all",
      ...(state ? { state } : {}),
    });
    return res.redirect(302, `https://www.strava.com/oauth/authorize?${params}`);
  }

  // ── /callback ────────────────────────────────────────────────────────────
  if (path === "/callback") {
    const code = req.query?.code;
    console.log(`[strava callback] code reçu: ${code?.slice(0,8)}... | state: ${req.query?.state || 'aucun'} | ${new Date().toISOString()}`);
    if (!code) return res.status(400).json({ error: "No code" });

    const resp = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });
    const data = await resp.json();
    if (data.errors) return res.status(400).json({ error: data.message, details: data.errors, state_recu: req.query?.state || null });

    const params = new URLSearchParams({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    });
    const destination = req.query?.state === "v2" ? "/v2" : "/";
    return res.redirect(302, `${BASE_URL}${destination}?${params}`);
  }

  // ── /refresh ─────────────────────────────────────────────────────────────
  if (path === "/refresh") {
    const { refresh_token } = req.body || {};
    const resp = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const data = await resp.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json(data);
  }

  // ── /activities ──────────────────────────────────────────────────────────
  if (path === "/activities") {
    const token = req.query?.token;
    if (!token) return res.status(401).json({ error: "No token" });

    const intervalDatesParam = req.query?.interval_dates;
    const INTERVAL_DATES = intervalDatesParam ? intervalDatesParam.split(",") : [];
    const planStartParam = req.query?.plan_start;
    const after = Math.floor(new Date((planStartParam || "2026-06-22") + "T00:00:00Z").getTime() / 1000);

    const resp = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const activities = await resp.json();

    if (!Array.isArray(activities)) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "no-store, max-age=0");
      return res.status(200).json(activities);
    }

    const enriched = await Promise.all(activities.map(async (act) => {
      const dateLocal = act.start_date_local?.slice(0, 10);
      if (act.type === "Run" && INTERVAL_DATES.includes(dateLocal)) {
        try {
          const actId = act.id_str || act.id;
          const lapsResp = await fetch(
            `https://www.strava.com/api/v3/activities/${actId}/laps`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const laps = await lapsResp.json();
          return { ...act, laps: Array.isArray(laps) ? laps : [] };
        } catch {
          return { ...act, laps: [] };
        }
      }
      return act;
    }));

    // Cache-Control: no-store — cette route dépend des dernières activités
    // Strava de l'utilisateur, elle ne doit jamais être servie depuis un
    // cache (navigateur ou CDN Vercel). Sans cet en-tête, une requête
    // identique (mêmes query params token/interval_dates/plan_start) peut
    // recevoir un 304 Not Modified sans corps, ce que le client interprète
    // à tort comme une erreur ("❌ Erreur Strava") faute de tableau JSON à
    // parser. Bug découvert le 15 juillet 2026 : la synchro échouait après
    // une séance fraîchement enregistrée alors que l'activité existait bien
    // côté Strava.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.status(200).json(enriched);
  }

  return res.status(404).send("Not found");
}
