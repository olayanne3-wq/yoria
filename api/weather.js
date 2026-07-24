// Proxy simple vers Open-Meteo (https://open-meteo.com/) — pas de clé API,
// pas d'inscription. Choisi pour l'absence de friction et un volume gratuit
// large (10 000 appels/jour en usage non commercial), cf.
// docs/v2-methodologie/convergence-v1-v2.md section 2.2. Limite explicitement
// actée : à revoir si l'app passe en usage commercial (v2.5).
//
// Reçoit latitude/longitude (géolocalisation, source variable selon
// l'appelant — GPS live pour une prévision, dernière activité Strava GPS
// pour la météo courante, cf. index.html) et un mode :
//   - type=forecast (défaut) : prévision J+1 à J+7, utilisé par weather.js
//     pour la note de chaleur avant séance. Renvoie temperatureMaxC +
//     alerteChaleur (seuil 28°C, repris de v1, fixe).
//   - type=current : météo actuelle (température + code météo), pour le
//     badge météo du dashboard (remplace l'appel direct fetchWeather()).
//   - type=historical : météo passée à une date donnée, pour afficher la
//     température qu'il faisait pendant une séance déjà réalisée (remplace
//     l'appel direct fetchHistoricalWeather()). Nécessite date.
//
// Réconciliation du 20 juillet 2026 (doc convergence-v1-v2.md, section 13) :
// avant cette extension, index.html appelait Open-Meteo directement depuis
// le navigateur pour current/historical, en parallèle du proxy /api/weather
// utilisé par weather.js pour forecast — deux façons différentes d'appeler
// la même API externe. Ce fichier centralise les trois désormais, sans
// changer la logique de géolocalisation de chaque appelant (légitimement
// différente : Strava GPS pour current, position live pour forecast).
export default async function handler(req, res) {
  const { lat, lon, date, type = "forecast" } = req.query || {};
  if (!lat || !lon) {
    return res.status(400).json({ error: "Paramètres lat/lon manquants" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (type === "current") {
    return handleCurrent(req, res, lat, lon);
  }
  if (type === "historical") {
    const { hour, timezone } = req.query || {};
    return handleHistorical(req, res, lat, lon, date, hour, timezone);
  }
  return handleForecast(req, res, lat, lon, date);
}

const SEUIL_CHALEUR_C = 28;
const TIMEZONE_DEFAUT = "Europe/Paris";

async function handleForecast(req, res, lat, lon, date) {
  try {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      daily: "temperature_2m_max",
      timezone: "auto",
      forecast_days: "7" // Open-Meteo fiabilise ses prévisions à J+7 max
    });
    const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!resp.ok) {
      return res.status(502).json({ error: "Open-Meteo indisponible", status: resp.status });
    }
    const data = await resp.json();

    const dateCible = date || new Date().toISOString().slice(0, 10);
    const index = (data.daily?.time || []).indexOf(dateCible);
    if (index === -1) {
      // Date hors de la fenêtre de prévision disponible (ex. trop loin dans
      // le futur) — pas une erreur, juste rien à renvoyer pour ce jour.
      return res.status(200).json({ disponible: false });
    }

    const temperatureMaxC = data.daily.temperature_2m_max[index];
    return res.status(200).json({
      disponible: true,
      date: dateCible,
      temperatureMaxC,
      alerteChaleur: temperatureMaxC > SEUIL_CHALEUR_C
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Météo actuelle — remplace l'appel direct fetchWeather() de index.html.
// Renvoie une température + un code météo simplifié (même mapping que
// l'ancien code côté client, déplacé ici pour centraliser la logique).
async function handleCurrent(req, res, lat, lon) {
  try {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: "temperature_2m,weathercode",
      timezone: "auto"
    });
    const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!resp.ok) {
      return res.status(502).json({ error: "Open-Meteo indisponible", status: resp.status });
    }
    const data = await resp.json();
    if (data.current?.temperature_2m == null) {
      return res.status(200).json({ disponible: false });
    }

    const temperatureC = Math.round(data.current.temperature_2m);
    const code = data.current.weathercode;
    let emoji = "🌡️";
    if (code === 0) emoji = "☀️";
    else if (code <= 3) emoji = "⛅";
    else if (code <= 67) emoji = "🌧️";

    return res.status(200).json({
      disponible: true,
      temperatureC,
      code,
      emoji
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Météo passée à une date donnée — remplace l'appel direct
// fetchHistoricalWeather() de index.html. Utilise l'heure réelle de la
// séance si fournie (start_date_local Strava, cf. index.html), pour
// refléter la météo au moment où la séance a vraiment eu lieu — plutôt
// qu'une approximation fixe. Repli sur 18h puis 12h puis minuit si aucune
// heure n'est fournie (ex. saisie manuelle sans horodatage) ou si l'heure
// demandée n'a pas de valeur dans la réponse Open-Meteo.
//
// timezone (24/07/2026) : paramètre optionnel transmis par l'appelant
// (ex. fuseau du profil coureur, à terme). Repli sur TIMEZONE_DEFAUT
// (Europe/Paris) si absent ou vide — comportement inchangé tant qu'aucun
// appelant ne fournit ce paramètre explicitement.
async function handleHistorical(req, res, lat, lon, date, hour, timezone) {
  if (!date) {
    return res.status(400).json({ error: "Paramètre date manquant pour type=historical" });
  }
  try {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      start_date: date,
      end_date: date,
      hourly: "temperature_2m",
      timezone: timezone || TIMEZONE_DEFAUT
    });
    const resp = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`);
    if (!resp.ok) {
      return res.status(502).json({ error: "Open-Meteo indisponible", status: resp.status });
    }
    const data = await resp.json();
    const temps = data.hourly?.temperature_2m;
    if (!temps) {
      return res.status(200).json({ disponible: false });
    }

    const heureCible = Number.isInteger(Number(hour)) && hour >= 0 && hour <= 23 ? Number(hour) : null;
    const temperatureC = Math.round(
      (heureCible !== null ? temps[heureCible] : undefined) ?? temps[18] ?? temps[12] ?? temps[0]
    );
    return res.status(200).json({
      disponible: true,
      date,
      temperatureC
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
