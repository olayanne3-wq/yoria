export const handler = async (event) => {
  const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
  const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

  // L'URL de base est détectée automatiquement depuis les headers Netlify
  const host = event.headers?.host || event.headers?.["x-forwarded-host"];
  const BASE_URL = `https://${host}`;

  const path = event.path
    .replace("/.netlify/functions/strava", "")
    .replace("/api/strava", "")
    || "/";

  const REDIRECT_URI = `${BASE_URL}/api/strava/callback`;

  // ── /auth → redirection vers Strava ─────────────────────────────────────
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

  // ── /callback → échange code contre token ───────────────────────────────
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

  // ── /refresh → rafraîchit le token ──────────────────────────────────────
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

  // ── /activities → liste des activités depuis le 22 juin ─────────────────
  if (path === "/activities") {
    const token = event.queryStringParameters?.token;
    if (!token) return { statusCode: 401, body: JSON.stringify({ error: "No token" }) };

    const after = Math.floor(new Date("2026-06-22T00:00:00Z").getTime() / 1000);
    const resp = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const activities = await resp.json();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(activities),
    };
  }

  return { statusCode: 404, body: "Not found" };
};
