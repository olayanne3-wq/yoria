// ============================================================
// Yoria — Détection d'intervalles depuis un fichier .fit
// Module ES pur, chargé via import() dynamique par index.html, sur le
// même pattern que session-analysis.js.
//
// Contexte : adapterFitVersFormatActivite() (index.html) construit déjà
// les laps[] d'une activité importée depuis les `laps` natifs du fichier
// .fit. Ça fonctionne bien pour une montre programmée en entraînement
// structuré (Garmin/Coros — laps posés par le programme lui-même,
// lap_trigger != 'distance'), mais échoue silencieusement pour Amazfit/
// Zepp : la montre y exécute bien le programme structuré (bips, phases
// affichées), mais l'export .fit ne contient que des laps fixes tous les
// 1000m (lap_trigger: 'distance'), sans aucun rapport avec la structure
// réelle de la séance — vérifié le 03/08/2026 sur plusieurs fichiers
// réels (aucun message workout_step, aucun champ développeur lié à un
// programme d'entraînement). Cf. docs/v2-methodologie/
// import-fit-intervalles.md pour le détail de cette investigation et des
// résultats de calibration.
//
// Ce module fournit le repli : reconstruire les intervalles par
// reconnaissance de signal sur le flux record (vitesse seconde par
// seconde) quand aucun marqueur natif n'est exploitable. Calibré sur 4
// séances réelles (seuil 3×6min ×2, VMA 30-30 ×2) comparées au détail
// Strava (montre programmée en structuré côté Strava, donc laps natifs
// fiables — référence "vérité terrain" pour cette calibration).
//
// Limite connue et acceptée (cf. doc, section 3.2) : le nombre de
// répétitions détecté est fiable dans tous les cas testés (seuil 3/3 ×2,
// VMA 30-30 5/5 et 6/6, dont une répétition nettement plus faible que
// les autres dans le dernier cas), et l'allure moyenne par répétition
// individuelle est précise à ±1-2s sur les efforts longs (seuil 6min).
// Sur les efforts courts (VMA ≤ ~40s), la précision reste plus large
// (jusqu'à ±10-15s observé sur la répétition la plus difficile) — limite
// structurelle liée au bruit GPS sur des durées courtes, pas un défaut
// corrigible par un réglage supplémentaire (plusieurs approches de
// délimitation fine des bornes testées lors de la calibration Python
// initiale sans amélioration cohérente, avant que l'approche par
// segments continus — retenue ici — ne redonne un résultat globalement
// fiable). Accepté comme limite plutôt que bloquant pour cette première
// version.
// ============================================================

// ------------------------------------------------------------
// Étape 1 — Vérification des marqueurs structurés natifs.
//
// Le format FIT supporte nativement les workouts structurés
// (lap_trigger != 'distance', messages workout_step). Quand présents,
// les bornes de chaque répétition sont connues avec certitude (posées
// par la montre en temps réel) — pas besoin de détection par signal.
//
// fit-file-parser expose lap_trigger tel quel (nom de champ FIT natif,
// pas de traduction) sur chaque lap en mode cascade (mode déjà utilisé
// par chargerFitParser() dans index.html).
// ------------------------------------------------------------
export function possedeMarqueursNatifs(lapsFit) {
  if (!Array.isArray(lapsFit) || lapsFit.length === 0) return false;
  // 'session_end' est un trigger normal posé par la montre sur le tout
  // dernier lap (fin d'activité), sans rapport avec un programme
  // structuré — exclu explicitement pour éviter un faux positif (bug
  // trouvé le 03/08/2026 en test réel : les 3 fichiers de calibration
  // avaient tous 'lap_trigger: distance' sauf leur dernier lap en
  // 'session_end', ce qui faisait conclure à tort à la présence de
  // marqueurs structurés).
  const triggersIgnores = new Set(['distance', 'session_end']);
  return lapsFit.some(lap => lap.lap_trigger && !triggersIgnores.has(lap.lap_trigger));
}

// ------------------------------------------------------------
// Étape 2 — Détection par reconnaissance de signal (repli).
//
// Principe retenu après plusieurs itérations le 03/08/2026 (cf. doc,
// section 3.2) : repérer les SEGMENTS CONTINUS où la vitesse lissée
// reste au-dessus d'un seuil, avec une tolérance de courtes chutes
// (bruit GPS) sans interrompre le segment — PAS une détection par pics
// locaux (`vl[i] >= vl[i-1] && vl[i] >= vl[i+1]`), qui échoue sur les
// plateaux longs et plats (seuil 6min : un seul point exact de maximum
// local par plateau, alors qu'il faut TOUT le plateau).
//
// Un seuil et une tolérance UNIQUES ne conviennent pas aux deux régimes
// observés (testé empiriquement, pas une supposition) :
// - Seuil long (6min) : allure d'effort proche en valeur relative de
//   l'allure de récup, nécessite un seuil bas + tolérance large (pour
//   absorber de vrais ralentissements ponctuels sans casser le bloc).
// - VMA courte (30-40s) : contraste fort, nécessite un seuil élevé +
//   tolérance courte (pour ne pas fusionner deux répétitions distinctes
//   séparées d'une récup courte).
// Un réglage adapté à l'un dégrade systématiquement l'autre (testé :
// seuil bas + tolérance large sur VMA → fusionne toutes les répétitions
// en un seul bloc ; seuil élevé + tolérance courte sur seuil long →
// fragmente le plateau en dizaines de segments courts).
//
// D'où : deux jeux de paramètres distincts, sélectionnés selon
// `structureAttendue.dureeEffortSec` (connue du plan avant même de lire
// le fichier). Pas de valeur par défaut universelle qui prétendrait
// couvrir tous les cas — un troisième profil sera nécessaire quand le
// cas "allure spécifique" (contraste le plus faible, pas encore testé
// à cette date) sera calibré.
// ------------------------------------------------------------

// Fenêtre de lissage (secondes) appliquée à la vitesse brute avant
// détection des segments, pour absorber le bruit GPS ponctuel.
const FENETRE_LISSAGE_SEC = 3;

function choisirParametres(structureAttendue) {
  const duree = structureAttendue?.dureeEffortSec;
  if (duree != null && duree <= 90) {
    // VMA courte (30-30, 30-40s type) — calibré sur 2 séances réelles
    // (5/5 puis 6/6 répétitions correctement détectées, y compris une
    // répétition nettement plus faible que les autres dans le second cas).
    return { seuilVitesseMs: 3.5, toleranceCreuxSec: 4, dureeMinBlocSec: 10 };
  }
  // Seuil long (6min type) ou type inconnu — calibré sur 2 séances
  // réelles (3/3 répétitions à chaque fois, durées ~360s retrouvées à
  // quelques secondes près). Retenu comme profil par défaut : plus
  // permissif, donc moins susceptible de fragmenter à tort un effort
  // long si le type réel n'est pas connu à l'avance.
  return { seuilVitesseMs: 3.05, toleranceCreuxSec: 10, dureeMinBlocSec: 20 };
}

function lisser(valeurs, fenetre = FENETRE_LISSAGE_SEC) {
  const demi = Math.floor(fenetre / 2);
  return valeurs.map((_, i) => {
    const lo = Math.max(0, i - demi);
    const hi = Math.min(valeurs.length, i + demi + 1);
    const tranche = valeurs.slice(lo, hi);
    return tranche.reduce((a, b) => a + b, 0) / tranche.length;
  });
}

// Détecte les segments continus où la vitesse lissée dépasse le seuil,
// en tolérant de courtes chutes (bruit GPS ponctuel, ou vrai
// ralentissement bref sans que l'effort s'arrête) sans y mettre fin —
// seul un creux qui persiste au-delà de `toleranceCreuxSec` termine le
// segment. Les segments trop courts pour être un vrai effort (bruit,
// faux positif isolé) sont écartés via `dureeMinBlocSec`.
function detecterSegments(records, params) {
  const vitesses = records.map(r => r.speed ?? 0);
  const vitessesLissees = lisser(vitesses);

  const segments = [];
  let debut = null;
  let compteurSousSeuil = 0;
  for (let i = 0; i < vitessesLissees.length; i++) {
    if (vitessesLissees[i] > params.seuilVitesseMs) {
      if (debut === null) debut = i;
      compteurSousSeuil = 0;
    } else if (debut !== null) {
      compteurSousSeuil++;
      if (compteurSousSeuil > params.toleranceCreuxSec) {
        segments.push([debut, i - compteurSousSeuil]);
        debut = null;
        compteurSousSeuil = 0;
      }
    }
  }
  if (debut !== null) {
    segments.push([debut, vitessesLissees.length - 1 - compteurSousSeuil]);
  }

  return segments.filter(([d, f]) => (f - d + 1) >= params.dureeMinBlocSec);
}

// Calcule les stats d'un bloc effort (allure moyenne, FC moyenne,
// cadence) à partir des records bruts entre deux indices — moyenne des
// vitesses instantanées, cohérent avec la méthode utilisée pendant la
// calibration (deux méthodes de calcul testées en Python, résultats
// quasi identiques sur les cas testés, cf. doc section "premier test
// seuil").
//
// Cadence ajoutée le 03/08/2026 (bug trouvé au test réel : spm absent de
// l'affichage). Convention : average_cadence stocké en pas PAR JAMBE par
// minute — même convention que le reste de index.html, qui multiplie
// toujours par 2 à l'affichage pour obtenir le spm total (cf. ses deux
// seuls usages, ligne ~2618/6508 : `average_cadence*2`). Le champ
// `cadence` du flux FIT brut (fourni par fit-file-parser) est déjà dans
// cette même convention par jambe — vérifié sur les fichiers de
// calibration (valeurs ~58-90, cohérentes avec une cadence par jambe,
// pas un spm total qui serait ~160-190).
function statsBloc(records, debut, fin) {
  const tranche = records.slice(debut, fin + 1).filter(r => r.speed > 0.3);
  if (tranche.length === 0) return null;
  const vitesseMoyenne = tranche.reduce((a, r) => a + r.speed, 0) / tranche.length;
  const distance = tranche.reduce((a, r) => a + r.speed, 0); // ~1 échantillon/s
  const fcValeurs = tranche.map(r => r.hr).filter(hr => hr != null);
  const fcMoyenne = fcValeurs.length ? fcValeurs.reduce((a, b) => a + b, 0) / fcValeurs.length : null;
  const cadenceValeurs = tranche.map(r => r.cadence).filter(c => c != null);
  const cadenceMoyenne = cadenceValeurs.length ? cadenceValeurs.reduce((a, b) => a + b, 0) / cadenceValeurs.length : null;
  return {
    average_speed: vitesseMoyenne,
    average_heartrate: fcMoyenne,
    average_cadence: cadenceMoyenne,
    distance,
    moving_time: records[fin].t - records[debut].t,
  };
}

// Point d'entrée détection par signal — retourne un tableau de laps
// reconstruits, au même format que ceux produits par
// adapterFitVersFormatActivite() (average_speed, average_heartrate,
// distance, moving_time), plus lap_index pour rester compatible avec
// getLapsAffichage()/getEffortLaps() (session-analysis.js).
export function detecterIntervallesParSignal(records, structureAttendue = null) {
  if (!Array.isArray(records) || records.length === 0) return [];

  const params = choisirParametres(structureAttendue);
  const segments = detecterSegments(records, params);

  const blocs = segments
    .map(([debut, fin]) => statsBloc(records, debut, fin))
    .filter(Boolean);

  return blocs.map((b, i) => ({
    id: 'fit-detect-lap-' + i,
    lap_index: i,
    average_speed: b.average_speed,
    average_heartrate: b.average_heartrate,
    average_cadence: b.average_cadence,
    distance: b.distance,
    moving_time: b.moving_time,
  }));
}

// ------------------------------------------------------------
// Point d'entrée unique du module — à appeler depuis
// adapterFitVersFormatActivite() (index.html) à la place de
// lapsFit.map(...) quand possedeMarqueursNatifs(lapsFit) est faux.
//
// `session` : objet session tel que retourné par fit-file-parser en
// mode cascade (session.laps[].records[] disponible).
// `structureAttendue` : optionnel, cf. detecterIntervallesParSignal.
// ------------------------------------------------------------
export function construireLapsDepuisFit(session, structureAttendue = null) {
  const lapsFit = session?.laps || [];

  if (possedeMarqueursNatifs(lapsFit)) {
    // Marqueurs natifs présents : pas de détection nécessaire, laisser
    // adapterFitVersFormatActivite() traiter les laps normalement (ce
    // module ne fait rien dans ce cas — signalé par un retour null,
    // à charge de l'appelant de garder son comportement existant).
    return null;
  }

  // Reconstitue un flux records unique à partir de tous les laps (mode
  // cascade : chaque lap porte ses propres records) — nécessaire car la
  // détection doit voir la séance entière en continu, pas lap par lap
  // (un effort peut chevaucher la frontière artificielle d'un lap
  // distance-trigger à 1km).
  const t0 = lapsFit[0]?.records?.[0]?.timestamp;
  if (!t0) return [];

  const records = [];
  for (const lap of lapsFit) {
    for (const r of (lap.records || [])) {
      if (!r.timestamp) continue;
      records.push({
        t: (new Date(r.timestamp) - new Date(t0)) / 1000,
        speed: r.speed ?? r.enhanced_speed ?? 0,
        hr: r.heart_rate ?? null,
        cadence: r.cadence ?? null,
      });
    }
  }

  return detecterIntervallesParSignal(records, structureAttendue);
}
