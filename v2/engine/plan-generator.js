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

// Ajustement du ratio selon l'ampleur de l'objectif (piste ouverte de la doc, tranchée ici :
// validée concrètement sur le profil réel — un objectif modeste n'a pas besoin d'un pic de
// volume, juste de plus de temps à affiner et récupérer)
const AJUSTEMENT_RATIO_PAR_AMPLEUR = { faible: +0.15, moderee: 0, ambitieuse: -0.05 };

/**
 * Catégorise l'ampleur du gain visé (% de temps à gagner par rapport à la référence).
 * < 5% : faible (ex. profil déjà en forme, petit ajustement)
 * 5-10% : modérée
 * > 10% : ambitieuse (vrai gain de fond à construire)
 */
export function categoriserAmpleurObjectif(refTimeSeconds, objectifTimeSeconds) {
  const gain = (refTimeSeconds - objectifTimeSeconds) / refTimeSeconds;
  if (gain < 0.05) return 'faible';
  if (gain <= 0.10) return 'moderee';
  return 'ambitieuse';
}

// ---------------------------------------------------------------------------
// Section 4bis — calcul des phases à partir des dates réelles
// ---------------------------------------------------------------------------

export function computePhases({ dateDebut, dateCourse, distance, niveau, ampleurObjectif }) {
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
  const ajustement = AJUSTEMENT_RATIO_PAR_AMPLEUR[ampleurObjectif] ?? 0;
  const ratioConstruction = Math.min(0.75, Math.max(0.20, RATIO_CONSTRUCTION[niveau] + ajustement));
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

export function computeVolumeProgression({ volumeDepart, distance, niveau, totalSemaines, contraintes = [], ampleurObjectif, phases }) {
  const [plafondBas, plafondHaut] = PLAFONDS_VOLUME[distance][niveau];
  const plafondPopulation = (plafondBas + plafondHaut) / 2;
  const warnings = [];

  // Objectif modeste : pas besoin de viser le plafond de population, un plateau
  // proche du volume de départ suffit (validé sur profil réel — cf. section 4bis "piste ouverte")
  const plafond = ampleurObjectif === 'faible'
    ? Math.min(plafondPopulation, volumeDepart * 1.20)
    : plafondPopulation;

  // Durée nulle : date invalide déjà signalée par computePhases, pas la peine
  // de calculer une fausse progression ni de remonter un 2e avertissement
  if (totalSemaines <= 0) {
    return { plafond, volumesParSemaine: [], warnings };
  }

  // Garde-fou #4 : volume de départ déjà proche/au-dessus du plafond
  if (volumeDepart >= plafond * 0.9) {
    warnings.push({
      code: 'MARGE_PROGRESSION_FAIBLE',
      message: `Volume de départ (${volumeDepart}km) déjà proche du plafond visé (${plafond}km) — marge de progression réduite.`
    });
  }

  const blessureActive = contraintes.includes('blessure-active');
  const tauxMax = blessureActive ? 0.07 : 0.10; // section 7 : 5-8% au lieu de 10%

  // Semaines d'Affûtage = les N dernières du plan (phases calculées en amont,
  // avant carottage de la réacclimatation qui ne touche que la Construction)
  const semainesAffutage = phases?.find(p => p.nom === 'Affutage')?.semaines ?? 0;
  const semainesProgression = Math.max(1, totalSemaines - semainesAffutage);

  const volumesParSemaine = [];
  let peak = volumeDepart; // plus haut niveau atteint hors semaines de décharge

  // Phase Construction + Spécifique : croissance 10%/semaine sur le "peak",
  // la décharge est un creux temporaire qui ne remet pas la progression à zéro
  // (sans ça, 3 semaines à +10% suivies d'une décharge à -25% s'annulent
  // quasiment : 1,1³ × 0,75 ≈ 0,998 — le volume ne progressait jamais)
  for (let s = 1; s <= semainesProgression; s++) {
    const estDecharge = s % 4 === 0 && s > 1;
    if (s === 1) {
      volumesParSemaine.push({ semaine: 1, volumeKm: Math.round(peak * 10) / 10, estDecharge: false });
      continue;
    }
    if (estDecharge) {
      volumesParSemaine.push({ semaine: s, volumeKm: Math.round(peak * 0.75 * 10) / 10, estDecharge: true });
    } else {
      peak = Math.min(peak * (1 + tauxMax), plafond);
      volumesParSemaine.push({ semaine: s, volumeKm: Math.round(peak * 10) / 10, estDecharge: false });
    }
  }

  // Pic de volume = fin de Spécifique, juste avant l'Affûtage — c'est LA référence
  // pour juger si la progression a atteint le plafond, pas la dernière semaine du plan
  const picVolume = peak;

  // Phase Affûtage : vraie réduction progressive (section 1 : -40 à -60% au total),
  // pas une continuation de la formule de croissance
  if (semainesAffutage > 0) {
    const fractions = semainesAffutage === 1
      ? [0.55]
      : Array.from({ length: semainesAffutage }, (_, j) =>
          0.75 - (0.40 * j / (semainesAffutage - 1))
        );
    fractions.forEach((frac, j) => {
      volumesParSemaine.push({
        semaine: semainesProgression + j + 1,
        volumeKm: Math.round(picVolume * frac * 10) / 10,
        estDecharge: false,
        estAffutage: true,
        fractionPic: frac
      });
    });
  }

  // Garde-fou #5 : écart volume/plafond trop grand pour la durée disponible
  // (ne s'applique pas si l'objectif est modeste : le plafond effectif est déjà
  // recalculé au-dessus pour rester atteignable, cf. ajustement ampleurObjectif)
  // Comparé au PIC de volume (fin Spécifique), pas à la dernière semaine du plan
  // qui est en plein taper et donc toujours basse par construction.
  if (picVolume < plafond * 0.85 && !blessureActive && ampleurObjectif !== 'faible') {
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

// Distance circulaire entre deux jours (0=Lundi...6=Dimanche) : Dimanche(6) et
// Lundi(0) sont adjacents dans un vrai calendrier (écart réel de 1 jour, pas 6)
function distanceCirculaire(a, b) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 7 - diff);
}

/**
 * Place les séances de la semaine sur les jours disponibles.
 * joursDisponibles : indices 0=Lundi ... 6=Dimanche
 * modulation : sortie de appliquerContraintes() — applique le plafond de qualité
 *   et transmet les restrictions d'allure (interdireV/interdireI) sur chaque séance
 *   qualité, en attendant que le contenu réel des séances soit généré (chantier à part)
 * forcerAucuneQualite : true pendant une semaine de réacclimatation — pas de qualité,
 *   quel que soit le niveau ou le nombre de séances
 * Retourne { assignment: {jourIndex: {type, ...}}, warnings: [] }
 */
export function placerSemaine({ joursDisponibles, niveau, renforcementActif, modulation = {}, forcerAucuneQualite = false }) {
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
  const nbQualiteBase = forcerAucuneQualite ? 0 : nbQualiteFor(nb, niveau);
  const nbQualite = Math.min(
    nbQualiteBase,
    modulation.quantiteMaxQualite ?? Infinity,
    pool.length
  );
  const qualiteDays = [];

  // Garde-fou #7 : éviter la qualité veille/lendemain de la longue, sauf repli forcé
  const strictPool = pool.filter(d => distanceCirculaire(d, longueDay) !== 1);
  const candidatePool = strictPool.length >= nbQualite ? strictPool : pool;
  const usedFallbackAdjacence = candidatePool === pool && strictPool.length < nbQualite;

  let working = [...candidatePool];
  for (let q = 0; q < nbQualite; q++) {
    let best = null, bestScore = -1;
    working.forEach(d => {
      const refs = [longueDay, ...qualiteDays];
      const minDist = Math.min(...refs.map(r => distanceCirculaire(d, r)));
      if (minDist > bestScore) { bestScore = minDist; best = d; }
    });
    qualiteDays.push(best);
    working = working.filter(d => d !== best);
    pool = pool.filter(d => d !== best);
  }

  qualiteDays.forEach((d, idx) => {
    assignment[d] = { type: 'qualite', indexQualite: idx };
    if (modulation.interdireV || modulation.interdireI) {
      assignment[d].restrictionsAllure = {
        interdireV: !!modulation.interdireV,
        interdireI: !!modulation.interdireI,
        repli5KDouleurChronique: !!modulation.repli5KDouleurChronique
      };
    }
  });
  pool.forEach(d => { assignment[d] = { type: 'ef' }; });

  if (usedFallbackAdjacence) {
    warnings.push({
      code: 'REPLI_ADJACENCE_LONGUE',
      message: "Pas assez de jours disponibles pour éviter une séance qualité juste avant/après la sortie longue."
    });
  }

  // Garde-fou #6 : écart < 48h entre séances dures (y compris le dernier jour
  // de la semaine vers le premier jour de la semaine suivante, circulairement)
  const hardDays = [longueDay, ...qualiteDays].sort((a, b) => a - b);
  for (let i = 1; i < hardDays.length; i++) {
    if (hardDays[i] - hardDays[i - 1] < 2) {
      warnings.push({
        code: 'ECART_RECUPERATION_INSUFFISANT',
        message: `Moins de 48h de récupération entre deux séances dures (jours ${hardDays[i - 1]} et ${hardDays[i]}).`
      });
    }
  }
  if (hardDays.length > 1) {
    const ecartBouclage = 7 - (hardDays[hardDays.length - 1] - hardDays[0]);
    if (ecartBouclage < 2) {
      warnings.push({
        code: 'ECART_RECUPERATION_INSUFFISANT',
        message: `Moins de 48h de récupération entre la fin d'une semaine (jour ${hardDays[hardDays.length - 1]}) et le début de la suivante (jour ${hardDays[0]}).`
      });
    }
  }

  // Renforcement -> jour de repos, idéalement lendemain de la longue (correction validée)
  if (renforcementActif) {
    const lendemainLongue = (longueDay + 1) % 7;
    const jourRepos = Object.keys(assignment).length < 7 && !assignment[lendemainLongue] ? lendemainLongue : null;
    if (jourRepos !== null) {
      assignment[jourRepos] = { type: 'repos', renfo: true, contenu: 'Repos + renforcement musculaire (25-30min)', kmEstime: 0 };
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
      modulation.repli5KDouleurChronique = true;
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
// Section 8 — zone FC par défaut (formule de Tanaka, à partir de l'année de naissance)
// ---------------------------------------------------------------------------

export function computeFcMaxTanaka(anneeNaissance) {
  const age = new Date().getFullYear() - anneeNaissance;
  return Math.round(208 - 0.7 * age);
}

// ---------------------------------------------------------------------------
// Section 2 (bibliothèque de séances) — contenu concret des séances qualité
// ---------------------------------------------------------------------------

// Rotation des sous-types de séance qualité par distance et par phase.
// Cycle sur (semaineDansPhase + index de la séance qualité dans la semaine).
const ROTATION_SOUS_TYPE = {
  '5K': {
    Reacclimatation: [],
    Construction: ['cotes', 'i-30-30'],
    Specifique: ['i-3min', 'vitesse'],
    Affutage: ['vitesse', 'i-3min']
  },
  '10K': {
    Reacclimatation: [],
    Construction: ['seuil-court', 'i-30-30'],
    Specifique: ['i-3min', 'seuil'],
    Affutage: ['allure-course', 'seuil-court']
  },
  'Semi': {
    Reacclimatation: [],
    Construction: ['tempo-court', 'fartlek'],
    Specifique: ['seuil', 'i-3min', 'allure-course'],
    Affutage: ['allure-course-court']
  },
  'Marathon': {
    Reacclimatation: [],
    Construction: ['tempo-court', 'seuil-court'],
    Specifique: ['seuil', 'allure-course'],
    Affutage: ['tempo-court']
  }
};

// Repli si V ou I sont interdits par une contrainte (section 7) : on ne supprime
// pas la séance, on descend d'un cran vers un sous-type moins intense
const REPLI_SOUS_TYPE = {
  'vitesse': 'i-3min',
  'i-3min': 'seuil',
  'i-30-30': 'seuil-court',
  'cotes': 'seuil-court'
};

function reduireSelonNiveauProgression(base, increment, cap, semaineDansPhase) {
  return Math.min(cap, base + Math.floor(semaineDansPhase / 3) * increment);
}

function resoudreSousType(sousType, restrictionsAllure) {
  if (!restrictionsAllure) return sousType;
  let resolved = sousType;
  const estV = t => t === 'vitesse';
  const estI = t => t === 'i-3min' || t === 'i-30-30';
  let iterations = 0;
  while (
    ((restrictionsAllure.interdireV && estV(resolved)) ||
     (restrictionsAllure.interdireI && estI(resolved))) &&
    REPLI_SOUS_TYPE[resolved] && iterations < 5
  ) {
    resolved = REPLI_SOUS_TYPE[resolved];
    iterations++;
  }
  return resolved;
}

/**
 * Génère la structure concrète d'une séance qualité (texte affichable).
 * alluresSec : allures en secondes/km (sortie de computeAllures, avant formatage)
 */
export function genererContenuQualite({ distance, phase, semaineDansPhase, indexQualiteSemaine, alluresSec, restrictionsAllure, tauxAffutage = 1 }) {
  const rotation = ROTATION_SOUS_TYPE[distance]?.[phase] ?? ['seuil'];
  if (rotation.length === 0) return { sousType: null, contenu: 'EF (réacclimatation, pas de qualité cette semaine)', kmEstime: 0 };

  const sousTypeBrut = rotation[(semaineDansPhase + indexQualiteSemaine) % rotation.length];
  const sousType = resoudreSousType(sousTypeBrut, restrictionsAllure);

  const T = alluresSec.T, I = alluresSec.I, V = alluresSec.V, C = alluresSec.C;
  // km à partir d'une durée en minutes à une allure donnée (sec/km)
  const kmDepuisMinutes = (min, paceSecParKm) => (min * 60) / paceSecParKm;

  // Pendant l'Affûtage, les répétitions/durée se réduisent proportionnellement
  // au taper (même fraction que le volume hebdo, section 6/18), avec un
  // plancher minimum pour garder un vrai stimulus — sans ça, les séances
  // qualité gardaient presque leur volume de Spécifique alors que le reste
  // de la semaine se réduisait, écrasant les EF (trouvé en usage réel).
  const ajuster = (valeur, floor) =>
    phase === 'Affutage' ? Math.max(floor, Math.round(valeur * tauxAffutage)) : valeur;

  switch (sousType) {
    case 'seuil-court': {
      const reps = ajuster(reduireSelonNiveauProgression(3, 1, 5, semaineDansPhase), 2);
      const kmEstime = kmDepuisMinutes(reps * 6, T);
      return { sousType, contenu: `${reps}×6min @ ${formatPace(T)} (Seuil), récup 90s`, kmEstime };
    }
    case 'seuil': {
      const reps = ajuster(reduireSelonNiveauProgression(3, 1, 5, semaineDansPhase), 2);
      const kmEstime = kmDepuisMinutes(reps * 8, T);
      return { sousType, contenu: `${reps}×8min @ ${formatPace(T)} (Seuil), récup 2min`, kmEstime };
    }
    case 'i-30-30': {
      const series = ajuster(reduireSelonNiveauProgression(2, 1, 3, semaineDansPhase), 1);
      // 8×30″ effort par série ; on ignore les 30″ de récup (approximation assumée)
      const kmEstime = kmDepuisMinutes(series * 8 * 0.5, I);
      return { sousType, contenu: `${series}×8×30″-30″ @ ${formatPace(I)} (VMA)`, kmEstime };
    }
    case 'i-3min': {
      const reps = ajuster(reduireSelonNiveauProgression(4, 1, 6, semaineDansPhase), 2);
      const kmEstime = kmDepuisMinutes(reps * 3, I);
      return { sousType, contenu: `${reps}×3min @ ${formatPace(I)} (VMA), récup 2min`, kmEstime };
    }
    case 'vitesse': {
      const reps = ajuster(reduireSelonNiveauProgression(6, 1, 10, semaineDansPhase), 3);
      const kmEstime = reps * 0.3; // distance directement connue (300m)
      return { sousType, contenu: `${reps}×300m @ ${formatPace(V)} (Vitesse), récupération complète`, kmEstime };
    }
    case 'cotes': {
      const reps = ajuster(reduireSelonNiveauProgression(6, 1, 10, semaineDansPhase), 3);
      const kmEstime = kmDepuisMinutes(reps * 0.5, V); // approximation : allure proche du V
      return { sousType, contenu: `${reps}×30s en côte (effort soutenu), récupération trot`, kmEstime };
    }
    case 'allure-course': {
      const reps = ajuster(reduireSelonNiveauProgression(3, 1, 5, semaineDansPhase), 2);
      const kmEstime = kmDepuisMinutes(reps * 5, C);
      return { sousType, contenu: `${reps}×5min @ ${formatPace(C)} (allure course), récup 2min`, kmEstime };
    }
    case 'allure-course-court': {
      const reps = ajuster(reduireSelonNiveauProgression(2, 1, 3, semaineDansPhase), 1);
      const kmEstime = kmDepuisMinutes(reps * 3, C);
      return { sousType, contenu: `${reps}×3min @ ${formatPace(C)} (allure course), récup 2min`, kmEstime };
    }
    case 'tempo-court': {
      const duree = ajuster(reduireSelonNiveauProgression(20, 5, 35, semaineDansPhase), 10);
      const kmEstime = kmDepuisMinutes(duree, T);
      return { sousType, contenu: `${duree}min continu @ ${formatPace(T)} (Seuil léger)`, kmEstime };
    }
    case 'fartlek': {
      const reps = ajuster(reduireSelonNiveauProgression(4, 1, 8, semaineDansPhase), 3);
      // Portions rapides comptées à l'allure T, portions faciles ignorées dans
      // l'estimation km (approximation assumée, comme pour i-30-30)
      const kmEstime = kmDepuisMinutes(reps * 2, T);
      return { sousType, contenu: `${reps}×2min rapide (${formatPace(T)}) / 2min facile, en continu (fartlek)`, kmEstime };
    }
    default: {
      const kmEstime = kmDepuisMinutes(24, T);
      return { sousType: 'seuil', contenu: `3×8min @ ${formatPace(T)} (Seuil), récup 2min`, kmEstime };
    }
  }
}

// Durée max raisonnable par séance, au-delà de laquelle on plafonne plutôt que
// de générer une séance disproportionnée (garde-fou révélé par la réconciliation
// volume/durée : sans ça, un volume hebdo élevé réparti sur peu de séances
// produisait des EF de 100+ minutes)
const DUREE_MAX_EF_MIN = 75;
const DUREE_MAX_LONGUE_MIN = { '5K': 90, '10K': 90, 'Semi': 120, 'Marathon': 150 };

/**
 * EF et sortie longue : la durée est dérivée du volume hebdo cible
 * (volumeCibleKm), une fois retiré le kilométrage déjà consommé par les
 * séances qualité de la semaine — voir répartirVolumeSemaine(). Plafonnée à
 * une durée max raisonnable ; l'excédent éventuel est signalé, pas caché.
 * Approximation assumée : échauffement/retour au calme et jogs de récupération
 * ne sont pas comptés séparément, ils sont absorbés dans l'allure EF globale.
 */
export function genererContenuEF({ alluresSec, kmCible, role = 'standard' }) {
  const dureeMinBrut = (kmCible * alluresSec.E) / 60;
  const dureeMin = Math.round(Math.min(dureeMinBrut, DUREE_MAX_EF_MIN));
  const kmEffectif = (dureeMin * 60) / alluresSec.E;
  const warning = dureeMinBrut > DUREE_MAX_EF_MIN + 1
    ? { code: 'SEANCE_EF_PLAFONNEE', message: `Séance EF plafonnée à ${DUREE_MAX_EF_MIN}min (${Math.round(dureeMinBrut)}min auraient été nécessaires pour caser tout le volume) — trop peu de séances/semaine pour ce volume cible.` }
    : null;
  const labelRole = role === 'recuperation' ? ' (récupération)' : '';
  return { contenu: `${dureeMin}min à allure EF${labelRole} (${formatPace(alluresSec.E)}) — ${Math.round(kmEffectif * 10) / 10}km`, kmEstime: kmEffectif, warning };
}

export function genererContenuLongue({ distance, phase, alluresSec, kmCible }) {
  const dureeMaxMin = DUREE_MAX_LONGUE_MIN[distance] ?? 120;
  const avecSegmentCourse = (distance === 'Semi' || distance === 'Marathon') &&
    (phase === 'Specifique' || phase === 'Affutage');

  const dureeBruteMin = (kmCible * alluresSec.E) / 60; // estimation avant plafond, allure EF globale
  const kmCiblePlafonne = dureeBruteMin > dureeMaxMin ? (dureeMaxMin * 60) / alluresSec.E : kmCible;
  const warning = dureeBruteMin > dureeMaxMin + 1
    ? { code: 'SEANCE_LONGUE_PLAFONNEE', message: `Sortie longue plafonnée à ${dureeMaxMin}min (${Math.round(dureeBruteMin)}min auraient été nécessaires pour caser tout le volume) — trop peu de séances/semaine pour ce volume cible.` }
    : null;

  if (avecSegmentCourse) {
    const kmSegmentCourse = Math.round(kmCiblePlafonne * 0.25 * 10) / 10;
    const kmEF = Math.round((kmCiblePlafonne - kmSegmentCourse) * 10) / 10;
    const dureeSegmentMin = Math.round((kmSegmentCourse * alluresSec.C) / 60);
    const dureeEFMin = Math.round((kmEF * alluresSec.E) / 60);
    return {
      contenu: `${dureeEFMin}min à allure EF (${formatPace(alluresSec.E)}), dont ${dureeSegmentMin}min @ ${formatPace(alluresSec.C)} (allure course) en fin de sortie — ${Math.round(kmCiblePlafonne * 10) / 10}km au total`,
      kmEstime: kmCiblePlafonne,
      warning
    };
  }

  const dureeMin = Math.round((kmCiblePlafonne * alluresSec.E) / 60);
  return { contenu: `${dureeMin}min à allure EF (${formatPace(alluresSec.E)}) — ${Math.round(kmCiblePlafonne * 10) / 10}km`, kmEstime: kmCiblePlafonne, warning };
}

/**
 * Répartit le volume hebdo cible entre les séances de la semaine : la sortie
 * longue reçoit ~40% du volume restant après les séances qualité, les EF se
 * partagent le reste à parts égales. La somme reste toujours égale au volume
 * cible (pas de plancher artificiel qui la dépasserait) — si ça donne des
 * séances dérisoires, un avertissement le signale plutôt que de gonfler
 * silencieusement le total réel.
 */
export function repartirVolumeSemaine({ volumeCibleKm, kmQualiteTotal, nbEF, aLongue }) {
  const kmRestant = Math.max(0, volumeCibleKm - kmQualiteTotal);
  let kmLongue = 0, kmParEF = 0;

  // Ratio Daniels : la sortie longue ne devrait jamais dépasser 25-30% du
  // volume hebdo TOTAL, quelle que soit la distance visée (5K ou marathon) —
  // pas de variation par distance ici, la règle est volontairement universelle.
  const RATIO_LONGUE = 0.28;

  if (aLongue) {
    kmLongue = Math.min(volumeCibleKm * RATIO_LONGUE, kmRestant);
    const kmRestantApresLongue = kmRestant - kmLongue;
    kmParEF = nbEF > 0 ? kmRestantApresLongue / nbEF : 0;
  } else {
    kmParEF = nbEF > 0 ? kmRestant / nbEF : 0;
  }

  let warning = null;
  const seanceMinKm = Math.min(aLongue ? kmLongue : Infinity, nbEF > 0 ? kmParEF : Infinity);
  if (kmRestant > 0 && seanceMinKm < 3) {
    warning = {
      code: 'VOLUME_HEBDO_TROP_FAIBLE_POUR_REPARTITION',
      message: `Volume hebdo restant (${Math.round(kmRestant * 10) / 10}km) trop faible pour des séances EF/longue substantielles.`
    };
  }

  return { kmLongue, kmParEF, warning };
}

/**
 * Différencie les séances EF entre elles selon leur position dans la semaine :
 * une EF qui suit directement une séance dure (qualité ou longue) devient une
 * EF de récupération plus courte ; les autres restent "standard". Le total
 * reste égal à kmParEF × nbEF (pas de nouvelle incohérence avec le volume cible).
 */
function differencierEF({ assignment, kmParEF }) {
  const efDays = Object.entries(assignment).filter(([, s]) => s.type === 'ef').map(([j]) => parseInt(j));
  const hardDays = Object.entries(assignment).filter(([, s]) => s.type === 'qualite' || s.type === 'longue').map(([j]) => parseInt(j));

  if (efDays.length <= 1) {
    return Object.fromEntries(efDays.map(j => [j, { role: 'standard', kmCible: kmParEF }]));
  }

  // "Récupération" = le jour suit directement (circulairement) une séance dure
  const estRecuperation = j => hardDays.some(h => (j - h + 7) % 7 === 1);
  const roles = Object.fromEntries(efDays.map(j => [j, estRecuperation(j) ? 'recuperation' : 'standard']));

  const POIDS = { recuperation: 0.75, standard: 1.0 };
  const sommePoids = efDays.reduce((acc, j) => acc + POIDS[roles[j]], 0);
  const kmTotal = kmParEF * efDays.length;

  return Object.fromEntries(efDays.map(j => [
    j,
    { role: roles[j], kmCible: sommePoids > 0 ? (kmTotal * POIDS[roles[j]]) / sommePoids : kmParEF }
  ]));
}

// ---------------------------------------------------------------------------
// Orchestrateur — assemble tout en un Plan conforme au schéma (section 9)
// ---------------------------------------------------------------------------

export function generatePlan(profil, params) {
  const distanceKm = KM_BY_DISTANCE[params.distance];
  const refTimeSeconds = parseTimeToSeconds(params.tempsReference);
  const objectifTimeSeconds = parseTimeToSeconds(params.objectif);
  const ampleurObjectif = categoriserAmpleurObjectif(refTimeSeconds, objectifTimeSeconds);

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
    niveau: profil.niveau,
    ampleurObjectif
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
    contraintes: params.contraintesPonctuelles ?? [],
    ampleurObjectif,
    phases
  });

  // Carotte les semaines de réacclimatation (contrainte "reprise") sur le budget
  // Construction, plutôt que d'allonger le plan (durée totale fixée par les dates)
  const semainesReacclimatation = Math.min(
    Math.ceil(modulation.semainesReacclimatation),
    Math.max(0, (phases.find(p => p.nom === 'Construction')?.semaines ?? 1) - 1)
  );
  const phasesAvecReacclimatation = [];
  for (const phase of phases) {
    if (phase.nom === 'Construction' && semainesReacclimatation > 0) {
      phasesAvecReacclimatation.push({ nom: 'Reacclimatation', semaines: semainesReacclimatation });
      phasesAvecReacclimatation.push({ nom: 'Construction', semaines: phase.semaines - semainesReacclimatation });
    } else {
      phasesAvecReacclimatation.push(phase);
    }
  }

  const semaines = [];
  const warningsSemaines = [];
  let semaineGlobale = 0;
  for (const phase of phasesAvecReacclimatation) {
    for (let i = 0; i < phase.semaines; i++) {
      semaineGlobale++;
      const { assignment, warnings: warningsPlacement } = placerSemaine({
        joursDisponibles: profil.joursDisponiblesHabituels,
        niveau: profil.niveau,
        renforcementActif: profil.renforcementMusculaire,
        modulation,
        forcerAucuneQualite: phase.nom === 'Reacclimatation'
      });

      // Contenu concret de chaque séance (section 2 — bibliothèque)
      // 1ère passe : générer les séances qualité et cumuler leur km estimé
      let kmQualiteTotal = 0;
      const tauxAffutageSemaine = volumesParSemaine[semaineGlobale - 1]?.fractionPic ?? 1;
      for (const [jour, seance] of Object.entries(assignment)) {
        if (seance.type === 'qualite') {
          const { sousType, contenu, kmEstime } = genererContenuQualite({
            distance: params.distance,
            phase: phase.nom,
            semaineDansPhase: i,
            indexQualiteSemaine: seance.indexQualite ?? 0,
            alluresSec: allSeconds,
            restrictionsAllure: seance.restrictionsAllure,
            tauxAffutage: tauxAffutageSemaine
          });
          seance.sousType = sousType;
          seance.contenu = contenu;
          seance.kmEstime = kmEstime;
          kmQualiteTotal += kmEstime;
        }
      }

      // 2e passe : répartir le volume restant entre longue et EF
      const nbEF = Object.values(assignment).filter(s => s.type === 'ef').length;
      const aLongue = Object.values(assignment).some(s => s.type === 'longue');
      const volumeCibleSemaine = volumesParSemaine[semaineGlobale - 1]?.volumeKm ?? 0;
      const { kmLongue, kmParEF, warning: warningRepartition } = repartirVolumeSemaine({
        volumeCibleKm: volumeCibleSemaine,
        kmQualiteTotal,
        nbEF,
        aLongue
      });
      if (warningRepartition && phase.nom !== 'Affutage') {
        warningsSemaines.push({ ...warningRepartition, message: `S${semaineGlobale} : ${warningRepartition.message}` });
      }

      const roleParJourEF = differencierEF({ assignment, kmParEF });

      for (const [jour, seance] of Object.entries(assignment)) {
        if (seance.type === 'ef') {
          const jourNum = parseInt(jour);
          const { role, kmCible } = roleParJourEF[jourNum] ?? { role: 'standard', kmCible: kmParEF };
          const { contenu, kmEstime, warning } = genererContenuEF({ alluresSec: allSeconds, kmCible, role });
          seance.contenu = contenu;
          seance.kmEstime = kmEstime;
          seance.role = role;
          if (warning) warningsSemaines.push({ ...warning, message: `S${semaineGlobale} (jour ${jour}) : ${warning.message}` });
        } else if (seance.type === 'longue') {
          const { contenu, kmEstime, warning } = genererContenuLongue({
            distance: params.distance, phase: phase.nom, alluresSec: allSeconds, kmCible: kmLongue
          });
          seance.contenu = contenu;
          seance.kmEstime = kmEstime;
          if (warning) warningsSemaines.push({ ...warning, message: `S${semaineGlobale} : ${warning.message}` });
        }
      }

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
    ...semaines.flatMap(s => s.warnings),
    ...warningsSemaines
  ];

  return {
    distance: params.distance,
    objectif: params.objectif,
    ampleurObjectif,
    dateDebut: params.dateDebut,
    dateCourse: params.dateCourse,
    dureeSemaines: totalSemaines,
    phases: phasesAvecReacclimatation,
    allures,
    zoneFC: profil.anneeNaissance ? { methode: 'tanaka', fcMax: computeFcMaxTanaka(profil.anneeNaissance) } : null,
    volumePlafondKm: plafond,
    semaines,
    warnings
  };
}
