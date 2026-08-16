// Origine autorisée pour les appels cross-origin (correctif sécurité) —
// remplace le wildcard "*" précédent sur /refresh et /activities. Un
// wildcard permettait à N'IMPORTE QUEL site tiers d'appeler ces routes
// depuis le navigateur d'un utilisateur (si ce site connaissait/devinait
// un token Strava valide, il aurait pu récupérer les données d'activité
// de cet utilisateur via une requête fetch() côté client). Seule l'app
// Yoria a légitimement besoin d'appeler ces routes — codé en dur plutôt
// qu'en variable d'environnement, l'app tournant uniquement sur ce
// domaine (confirmé : pas d'usage depuis les URLs de preview Vercel).
const ORIGINE_AUTORISEE = "https://yoria.run";

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
    // "state" est un paramètre OAuth standard, renvoyé tel quel par Strava au
    // callback — utilisé ici pour savoir où rediriger ensuite (v1 par défaut,
    // v2 si state=v2). N'affecte pas v1 : sans state, comportement inchangé.
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
    // Log de diagnostic (correctif sécurité, retrait du fragment de code) —
    // le code OAuth lui-même n'est plus loggé, même tronqué. Un code
    // d'autorisation est à usage unique et de courte durée de vie, donc le
    // risque réel était faible, mais rien n'est gagné à le journaliser,
    // même partiellement — seule sa présence/absence est utile pour le
    // diagnostic, pas sa valeur.
    console.log(`[strava callback] code présent: ${!!code} | state: ${req.query?.state || 'aucun'} | ${new Date().toISOString()}`);
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
    // Redirige vers v2 si state=v2 a été transmis, sinon vers v1 (racine)
    // comme avant — comportement de v1 inchangé par défaut.
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
    res.setHeader("Access-Control-Allow-Origin", ORIGINE_AUTORISEE);
    return res.status(200).json(data);
  }

  // ── /activities ──────────────────────────────────────────────────────────
  if (path === "/activities") {
    const token = req.query?.token;
    if (!token) return res.status(401).json({ error: "No token" });

    const intervalDatesParam = req.query?.interval_dates;
    const INTERVAL_DATES = intervalDatesParam ? intervalDatesParam.split(",") : [];

    // Nombre de laps attendu par date (16/08/2026, correctif décomposition
    // séance qualité — cf. docs/v2-methodologie/saisie-et-integrations.md).
    // Format transmis par index.html : "2026-08-16:3,2026-08-20:5" (date
    // deux-points nombre de blocs attendus, plusieurs dates séparées par
    // virgule). Optionnel — une date présente dans INTERVAL_DATES mais
    // absente ici n'a pas de vérification de cohérence possible (comportement
    // inchangé : laps Strava utilisés tels quels).
    const intervalExpectedParam = req.query?.interval_expected;
    const NB_BLOCS_ATTENDU_PAR_DATE = new Map();
    if (intervalExpectedParam) {
      for (const paire of intervalExpectedParam.split(",")) {
        const [date, nb] = paire.split(":");
        if (date && nb) NB_BLOCS_ATTENDU_PAR_DATE.set(date, parseInt(nb, 10));
      }
    }

    const planStartParam = req.query?.plan_start;
    const after = Math.floor(new Date((planStartParam || "2026-06-22") + "T00:00:00Z").getTime() / 1000);

    const resp = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const activities = await resp.json();

    if (!Array.isArray(activities)) {
      res.setHeader("Access-Control-Allow-Origin", ORIGINE_AUTORISEE);
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
          const lapsArray = Array.isArray(laps) ? laps : [];

          // Cohérence : nombre de laps attendu (blocs + échauffement +
          // retour au calme) vs réel. Si on n'a pas d'attendu pour cette
          // date, ou si le nombre réel suffit, comportement inchangé — pas
          // d'appel /streams supplémentaire (coûteux, à réserver au cas où
          // c'est vraiment nécessaire).
          const nbBlocsAttendu = NB_BLOCS_ATTENDU_PAR_DATE.get(dateLocal);
          const attendu = nbBlocsAttendu != null ? nbBlocsAttendu + 2 : null;
          const incoherent = attendu != null && lapsArray.length < attendu;

          if (!incoherent) {
            return { ...act, laps: lapsArray };
          }

          // Laps insuffisants pour décomposer correctement la séance —
          // repli sur le flux détaillé (streams), pour permettre une
          // reconstruction par détection de signal côté client
          // (fit-detection.js, construireRecordsDepuisStreamsStrava()).
          // key_by_type=true : réponse en objet { time: {data:[...]}, ... }
          // plutôt qu'un tableau de flux — plus simple à consommer côté
          // client, cf. commentaire de construireRecordsDepuisStreamsStrava().
          try {
            const streamsResp = await fetch(
              `https://www.strava.com/api/v3/activities/${actId}/streams?keys=time,velocity_smooth,heartrate,cadence&key_by_type=true`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const streams = await streamsResp.json();
            return { ...act, laps: lapsArray, raw_streams: streams, laps_incoherents: true };
          } catch {
            // Streams indisponibles (activité privée aux détails avancés,
            // erreur réseau ponctuelle...) — on retourne quand même les laps
            // bruts avec le flag, le client saura qu'il n'a pas de repli
            // possible et affichera l'avertissement sans décomposition.
            return { ...act, laps: lapsArray, laps_incoherents: true };
          }
        } catch {
          return { ...act, laps: [] };
        }
      }
      return act;
    }));

    res.setHeader("Access-Control-Allow-Origin", ORIGINE_AUTORISEE);
    return res.status(200).json(enriched);
  }

  return res.status(404).send("Not found");
}
