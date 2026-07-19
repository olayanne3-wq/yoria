/**
 * plan-generator.js
 * Moteur de génération de plan — Yoria v2.0
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
export const FAMILLE_SOUS_TYPE = {
  'seuil-court': 'seuil', 'seuil': 'seuil', 'seuil-negatif': 'seuil',
  'tempo-court': 'seuil', 'seuil-2min': 'seuil',
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
  // Sous-type précis, pas la famille — un seuil-2min alterne rapide/facile
  // (répétitions de 2min au seuil, récup courte), les notes génériques de
  // la famille 'seuil' ci-dessus ("vise la régularité") supposent un effort
  // continu, pas adaptées à ce format répété.
  // Bug trouvé le 7 juillet 2026 : Laurent, en lisant sa séance (alors
  // appelée "fartlek" — nom impropre, corrigé le même jour : un vrai
  // fartlek est non-structuré/basé sur le ressenti, cf. littérature,
  // alors que cette séance est un protocole précis de répétitions 2min),
  // ne comprenait pas pourquoi une note "régularité" accompagnait un
  // contenu explicitement alterné.
  'seuil-2min': [
    "Les portions rapides doivent être franches, pas juste \"un peu plus vite\" — c'est l'alternance qui fait le travail.",
    "Relâche vraiment sur les portions faciles, pour repartir frais sur la suivante."
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
 * le contenu). Vérifie d'abord une entrée dédiée au SOUS-TYPE exact (ex.
 * 'seuil-2min'), avant de retomber sur la FAMILLE générique — permet des
 * exceptions ciblées sans dupliquer toute la banque par sous-type.
 */
// ---------------------------------------------------------------------------
// Strides (accélérations courtes) — v2.13, ajouté suite à un échange sur la
// variété perçue en phase Construction (17/07/2026). Littérature convergente
// (tradition Lydiard, Runners Connect, Coach Saltmarsh) : stimulus neuromusculaire
// bref et à risque quasi nul (récupération complète entre répétitions),
// distinct du travail VMA déjà couvert par i-30-30/i-3min — n'entre donc pas
// en conflit avec les limites Daniels déjà validées (audit du 17/07/2026),
// puisque le volume ajouté est marginal (cf. estimerKmStrides ci-dessous).
//
// Volontairement PAS d'allure chiffrée (contrairement à seuil/VMA/vitesse) :
// les strides se pilotent au ressenti (accélération progressive jusqu'à un
// effort vif mais contrôlé, jamais un sprint à fond), une allure fixe en
// min/km n'aurait pas de sens pour ce type d'effort. Le champ `allure` de
// structureIntervalles est donc une chaîne descriptive, pas un pace formaté.
// ---------------------------------------------------------------------------

export const STRIDES_REPETITIONS = 4; // base phase — 4 suffisent (Runners Connect), pas 6-8 (réservé à la prépa course)
export const STRIDES_DUREE_EFFORT_SEC = 20;
// Distance estimée par répétition à titre indicatif (~95% de l'allure V),
// pour que kmEstime reste cohérent avec le reste du moteur (ACWR, charge) —
// même logique que le sous-type 'vitesse' qui connaît sa distance directement.
// Approximation volontairement grossière : l'objectif n'est pas la précision
// mais d'éviter qu'une séance EF+strides paraisse identique en charge à une
// EF pure alors que la charge réelle (même faible) diffère légèrement.
export function estimerKmStrides(alluresSec) {
  const paceApproxSecParKm = (alluresSec.V ?? alluresSec.I) * 1.05; // légèrement plus lent que V, jamais un sprint pur
  const kmParRep = STRIDES_DUREE_EFFORT_SEC / paceApproxSecParKm;
  return Math.round(kmParRep * STRIDES_REPETITIONS * 100) / 100;
}

/**
 * Ajoute des strides en fin d'un sous-ensemble des séances EF "standard" de
 * la phase Construction — jamais sur les EF "recuperation" (le but est
 * d'entretenir la mécanique/l'économie sans jamais empiéter sur un jour de
 * vraie récupération), et jamais hors Construction (Spécifique a déjà une
 * rotation de sous-types qualité riche, cf. tableau doc méthodologie ; en
 * Affûtage on évite tout stimulus superflu avant course, cf. littérature).
 *
 * Fréquence : 1 EF standard sur STRIDES_FREQUENCE (compteur cyclique sur les
 * occurrences d'EF standard rencontrées, pas un jour fixe dans la semaine —
 * s'adapte automatiquement au nombre réel d'EF standard du plan, quel que
 * soit le niveau/mode). Mute `semaines` en place, ne retourne rien.
 */
export const STRIDES_FREQUENCE = 2;

export function injecterStrides(semaines, alluresSec) {
  const kmStrides = estimerKmStrides(alluresSec);
  const structureStrides = {
    repetitions: STRIDES_REPETITIONS,
    dureeEffortSec: STRIDES_DUREE_EFFORT_SEC,
    allure: 'ressenti — accélération progressive jusqu\'à un effort vif mais contrôlé (≈95% vitesse max), jamais un sprint à fond',
    dureeRecupSec: null,
    recupLabel: 'complète (marche/trot 1-2min)'
  };

  let compteurEFStandard = 0;
  for (const semaine of semaines) {
    if (semaine.phase !== 'Construction') continue;
    for (const seance of Object.values(semaine.assignment)) {
      if (seance.type !== 'ef' || seance.role !== 'standard') continue;
      compteurEFStandard++;
      if (compteurEFStandard % STRIDES_FREQUENCE !== 0) continue;

      seance.contenu = `${seance.contenu} + 4×20s lignes droites (accélération progressive, effort vif mais contrôlé, jamais à fond), récupération complète entre chaque`;
      seance.kmEstime = (seance.kmEstime ?? 0) + kmStrides;
      seance.strides = structureStrides;
    }
  }
}

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
        // Sous-type exact d'abord (ex. 'seuil-2min'), sinon repli sur la
        // famille générique (ex. 'seuil')
        const cle = NOTES_PRATIQUES[seance.sousType] ? seance.sousType : FAMILLE_SOUS_TYPE[seance.sousType];
        if (cle && NOTES_PRATIQUES[cle]) {
          ajouterNote(seance, piocher(cle));
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Repères qualitatifs sur séances dures (doc convergence-v1-v2.md, section
// 2.4) — deux natures distinctes :
// - Ressenti : banque de variantes par famille (même mécanisme que 2.3/2.5)
// - Progression relative : comparaison à l'occurrence antérieure la plus
//   récente de même famille (cf. FAMILLE_SOUS_TYPE, décision actée dans le
//   doc : comparer par famille plutôt que sousType exact, un sousType
//   identique d'une occurrence à l'autre étant peu probable)
// ---------------------------------------------------------------------------

export const NOTES_RESSENTI = {
  'seuil': [
    "Effort contrôlé, 3-4 mots max si tu devais parler.",
    "Ça doit rester soutenu mais pas explosif."
  ],
  // Sous-type précis, même principe que NOTES_PRATIQUES.seuil-2min — un
  // seuil-2min alterne rapide/facile, "reste soutenu" (repère seuil
  // générique) n'a pas de sens pour ce format alterné (bug trouvé le
  // 7 juillet 2026, cf. commentaire ci-dessus sur le renommage fartlek ->
  // seuil-2min).
  'seuil-2min': [
    "Sur les portions rapides, vise un effort proche du seuil — pas maximal, mais nettement plus soutenu que l'allure facile qui suit.",
    "L'écart entre le rapide et le facile doit être net — c'est cet écart qui donne son intérêt à cette séance."
  ],
  'vma': [
    "Effort proche du maximum sur chaque répétition, récup complète entre les deux.",
    "L'intensité prime — mieux vaut une répétition de moins mais bien exécutée."
  ]
};

/**
 * Injecte un repère de ressenti (piochée aléatoirement) sur les séances de
 * famille seuil/vma. Indépendant des notes pratiques (2.3) : peut se
 * cumuler avec elles dans le même contenu. Vérifie d'abord une entrée
 * dédiée au SOUS-TYPE exact, même principe que injecterNotesPratiques.
 */
export function injecterRepereRessenti(semaines) {
  const piocher = (cle) => {
    const variantes = NOTES_RESSENTI[cle];
    return variantes[Math.floor(Math.random() * variantes.length)];
  };

  for (const semaine of semaines) {
    for (const seance of Object.values(semaine.assignment)) {
      if (seance.type !== 'qualite') continue;
      const cle = NOTES_RESSENTI[seance.sousType] ? seance.sousType : FAMILLE_SOUS_TYPE[seance.sousType];
      if (cle && NOTES_RESSENTI[cle] && seance.contenu) {
        seance.contenu = `${seance.contenu} ${piocher(cle)}`;
      }
    }
  }
}

/**
 * Injecte une note de progression relative en comparant chaque séance
 * qualité à l'occurrence antérieure la plus récente de même famille
 * (FAMILLE_SOUS_TYPE). Parcourt les semaines dans l'ordre chronologique en
 * gardant trace, par famille, de la dernière semaine où elle a été vue.
 * Ne compare jamais une séance à elle-même (première occurrence d'une
 * famille : pas de note).
 *
 * Déclenchement volontairement strict pour rester un repère ponctuel et
 * remarquable (comme dans v1, où la note n'apparaît qu'une fois sur
 * l'ensemble du plan observé) plutôt qu'une routine hebdomadaire : sans ces
 * deux garde-fous, la progression par petits paliers réguliers du moteur
 * faisait déclencher la note presque à chaque semaine consécutive.
 * - Écart minimum de 3 semaines (pas la semaine juste précédente)
 * - Seuil de similarité resserré à 5% (pas 15%)
 *
 * À appeler après injecterNotesPratiques/injecterRepereRessenti si on veut
 * cumuler les trois notes sur une même séance (l'ordre entre ces trois
 * fonctions n'a pas d'importance fonctionnelle, seulement l'ordre
 * d'affichage des notes accumulées dans le contenu).
 */
export function injecterProgressionRelative(semaines) {
  const ECART_MIN_SEMAINES = 3;
  const SEUIL_SIMILARITE = 0.10;
  const historiqueParFamille = {}; // famille -> [{ semaineNum, kmEstime }, ...]

  for (const semaine of semaines) {
    for (const seance of Object.values(semaine.assignment)) {
      if (seance.type !== 'qualite') continue;
      const famille = FAMILLE_SOUS_TYPE[seance.sousType];
      if (!famille) continue;

      const historique = historiqueParFamille[famille] ?? [];
      // Cherche, dans l'historique de cette famille, la comparaison la plus
      // pertinente : la plus récente qui respecte l'écart minimum de
      // semaines ET le seuil de similarité de volume.
      const candidat = [...historique].reverse().find(h => {
        const ecartSemaines = semaine.semaineNum - h.semaineNum;
        const volumeSimilaire = h.kmEstime > 0 &&
          Math.abs((seance.kmEstime ?? 0) - h.kmEstime) / h.kmEstime < SEUIL_SIMILARITE;
        return ecartSemaines >= ECART_MIN_SEMAINES && volumeSimilaire;
      });

      if (candidat && seance.contenu) {
        const ecartSemaines = semaine.semaineNum - candidat.semaineNum;
        seance.contenu = `${seance.contenu} Volume similaire à S${candidat.semaineNum} (il y a ${ecartSemaines} semaines) — la fatigue accumulée depuis peut se faire sentir.`;
      }

      historiqueParFamille[famille] = [...historique, { semaineNum: semaine.semaineNum, kmEstime: seance.kmEstime ?? 0 }];
    }
  }
}

// ---------------------------------------------------------------------------
// Cohérence narrative de la semaine test (doc convergence-v1-v2.md, section
// 2.6) — doit s'exécuter APRÈS placerSeanceTest (la séance test n'existe pas
// encore au moment où injecterJalonsTransition/injecterNotesPratiques/etc.
// tournent, cf. l'ordre des appels dans generatePlan : placerSeanceTest est
// appelée bien après, une fois l'objet plan construit).
// ---------------------------------------------------------------------------

export const NOTES_SEMAINE_TEST = {
  'annonce': [
    "Semaine test : l'occasion de vérifier où tu en es sur ton allure objectif.",
    "Cette semaine contient ta séance test — vise à arriver dessus en forme."
  ],
  'veille-test': [
    "Jambes fraîches pour demain — reste facile.",
    "Rien à prouver aujourd'hui, garde de l'énergie pour demain."
  ],
  'lendemain-test': [
    "Récupération après l'effort d'hier.",
    "Jambes qui tournent tranquillement après le test."
  ]
};

/**
 * Détecte la séance test (estTest: true) dans le plan et enrichit la
 * cohérence narrative de sa semaine à trois niveaux :
 * - Annonce en tête de semaine (1er jour), rejoint le principe des jalons
 *   de transition (2.5) mais implémenté ici faute d'exister au moment où
 *   injecterJalonsTransition tourne
 * - Contexte "veille de test" sur le jour juste avant (assigné en plus du
 *   rôle standard/recuperation existant)
 * - Contexte "lendemain de test" sur le jour juste après
 * Ne fait rien si aucune séance test n'a été placée dans le plan (ex. plan
 * trop court pour accueillir une phase Spécifique).
 */
export function injecterCoherenceSemaineTest(plan) {
  const piocher = (cle) => {
    const variantes = NOTES_SEMAINE_TEST[cle];
    return variantes[Math.floor(Math.random() * variantes.length)];
  };

  for (const semaine of plan.semaines) {
    const jours = Object.entries(semaine.assignment);
    const indexTest = jours.findIndex(([, s]) => s.estTest);
    if (indexTest === -1) continue;

    // Annonce en tête de semaine (1er jour, différent du jour du test lui-même)
    const [, premierJour] = jours[0];
    if (premierJour.contenu && !premierJour.estTest) {
      premierJour.contenu = `${premierJour.contenu} ${piocher('annonce')}`;
    }

    // Veille (jour juste avant le test dans l'ordre de la semaine)
    if (indexTest > 0) {
      const [, veille] = jours[indexTest - 1];
      if (veille.contenu) {
        veille.role = veille.role ? `${veille.role}+veille-test` : 'veille-test';
        veille.contenu = `${veille.contenu} ${piocher('veille-test')}`;
      }
    }

    // Lendemain (jour juste après)
    if (indexTest < jours.length - 1) {
      const [, lendemain] = jours[indexTest + 1];
      if (lendemain.contenu) {
        lendemain.role = lendemain.role ? `${lendemain.role}+lendemain-test` : 'lendemain-test';
        lendemain.contenu = `${lendemain.contenu} ${piocher('lendemain-test')}`;
      }
    }

    break; // une seule séance test par plan actuellement, pas la peine de continuer
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
  // ceil (pas round) : garantit que dateCourse tombe TOUJOURS dans la
  // dernière semaine générée, jamais après. Avec round, un totalJours non
  // multiple de 7 pouvait arrondir vers le bas et faire terminer le plan
  // avant la vraie date de course (bug trouvé le 17/07/2026 : semi prévu
  // le 04/04/2027, plan se terminait le 28/03/2027, -7 jours). Le calcul
  // exact du jour de course DANS cette dernière semaine reste fait par
  // placerSeanceCourse (index ISO du jour, pas juste "le dernier jour").
  const totalSemaines = Math.max(1, Math.ceil(totalJours / 7));

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
  if (niveau === 'grand-debutant') return 0; // marche-course uniquement, pas de qualité (§ marche-course)
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

  // Grand débutant (§ marche-course) : pas de distinction longue/EF/qualité —
  // toutes les séances de la semaine sont du marche-course au même palier de
  // progression. Les études (NHS Couch-to-5K, etc.) ne différencient jamais
  // une "sortie longue" chez ce public : 3 séances identiques + repos entre
  // chaque, la structure classique n'apparaît qu'une fois la course continue
  // acquise (transition vers le niveau "debutant").
  if (niveau === 'grand-debutant') {
    days.forEach(d => { assignment[d] = { type: 'marche-course' }; });
    // Garde-fou #6 (48h entre séances dures) : le marche-course est doux mais
    // reste un effort cardio répété, on applique la même vérification.
    for (let i = 1; i < days.length; i++) {
      if (days[i] - days[i - 1] < 2) {
        warnings.push({
          code: 'ECART_RECUPERATION_INSUFFISANT',
          message: `Moins de 48h de récupération entre deux séances marche-course (jours ${days[i - 1]} et ${days[i]}).`
        });
      }
    }
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
    Construction: ['tempo-court', 'seuil-2min'],
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
export function genererContenuQualite({ distance, phase, semaineDansPhase, indexQualiteSemaine, alluresSec, restrictionsAllure, tauxAffutage = 1, estDechargeSemaine = false, nbApparitionsParSousType = {}, niveau = 'intermediaire' }) {
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

  let contenuCorps, kmCorps, structureIntervalles;

  switch (sousType) {
    case 'seuil-court': {
      // Progression par niveau (v2.2, 11 juillet 2026) — base/plafond
      // intermédiaire inchangés (3→5), débutant/confirmé ajustés d'une
      // répétition de part et d'autre, cohérent avec l'ampleur déjà
      // retenue pour i-30-30.
      const PARAMS_NIVEAU = { debutant:{base:2,cap:4}, intermediaire:{base:3,cap:5}, confirme:{base:4,cap:6} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      const reps = ajuster(reduireSelonNiveauProgression(base, 1, cap, semaineDansPhase), 2);
      kmCorps = kmDepuisMinutes(reps * 6, T);
      contenuCorps = `${reps}×6min @ ${formatPace(T)} (Seuil), récup 90s`;
      structureIntervalles = { blocs: [{ repetitions: reps, dureeEffortSec: 6*60, allure: formatPace(T), dureeRecupSec: 90 }] };
      break;
    }
    case 'seuil': {
      const PARAMS_NIVEAU = { debutant:{base:2,cap:4}, intermediaire:{base:3,cap:5}, confirme:{base:4,cap:6} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      const reps = ajuster(reduireSelonNiveauProgression(base, 1, cap, semaineDansPhase), 2);
      kmCorps = kmDepuisMinutes(reps * 8, T);
      contenuCorps = `${reps}×8min @ ${formatPace(T)} (Seuil), récup 2min`;
      structureIntervalles = { blocs: [{ repetitions: reps, dureeEffortSec: 8*60, allure: formatPace(T), dureeRecupSec: 2*60 }] };
      break;
    }
    case 'i-30-30': {
      // Correctif du 8 juillet 2026 (v2.2, méthodologie) : l'ancienne version
      // fixait les répétitions à 8 dès la 1ère apparition et ne faisait
      // progresser QUE le nombre de séries (1→2→3) — cassait le principe de
      // "surcharge progressive" (augmenter UNE seule variable à la fois,
      // confirmé par plusieurs sources : NQ Physio, Medical News Today,
      // Marathon Handbook) et produisait un saut brutal de +50% du volume
      // total en une semaine au passage de 2 à 3 séries (16→24 répétitions),
      // repéré par Laurent en conditions réelles sur son propre plan.
      //
      // Deux tentatives intermédiaires rejetées avant cette version, testées
      // par calcul isolé avant de committer : 1) faire progresser les
      // répétitions puis les séries en gardant les répétitions au plafond
      // pour les nouvelles séries — laissait un saut de +100% au passage
      // 1→2 séries (8 -> 16) ; 2) une formule à base de modulo imbriqué pour
      // que chaque nouvelle série redémarre aussi à un niveau réduit — trop
      // complexe, plusieurs bugs de calcul trouvés en testant (le plafond
      // final ne se stabilisait pas correctement).
      //
      // Version retenue : simulation par boucle explicite, plus simple et
      // vérifiable. Progression basée sur le nombre de fois que cette
      // séance est déjà apparue dans le plan (pas semaineDansPhase, qui
      // reset à chaque changement de phase — la progression continue même
      // si la VMA revient après une pause dans la rotation) :
      // 1) 1ère série : répétitions montent de 4 à 8 (+1 par apparition)
      // 2) une fois 8 atteint, une 2e série démarre à 5 répétitions,
      //    remonte à son tour à 8
      // 3) une fois les 2 séries à 8, une 3e série démarre à 5, remonte à 8
      // 4) au-delà (3 séries de 8), reste stable — plus grand saut mesuré
      //    sur toute la séquence : 25% (le tout premier pas 4->5, minimal
      //    possible vu la petite base de départ)
      const REPS_PARAMS_PAR_NIVEAU = {
        // Base de départ et plafond de répétitions par niveau (v2.2,
        // demandé par Laurent le 11 juillet 2026) — vérifié contre la
        // littérature (peakvo2trainer.com, runstreet.com) : les débutants
        // devraient démarrer plus bas et progresser plus prudemment que les
        // coureurs confirmés, cohérent avec le principe de surcharge
        // progressive déjà appliqué (section 2.2, commit 71e9495) mais
        // jusqu'ici identique pour tous les niveaux.
        debutant:     { depart: 3, max: 7 },
        intermediaire:{ depart: 4, max: 8 },
        confirme:     { depart: 5, max: 9 },
      };
      const { depart: REPS_DEPART_I3030, max: REPS_MAX_I3030 } = REPS_PARAMS_PAR_NIVEAU[niveau] || REPS_PARAMS_PAR_NIVEAU.intermediaire;
      const SERIES_MAX_I3030 = 3, REPS_DEPART_NOUVELLE_SERIE_I3030 = REPS_DEPART_I3030 + 1;
      let series = 1, repsParSerie = REPS_DEPART_I3030;
      const nbApparitions = nbApparitionsParSousType['i-30-30'] ?? 0;
      for (let iter = 0; iter < nbApparitions; iter++) {
        if (repsParSerie < REPS_MAX_I3030) repsParSerie++;
        else if (series < SERIES_MAX_I3030) { series++; repsParSerie = REPS_DEPART_NOUVELLE_SERIE_I3030; }
      }
      repsParSerie = ajuster(repsParSerie, 4);
      series = ajuster(series, 1);
      // 30s effort par répétition ; on ignore les 30s de récup intra-série
      // dans l'estimation km (approximation assumée) ; récup inter-séries
      // fixée à 3min (seulement pertinente si series > 1)
      kmCorps = kmDepuisMinutes(series * repsParSerie * 0.5, I);
      contenuCorps = series > 1
        ? `${series} séries de ${repsParSerie}×30s-30s @ ${formatPace(I)} (VMA), récup 3min entre les séries`
        : `${repsParSerie}×30s-30s @ ${formatPace(I)} (VMA)`;
      structureIntervalles = { blocs: [{ repetitions: repsParSerie, dureeEffortSec: 30, allure: formatPace(I), dureeRecupSec: 30 }], nbSeries: series, recupEntreSeriesSec: series > 1 ? 3*60 : undefined };
      break;
    }
    case 'i-3min': {
      const PARAMS_NIVEAU = { debutant:{base:3,cap:5}, intermediaire:{base:4,cap:6}, confirme:{base:5,cap:7} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      const reps = ajuster(reduireSelonNiveauProgression(base, 1, cap, semaineDansPhase), 2);
      kmCorps = kmDepuisMinutes(reps * 3, I);
      contenuCorps = `${reps}×3min @ ${formatPace(I)} (VMA), récup 2min`;
      structureIntervalles = { blocs: [{ repetitions: reps, dureeEffortSec: 3*60, allure: formatPace(I), dureeRecupSec: 2*60 }] };
      break;
    }
    case 'vitesse': {
      const PARAMS_NIVEAU = { debutant:{base:4,cap:8}, intermediaire:{base:6,cap:10}, confirme:{base:8,cap:12} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      const reps = ajuster(reduireSelonNiveauProgression(base, 1, cap, semaineDansPhase), 3);
      kmCorps = reps * 0.3; // distance directement connue (300m)
      contenuCorps = `${reps}×300m @ ${formatPace(V)} (Vitesse), récupération complète`;
      structureIntervalles = { blocs: [{ repetitions: reps, distanceEffortM: 300, allure: formatPace(V), dureeRecupSec: null, recupLabel: 'complète' }] };
      break;
    }
    case 'cotes': {
      const PARAMS_NIVEAU = { debutant:{base:4,cap:8}, intermediaire:{base:6,cap:10}, confirme:{base:8,cap:12} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      const reps = ajuster(reduireSelonNiveauProgression(base, 1, cap, semaineDansPhase), 3);
      kmCorps = kmDepuisMinutes(reps * 0.5, V); // approximation : allure proche du V
      contenuCorps = `${reps}×30s en côte (effort soutenu), récupération trot`;
      structureIntervalles = { blocs: [{ repetitions: reps, dureeEffortSec: 30, allure: 'effort soutenu (côte)', dureeRecupSec: null, recupLabel: 'trot' }] };
      break;
    }
    case 'allure-course': {
      const PARAMS_NIVEAU = { debutant:{base:2,cap:4}, intermediaire:{base:3,cap:5}, confirme:{base:4,cap:6} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      const reps = ajuster(reduireSelonNiveauProgression(base, 1, cap, semaineDansPhase), 2);
      kmCorps = kmDepuisMinutes(reps * 5, C);
      contenuCorps = `${reps}×5min @ ${formatPace(C)} (allure course), récup 2min`;
      structureIntervalles = { blocs: [{ repetitions: reps, dureeEffortSec: 5*60, allure: formatPace(C), dureeRecupSec: 2*60 }] };
      break;
    }
    case 'allure-course-court': {
      const PARAMS_NIVEAU = { debutant:{base:1,cap:2}, intermediaire:{base:2,cap:3}, confirme:{base:3,cap:4} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      const reps = ajuster(reduireSelonNiveauProgression(base, 1, cap, semaineDansPhase), 1);
      kmCorps = kmDepuisMinutes(reps * 3, C);
      contenuCorps = `${reps}×3min @ ${formatPace(C)} (allure course), récup 2min`;
      structureIntervalles = { blocs: [{ repetitions: reps, dureeEffortSec: 3*60, allure: formatPace(C), dureeRecupSec: 2*60 }] };
      break;
    }
    case 'pyramidale': {
      // Structure par niveau (v2.2, 11 juillet 2026, demandé par Laurent) —
      // vérifié contre la littérature (runbikecalc.com) : une demi-pyramide
      // (montée seulement, sans redescendre) convient mieux aux débutants,
      // une pyramide complète (montée-descente) aux niveaux intermédiaire/
      // confirmé — le niveau confirmé va un cran plus loin (palier
      // supplémentaire à 5min) qu'une pyramide "standard".
      const PALIERS_PAR_NIVEAU = {
        debutant:      [2, 3, 4],           // demi-pyramide, montée seulement
        intermediaire: [2, 3, 4, 3, 2],      // pyramide complète (valeur historique, inchangée)
        confirme:      [2, 3, 4, 5, 4, 3, 2],// pyramide complète plus longue
      };
      const paliers = PALIERS_PAR_NIVEAU[niveau] || PALIERS_PAR_NIVEAU.intermediaire;
      // Demi-pyramide = montée strictement croissante jusqu'au bout, jamais
      // de redescente — plus robuste que déduire ça des valeurs elles-mêmes
      const estDemiPyramide = paliers.every((p, i) => i === 0 || p > paliers[i-1]);
      const totalMin = paliers.reduce((a, b) => a + b, 0);
      kmCorps = kmDepuisMinutes(totalMin, I); // récup ignorée dans l'estimation km (comme i-30-30/seuil-2min)
      contenuCorps = estDemiPyramide
        ? `Pyramidale (montée) ${paliers.join('-')}min @ ${formatPace(I)} (VMA), récup égale au temps de l'effort`
        : `Pyramidale ${paliers.join('-')}min @ ${formatPace(I)} (VMA), récup égale au temps de l'effort`;
      structureIntervalles = { blocs: paliers.map(p => ({ repetitions: 1, dureeEffortSec: p*60, allure: formatPace(I), dureeRecupSec: p*60 })) };
      break;
    }
    case 'seuil-negatif': {
      // Deux blocs de seuil, le second plus rapide — travaille la capacité à
      // accélérer sur jambes fatiguées, cohérent avec le seuil classique
      const PARAMS_NIVEAU = { debutant:{base:6,cap:10}, intermediaire:{base:8,cap:12}, confirme:{base:10,cap:14} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      const dureeBloc = ajuster(reduireSelonNiveauProgression(base, 2, cap, semaineDansPhase), 5);
      const paceBloc2 = T - (T - I) * 0.3; // 30% du chemin vers l'allure VMA
      kmCorps = kmDepuisMinutes(dureeBloc, T) + kmDepuisMinutes(dureeBloc, paceBloc2);
      contenuCorps = `${dureeBloc}min @ ${formatPace(T)} (Seuil) puis ${dureeBloc}min @ ${formatPace(paceBloc2)} (Seuil soutenu), enchaînés sans récup`;
      structureIntervalles = { blocs: [
        { repetitions: 1, dureeEffortSec: dureeBloc*60, allure: formatPace(T), dureeRecupSec: 0 },
        { repetitions: 1, dureeEffortSec: dureeBloc*60, allure: formatPace(paceBloc2), dureeRecupSec: 0 },
      ] };
      break;
    }
    case 'tempo-court': {
      const PARAMS_NIVEAU = { debutant:{base:15,cap:25}, intermediaire:{base:20,cap:35}, confirme:{base:25,cap:40} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      const duree = ajuster(reduireSelonNiveauProgression(base, 5, cap, semaineDansPhase), 10);
      kmCorps = kmDepuisMinutes(duree, T);
      contenuCorps = `${duree}min continu @ ${formatPace(T)} (Seuil léger)`;
      structureIntervalles = { blocs: [{ repetitions: 1, dureeEffortSec: duree*60, allure: formatPace(T), dureeRecupSec: 0 }] };
      break;
    }
    case 'seuil-2min': {
      const PARAMS_NIVEAU = { debutant:{base:3,cap:7}, intermediaire:{base:4,cap:8}, confirme:{base:5,cap:9} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      const reps = ajuster(reduireSelonNiveauProgression(base, 1, cap, semaineDansPhase), 3);
      // Portions rapides comptées à l'allure T, portions faciles ignorées dans
      // l'estimation km (approximation assumée, comme pour i-30-30)
      kmCorps = kmDepuisMinutes(reps * 2, T);
      contenuCorps = `${reps}×2min @ ${formatPace(T)} (Seuil), récup 2min`;
      structureIntervalles = { blocs: [{ repetitions: reps, dureeEffortSec: 2*60, allure: formatPace(T), dureeRecupSec: 2*60 }] };
      break;
    }
    default: {
      kmCorps = kmDepuisMinutes(24, T);
      contenuCorps = `3×8min @ ${formatPace(T)} (Seuil), récup 2min`;
      structureIntervalles = { blocs: [{ repetitions: 3, dureeEffortSec: 8*60, allure: formatPace(T), dureeRecupSec: 2*60 }] };
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

  // structureIntervalles : capturée au moment de la génération (blocs avec
  // répétitions/durées/allures réels), pas reparsée depuis le texte de
  // contenu — même principe déjà appliqué à kmEstime (section 7bis du doc
  // de convergence, reparser du texte s'est avéré fragile plusieurs fois
  // cette session). Sert à afficher "à programmer sur ta montre" (2.8,
  // demandé par Laurent le 8 juillet 2026) et, plus tard, à comparer les
  // laps réels d'une activité Strava à ce qui était attendu.
  structureIntervalles.echauffementSec = DUREE_ECHAUFFEMENT_MIN * 60;
  structureIntervalles.retourCalmeSec = DUREE_RETOUR_CALME_MIN * 60;
  structureIntervalles.allureEchauffement = formatPace(E);

  return { sousType, contenu, kmEstime, structureIntervalles };
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
// ---------------------------------------------------------------------------
// Marche-course (grand débutant) — méthode Galloway / Couch-to-5K
// Paliers de ratio course/marche, une seule variable qui bouge à la fois
// (durée totale de séance stable ~20-30min), conforme aux plans NHS/C25K :
// on ne rallonge jamais la durée ET le ratio simultanément. La progression
// d'un palier au suivant est CONDITIONNELLE (pas liée à une semaine fixe) —
// voir compterSeancesValideesPalier et le garde-fou de §analyserAdaptations.
// ---------------------------------------------------------------------------

// Refonte 17.5 (15/07/2026) : paliers exprimés en durée de course CONTINUE
// (5→30min), plus de ratio course/marche à rallonger. Chaque palier reste
// encadré d'échauffement/retour au calme en marche. Décision avec Laurent :
// 7 paliers, plus rapprochés en début de progression (5-8-12-16-20-25-30)
// pour ne pas décourager au démarrage, écarts plus larges ensuite une fois
// la dynamique de course installée.
export const PALIERS_MARCHE_COURSE = [
  { id: 0, courseMin: 5,  label: '5min de course continue' },
  { id: 1, courseMin: 8,  label: '8min de course continue' },
  { id: 2, courseMin: 12, label: '12min de course continue' },
  { id: 3, courseMin: 16, label: '16min de course continue' },
  { id: 4, courseMin: 20, label: '20min de course continue' },
  { id: 5, courseMin: 25, label: '25min de course continue' },
  { id: 6, courseMin: 30, label: '30min de course continue (transition)' }
];

// Durée totale cible de séance, stable sur tout le programme (§ principe
// "une seule variable à la fois") — le temps de marche d'échauffement/retour
// au calme se réduit mécaniquement à mesure que la course continue s'allonge,
// jusqu'à un minimum de 5min de chaque côté (jamais supprimé, toujours utile
// avant/après un effort).
const DUREE_CIBLE_MARCHE_COURSE_MIN = 25;
const DUREE_MIN_ECHAUFFEMENT_RETOUR_MIN = 5;

/**
 * Détermine si le coureur PEUT passer au palier suivant — validation
 * manuelle (17.5, 15/07/2026) : plus de seuil de nombre de séances, une
 * seule séance validée ("✅") au palier courant suffit à débloquer le bouton
 * côté dashboard. Le passage lui-même reste toujours une action volontaire
 * du coureur (bouton), jamais automatique.
 */
export function palierMarcheCourseFor(seancesValideesPalierCourant, palierActuelId = 0) {
  const palier = PALIERS_MARCHE_COURSE[Math.min(palierActuelId, PALIERS_MARCHE_COURSE.length - 1)];
  const pretPourSuivant = seancesValideesPalierCourant >= 1
    && palierActuelId < PALIERS_MARCHE_COURSE.length - 1;
  return { palier, pretPourSuivant };
}

export function genererContenuMarcheCourse({ palierId = 0 }) {
  const palier = PALIERS_MARCHE_COURSE[Math.min(palierId, PALIERS_MARCHE_COURSE.length - 1)];
  const dureeEchauffementRetour = Math.max(
    DUREE_MIN_ECHAUFFEMENT_RETOUR_MIN,
    Math.round((DUREE_CIBLE_MARCHE_COURSE_MIN - palier.courseMin) / 2)
  );

  return {
    contenu: `Échauffement marche ${dureeEchauffementRetour}min + ${palier.courseMin}min de course continue + retour au calme marche ${dureeEchauffementRetour}min`,
    kmEstime: null, // pas d'estimation fiable tant que l'allure grand-débutant n'est pas établie
    palierLabel: palier.label
  };
}

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
  // structureIntervalles : un seul bloc continu (la séance test n'a pas de
  // répétitions), même principe que genererContenuQualite() (section 2.8,
  // ajouté le 8 juillet 2026).
  const structureIntervalles = {
    blocs: [{ repetitions: 1, dureeEffortSec: dureeConfirmationMin*60, allure: formatPace(C), dureeRecupSec: 0 }],
    echauffementSec: DUREE_ECHAUFFEMENT_MIN*60,
    retourCalmeSec: DUREE_RETOUR_CALME_MIN*60,
    allureEchauffement: formatPace(E)
  };
  return { sousType: 'test', contenu, kmEstime, distanceTestKm, structureIntervalles };
}

// ---------------------------------------------------------------------------
// Jour de course (doc convergence-v1-v2.md, section 2.7) — stratégie de
// pacing par distance décidée à partir de la littérature (cf. doc pour les
// sources), explicitement pour un public amateur/intermédiaire, pas élite.
//
// Réécrite le 19/07/2026 pour utiliser EXACTEMENT la même logique de
// calibrage que calculerStrategieCourse()/calculerSplitsCalibres() dans
// public/index.html (carte "Allures de passage" de l'onglet Course et
// carte "Jour J" de la vue Semaine) — bug corrigé : cette fonction générait
// un texte narratif AU MOMENT DE LA CRÉATION DU PLAN, figé ensuite dans
// seance.contenu (stocké tel quel en base), avec une stratégie à 2
// segments non calibrée (10K) complètement différente de la stratégie à
// 3-4 segments calibrés affichée dynamiquement ailleurs dans l'app. Les
// deux logiques doivent rester alignées ; si calculerStrategieCourse()
// change côté index.html, ce générateur doit être mis à jour en miroir
// (aucun moyen de les partager littéralement, plan-generator.js tournant
// aussi côté serveur/génération de plan, index.html côté affichage).
// ---------------------------------------------------------------------------

/**
 * Calcule les segments à partir de définitions avec un ÉCART relatif
 * (offsetSecKm) pour tous les segments SAUF le dernier — le dernier
 * segment est calibré mathématiquement pour compenser exactement l'écart
 * accumulé, garantissant que la somme des temps de tous les segments
 * corresponde TOUJOURS exactement au temps objectif. Miroir exact de
 * calculerSplitsCalibres() dans public/index.html.
 */
function calculerSplitsCalibres(distanceKm, tempsObjectifSec, definitionsSegmentsIntermediaires, dernierNote) {
  const paceMoyen = tempsObjectifSec / distanceKm;
  let tempsUtilise = 0, distUtilisee = 0;
  const segments = definitionsSegmentsIntermediaires.map(d => {
    const pace = paceMoyen + d.offsetSecKm;
    const dist = d.to - d.from;
    tempsUtilise += dist * pace;
    distUtilisee += dist;
    return { from: d.from, to: d.to, note: d.note, pace };
  });
  const distRestante = distanceKm - distUtilisee;
  const tempsRestant = tempsObjectifSec - tempsUtilise;
  segments.push({ from: distUtilisee, to: distanceKm, note: dernierNote, pace: tempsRestant / distRestante });
  return segments;
}

/**
 * Choix des segments selon la distance de course. Miroir exact de
 * calculerStrategieCourse() dans public/index.html.
 */
function calculerStrategieCourse(distanceKmCourse, tempsObjectifSec) {
  if (distanceKmCourse <= 5.5) {
    const d = Math.round(distanceKmCourse);
    return calculerSplitsCalibres(distanceKmCourse, tempsObjectifSec, [
      { from: 0, to: Math.min(1, d * 0.2), note: "Départ prudent", offsetSecKm: 6 },
      { from: Math.min(1, d * 0.2), to: d * 0.45, note: "Allure cible", offsetSecKm: 1 },
      { from: d * 0.45, to: d * 0.8, note: "Accélération progressive", offsetSecKm: -2 },
    ], "Tout donner");
  } else if (distanceKmCourse <= 12) {
    const d = distanceKmCourse;
    return calculerSplitsCalibres(d, tempsObjectifSec, [
      { from: 0, to: d * 0.2, note: "Départ prudent", offsetSecKm: 8 },
      { from: d * 0.2, to: d * 0.5, note: "Montée en régime", offsetSecKm: 2 },
      { from: d * 0.5, to: d * 0.8, note: "Allure cible soutenue", offsetSecKm: -2 },
    ], "Dernier effort, tout donner");
  } else {
    const d = distanceKmCourse;
    const kmDepart = d * 0.15;
    return calculerSplitsCalibres(d, tempsObjectifSec, [
      { from: 0, to: kmDepart, note: "Marge de sécurité, ne pars pas trop vite", offsetSecKm: 5 },
      { from: kmDepart, to: d * 0.85, note: "Allure cible, régularité", offsetSecKm: -0.5 },
    ], "Ajuste au ressenti en fin de course");
  }
}

/**
 * Génère le contenu de la séance de course. Utilise calculerStrategieCourse()
 * ci-dessus — mêmes segments (bornes km, note, allure) que la carte visuelle
 * "Allures de passage" affichée dynamiquement dans l'app, garantissant que
 * le texte figé dans le plan et l'affichage recalculé racontent toujours la
 * même histoire.
 */
export function genererContenuRace({ distance, alluresSec }) {
  const distanceKm = KM_BY_DISTANCE[distance] ?? 10;
  const C = alluresSec.C; // allure course, en secondes/km
  const tempsObjectifSec = C * distanceKm;

  const splits = calculerStrategieCourse(distanceKm, tempsObjectifSec);

  const segments = splits.map(s =>
    `Km ${Math.round(s.from)}-${Math.round(s.to)} : ${s.note} (${formatPace(s.pace)})`
  );
  const resume = segments.join(' · ');

  const contenu = `🏁 Jour de course — ${distanceKm}km à l'allure objectif ${formatPace(C)}. ${resume}`;
  return { sousType: 'race', contenu, kmEstime: distanceKm };
}

/**
 * Remplace la séance du jour de course (date == dateCourse) par une vraie
 * séance de course, avec stratégie de segments par distance. Mute le plan
 * en place. Silencieux si le jour de course ne tombe sur aucune séance du
 * plan.
 *
 * Cible le jour ISO exact de dateCourse dans la dernière semaine (pas
 * systématiquement "le dernier jour de la semaine") — correctif du
 * 17/07/2026. Avant : supposait que dateCourse tombait toujours un
 * dimanche (dernier index de assignment), ce qui n'est vrai QUE si
 * totalJours est un multiple exact de 7 depuis dateDebut. Sinon, la
 * "vraie" position de dateCourse dans la semaine ne correspondait pas au
 * dernier jour généré — bug découvert le 17/07/2026 (semi prévu le
 * 04/04/2027, un dimanche, mais le plan plaçait la course une semaine
 * trop tôt car totalSemaines avait arrondi vers le bas, cf. computePhases).
 * Combiné au passage de computePhases en ceil (jamais de sous-dimension),
 * la dernière semaine générée contient TOUJOURS dateCourse quelque part ;
 * ce calcul trouve précisément où.
 */
export function placerSeanceCourse(plan, alluresSec) {
  const derniereSemaine = plan.semaines[plan.semaines.length - 1];
  if (!derniereSemaine) return;

  // Jour ISO de dateCourse (0=lundi...6=dimanche) — clés assignment vont
  // de 1 (mardi) à 6 (dimanche), lundi (0) absent (repos implicite, cf.
  // mémoire séances). getDay() JS renvoie 0=dimanche...6=samedi, converti
  // ici en 0=lundi...6=dimanche pour matcher les clés assignment.
  const jsDay = new Date(plan.dateCourse + 'T00:00:00').getDay();
  const jourCourseISO = (jsDay + 6) % 7;

  let dernierJour = derniereSemaine.assignment[jourCourseISO];
  let jourCourseNum = jourCourseISO;

  // Garde-fou : si dateCourse tombe un lundi (jourCourseISO === 0), aucune
  // clé n'existe dans assignment (lundi toujours repos implicite). Cas
  // limite non géré avant, repli sur l'ancien comportement (dernier jour
  // généré) plutôt que de silencieusement ne rien faire.
  if (!dernierJour) {
    const jours = Object.entries(derniereSemaine.assignment);
    const derniere = jours[jours.length - 1];
    if (!derniere) return;
    jourCourseNum = Number(derniere[0]);
    dernierJour = derniere[1];
  }
  if (!dernierJour) return;

  const { sousType, contenu, kmEstime } = genererContenuRace({ distance: plan.distance, alluresSec });
  dernierJour.type = 'race';
  dernierJour.sousType = sousType;
  dernierJour.contenu = contenu;
  dernierJour.kmEstime = kmEstime;
  dernierJour.estCourse = true;
}

// ---------------------------------------------------------------------------
// Semaine d'approche : repères J-X et consignes logistiques (doc
// convergence-v1-v2.md, section 2.7, deuxième partie) — les 3 derniers jours
// avant course (hors le jour de course lui-même, traité par
// placerSeanceCourse) reçoivent un repère de distance et/ou une consigne
// pratique. Doit s'exécuter après placerSeanceCourse (a besoin de savoir
// quel jour est le jour de course pour compter les J-X en arrière).
// ---------------------------------------------------------------------------

export const NOTES_APPROCHE_COURSE = {
  'j3': [
    "J-3 : footing léger uniquement, rien de plus.",
    "Encore 3 jours. Cette séance reste volontairement courte et facile."
  ],
  'j2': [
    "Hydratation et sommeil : les deux leviers qui comptent le plus maintenant.",
    "Repos total aujourd'hui — priorité à l'hydratation et à un bon sommeil."
  ],
  'veille': [
    "Pâtes le soir, coucher tôt. Prépare ce dont tu as besoin pour demain.",
    "Repos complet, repas riche en glucides ce soir, et au lit tôt."
  ]
};

/**
 * Injecte les repères J-X et consignes logistiques sur les 3 derniers jours
 * avant la course (J-3, J-2, veille), en comptant en arrière depuis le jour
 * de course (estCourse: true). Mute le plan en place. Silencieux si aucun
 * jour de course n'est trouvé, ou si le plan est trop court pour avoir 3
 * jours avant (pas de garde-fou bloquant, juste les jours manquants sont
 * ignorés).
 */
export function injecterApprocheCourse(plan) {
  const piocher = (cle) => {
    const variantes = NOTES_APPROCHE_COURSE[cle];
    return variantes[Math.floor(Math.random() * variantes.length)];
  };

  const derniereSemaine = plan.semaines[plan.semaines.length - 1];
  if (!derniereSemaine) return;

  // Utilise directement la clé numérique du jour (0=Lun ... 6=Dim) plutôt
  // que la position dans Object.values(assignment) : ce dernier ne
  // reflète l'ordre réel des jours que si l'objet a ses 7 clés (0 à 6)
  // contiguës, ce qui est vrai pour un plan généré normalement mais pas
  // garanti dans tous les cas (ex. tests avec un assignment partiel).
  const cleCourse = Object.entries(derniereSemaine.assignment).find(([, j]) => j.estCourse)?.[0];
  if (cleCourse === undefined) return;
  const jourCourseNum = Number(cleCourse);

  // Garde-fou sportif : jamais de séance qualité dans les 2 derniers jours
  // avant course (J-2 et veille) — la rotation Affûtage du moteur peut
  // placer une séance qualité (ex. allure-course) à cet endroit sans tenir
  // compte de la proximité de la course. Converti en EF léger générique
  // plutôt que de complexifier placerSemaine avec un cas spécifique à la
  // toute dernière semaine du plan.
  [1, 2].forEach(decalage => {
    const jour = derniereSemaine.assignment[jourCourseNum - decalage];
    if (jour && jour.type === 'qualite') {
      jour.type = 'ef';
      jour.sousType = undefined;
      jour.role = 'recuperation';
      jour.contenu = `Footing très léger, aucune intensité à ${decalage} jour${decalage > 1 ? 's' : ''} de la course.`;
      jour.kmEstime = (jour.kmEstime ?? 0) * 0.4; // réduit fortement le volume de cette séance
    }
  });

  // J-3, J-2 (= veille de la veille), veille (J-1) — dans cet ordre, en
  // comptant en arrière depuis le jour de course
  const cles = ['j3', 'j2', 'veille'];
  cles.forEach((cle, i) => {
    const decalage = cles.length - i; // 3, 2, 1
    const jour = derniereSemaine.assignment[jourCourseNum - decalage];
    if (jour && jour.contenu) {
      jour.contenu = `${jour.contenu} ${piocher(cle)}`;
    }
  });
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

  const { sousType, contenu, kmEstime, distanceTestKm, structureIntervalles } = genererContenuTest({ distance: plan.distance, alluresSec });
  seance.sousType = sousType;
  seance.contenu = contenu;
  seance.kmEstime = kmEstime;
  seance.estTest = true;
  seance.distanceTestKm = distanceTestKm;
  seance.structureIntervalles = structureIntervalles;

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
// Grand débutant (marche-course) : le chemin de génération de plan a été
// déplacé dans plan-forme.js (generatePlanFormeMarcheCourse) le 14/07/2026
// — v2.8, §17.1, correction du choix initial de rattacher ce niveau au plan
// course. Restent ici, réutilisés par plan-forme.js : nbQualiteFor,
// placerSemaine (cas grand-debutant), PALIERS_MARCHE_COURSE,
// genererContenuMarcheCourse, palierMarcheCourseFor,
// analyserProgressionMarcheCourse — briques indépendantes de la notion de
// plan course, pas de duplication à faire.
// ---------------------------------------------------------------------------

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
  // Compteur d'apparitions par sous-type, utilisé pour la progression
  // continue sur tout le plan (section 2.2 v2.2, voir commentaire dans le
  // case 'i-30-30' de genererContenuQualite) — persiste à travers toute la
  // boucle des semaines, incrémenté après chaque séance qualité générée.
  const nbApparitionsParSousType = {};
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
          const { sousType, contenu, kmEstime, structureIntervalles } = genererContenuQualite({
            distance: params.distance,
            phase: phase.nom,
            semaineDansPhase: i,
            indexQualiteSemaine: seance.indexQualite ?? 0,
            alluresSec: allSeconds,
            restrictionsAllure: seance.restrictionsAllure,
            tauxAffutage: tauxAffutageSemaine,
            estDechargeSemaine: dechargeSemaine,
            nbApparitionsParSousType,
            niveau: profil.niveau
          });
          seance.sousType = sousType;
          seance.contenu = contenu;
          seance.kmEstime = kmEstime;
          seance.structureIntervalles = structureIntervalles;
          if (sousType) nbApparitionsParSousType[sousType] = (nbApparitionsParSousType[sousType] ?? 0) + 1;
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

  // Strides sur un sous-ensemble des EF standard de Construction (v2.13,
  // 17/07/2026) — après injecterNotesPratiques pour que le texte des strides
  // s'ajoute à la suite de la note pratique existante, pas l'inverse
  injecterStrides(semaines, allSeconds);

  // Repères qualitatifs sur séances dures (doc convergence-v1-v2.md, 2.4) —
  // ressenti (banque de variantes) + progression relative (comparaison à
  // l'historique du plan déjà généré, doit s'exécuter après que kmEstime
  // soit connu sur toutes les séances qualité)
  injecterRepereRessenti(semaines);
  injecterProgressionRelative(semaines);

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

  // Cohérence narrative de la semaine test (doc convergence-v1-v2.md, 2.6) —
  // doit s'exécuter après placerSeanceTest, la séance test n'existant pas
  // encore au moment des autres injections de notes plus haut
  injecterCoherenceSemaineTest(plan);

  // Jour de course (doc convergence-v1-v2.md, 2.7) — remplace le dernier
  // jour du plan (générique jusqu'ici) par une vraie séance de course avec
  // stratégie de segments par distance
  placerSeanceCourse(plan, allSeconds);

  // Semaine d'approche : repères J-X et consignes logistiques (doc
  // convergence-v1-v2.md, 2.7) — doit s'exécuter après placerSeanceCourse
  // (a besoin de savoir quel jour est estCourse pour compter en arrière)
  injecterApprocheCourse(plan);

  return plan;
}

// ---------------------------------------------------------------------------
// Section 33bis — ACWR (Acute:Chronic Workload Ratio)
// ---------------------------------------------------------------------------
// v1 volontairement simple (chantier ACWR, discuté 11/07/2026, validé
// historiquement le 13/07/2026) : volume brut (km courus), sans pondération
// FC ni allure — ce sera l'étape suivante (TRIMP ou pondération
// SESSION_TARGETS) si ce v1 s'avère insuffisant. Calcul sur activités
// Strava réelles uniquement (jamais le plan théorique) : charge aiguë =
// somme des 7 derniers jours, charge chronique = moyenne des 4 fenêtres de
// 7 jours sur les 28 derniers jours. Seuil de risque communément admis en
// littérature : ratio > 1.5.

export const ACWR_SEUIL_RISQUE = 1.5;
export const ACWR_SEUIL_VIGILANCE = 1.3;
export const ACWR_SEUIL_SOUS_CHARGE = 0.8;

// kmParJour() et calculerACWR() retirées le 17/07/2026 (§9.3 doc intégration
// moteur de décision — unification de la source de vérité sur la charge).
// Remplacées par DecisionEngineRunnerState.calculerHistoriqueCharge() /
// .calculerRunnerState() (côté classic ; pas d'équivalent ES module pour le
// moteur de décision à ce jour, cf. inventaire).

// ---------------------------------------------------------------------------
// Section 33 — Règles d'adaptation du plan selon les résultats réels
// ---------------------------------------------------------------------------

// Format réel des statuts stockés côté app (public/index.html, SOPTS) :
// emojis, pas mots — "✅" réussie, "❌" ratée, "⚠️" adaptée, "😴" repos/skip.
// BUG CORRIGÉ le 14/07/2026 : ces clés étaient auparavant des mots
// (ratee/adaptee/reussie) qui ne correspondaient à AUCUN statut réel jamais
// stocké par l'app — POIDS_STATUT[statut] retournait donc toujours
// `undefined` (repli silencieux sur `?? 0` ligne ~2115), neutralisant
// complètement le score de chaque semaine : une séance ratée valait 0 au
// lieu de 1, donc analyserAdaptations() ne proposait jamais d'alléger une
// semaine, quel que soit le nombre de séances ratées. Repéré en corrigeant
// le même type d'erreur sur analyserProgressionMarcheCourse (§15).
const POIDS_STATUT = { '❌': 1, '⚠️': 0.5, '✅': 0 };

// ---------------------------------------------------------------------------
// Progression marche-course (grand débutant) — distincte du mécanisme
// d'adaptation classique (décharge de volume) : ici il s'agit de faire
// avancer ou non le palier de ratio course/marche, pas d'ajuster un volume.
// Garde-fou de durée totale : au-delà de GARDE_FOU_SEMAINES_MARCHE_COURSE
// semaines sans atteindre le dernier palier (course continue), on avertit
// plutôt que de laisser le plan traîner silencieusement (cf. décision du
// 14/07/2026 : la progression conditionnelle n'a pas de fin automatique,
// donc il faut un signal si elle ne converge pas).
// ---------------------------------------------------------------------------

export const GARDE_FOU_SEMAINES_MARCHE_COURSE = 12;

/**
 * Détermine, à partir des statuts enregistrés, si le coureur PEUT passer au
 * palier suivant (17.5, 15/07/2026 : validation manuelle — une seule séance
 * "✅" au palier courant suffit à débloquer le bouton côté dashboard, le
 * passage lui-même reste toujours une action volontaire, jamais automatique).
 * Compte les séances "✅" au palier courant (plan.palierMarcheCourse) parmi
 * les semaines déjà vécues du plan ; une séance "❌" ou "⚠️" ne fait pas
 * reculer le palier mais ne compte pas non plus comme validation.
 */
export function analyserProgressionMarcheCourse(plan) {
  // v2.8 (§17.1) : le plan grand-débutant est désormais généré par
  // generatePlanFormeMarcheCourse (plan-forme.js), qui expose
  // mode:'forme', sousMode:'marche-course', palierMarcheCourse à la racine
  // du plan — pas de profilOrigine (contrairement à l'ancien
  // generatePlanMarcheCourse, retiré le 14/07/2026).
  if (plan.mode !== 'forme' || plan.sousMode !== 'marche-course') return null;

  const palierId = plan.palierMarcheCourse ?? 0;
  let seancesValidees = 0;
  let totalSeancesSuivies = 0;
  let premiereSeanceSemaine = null;
  let derniereSeanceSemaine = null;

  for (const semaine of plan.semaines) {
    for (const [jour, seance] of Object.entries(semaine.assignment)) {
      if (seance.type !== 'marche-course') continue;
      const uid = `${semaine.semaineNum}-${jour}`;
      const statut = plan.statuses?.[uid];
      if (!statut) continue;
      totalSeancesSuivies++;
      if (premiereSeanceSemaine === null) premiereSeanceSemaine = semaine.semaineNum;
      derniereSeanceSemaine = semaine.semaineNum;
      // Format réel des statuts côté app (public/index.html, SOPTS) :
      // emojis, pas mots — "✅" = réussie, "❌" = ratée, "⚠️" = adaptée,
      // "😴" = repos/skip.
      if (statut === '✅') seancesValidees++;
    }
  }

  const { pretPourSuivant } = palierMarcheCourseFor(seancesValidees, palierId);
  const dernierPalier = palierId >= PALIERS_MARCHE_COURSE.length - 1;
  const semainesEcoulees = premiereSeanceSemaine !== null
    ? (derniereSeanceSemaine - premiereSeanceSemaine + 1)
    : 0;

  const warnings = [];
  if (!dernierPalier && semainesEcoulees >= GARDE_FOU_SEMAINES_MARCHE_COURSE) {
    warnings.push({
      code: 'MARCHE_COURSE_PROGRESSION_LENTE',
      message: `Toujours au palier "${PALIERS_MARCHE_COURSE[palierId].label}" après ${semainesEcoulees} semaines — ça vaut le coup de vérifier si le rythme est le bon, sans pression pour autant.`
    });
  }

  return { palierId, pretPourSuivant, dernierPalier, seancesValidees, totalSeancesSuivies, warnings };
}

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

    // ── Garde-fou : ne jamais adapter une semaine déjà entièrement passée
    // (17/07/2026, demande explicite de Laurent, même principe que le
    // garde-fou côté changerPalierGrandDebutant dans index.html). Cas limite
    // possible : la proposition d'adaptation a été ignorée plusieurs
    // semaines de suite, ou appliquée en retard, et la "semaine suivante"
    // ciblée par analyserAdaptations() se trouve être déjà terminée au
    // moment du clic. Toutes ses séances ont alors déjà eu lieu — leur
    // contenu ne doit plus changer rétroactivement (trompeur pour l'analyse
    // a posteriori, dont le Module 2 du moteur de décision qui compare une
    // séance réalisée à ce que le plan affirme avoir été prévu ce jour-là).
    if (plan.dateDebut) {
      const debutPlan = new Date(plan.dateDebut + 'T00:00:00Z');
      const aujourdhui = new Date();
      const aujourdhuiStr = new Date(Date.UTC(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate())).toISOString().slice(0, 10);
      const datesJoursSemaine = Object.keys(semaine.assignment || {}).map(jourIndex => {
        const d = new Date(debutPlan);
        d.setUTCDate(debutPlan.getUTCDate() + (semaine.semaineNum - 1) * 7 + Number(jourIndex));
        return d.toISOString().slice(0, 10);
      });
      const toutesPassees = datesJoursSemaine.length > 0 && datesJoursSemaine.every(d => d < aujourdhuiStr);
      if (toutesPassees) {
        nouveauxWarnings.push({
          code: 'ADAPTATION_IGNOREE_SEMAINE_PASSEE',
          message: `S${semaineNum} : adaptation suggérée mais ignorée, cette semaine est déjà entièrement passée.`
        });
        continue;
      }
    }

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

    // Reconstitue le compteur d'apparitions depuis l'historique déjà présent
    // dans le plan (les semaines précédentes ont déjà leur sousType assigné,
    // contrairement à une génération initiale) — nécessaire pour que la
    // progression VMA (i-30-30, section 2.2 v2.2) continue correctement même
    // lors d'une adaptation ponctuelle d'une seule semaine, pas de tout le
    // plan.
    const nbApparitionsParSousType = {};
    for (const s of plan.semaines) {
      if (s.semaineNum >= semaineNum) break;
      for (const sce of Object.values(s.assignment)) {
        if (sce.type === 'qualite' && sce.sousType) {
          nbApparitionsParSousType[sce.sousType] = (nbApparitionsParSousType[sce.sousType] ?? 0) + 1;
        }
      }
    }

    const nouveauVolume = Math.round(semaine.volumeCibleKm * 0.75 * 10) / 10;
    let kmQualiteTotal = 0;

    for (const seance of Object.values(semaine.assignment)) {
      if (seance.type !== 'qualite') continue;
      const { sousType, contenu, kmEstime, structureIntervalles } = genererContenuQualite({
        distance: plan.paramsOrigine.distance,
        phase: semaine.phase,
        semaineDansPhase,
        indexQualiteSemaine: seance.indexQualite ?? 0,
        alluresSec,
        restrictionsAllure: seance.restrictionsAllure,
        tauxAffutage: 1,
        estDechargeSemaine: true, // réutilise le même levier de réduction (facteur 0.75, sections 22/26)
        nbApparitionsParSousType,
        niveau: plan.profilOrigine?.niveau
      });
      seance.sousType = sousType;
      seance.contenu = contenu;
      seance.kmEstime = kmEstime;
      seance.structureIntervalles = structureIntervalles;
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

/**
 * Régénère structureIntervalles pour toutes les séances qualité d'un plan
 * déjà existant, SANS toucher au contenu textuel déjà affiché ni au reste
 * du plan (statuts, dates, kmEstime) — action de rattrapage pour les plans
 * générés avant l'ajout de structureIntervalles (section 2.8 du doc de
 * convergence, demandé par Laurent le 8 juillet 2026, qui souhaite un
 * effet rétroactif sur son plan Semi déjà existant plutôt que d'avoir à le
 * recréer et perdre son historique de statuts).
 *
 * Garde-fou : vérifie que le sousType recalculé correspond bien à
 * l'original avant d'appliquer la nouvelle structure — si un écart
 * apparaît (ex. plan généré avec une version différente de
 * ROTATION_SOUS_TYPE), la séance concernée est laissée intacte plutôt que
 * de risquer une structure incohérente avec le contenu déjà affiché.
 *
 * Retourne le nombre de séances effectivement mises à jour.
 */
export function regenererStructuresIntervalles(plan) {
  if (!plan.paramsOrigine || !plan.profilOrigine) {
    throw new Error("Ce plan a été sauvegardé avant l'ajout de profilOrigine/paramsOrigine et ne peut pas être régénéré — recrée-le depuis le wizard.");
  }

  const alluresSec = computeAllures({
    refTimeSeconds: parseTimeToSeconds(plan.paramsOrigine.tempsReference),
    refDistanceKm: KM_BY_DISTANCE[plan.paramsOrigine.refDistance ?? plan.paramsOrigine.distance],
    objectifTimeSeconds: parseTimeToSeconds(plan.paramsOrigine.objectif),
    distanceCibleKm: KM_BY_DISTANCE[plan.paramsOrigine.distance]
  });

  let curseur = 0;
  const bornesPhases = plan.phases.map(p => {
    const debut = curseur;
    curseur += p.semaines;
    return { nom: p.nom, debut, fin: curseur };
  });

  let nbMisesAJour = 0;
  const nbApparitionsParSousType = {};
  // Garde-fou (17/07/2026, demande explicite de Laurent) : calculé une seule
  // fois avant la boucle, pour comparer chaque date de séance sans recalculer
  // "aujourd'hui" à chaque itération.
  const debutPlanGF = plan.dateDebut ? new Date(plan.dateDebut + 'T00:00:00Z') : null;
  const aujourdhuiGF = new Date();
  const aujourdhuiStrGF = new Date(Date.UTC(aujourdhuiGF.getFullYear(), aujourdhuiGF.getMonth(), aujourdhuiGF.getDate())).toISOString().slice(0, 10);

  for (const semaine of plan.semaines) {
    const phaseInfo = bornesPhases.find(b => b.nom === semaine.phase && semaine.semaineNum > b.debut && semaine.semaineNum <= b.fin);
    const semaineDansPhase = phaseInfo ? semaine.semaineNum - phaseInfo.debut - 1 : 0;

    for (const [jourIndex, seance] of Object.entries(semaine.assignment)) {
      if (seance.type !== 'qualite') continue;
      // Compte l'apparition AVANT le "continue" ci-dessous, pour rester
      // cohérent même sur les séances déjà pourvues d'une structure —
      // sinon le compteur se désynchroniserait de l'historique réel du plan
      if (seance.sousType) nbApparitionsParSousType[seance.sousType] = (nbApparitionsParSousType[seance.sousType] ?? 0) + 1;
      if (seance.structureIntervalles) continue; // déjà présente, rien à faire

      // ── Garde-fou : ne jamais attribuer une nouvelle structure à une
      // séance déjà passée (17/07/2026, cause identifiée d'un changement
      // rétroactif observé par Laurent — cf. discussion "je ne comprends pas
      // comment cette séance a pu être changée dans le plan"). Avant ce
      // correctif, une séance passée sans structureIntervalles (ex. créée
      // avant le 8 juillet 2026) recevait silencieusement une structure
      // fraîchement calculée, potentiellement très différente de ce qui
      // avait réellement été couru et affiché à l'époque — trompeur pour
      // toute analyse a posteriori (Module 2 du moteur de décision compris).
      if (debutPlanGF) {
        const dateSeanceGF = new Date(debutPlanGF);
        dateSeanceGF.setUTCDate(debutPlanGF.getUTCDate() + (semaine.semaineNum - 1) * 7 + Number(jourIndex));
        const dateSeanceStrGF = dateSeanceGF.toISOString().slice(0, 10);
        if (dateSeanceStrGF < aujourdhuiStrGF) continue; // séance déjà passée, jamais touchée
      }

      // La séance test (estTest: true) utilise genererContenuTest(), pas
      // genererContenuQualite() — traitée séparément, sinon le garde-fou
      // sousType !== seance.sousType la rejette systématiquement (elle
      // recalculerait un sous-type par rotation normale, jamais 'test').
      if (seance.estTest) {
        const { structureIntervalles } = genererContenuTest({ distance: plan.paramsOrigine.distance, alluresSec });
        seance.structureIntervalles = structureIntervalles;
        nbMisesAJour++;
        continue;
      }

      const { sousType, structureIntervalles } = genererContenuQualite({
        distance: plan.paramsOrigine.distance,
        phase: semaine.phase,
        semaineDansPhase,
        indexQualiteSemaine: seance.indexQualite ?? 0,
        alluresSec,
        restrictionsAllure: seance.restrictionsAllure,
        tauxAffutage: semaine.tauxAffutage ?? 1,
        estDechargeSemaine: semaine.estDecharge ?? false,
        nbApparitionsParSousType: { ...nbApparitionsParSousType, [seance.sousType]: Math.max(0, (nbApparitionsParSousType[seance.sousType] ?? 1) - 1) },
        niveau: plan.profilOrigine?.niveau
      });

      // Garde-fou : n'applique la structure que si le sous-type recalculé
      // correspond bien à celui déjà présent sur la séance (sinon la
      // structure risquerait d'être incohérente avec le contenu textuel
      // déjà affiché, jamais régénéré par cette fonction)
      if (sousType !== seance.sousType) continue;

      seance.structureIntervalles = structureIntervalles;
      nbMisesAJour++;
    }
  }

  return nbMisesAJour;
}

