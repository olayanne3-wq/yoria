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

export const KM_BY_DISTANCE = { '5K': 5, '10K': 10, 'Semi': 21.1, 'Marathon': 42.2 };

// ---------------------------------------------------------------------------
// Section 6 (zones d'allure) — ratios calibrés sur le plan réel validé
// (Laurent V., 10K réf 50'21" -> allures observées EF/Seuil/VMA)
// ---------------------------------------------------------------------------

export const PACE_RATIOS = {
  recup: 1.33,
  E: 1.225,   // milieu de la fourchette observée 1.19-1.26
  T: 0.99,
  I: 0.855,
  V: 0.80
};

// ---------------------------------------------------------------------------
// Jalons narratifs de transition (doc convergence-v1-v2.md, section 2.5) —
// banque de variantes par jalon, tirée au sort à la génération du plan.
// Fusionnées dans le champ `contenu` de la séance concernée, jamais un champ
// séparé (cohérent avec la décision 2.1 : contenu unique plutôt que
// warmup/session/cooldown/notes éclatés).
// ---------------------------------------------------------------------------

export const JALONS_TRANSITION = {
  'derniere-longue-avant-affutage': [
    "Dernière sortie longue avant l'affûtage — allonge un peu si la forme le permet.",
    "C'est la dernière grosse sortie avant de lever le pied. Profites-en."
  ],
  'debut-affutage': [
    "Entrée en affûtage : le volume baisse, l'intensité reste.",
    "Le gros du travail est fait — place à la récupération active avant le jour J."
  ],
  'debut-specifique': [
    "Début de la phase spécifique : place aux séances à allure course.",
    "On rentre dans le dur — les séances vont maintenant coller à ton allure objectif."
  ],
  'derniere-semaine-avant-course': [
    "Dernières séances avant le jour J — reste tranquille.",
    "Presque prêt. Ces derniers jours ne servent qu'à arriver frais."
  ]
};

/**
 * Détecte les transitions de phase dans le plan déjà construit et injecte une
 * note (piochée aléatoirement dans JALONS_TRANSITION) dans le contenu de la
 * séance concernée. Mute `semaines` en place (ajoute la note au contenu
 * existant), ne retourne rien.
 *
 * Règles de détection (génériques, aucune date/phase codée en dur) :
 * - Début de phase : phase de la semaine différente de la semaine précédente
 * - Fin de phase avant Affûtage : dernière semaine où phase !== 'Affutage'
 * - Dernière longue avant Affûtage : dernière séance de type 'longue' de
 *   cette même semaine de transition
 * - Dernière semaine du plan entier : jalon "avant course"
 */
export function injecterJalonsTransition(semaines) {
  const piocher = (cle) => {
    const variantes = JALONS_TRANSITION[cle];
    return variantes[Math.floor(Math.random() * variantes.length)];
  };
  const ajouterNote = (seance, note) => {
    if (!seance || !seance.contenu) return;
    seance.contenu = `${seance.contenu} ${note}`;
  };

  for (let idx = 0; idx < semaines.length; idx++) {
    const semaine = semaines[idx];
    const precedente = idx > 0 ? semaines[idx - 1] : null;
    const suivante = idx < semaines.length - 1 ? semaines[idx + 1] : null;

    // Début de phase (jamais sur la toute première semaine du plan : ce
    // n'est pas une "transition", juste le départ)
    if (precedente && semaine.phase !== precedente.phase) {
      if (semaine.phase === 'Affutage') {
        const premierJour = Object.values(semaine.assignment)[0];
        ajouterNote(premierJour, piocher('debut-affutage'));
      } else if (semaine.phase === 'Specifique') {
        const premierJour = Object.values(semaine.assignment)[0];
        ajouterNote(premierJour, piocher('debut-specifique'));
      }
    }

    // Dernière semaine avant Affûtage : note sur la dernière séance longue
    if (suivante && suivante.phase === 'Affutage' && semaine.phase !== 'Affutage') {
      const jours = Object.values(semaine.assignment);
      const derniereLongue = [...jours].reverse().find(j => j.type === 'longue');
      ajouterNote(derniereLongue, piocher('derniere-longue-avant-affutage'));
    }

    // Dernière semaine du plan entier (semaine de course)
    if (idx === semaines.length - 1) {
      const jours = Object.values(semaine.assignment);
      // Note sur toutes les séances EF de la semaine de course (hors la
      // séance de course elle-même, traitée séparément — cf. 2.7, non
      // implémenté à ce stade)
      jours.forEach(j => {
        if (j.type === 'ef') ajouterNote(j, piocher('derniere-semaine-avant-course'));
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Notes pratiques par famille de séance (doc convergence-v1-v2.md, section
// 2.3) — même mécanisme que JALONS_TRANSITION (banque de variantes tirée au
// sort, fusionnée dans `contenu`), déclenché par le type/sous-type de séance
// plutôt qu'une transition de phase.
// ---------------------------------------------------------------------------

// Regroupe un sousType de séance qualité (cf. ROTATION_SOUS_TYPE) en famille
// pour le choix de la banque de notes. 'test' n'a pas de note pratique ici :
// traité à part (2.6, cohérence narrative de la semaine test).
const FAMILLE_SOUS_TYPE = {
  'seuil-court': 'seuil', 'seuil': 'seuil', 'seuil-negatif': 'seuil',
  'tempo-court': 'seuil', 'fartlek': 'seuil',
  'i-30-30': 'vma', 'i-3min': 'vma', 'vitesse': 'vma', 'pyramidale': 'vma', 'cotes': 'vma',
  'allure-course': 'allure-course', 'allure-course-court': 'allure-course'
};

export const NOTES_PRATIQUES = {
  'longue': [
    "Hydrate-toi bien avant et pendant si besoin.",
    "Emporte de quoi boire si tu pars plus d'1h."
  ],
  'seuil': [
    "Effort contrôlé — tu dois pouvoir tenir une phrase courte, pas plus.",
    "Vise la régularité plutôt que la vitesse sur cette séance."
  ],
  'vma': [
    "Récupération complète entre les répétitions — pas de course contre la montre sur la récup.",
    "La qualité de l'effort compte plus que le nombre de répétitions."
  ],
  'allure-course': [
    "Reste concentré sur ton allure cible, pas sur ce que tu pourrais tenir aujourd'hui.",
    "C'est l'occasion de sentir ton allure objectif dans les jambes."
  ]
};

/**
 * Injecte une note pratique (piochée aléatoirement) selon le type/sous-type
 * de chaque séance du plan. Mute `semaines` en place, ne retourne rien.
 * Indépendant de injecterJalonsTransition (peut s'appliquer à la même
 * séance qu'un jalon de transition — les deux notes se cumulent alors dans
 * le contenu).
 */
export function injecterNotesPratiques(semaines) {
  const piocher = (cle) => {
    const variantes = NOTES_PRATIQUES[cle];
    return variantes[Math.floor(Math.random() * variantes.length)];
  };
  const ajouterNote = (seance, note) => {
    if (!seance || !seance.contenu) return;
    seance.contenu = `${seance.contenu} ${note}`;
  };

  for (const semaine of semaines) {
    for (const seance of Object.values(semaine.assignment)) {
      if (seance.type === 'longue') {
        ajouterNote(seance, piocher('longue'));
      } else if (seance.type === 'qualite') {
        const famille = FAMILLE_SOUS_TYPE[seance.sousType];
        if (famille && NOTES_PRATIQUES[famille]) {
          ajouterNote(seance, piocher(famille));
        }
      }
    }
  }
}

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
  const plafondCible = ampleurObjectif === 'faible'
    ? Math.min(plafondPopulation, volumeDepart * 1.20)
    : plafondPopulation;

  // Le plafond ne doit jamais descendre sous le volume de départ réel — sinon
  // la formule de croissance écrête brutalement dès la 2e semaine (trouvé en
  // usage réel : quelqu'un qui court déjà à 50km/sem ne doit pas être ramené
  // de force à un plafond de population plus bas, ce serait contre-productif)
  const plafond = Math.max(plafondCible, volumeDepart);

  // Durée nulle : date invalide déjà signalée par computePhases, pas la peine
  // de calculer une fausse progression ni de remonter un 2e avertissement
  if (totalSemaines <= 0) {
    return { plafond, volumesParSemaine: [], warnings };
  }

  // Garde-fou #4 : volume de départ déjà proche ou au-dessus du plafond de
  // population — signalé même si le plafond effectif a été relevé au-dessus,
  // car ça reste une info utile (le profil déclaré dépasse les repères habituels)
  if (volumeDepart >= plafondCible * 0.9) {
    const messageEcart = volumeDepart > plafondCible
      ? `Volume de départ (${volumeDepart}km) déjà au-dessus du plafond habituel pour ce profil (${Math.round(plafondCible * 10) / 10}km) — le plafond a été relevé pour ne pas te faire régresser.`
      : `Volume de départ (${volumeDepart}km) déjà proche du plafond visé (${Math.round(plafondCible * 10) / 10}km) — marge de progression réduite.`;
    warnings.push({ code: 'MARGE_PROGRESSION_FAIBLE', message: messageEcart });
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

  // Phase Affûtage : réduction progressive calibrée par distance (pas une
  // continuation de la formule de croissance). Sources : réduction de 30-40%
  // pour un 5K, 35-45% pour un 10K, plus marquée pour semi/marathon — même en
  // semaine de course, un marathon ne descend que vers -40/-50%, pas -65%
  // comme l'ancienne formule générique le faisait pour toutes les distances.
  const FRACTIONS_AFFUTAGE = {
    '5K':       { debut: 0.80, fin: 0.65 },
    '10K':      { debut: 0.80, fin: 0.60 },
    'Semi':     { debut: 0.75, fin: 0.55 },
    'Marathon': { debut: 0.75, fin: 0.50 }
  };

  if (semainesAffutage > 0) {
    const { debut, fin } = FRACTIONS_AFFUTAGE[distance] ?? { debut: 0.75, fin: 0.55 };
    const fractions = semainesAffutage === 1
      ? [fin]
      : Array.from({ length: semainesAffutage }, (_, j) =>
          debut - ((debut - fin) * j / (semainesAffutage - 1))
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

// Zones FC par type de séance, en % de FC max — validé contre le vrai code v1
// (EF/Longue 65-75%, Seuil 90-95%, VMA 90-100%, Allure course 85-90%)
const ZONES_FC_POURCENTAGE = {
  recup: [0.55, 0.65],
  E: [0.65, 0.75],
  C: [0.85, 0.90],
  T: [0.90, 0.95],
  I: [0.90, 1.00],
  V: [0.95, 1.00]
};

export function computeZonesFC(fcMax) {
  return Object.fromEntries(
    Object.entries(ZONES_FC_POURCENTAGE).map(([zone, [bas, haut]]) => [
      zone,
      { min: Math.round(fcMax * bas), max: Math.round(fcMax * haut) }
    ])
  );
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
    // Pyramidale à 1/12 — les séances de base (i-3min, vitesse) restent
    // largement majoritaires, cf. échange sur la variété des séances
    Specifique: ['i-3min', 'vitesse', 'i-3min', 'vitesse', 'i-3min', 'vitesse', 'i-3min', 'vitesse', 'i-3min', 'vitesse', 'i-3min', 'pyramidale'],
    Affutage: ['vitesse', 'i-3min']
  },
  '10K': {
    Reacclimatation: [],
    Construction: ['seuil-court', 'i-30-30'],
    // Pyramidale à 1/12, seuil négatif à 2/12 — base (i-3min/seuil/allure
    // course) toujours majoritaire
    Specifique: ['i-3min', 'seuil', 'allure-course', 'i-3min', 'seuil-negatif', 'allure-course', 'i-3min', 'seuil', 'allure-course', 'seuil-negatif', 'seuil', 'pyramidale'],
    Affutage: ['allure-course', 'seuil-court']
  },
  'Semi': {
    Reacclimatation: [],
    Construction: ['tempo-court', 'fartlek'],
    Specifique: ['seuil', 'i-3min', 'allure-course', 'seuil', 'seuil-negatif', 'allure-course', 'seuil', 'i-3min', 'allure-course', 'seuil-negatif', 'i-3min', 'pyramidale'],
    Affutage: ['allure-course-court', 'seuil-court']
  },
  'Marathon': {
    Reacclimatation: [],
    Construction: ['tempo-court', 'seuil-court'],
    // Pas de pyramidale pour le marathon (moins pertinente, phase plus
    // orientée seuil/allure course) — seuil négatif seulement, à 2/12
    Specifique: ['seuil', 'allure-course', 'seuil', 'allure-course', 'seuil', 'allure-course', 'seuil', 'allure-course', 'seuil-negatif', 'seuil', 'allure-course', 'seuil-negatif'],
    Affutage: ['tempo-court', 'allure-course-court']
  }
};

// Repli si V ou I sont interdits par une contrainte (section 7) : on ne supprime
// pas la séance, on descend d'un cran vers un sous-type moins intense
const REPLI_SOUS_TYPE = {
  'vitesse': 'i-3min',
  'i-3min': 'seuil',
  'i-30-30': 'seuil-court',
  'cotes': 'seuil-court',
  'pyramidale': 'seuil',       // pyramidale utilise l'allure I, repli vers seuil si I interdite
  'seuil-negatif': 'seuil'     // repli vers seuil simple si l'allure soutenue n'est pas indiquée
};

function reduireSelonNiveauProgression(base, increment, cap, semaineDansPhase) {
  return Math.min(cap, base + Math.floor(semaineDansPhase / 3) * increment);
}

function resoudreSousType(sousType, restrictionsAllure) {
  if (!restrictionsAllure) return sousType;
  let resolved = sousType;
  const estV = t => t === 'vitesse';
  const estI = t => t === 'i-3min' || t === 'i-30-30' || t === 'pyramidale';
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
export function genererContenuQualite({ distance, phase, semaineDansPhase, indexQualiteSemaine, alluresSec, restrictionsAllure, tauxAffutage = 1, estDechargeSemaine = false }) {
  const rotation = ROTATION_SOUS_TYPE[distance]?.[phase] ?? ['seuil'];
  if (rotation.length === 0) return { sousType: null, contenu: 'EF (réacclimatation, pas de qualité cette semaine)', kmEstime: 0 };

  const sousTypeBrut = rotation[(semaineDansPhase + indexQualiteSemaine) % rotation.length];
  const sousType = resoudreSousType(sousTypeBrut, restrictionsAllure);

  const T = alluresSec.T, I = alluresSec.I, V = alluresSec.V, C = alluresSec.C, E = alluresSec.E;
  // km à partir d'une durée en minutes à une allure donnée (sec/km)
  const kmDepuisMinutes = (min, paceSecParKm) => (min * 60) / paceSecParKm;

  // Pendant l'Affûtage OU une semaine de décharge, les répétitions/durée se
  // réduisent proportionnellement (même fraction que le volume hebdo,
  // section 6/18/22), avec un plancher minimum pour garder un vrai stimulus —
  // sans ça, les séances qualité gardaient presque leur volume plein alors que
  // le reste de la semaine se réduisait, écrasant les EF (trouvé en usage réel,
  // d'abord sur l'Affûtage puis sur les décharges classiques).
  const facteurReductionCorps = phase === 'Affutage' ? tauxAffutage : (estDechargeSemaine ? 0.75 : 1);
  const ajuster = (valeur, floor) =>
    facteurReductionCorps < 1 ? Math.max(floor, Math.round(valeur * facteurReductionCorps)) : valeur;

  let contenuCorps, kmCorps;

  switch (sousType) {
    case 'seuil-court': {
      const reps = ajuster(reduireSelonNiveauProgression(3, 1, 5, semaineDansPhase), 2);
      kmCorps = kmDepuisMinutes(reps * 6, T);
      contenuCorps = `${reps}×6min @ ${formatPace(T)} (Seuil), récup 90s`;
      break;
    }
    case 'seuil': {
      const reps = ajuster(reduireSelonNiveauProgression(3, 1, 5, semaineDansPhase), 2);
      kmCorps = kmDepuisMinutes(reps * 8, T);
      contenuCorps = `${reps}×8min @ ${formatPace(T)} (Seuil), récup 2min`;
      break;
    }
    case 'i-30-30': {
      const series = ajuster(reduireSelonNiveauProgression(2, 1, 3, semaineDansPhase), 1);
      // 8×30s effort par série ; on ignore les 30s de récup intra-série dans
      // l'estimation km (approximation assumée) ; récup inter-séries fixée à 3min
      kmCorps = kmDepuisMinutes(series * 8 * 0.5, I);
      contenuCorps = `${series} séries de 8×30s-30s @ ${formatPace(I)} (VMA), récup 3min entre les séries`;
      break;
    }
    case 'i-3min': {
      const reps = ajuster(reduireSelonNiveauProgression(4, 1, 6, semaineDansPhase), 2);
      kmCorps = kmDepuisMinutes(reps * 3, I);
      contenuCorps = `${reps}×3min @ ${formatPace(I)} (VMA), récup 2min`;
      break;
    }
    case 'vitesse': {
      const reps = ajuster(reduireSelonNiveauProgression(6, 1, 10, semaineDansPhase), 3);
      kmCorps = reps * 0.3; // distance directement connue (300m)
      contenuCorps = `${reps}×300m @ ${formatPace(V)} (Vitesse), récupération complète`;
      break;
    }
    case 'cotes': {
      const reps = ajuster(reduireSelonNiveauProgression(6, 1, 10, semaineDansPhase), 3);
      kmCorps = kmDepuisMinutes(reps * 0.5, V); // approximation : allure proche du V
      contenuCorps = `${reps}×30s en côte (effort soutenu), récupération trot`;
      break;
    }
    case 'allure-course': {
      const reps = ajuster(reduireSelonNiveauProgression(3, 1, 5, semaineDansPhase), 2);
      kmCorps = kmDepuisMinutes(reps * 5, C);
      contenuCorps = `${reps}×5min @ ${formatPace(C)} (allure course), récup 2min`;
      break;
    }
    case 'allure-course-court': {
      const reps = ajuster(reduireSelonNiveauProgression(2, 1, 3, semaineDansPhase), 1);
      kmCorps = kmDepuisMinutes(reps * 3, C);
      contenuCorps = `${reps}×3min @ ${formatPace(C)} (allure course), récup 2min`;
      break;
    }
    case 'pyramidale': {
      // Montée-descente classique en VMA — variété rare (1/12), les séances
      // de base restent largement majoritaires dans la rotation
      const paliers = [2, 3, 4, 3, 2];
      const totalMin = paliers.reduce((a, b) => a + b, 0);
      kmCorps = kmDepuisMinutes(totalMin, I); // récup ignorée dans l'estimation km (comme i-30-30/fartlek)
      contenuCorps = `Pyramidale ${paliers.join('-')}min @ ${formatPace(I)} (VMA), récup égale au temps de l'effort`;
      break;
    }
    case 'seuil-negatif': {
      // Deux blocs de seuil, le second plus rapide — travaille la capacité à
      // accélérer sur jambes fatiguées, cohérent avec le seuil classique
      const dureeBloc = ajuster(reduireSelonNiveauProgression(8, 2, 12, semaineDansPhase), 5);
      const paceBloc2 = T - (T - I) * 0.3; // 30% du chemin vers l'allure VMA
      kmCorps = kmDepuisMinutes(dureeBloc, T) + kmDepuisMinutes(dureeBloc, paceBloc2);
      contenuCorps = `${dureeBloc}min @ ${formatPace(T)} (Seuil) puis ${dureeBloc}min @ ${formatPace(paceBloc2)} (Seuil soutenu), enchaînés sans récup`;
      break;
    }
    case 'tempo-court': {
      const duree = ajuster(reduireSelonNiveauProgression(20, 5, 35, semaineDansPhase), 10);
      kmCorps = kmDepuisMinutes(duree, T);
      contenuCorps = `${duree}min continu @ ${formatPace(T)} (Seuil léger)`;
      break;
    }
    case 'fartlek': {
      const reps = ajuster(reduireSelonNiveauProgression(4, 1, 8, semaineDansPhase), 3);
      // Portions rapides comptées à l'allure T, portions faciles ignorées dans
      // l'estimation km (approximation assumée, comme pour i-30-30)
      kmCorps = kmDepuisMinutes(reps * 2, T);
      contenuCorps = `${reps}×2min rapide (${formatPace(T)}) / 2min facile, en continu (fartlek)`;
      break;
    }
    default: {
      kmCorps = kmDepuisMinutes(24, T);
      contenuCorps = `3×8min @ ${formatPace(T)} (Seuil), récup 2min`;
    }
  }

  // Échauffement et retour au calme : réels, comptent dans le volume du jour
  // (donc dans le volume hebdo — repartirVolumeSemaine s'ajuste automatiquement
  // en conséquence, aucune logique supplémentaire nécessaire ailleurs)
  // Réduction proportionnelle pendant décharge/Affûtage, comme pour le corps
  // de séance — sans ça, l'échauffement+RAC (coût fixe) prend une part
  // disproportionnée du budget sur une semaine déjà réduite (trouvé en usage réel)
  const facteurReduction = estDechargeSemaine ? 0.75 : (phase === 'Affutage' ? tauxAffutage : 1);
  const DUREE_ECHAUFFEMENT_MIN = Math.max(8, Math.round(15 * facteurReduction));
  const DUREE_RETOUR_CALME_MIN = Math.max(5, Math.round(10 * facteurReduction));
  const kmEchauffement = kmDepuisMinutes(DUREE_ECHAUFFEMENT_MIN, E);
  const kmRetourCalme = kmDepuisMinutes(DUREE_RETOUR_CALME_MIN, E);
  const kmEstime = kmCorps + kmEchauffement + kmRetourCalme;

  const contenu = `Échauffement ${DUREE_ECHAUFFEMENT_MIN}min @ ${formatPace(E)} (EF) + ${contenuCorps} + Retour au calme ${DUREE_RETOUR_CALME_MIN}min @ ${formatPace(E)} (EF)`;

  return { sousType, contenu, kmEstime };
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

// ---------------------------------------------------------------------------
// Séance de confirmation d'allure — placement validé (recherche + retour
// terrain) : vers la fin de Spécifique, avec un tampon de récupération avant
// le début de l'Affûtage (sources : "tune-up race" 4-8 sem. avant marathon,
// 3-6 sem. avant semi, 2-5 sem. avant 5K/10K — trop proche et la récupération
// empiète sur le taper). Contenu : courir une portion de la distance de
// course À L'ALLURE OBJECTIF (pas à fond) — principe "goal pace confirmation
// workout" (McMillan, Hal Higdon) plutôt qu'un time trial à effort maximal :
// sert à vérifier que l'allure visée est tenable dans la durée, pas à mesurer
// la forme maximale. Réutilise le même principe que le segment allure course
// déjà présent en fin de sortie longue pour Semi/Marathon (avecSegmentCourse).
// ---------------------------------------------------------------------------

// % de la distance de course à courir à l'allure objectif
const POURCENTAGE_CONFIRMATION_ALLURE = { '5K': 0.60, '10K': 0.55, 'Semi': 0.35, 'Marathon': 0.25 };

// Tampon en semaines à laisser entre la séance et le début de l'Affûtage
const TAMPON_TEST_SEMAINES = { '5K': 1, '10K': 1, 'Semi': 2, 'Marathon': 2 };

export function genererContenuTest({ distance, alluresSec }) {
  const distanceCourseKm = KM_BY_DISTANCE[distance] ?? 10;
  const pourcentage = POURCENTAGE_CONFIRMATION_ALLURE[distance] ?? 0.5;
  const distanceTestKm = Math.round(distanceCourseKm * pourcentage * 10) / 10;

  const C = alluresSec.C, E = alluresSec.E;
  const kmDepuisMinutes = (min, paceSecParKm) => (min * 60) / paceSecParKm;
  const DUREE_ECHAUFFEMENT_MIN = 15;
  const DUREE_RETOUR_CALME_MIN = 10;
  const dureeConfirmationMin = Math.round((distanceTestKm * C) / 60);
  const kmEchauffement = kmDepuisMinutes(DUREE_ECHAUFFEMENT_MIN, E);
  const kmRetourCalme = kmDepuisMinutes(DUREE_RETOUR_CALME_MIN, E);
  const kmEstime = distanceTestKm + kmEchauffement + kmRetourCalme;
  const contenu = `Échauffement ${DUREE_ECHAUFFEMENT_MIN}min @ ${formatPace(E)} (EF) + ${dureeConfirmationMin}min à allure course (${formatPace(C)}) — ${distanceTestKm}km, sert à confirmer/recalibrer ton allure objectif + Retour au calme ${DUREE_RETOUR_CALME_MIN}min @ ${formatPace(E)} (EF)`;
  return { sousType: 'test', contenu, kmEstime, distanceTestKm };
}

/**
 * Place une séance test unique dans le plan déjà généré, vers la fin de la
 * phase Spécifique (avec le tampon de récupération avant l'Affûtage). Mute
 * le plan en place. Silencieux si Spécifique n'a aucune semaine (plan trop
 * court pour en avoir une) — pas de garde-fou bloquant, juste pas de test.
 */
export function placerSeanceTest(plan, alluresSec) {
  const phaseSpecifique = plan.phases.find(p => p.nom === 'Specifique');
  if (!phaseSpecifique || phaseSpecifique.semaines <= 0) return;

  // Numéro de semaine (global) où débute Spécifique, à partir des phases
  let curseur = 0;
  for (const p of plan.phases) {
    if (p.nom === 'Specifique') break;
    curseur += p.semaines;
  }
  const debutSpecifique = curseur + 1;

  const tampon = TAMPON_TEST_SEMAINES[plan.distance] ?? 1;
  // Semaine visée : tampon semaines avant la fin de Spécifique — avec
  // plancher sur la première semaine de Spécifique si la phase est trop
  // courte pour respecter le tampon complet (pas de blocage, juste un
  // compromis raisonnable plutôt qu'un index hors limites)
  const semaineViseeIndex = Math.max(0, phaseSpecifique.semaines - tampon - 1);
  const semaineNumCible = debutSpecifique + semaineViseeIndex;

  const semaine = plan.semaines.find(s => s.semaineNum === semaineNumCible);
  if (!semaine) return;

  const jourQualite = Object.entries(semaine.assignment).find(([, s]) => s.type === 'qualite');
  if (!jourQualite) return; // semaine de réacclimatation sans qualité, par exemple
  const [jour, seance] = jourQualite;

  const { sousType, contenu, kmEstime, distanceTestKm } = genererContenuTest({ distance: plan.distance, alluresSec });
  seance.sousType = sousType;
  seance.contenu = contenu;
  seance.kmEstime = kmEstime;
  seance.estTest = true;
  seance.distanceTestKm = distanceTestKm;

  // Recalcule la répartition EF/longue de cette semaine, le kilométrage de
  // la séance qualité ayant changé (factorisé, recalculerRepartitionEFLongue)
  let kmQualiteTotal = 0;
  for (const s of Object.values(semaine.assignment)) {
    if (s.type === 'qualite') kmQualiteTotal += s.kmEstime;
  }
  recalculerRepartitionEFLongue({
    assignment: semaine.assignment,
    volumeCibleKm: semaine.volumeCibleKm,
    kmQualiteTotal,
    distance: plan.distance,
    phase: semaine.phase,
    alluresSec
  });

  semaine.aUneSeanceTest = true;
}

/**
 * Recalcule la répartition EF/longue d'une semaine (mute assignment en
 * place) — factorisé car identique dans 3 endroits (génération initiale,
 * adaptation, séance test) : seul le kilométrage qualité en entrée change.
 * Retourne les avertissements de plafonnement (EF/longue trop courtes),
 * jusqu'ici silencieusement perdus dans 2 des 3 appelants.
 */
function recalculerRepartitionEFLongue({ assignment, volumeCibleKm, kmQualiteTotal, distance, phase, alluresSec }) {
  const nbEF = Object.values(assignment).filter(s => s.type === 'ef').length;
  const aLongue = Object.values(assignment).some(s => s.type === 'longue');
  const { kmLongue, kmParEF, warning: warningRepartition } = repartirVolumeSemaine({
    volumeCibleKm, kmQualiteTotal, nbEF, aLongue
  });

  const warnings = [];
  if (warningRepartition) warnings.push(warningRepartition);

  const roleParJourEF = differencierEF({ assignment, kmParEF });
  for (const [jour, seance] of Object.entries(assignment)) {
    if (seance.type === 'ef') {
      const { role, kmCible } = roleParJourEF[jour] ?? { role: 'standard', kmCible: kmParEF };
      const { contenu, kmEstime, warning } = genererContenuEF({ alluresSec, kmCible, role });
      seance.contenu = contenu;
      seance.kmEstime = kmEstime;
      seance.role = role;
      if (warning) warnings.push({ ...warning, jour });
    } else if (seance.type === 'longue') {
      const { contenu, kmEstime, warning } = genererContenuLongue({ distance, phase, alluresSec, kmCible: kmLongue });
      seance.contenu = contenu;
      seance.kmEstime = kmEstime;
      if (warning) warnings.push({ ...warning, jour });
    }
  }
  return { warnings };
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
  if (kmRestant > 0 && seanceMinKm < 2) {
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
      const dechargeSemaine = volumesParSemaine[semaineGlobale - 1]?.estDecharge ?? false;
      for (const [jour, seance] of Object.entries(assignment)) {
        if (seance.type === 'qualite') {
          const { sousType, contenu, kmEstime } = genererContenuQualite({
            distance: params.distance,
            phase: phase.nom,
            semaineDansPhase: i,
            indexQualiteSemaine: seance.indexQualite ?? 0,
            alluresSec: allSeconds,
            restrictionsAllure: seance.restrictionsAllure,
            tauxAffutage: tauxAffutageSemaine,
            estDechargeSemaine: dechargeSemaine
          });
          seance.sousType = sousType;
          seance.contenu = contenu;
          seance.kmEstime = kmEstime;
          kmQualiteTotal += kmEstime;
        }
      }

      // 2e passe : répartir le volume restant entre longue et EF (factorisé,
      // recalculerRepartitionEFLongue — identique dans generatePlan,
      // appliquerAdaptations et placerSeanceTest)
      const volumeCibleSemaine = volumesParSemaine[semaineGlobale - 1]?.volumeKm ?? 0;
      const { warnings: warningsRepartition } = recalculerRepartitionEFLongue({
        assignment,
        volumeCibleKm: volumeCibleSemaine,
        kmQualiteTotal,
        distance: params.distance,
        phase: phase.nom,
        alluresSec: allSeconds
      });
      if (!(phase.nom === 'Affutage' || dechargeSemaine)) {
        warningsRepartition.forEach(w => {
          const suffixeJour = w.jour !== undefined && w.code !== 'VOLUME_HEBDO_TROP_FAIBLE_POUR_REPARTITION' ? ` (jour ${w.jour})` : '';
          warningsSemaines.push({ ...w, message: `S${semaineGlobale}${suffixeJour} : ${w.message}` });
        });
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

  // Jalons narratifs de transition (doc convergence-v1-v2.md, 2.5) — mute
  // semaines en place, doit s'exécuter une fois toutes les semaines/phases
  // connues (a besoin de regarder la semaine précédente/suivante)
  injecterJalonsTransition(semaines);

  // Notes pratiques par famille de séance (doc convergence-v1-v2.md, 2.3) —
  // indépendant des jalons de transition, peut s'exécuter à tout moment
  // après que les séances aient leur contenu/sousType
  injecterNotesPratiques(semaines);

  const plan = {
    distance: params.distance,
    objectif: params.objectif,
    ampleurObjectif,
    dateDebut: params.dateDebut,
    dateCourse: params.dateCourse,
    dureeSemaines: totalSemaines,
    phases: phasesAvecReacclimatation,
    allures,
    zoneFC: (() => {
      const fcMax = profil.fcMaxConnue ?? (profil.anneeNaissance ? computeFcMaxTanaka(profil.anneeNaissance) : null);
      if (!fcMax) return null;
      return {
        methode: profil.fcMaxConnue ? 'mesuree' : 'tanaka',
        fcMax,
        zonesParType: computeZonesFC(fcMax)
      };
    })(),
    volumePlafondKm: plafond,
    semaines,
    warnings
  };

  // Séance test, placée vers la fin de Spécifique (section 36) — silencieux
  // si le plan est trop court pour en accueillir une
  placerSeanceTest(plan, allSeconds);

  return plan;
}

// ---------------------------------------------------------------------------
// Section 33 — Règles d'adaptation du plan selon les résultats réels
// ---------------------------------------------------------------------------

const POIDS_STATUT = { ratee: 1, adaptee: 0.5, reussie: 0 };

/**
 * Score d'une semaine à partir des statuts des séances dures (qualité +
 * longue uniquement — les EF ne comptent pas, cohérent avec la priorité
 * "rattraper les séances clés" trouvée dans la littérature). Retourne null
 * si aucune séance dure de cette semaine n'a de statut enregistré (semaine
 * pas encore vécue, ou pas suivie) — distingué de 0 (tout réussi).
 */
export function calculerScoreSemaine(semaine, statuses) {
  let score = 0;
  let auMoinsUnStatut = false;
  for (const [jour, seance] of Object.entries(semaine.assignment)) {
    if (seance.type !== 'qualite' && seance.type !== 'longue') continue;
    const uid = `${semaine.semaineNum}-${jour}`;
    const statut = statuses?.[uid];
    if (statut) {
      auMoinsUnStatut = true;
      score += POIDS_STATUT[statut] ?? 0;
    }
  }
  return auMoinsUnStatut ? score : null;
}

/**
 * Analyse le plan et détermine quelles semaines doivent être adaptées
 * (décharge supplémentaire) suite aux résultats de la semaine précédente.
 * Règle : score ≥ 2 sur les séances dures d'une semaine déclenche une
 * adaptation pour la semaine SUIVANTE. Compte aussi les déclenchements
 * consécutifs, pour le garde-fou "plan probablement trop ambitieux".
 */
export function analyserAdaptations(plan) {
  const semainesAAdapter = new Map(); // semaineNum -> { dejaDecharge }
  let consecutives = 0;
  let maxConsecutives = 0;

  const semainesTriees = [...plan.semaines].sort((a, b) => a.semaineNum - b.semaineNum);

  for (const semaine of semainesTriees) {
    const score = calculerScoreSemaine(semaine, plan.statuses);
    if (score === null) { consecutives = 0; continue; } // semaine pas suivie, rien à en déduire

    const declenche = score >= 2;
    if (declenche) {
      const suivante = semainesTriees.find(s => s.semaineNum === semaine.semaineNum + 1);
      if (suivante) semainesAAdapter.set(suivante.semaineNum, { dejaDecharge: suivante.estDechargeSemaine });
      consecutives += 1;
      maxConsecutives = Math.max(maxConsecutives, consecutives);
    } else {
      consecutives = 0;
    }
  }

  return { semainesAAdapter, adaptationsConsecutivesMax: maxConsecutives };
}

/**
 * Applique les adaptations déterminées par analyserAdaptations : régénère le
 * contenu des semaines concernées (volume et séances qualité réduits, même
 * mécanique que la décharge classique — sections 22/26), sans cumul si la
 * semaine était déjà une décharge programmée (la décharge programmée absorbe
 * l'adaptation, section 33). Mute le plan en place et retourne les
 * avertissements générés (à fusionner avec plan.warnings par l'appelant).
 */
export function appliquerAdaptations(plan) {
  const { semainesAAdapter, adaptationsConsecutivesMax } = analyserAdaptations(plan);
  const nouveauxWarnings = [];

  if (semainesAAdapter.size === 0) return nouveauxWarnings;

  // Les plans sauvegardés avant l'ajout de profilOrigine/paramsOrigine (section
  // 32) n'ont pas ces données — impossible de régénérer du contenu sans elles.
  if (!plan.paramsOrigine || !plan.profilOrigine) {
    nouveauxWarnings.push({
      code: 'ADAPTATION_IMPOSSIBLE',
      message: "Ce plan a été sauvegardé avant l'ajout du suivi d'adaptation et ne peut pas être adapté automatiquement — regénère-le depuis le wizard pour bénéficier de cette fonctionnalité."
    });
    return nouveauxWarnings;
  }

  const alluresSec = computeAllures({
    refTimeSeconds: parseTimeToSeconds(plan.paramsOrigine.tempsReference),
    refDistanceKm: KM_BY_DISTANCE[plan.paramsOrigine.refDistance ?? plan.paramsOrigine.distance],
    objectifTimeSeconds: parseTimeToSeconds(plan.paramsOrigine.objectif),
    distanceCibleKm: KM_BY_DISTANCE[plan.paramsOrigine.distance]
  });

  // Bornes de chaque phase (en numéros de semaine), pour retrouver
  // semaineDansPhase à partir du seul semaineNum
  let curseur = 0;
  const bornesPhases = plan.phases.map(p => {
    const debut = curseur;
    curseur += p.semaines;
    return { nom: p.nom, debut, fin: curseur };
  });

  for (const [semaineNum, { dejaDecharge }] of semainesAAdapter.entries()) {
    const semaine = plan.semaines.find(s => s.semaineNum === semaineNum);
    if (!semaine) continue;

    if (dejaDecharge) {
      semaine.estAdaptee = true;
      nouveauxWarnings.push({
        code: 'ADAPTATION_ABSORBEE',
        message: `S${semaineNum} : adaptation suite aux résultats de la semaine précédente, absorbée par la décharge déjà programmée (pas de réduction supplémentaire).`
      });
      continue;
    }

    const phaseInfo = bornesPhases.find(b => b.nom === semaine.phase && semaineNum > b.debut && semaineNum <= b.fin);
    const semaineDansPhase = phaseInfo ? semaineNum - phaseInfo.debut - 1 : 0;

    const nouveauVolume = Math.round(semaine.volumeCibleKm * 0.75 * 10) / 10;
    let kmQualiteTotal = 0;

    for (const seance of Object.values(semaine.assignment)) {
      if (seance.type !== 'qualite') continue;
      const { sousType, contenu, kmEstime } = genererContenuQualite({
        distance: plan.paramsOrigine.distance,
        phase: semaine.phase,
        semaineDansPhase,
        indexQualiteSemaine: seance.indexQualite ?? 0,
        alluresSec,
        restrictionsAllure: seance.restrictionsAllure,
        tauxAffutage: 1,
        estDechargeSemaine: true // réutilise le même levier de réduction (facteur 0.75, sections 22/26)
      });
      seance.sousType = sousType;
      seance.contenu = contenu;
      seance.kmEstime = kmEstime;
      kmQualiteTotal += kmEstime;
    }

    const { warnings: warningsRepartition } = recalculerRepartitionEFLongue({
      assignment: semaine.assignment,
      volumeCibleKm: nouveauVolume,
      kmQualiteTotal,
      distance: plan.paramsOrigine.distance,
      phase: semaine.phase,
      alluresSec
    });
    warningsRepartition.forEach(w => nouveauxWarnings.push({ ...w, message: `S${semaineNum} : ${w.message}` }));

    semaine.volumeCibleKm = nouveauVolume;
    semaine.estAdaptee = true;
    nouveauxWarnings.push({
      code: 'ADAPTATION_APPLIQUEE',
      message: `S${semaineNum} : décharge d'adaptation (volume réduit à ${nouveauVolume}km) suite à plusieurs séances difficiles la semaine précédente.`
    });
  }

  if (adaptationsConsecutivesMax >= 3) {
    nouveauxWarnings.push({
      code: 'ADAPTATIONS_REPETEES',
      message: `${adaptationsConsecutivesMax} semaines d'affilée avec des séances difficiles — le plan actuel semble trop ambitieux compte tenu de ta disponibilité réelle. Envisage de revoir ton objectif ou la durée du plan plutôt que de continuer à enchaîner les adaptations.`
    });
  }

  return nouveauxWarnings;
}
