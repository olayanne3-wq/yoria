/**
 * strava.js (module client)
 * Intégration Strava côté wizard v2 — Yoria
 *
 * RECONSTRUIT LE 15/07/2026 (signalé par Laurent — bouton Strava du wizard
 * ne déclenchait rien, puis après correctif du clic, la connexion "ne se
 * validait pas" et le plan généré ne se sauvegardait pas). Diagnostic :
 * public/v2/engine/strava.js contenait en réalité une COPIE ACCIDENTELLE du
 * code serverless (api/strava.js, handler Vercel), pas le module client
 * attendu par v2/index.html (Engine.urlConnexionStrava,
 * Engine.extraireTokensDepuisUrl, Engine.setStravaTokens,
 * Engine.getStravaTokens, Engine.clearStravaTokens,
 * Engine.assurerTokenStravaValide, Engine.recupererVolumeStrava — aucune de
 * ces fonctions n'existait nulle part dans le repo, confirmé par recherche
 * exhaustive). Chaque appel levait une TypeError non catchée, interrompant
 * le script en cours d'exécution — d'où la validation Strava qui échouait
 * silencieusement ET la sauvegarde de plan qui s'arrêtait net juste après
 * (même script, exécution stoppée avant d'atteindre le code de sauvegarde).
 *
 * Reconstruit à partir de la spécification documentée dans
 * test-strava.mjs (déjà présent dans le repo, jamais exécutable faute du
 * vrai fichier) et du comportement déjà éprouvé côté public/index.html (v1,
 * ensureFreshToken/syncStrava) — mêmes principes, clés localStorage
 * distinctes (v2_strava_*) pour ne jamais interférer avec la session
 * Strava de v1.
 *
 * Module pur pour la logique de calcul (calculerMedianeVolumeHebdo) et les
 * accès storage (get/set/clearStravaTokens) — storage injectable pour
 * rester testable hors navigateur, même convention que gist-sync.js.
 * urlConnexionStrava/assurerTokenStravaValide/recupererVolumeStrava
 * touchent le réseau ou window.location, non testables en isolation de la
 * même façon.
 */

const REFRESH_MARGIN_SECONDS = 60;

// ---------------------------------------------------------------------------
// Construction de l'URL de connexion — redirige vers l'endpoint serverless
// existant (api/strava.js, route /auth), avec state=v2 pour que le callback
// revienne sur /v2 plutôt que sur / (v1). Cf. api/strava.js ligne
// `const destination = req.query?.state === "v2" ? "/v2" : "/";`.
// ---------------------------------------------------------------------------
export function urlConnexionStrava() {
  return '/api/strava/auth?state=v2';
}

// ---------------------------------------------------------------------------
// Extraction des tokens depuis les query params de l'URL au retour du
// callback OAuth (access_token/refresh_token/expires_at, ajoutés par
// api/strava.js). Retourne null si access_token absent (pas un retour
// Strava valide) — cf. test-strava.mjs pour le contrat exact attendu.
// ---------------------------------------------------------------------------
export function extraireTokensDepuisUrl(search) {
  const params = new URLSearchParams(search);
  const accessToken = params.get('access_token');
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: params.get('refresh_token'),
    expiresAt: params.get('expires_at')
  };
}

// ---------------------------------------------------------------------------
// Stockage des tokens — clés v2_strava_* dédiées (distinctes de
// lk_strava_* utilisées par v1), pour ne jamais interférer avec la session
// Strava de l'app principale même si les deux sont ouvertes sur le même
// appareil.
// ---------------------------------------------------------------------------
export function setStravaTokens({ accessToken, refreshToken, expiresAt }, storage = localStorage) {
  if (accessToken) storage.setItem('v2_strava_token', accessToken);
  if (refreshToken) storage.setItem('v2_strava_refresh', refreshToken);
  if (expiresAt) storage.setItem('v2_strava_expires', String(expiresAt));
}

export function getStravaTokens(storage = localStorage) {
  return {
    accessToken: storage.getItem('v2_strava_token') || null,
    refreshToken: storage.getItem('v2_strava_refresh') || null,
    expiresAt: parseInt(storage.getItem('v2_strava_expires') || '0', 10)
  };
}

export function clearStravaTokens(storage = localStorage) {
  storage.removeItem('v2_strava_token');
  storage.removeItem('v2_strava_refresh');
  storage.setItem('v2_strava_expires', '0');
}

// ---------------------------------------------------------------------------
// Rafraîchissement du token si expiré (même logique que ensureFreshToken()
// côté v1, index.html) — retourne l'access_token valide, ou null si pas de
// connexion Strava/rafraîchissement impossible. C'est cette fonction que le
// wizard appelle pour savoir s'il doit afficher le bouton "Connecter
// Strava" ou le bloc de volume déjà connecté.
// ---------------------------------------------------------------------------
export async function assurerTokenStravaValide(storage = localStorage) {
  const { accessToken, refreshToken, expiresAt } = getStravaTokens(storage);
  if (!accessToken) return null;
  if (Date.now() / 1000 < expiresAt - REFRESH_MARGIN_SECONDS) return accessToken;
  if (!refreshToken) return null;
  try {
    const resp = await fetch('/api/strava/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    const data = await resp.json();
    if (!data.access_token) return null;
    setStravaTokens({ accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: data.expires_at }, storage);
    return data.access_token;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Médiane du volume hebdomadaire (km) à partir d'activités Strava brutes —
// utilisée pour pré-remplir "combien tu cours actuellement" dans le wizard.
// Semaine ISO (lundi-dimanche), seules les activités type 'Run' comptent,
// plusieurs sorties la même semaine se cumulent. Cf. test-strava.mjs pour
// les 5 cas de référence.
// ---------------------------------------------------------------------------
export function calculerMedianeVolumeHebdo(activites) {
  const runs = activites.filter(a => a.type === 'Run');
  if (runs.length === 0) return null;

  const volumeParSemaine = new Map();
  for (const run of runs) {
    const date = new Date(run.start_date_local.slice(0, 10) + 'T00:00:00Z');
    const jourISO = (date.getUTCDay() + 6) % 7; // 0=lundi ... 6=dimanche
    const lundi = new Date(date);
    lundi.setUTCDate(date.getUTCDate() - jourISO);
    const cleSemaine = lundi.toISOString().slice(0, 10);
    volumeParSemaine.set(cleSemaine, (volumeParSemaine.get(cleSemaine) || 0) + run.distance);
  }

  const volumesKm = [...volumeParSemaine.values()].map(m => m / 1000).sort((a, b) => a - b);
  const milieu = Math.floor(volumesKm.length / 2);
  const mediane = volumesKm.length % 2 !== 0
    ? volumesKm[milieu]
    : (volumesKm[milieu - 1] + volumesKm[milieu]) / 2;

  return Math.round(mediane);
}

// ---------------------------------------------------------------------------
// Récupère les activités des 8 dernières semaines et calcule la médiane de
// volume hebdo — appelée par chargerVolumeStrava()/chargerVolumeStravaForme()
// dans v2/index.html une fois un token valide obtenu.
// ---------------------------------------------------------------------------
export async function recupererVolumeStrava(accessToken) {
  try {
    const huitSemainesAvant = new Date();
    huitSemainesAvant.setDate(huitSemainesAvant.getDate() - 8 * 7);
    const planStart = huitSemainesAvant.toISOString().slice(0, 10);
    const resp = await fetch(`/api/strava/activities?token=${accessToken}&plan_start=${planStart}`);
    const activites = await resp.json();
    if (!Array.isArray(activites)) {
      return { mediane: null, erreur: activites?.error || 'Réponse Strava invalide' };
    }
    return { mediane: calculerMedianeVolumeHebdo(activites), erreur: null };
  } catch (e) {
    return { mediane: null, erreur: e.message };
  }
}
