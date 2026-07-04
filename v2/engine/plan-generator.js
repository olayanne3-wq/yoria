/**
 * plan-generator.js
 * Moteur de génération de plan — Run by Léa v2.0
 *
 * Implémente les sections 2, 4bis, 5, 6, 7, 9 et 10 de bibliotheque-seances.md.
 * Module pur (aucune dépendance DOM) — testable en isolation.
 *
 * Convention : toutes les allures sont manipulées en secondes/km en interne,
 * formatées en "m:ss/km" uniquement à l'affichage (formatPace).
 */

// ---------------------------------------------------------------------------
// Utilitaires de temps / allure
// ---------------------------------------------------------------------------

export function parseTimeToSeconds(str) {
  // "50:21" -> 3021 ; "1:52:00" -> 6720
  const parts = str.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  throw new Error(`Format de temps invalide: ${str}`);
}

export function formatPace(secPerKm) {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

export function paceFromTime(totalSeconds, distanceKm) {
  return totalSeconds / distanceKm;
}

// Formule de Riegel : prédit un temps sur d2 à partir d'un temps connu sur d1
export function riegelPredict(t1Seconds, d1Km, d2Km) {
  return t1Seconds * Math.pow(d2Km / d1Km, 1.06);
}

const KM_BY_DISTANCE = { '5K': 5, '10K': 10, 'Semi': 21.1, 'Marathon': 42.2 };

// ---------------------------------------------------------------------------
// Section 6 (zones d'allure) — ratios calibrés sur le plan réel validé
// (Laurent V., 10K réf 50'21" -> allures observées EF/Seuil/VMA)
// ---------------------------------------------------------------------------

const PACE_RATIOS = {
  recup: 1.33,
  E: 1.225,   // milieu de la fourchette observée 1.19-1.26
  T: 0.99,
  I: 0.855,
  V: 0.80
};

/**
 * Calcule les zones d'allure à partir d'une performance de référence
 * (n'importe quelle distance), normalisée en équivalent 10K via Riegel.
 * La zone C (allure course objectif) est calculée séparément à partir
 * de l'objectif, pas de la référence (section 6 corrigée).
 */
export function computeAllures({ refTimeSeconds, refDistanceKm, objectifTimeSeconds, distanceCibleKm }) {
  const paceRef10k = paceFromTime(riegelPredict(refTimeSeconds, refDistanceKm, 10), 10);

  const allures = {};
  for (const [zone, ratio] of Object.entries(PACE_RATIOS)) {
    allures[zone] = paceRef10k * ratio;
  }
  allures.C = paceFromTime(objectifTimeSeconds, distanceCibleKm);
  return allures; // secondes/km par zone
}

// ---------------------------------------------------------------------------
// Section 2 — plafonds de volume hebdo par distance et niveau (km/sem)
// ---------------------------------------------------------------------------

export const PLAFONDS_VOLUME = {
  '5K':       { debutant: [20, 25], intermediaire: [25, 35], confirme: [35, 45] },
  '10K':      { debutant: [25, 35], intermediaire: [35, 50], confirme: [50, 65] },
  'Semi':     { debutant: [35, 45], intermediaire: [45, 60], confirme: [60, 80] },
  'Marathon': { debutant: [35, 40], intermediaire: [45, 55], confirme: [55, 70] }
};

// Durée fixe de l'Affûtage (jours), section 4bis / validée section "10 jours pour 10K"
export const DUREE_AFFUTAGE_JOURS = {
  '5K': 7,
  '10K': 10,
  'Semi': 10,       // milieu de la fourchette 7-14j
  'Marathon': 18    // milieu de la fourchette 14-21j (2-3 semaines)
};

// Ratio Construction / Spécifique du temps restant après Affûtage, par niveau
const RATIO_CONSTRUCTION = { debutant: 0.55, intermediaire: 0.40, confirme: 0.30 };

// ---------------------------------------------------------------------------
// Section 4bis — calcul des phases à partir des dates réelles
// ---------------------------------------------------------------------------

export function computePhases({ dateDebut, dateCourse, distance, niveau }) {
  const debut = new Date(dateDebut);
  const course = new Date(dateCourse);
  const totalJours = Math.round((course - debut) / 86400000);
  const totalSemaines = Math.max(1, Math.round(totalJours / 7));

  const warnings = [];
  if (totalJours < 0) {
    warnings.push({ code: 'DATE_INVALIDE', message: "La date de course doit être après le début du plan." });
    return { totalSemaines: 0, phases: [], warnings };
  }

  const affutageJours = DUREE_AFFUTAGE_JOURS[distance];
  // Arrondi au supérieur : mieux vaut un peu plus de taper qu'un plan qui le sous-dimensionne
  // (le modèle reste en semaines entières — un vrai découpage au jour près est un chantier à part)
  const affutageSemaines = Math.max(1, Math.ceil(affutageJours / 7));
  const resteJours = totalJours - affutageJours;

  // Garde-fou #3 : durée de plan trop courte (checklist section 10)
  if (resteJours < 21) {
    warnings.push({
      code: 'DUREE_PLAN_TROP_COURTE',
      message: `${totalSemaines} semaines avant course : ce plan sera essentiellement un maintien, pas une vraie progression.`
    });
  }

  const resteSemaines = Math.max(0, totalSemaines - affutageSemaines);
  const ratioConstruction = RATIO_CONSTRUCTION[niveau];
  const constructionSemaines = Math.max(1, Math.round(resteSemaines * ratioConstruction));
  const specifiqueSemaines = Math.max(0, resteSemaines - constructionSemaines);

  return {
    totalSemaines,
    phases: [
      { nom: 'Construction', semaines: constructionSemaines },
      { nom: 'Specifique', semaines: specifiqueSemaines },
      { nom: 'Affutage', semaines: affutageSemaines, dureeFixe: true }
    ],
    warnings
  };
}

// ---------------------------------------------------------------------------
// Section 6 — progression du volume (règle des 10%, décharge tous les 3-4 sem)
// ---------------------------------------------------------------------------

export function computeVolumeProgression({ volumeDepart, distance, niveau, totalSemaines, contraintes = [] }) {
  const [plafondBas, plafondHaut] = PLAFONDS_VOLUME[distance][niveau];
  const plafond = (plafondBas + plafondHaut) / 2;
  const warnings = [];

  // Garde-fou #4 : volume de départ déjà proche/au-dessus du plafond
  if (volumeDepart >= plafond * 0.9) {
    warnings.push({
      code: 'MARGE_PROGRESSION_FAIBLE',
      message: `Volume de départ (${volumeDepart}km) déjà proche du plafond visé (${plafond}km) — marge de progression réduite.`
    });
  }

  const blessureActive = contraintes.includes('blessure-active');
  const tauxMax = blessureActive ? 0.07 : 0.10; // section 7 : 5-8% au lieu de 10%

  const volumesParSemaine = [];
  let volumeCourant = volumeDepart;
  for (let s = 1; s <= totalSemaines; s++) {
    const estDecharge = s % 4 === 0; // décharge toutes les 4 semaines (section 1)
    if (s > 1) {
      volumeCourant = estDecharge
        ? volumesParSemaine[s - 2].volumeKm * 0.75 // -25%, milieu de la fourchette 20-30%
        : Math.min(volumeCourant * (1 + tauxMax), plafond);
    }
    volumesParSemaine.push({ semaine: s, volumeKm: Math.round(volumeCourant * 10) / 10, estDecharge });
  }

  // Garde-fou #5 : écart volume/plafond trop grand pour la durée disponible
  const volumeFinConstruction = volumesParSemaine[volumesParSemaine.length - 1].volumeKm;
  if (volumeFinConstruction < plafond * 0.85 && !blessureActive) {
    warnings.push({
      code: 'PROGRESSION_INSUFFISANTE',
      message: "L'écart entre le volume de départ et le plafond visé est trop grand pour la durée du plan, même en respectant la règle des 10%."
    });
  }

  return { plafond, volumesParSemaine, warnings };
}

// ---------------------------------------------------------------------------
// Section 5 — nombre de séances qualité et placement dans la semaine
// ---------------------------------------------------------------------------

export function nbQualiteFor(nbSeances, niveau) {
  if (nbSeances <= 4) return nbSeances >= 2 ? 1 : 0;
  if (nbSeances === 5) return niveau === 'debutant' ? 1 : 2;
  return 2; // 6+
}

function pickLongueDay(joursDisponibles) {
  if (joursDisponibles.includes(6)) return 6; // Dimanche
  if (joursDisponibles.includes(5)) return 5; // Samedi
  return Math.max(...joursDisponibles);
}

/**
 * Place les séances de la semaine sur les jours disponibles.
 * joursDisponibles : indices 0=Lundi ... 6=Dimanche
 * Retourne { assignment: {jourIndex: {type, ...}}, warnings: [] }
 */
export function placerSemaine({ joursDisponibles, niveau, renforcementActif }) {
  const days = [...joursDisponibles].sort((a, b) => a - b);
  const nb = days.length;
  const warnings = [];
  const assignment = {};

  if (nb < 2) {
    warnings.push({ code: 'JOURS_INSUFFISANTS', message: 'Au moins 2 jours disponibles sont nécessaires.' });
    return { assignment, warnings };
  }

  const longueDay = pickLongueDay(days);
  assignment[longueDay] = { type: 'longue' };

  let pool = days.filter(d => d !== longueDay);
  const nbQualite = Math.min(nbQualiteFor(nb, niveau), pool.length);
  const qualiteDays = [];

  // Garde-fou #7 : éviter la qualité veille/lendemain de la longue, sauf repli forcé
  const strictPool = pool.filter(d => Math.abs(d - longueDay) !== 1);
  const candidatePool = strictPool.length >= nbQualite ? strictPool : pool;
  const usedFallbackAdjacence = candidatePool === pool && strictPool.length < nbQualite;

  let working = [...candidatePool];
  for (let q = 0; q < nbQualite; q++) {
    let best = null, bestScore = -1;
    working.forEach(d => {
      const refs = [longueDay, ...qualiteDays];
      const minDist = Math.min(...refs.map(r => Math.abs(d - r)));
      if (minDist > bestScore) { bestScore = minDist; best = d; }
    });
    qualiteDays.push(best);
    working = working.filter(d => d !== best);
    pool = pool.filter(d => d !== best);
  }

  qualiteDays.forEach(d => { assignment[d] = { type: 'qualite' }; });
  pool.forEach(d => { assignment[d] = { type: 'ef' }; });

  if (usedFallbackAdjacence) {
    warnings.push({
      code: 'REPLI_ADJACENCE_LONGUE',
      message: "Pas assez de jours disponibles pour éviter une séance qualité juste avant/après la sortie longue."
    });
  }

  // Garde-fou #6 : écart < 48h entre séances dures
  const hardDays = [longueDay, ...qualiteDays].sort((a, b) => a - b);
  for (let i = 1; i < hardDays.length; i++) {
    if (hardDays[i] - hardDays[i - 1] < 2) {
      warnings.push({
        code: 'ECART_RECUPERATION_INSUFFISANT',
        message: `Moins de 48h de récupération entre deux séances dures (jours ${hardDays[i - 1]} et ${hardDays[i]}).`
      });
    }
  }

  // Renforcement -> jour de repos, idéalement lendemain de la longue (correction validée)
  if (renforcementActif) {
    const lendemainLongue = (longueDay + 1) % 7;
    const jourRepos = Object.keys(assignment).length < 7 && !assignment[lendemainLongue] ? lendemainLongue : null;
    if (jourRepos !== null) {
      assignment[jourRepos] = { type: 'repos', renfo: true };
    }
  }

  return { assignment, warnings };
}

// ---------------------------------------------------------------------------
// Section 7 — modulation par contraintes
// ---------------------------------------------------------------------------

const DUREE_REACCLIMATATION_SEMAINES = {
  '2-4sem': 0,
  '1-3mois': 1,
  '3-6mois': 2,
  '6mois+': 3.5
};

export function appliquerContraintes({ contraintes, repriseDuree, distance }) {
  const modulation = {
    tauxProgressionMax: 0.10,
    quantiteMaxQualite: null, // null = pas de plafond spécifique
    interdireV: false,
    interdireI: false,
    semainesReacclimatation: 0,
    desactiverEstimationStrava: false,
    warnings: []
  };

  if (contraintes.includes('blessure-active')) {
    modulation.tauxProgressionMax = 0.07;
    modulation.interdireV = true;
    modulation.interdireI = true;
    modulation.warnings.push({
      code: 'BLESSURE_ACTIVE',
      message: "Aucune séance V/I pendant les 2-3 premières semaines. Avis professionnel recommandé avant de reprendre l'intensité."
    });
  }

  if (contraintes.includes('douleur-chronique')) {
    modulation.quantiteMaxQualite = 1;
    modulation.interdireV = true;
    // Cas particulier 5K (section 7 corrigée) : repli sur I plutôt que suppression pure
    if (distance === '5K') {
      modulation.warnings.push({
        code: 'REPLI_5K_DOULEUR_CHRONIQUE',
        message: "V contre-indiqué pour un plan 5K : repli sur I (VMA) plus soutenu pour garder un stimulus de vitesse."
      });
    }
  }

  if (contraintes.includes('reprise')) {
    modulation.semainesReacclimatation = DUREE_REACCLIMATATION_SEMAINES[repriseDuree] ?? 1;
    if (repriseDuree !== '2-4sem') {
      modulation.desactiverEstimationStrava = true;
      modulation.warnings.push({
        code: 'STRAVA_DESACTIVE_REPRISE',
        message: "Estimation Strava désactivée (biais probable) — saisie manuelle du volume de départ requise."
      });
    }
  }

  return modulation;
}

// ---------------------------------------------------------------------------
// Orchestrateur — assemble tout en un Plan conforme au schéma (section 9)
// ---------------------------------------------------------------------------

export function generatePlan(profil, params) {
  const distanceKm = KM_BY_DISTANCE[params.distance];
  const refTimeSeconds = parseTimeToSeconds(params.tempsReference);
  const objectifTimeSeconds = parseTimeToSeconds(params.objectif);

  const allSeconds = computeAllures({
    refTimeSeconds,
    refDistanceKm: KM_BY_DISTANCE[params.refDistance ?? params.distance],
    objectifTimeSeconds,
    distanceCibleKm: distanceKm
  });
  const allures = Object.fromEntries(
    Object.entries(allSeconds).map(([k, v]) => [k, formatPace(v)])
  );

  const { totalSemaines, phases, warnings: warningsPhases } = computePhases({
    dateDebut: params.dateDebut,
    dateCourse: params.dateCourse,
    distance: params.distance,
    niveau: profil.niveau
  });

  const modulation = appliquerContraintes({
    contraintes: params.contraintesPonctuelles ?? [],
    repriseDuree: params.repriseDuree,
    distance: params.distance
  });

  const { plafond, volumesParSemaine, warnings: warningsVolume } = computeVolumeProgression({
    volumeDepart: params.volumeActuel,
    distance: params.distance,
    niveau: profil.niveau,
    totalSemaines,
    contraintes: params.contraintesPonctuelles ?? []
  });

  const semaines = [];
  let semaineGlobale = 0;
  for (const phase of phases) {
    for (let i = 0; i < phase.semaines; i++) {
      semaineGlobale++;
      const { assignment, warnings: warningsPlacement } = placerSemaine({
        joursDisponibles: profil.joursDisponiblesHabituels,
        niveau: profil.niveau,
        renforcementActif: profil.renforcementMusculaire
      });
      semaines.push({
        semaineNum: semaineGlobale,
        phase: phase.nom,
        volumeCibleKm: volumesParSemaine[semaineGlobale - 1]?.volumeKm ?? null,
        estDechargeSemaine: volumesParSemaine[semaineGlobale - 1]?.estDecharge ?? false,
        assignment,
        warnings: warningsPlacement
      });
    }
  }

  const warnings = [
    ...warningsPhases,
    ...warningsVolume,
    ...modulation.warnings,
    ...semaines.flatMap(s => s.warnings)
  ];

  return {
    distance: params.distance,
    objectif: params.objectif,
    dateDebut: params.dateDebut,
    dateCourse: params.dateCourse,
    dureeSemaines: totalSemaines,
    phases,
    allures,
    volumePlafondKm: plafond,
    semaines,
    warnings
  };
}
