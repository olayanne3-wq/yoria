export const handler = async (event) => {
  const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
  const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

  const host = event.headers?.host || event.headers?.["x-forwarded-host"];
  const BASE_URL = `https://${host}`;

  const path = event.path
    .replace("/.netlify/functions/strava", "")
    .replace("/api/strava", "")
    || "/";

  const REDIRECT_URI = `${BASE_URL}/api/strava/callback`;

  // ── /auth ────────────────────────────────────────────────────────────────
  if (path === "/auth" || path === "/" || path === "") {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "activity:read_all",
    });
    return {
      statusCode: 302,
      headers: { Location: `https://www.strava.com/oauth/authorize?${params}` },
      body: "",
    };
  }

  // ── /callback ────────────────────────────────────────────────────────────
  if (path === "/callback") {
    const code = event.queryStringParameters?.code;
    if (!code) return { statusCode: 400, body: JSON.stringify({ error: "No code" }) };

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
    if (data.errors) return { statusCode: 400, body: JSON.stringify({ error: data.message }) };

    const params = new URLSearchParams({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    });
    return {
      statusCode: 302,
      headers: { Location: `${BASE_URL}/?${params}` },
      body: "",
    };
  }

  // ── /refresh ─────────────────────────────────────────────────────────────
  if (path === "/refresh") {
    const { refresh_token } = JSON.parse(event.body || "{}");
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
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    };
  }

  // ── /activities → liste + laps des séances VMA/SPEC ─────────────────────
  if (path === "/activities") {
    const token = event.queryStringParameters?.token;
    if (!token) return { statusCode: 401, body: JSON.stringify({ error: "No token" }) };

    // Dates des séances VMA et SPEC du plan (pour fetch leurs laps)
    const INTERVAL_DATES = [
      "2026-06-24","2026-07-01","2026-07-03","2026-07-08","2026-07-10",
      "2026-07-15","2026-07-18","2026-07-22","2026-07-24","2026-07-29",
      "2026-07-31","2026-08-05","2026-08-07","2026-08-12","2026-08-14",
      "2026-08-19","2026-08-21","2026-08-26","2026-08-29",
    ];

    const after = Math.floor(new Date("2026-06-22T00:00:00Z").getTime() / 1000);
    const resp = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const activities = await resp.json();
    if (!Array.isArray(activities)) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(activities),
      };
    }

    // Pour chaque activité dont la date correspond à une séance VMA/SPEC,
    // on fetch les laps et on les attache à l'activité
    const enriched = await Promise.all(activities.map(async (act) => {
      const dateLocal = act.start_date_local?.slice(0, 10);
      if (act.type === "Run" && INTERVAL_DATES.includes(dateLocal)) {
        try {
          const lapsResp = await fetch(
            `https://www.strava.com/api/v3/activities/${act.id}/laps`,
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

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(enriched),
    };
  }

  return { statusCode: 404, body: "Not found" };
};
