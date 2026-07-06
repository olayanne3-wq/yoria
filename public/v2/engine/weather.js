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
export const NOTE_CHALEUR = "Chaleur annoncée aujourd'hui — ralentis l'allure si besoin, l'important est de finir la séance, pas de tenir un chrono.";

/**
 * Récupère la prévision météo pour une date et des coordonnées données, en
 * passant par l'endpoint serverless /api/weather (lui-même un proxy vers
 * Open-Meteo, cf. api/weather.js). Cache le résultat par jour dans le
 * storage fourni pour éviter des appels répétés si la fonction est appelée
 * plusieurs fois pour la même date (ex. plusieurs séances le même jour).
 */
export async function recupererPrevisionMeteo({ latitude, longitude, date }, storage = localStorage) {
  const cleCache = `${CACHE_KEY_PREFIX}${date}`;
  const cache = storage.getItem(cleCache);
  if (cache) {
    try {
      const parsed = JSON.parse(cache);
      console.log('[météo] Résultat pris depuis le cache (pas d\'appel réseau) :', parsed);
      return parsed;
    } catch {
      // Cache corrompu, on ignore et refait l'appel
    }
  }

  try {
    const params = new URLSearchParams({ lat: latitude, lon: longitude, date });
    console.log('[météo] Appel réseau vers /api/weather...');
    const resp = await fetch(`/api/weather?${params}`);
    const data = await resp.json();
    console.log('[météo] Réponse /api/weather :', resp.status, data);
    storage.setItem(cleCache, JSON.stringify(data));
    return data;
  } catch (e) {
    console.log('[météo] Erreur réseau :', e.message);
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
export function enrichirSeanceAvecMeteo(seance, prevision) {
  if (!seance || !seance.contenu) return seance;
  if (!prevision?.disponible || !prevision.alerteChaleur) return seance;
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
export async function verifierMeteoPourSeance(seance, date, storage = localStorage) {
  console.log('[météo] verifierMeteoPourSeance appelée, geolocation disponible:', 'geolocation' in navigator);
  if (!('geolocation' in navigator)) return seance;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        console.log('[météo] Position obtenue:', position.coords.latitude, position.coords.longitude);
        const prevision = await recupererPrevisionMeteo({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          date
        }, storage);
        console.log('[météo] Prévision reçue:', prevision);
        resolve(enrichirSeanceAvecMeteo(seance, prevision));
      },
      (err) => {
        console.log('[météo] Échec géolocalisation:', err.message, '(code', err.code, ')');
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
