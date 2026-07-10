/**
 * weather.js
 * Notes météo dynamiques sur les séances proches — Run by Léa v2.0
 *
 * Contrairement aux autres injections de contenu (jalons de transition,
 * notes pratiques, repères qualitatifs, jour de course), la météo ne peut
 * pas être injectée une fois pour toutes à la génération du plan : une
 * prévision n'a de sens que proche de la date réelle de la séance
 * (cf. docs/v2-methodologie/convergence-v1-v2.md, section 2.2). Ce module
 * fournit donc un second passage, à appeler séparément (idéalement la
 * veille de chaque séance, pas en continu), qui enrichit une séance déjà
 * générée avec la prévision du jour si elle dépasse le seuil de chaleur.
 *
 * Module pur (aucune dépendance DOM) — storage injectable (localStorage
 * par défaut), cohérent avec strava.js/gist-sync.js.
 */

const SEUIL_CHALEUR_C = 28;
const CACHE_KEY_PREFIX = 'v2_weather_cache_';

// Note statique de repli si la prévision n'est pas disponible (ex. date
// hors de la fenêtre J+7 d'Open-Meteo, ou géolocalisation refusée) — pas de
// blocage, juste pas d'enrichissement météo pour cette séance.
const NOTE_CHALEUR = "Chaleur annoncée pour demain — ralentis l'allure si besoin, l'important est de finir la séance, pas de tenir un chrono.";

/**
 * Récupère la prévision météo pour une date et des coordonnées données, en
 * passant par l'endpoint serverless /api/weather (lui-même un proxy vers
 * Open-Meteo, cf. api/weather.js). Cache le résultat par jour dans le
 * storage fourni pour éviter des appels répétés si la fonction est appelée
 * plusieurs fois pour la même date (ex. plusieurs séances le même jour).
 */
async function recupererPrevisionMeteo({ latitude, longitude, date }, storage = localStorage) {
  const cleCache = `${CACHE_KEY_PREFIX}${date}`;
  const cache = storage.getItem(cleCache);
  if (cache) {
    try {
      const parsed = JSON.parse(cache);
      return parsed;
    } catch {
      // Cache corrompu, on ignore et refait l'appel
    }
  }

  try {
    const params = new URLSearchParams({ lat: latitude, lon: longitude, date });
    const resp = await fetch(`/api/weather?${params}`);
    const data = await resp.json();
    storage.setItem(cleCache, JSON.stringify(data));
    return data;
  } catch (e) {
    return { disponible: false, erreur: e.message };
  }
}

/**
 * Enrichit une séance donnée avec la note de chaleur si la prévision
 * dépasse le seuil. Ne modifie rien si la prévision n'est pas disponible,
 * ou si elle ne dépasse pas le seuil. Retourne la séance mutée (même objet,
 * pour rester cohérent avec les autres fonctions injecterXxx du moteur qui
 * mutent en place).
 */
function enrichirSeanceAvecMeteo(seance, prevision) {
  if (!seance || !seance.contenu) return seance;
  if (!prevision?.disponible || !prevision.alerteChaleur) return seance;
  // Idempotence : ne pas ré-ajouter la note si elle est déjà présente dans
  // le contenu — bug trouvé le 7 juillet 2026 (capture d'écran de Laurent) :
  // verifierMeteoSeanceDemain() est appelée à chaque fin de renderResults(),
  // donc à chaque régénération/rechargement du plan dans le wizard. Sans ce
  // garde-fou, la note se répétait autant de fois que le plan avait été
  // affiché, produisant un contenu avec la même phrase collée 3 fois.
  if (seance.contenu.includes(NOTE_CHALEUR)) return seance;
  seance.contenu = `${seance.contenu} ${NOTE_CHALEUR}`;
  return seance;
}

/**
 * Point d'entrée principal : récupère la géolocalisation du navigateur,
 * appelle la prévision météo pour la date donnée, et enrichit la séance si
 * besoin. À appeler la veille de chaque séance qualifiante (pas à la
 * génération du plan) — l'appelant décide du moment (ex. un check quotidien
 * au chargement de l'app, qui compare la date du jour à celle des séances à
 * venir).
 */
async function verifierMeteoPourSeance(seance, date, storage = localStorage) {
  if (!('geolocation' in navigator)) return seance;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const prevision = await recupererPrevisionMeteo({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          date
        }, storage);
        resolve(enrichirSeanceAvecMeteo(seance, prevision));
      },
      (err) => {
        resolve(seance);
      },
      {
        timeout: 15000, // 5s était trop court : un GPS qui doit se fixer
        // (intérieur, signal faible) peut facilement dépasser ce délai —
        // constaté en pratique (timeout systématique chez Laurent)
        maximumAge: 10 * 60 * 1000, // accepte une position vieille de 10min
        // max : la météo n'a pas besoin d'une précision GPS instantanée,
        // une position en cache récente suffit et évite d'attendre un
        // nouveau fix si le navigateur en a déjà une sous la main
        enableHighAccuracy: false // la précision fine (GPS pur) est plus
        // lente que la position approximative (réseau/wifi) ; largement
        // suffisant pour une prévision météo à l'échelle d'une ville
      }
    );
  });
}
