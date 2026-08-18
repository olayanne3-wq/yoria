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
  const parts = str.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  throw new Error(`Format de temps invalide: ${str}`);
}

export function formatSecondsToTime(totalSeconds) {
  const s = Math.round(totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function formatPace(secPerKm) {
  const total = Math.round(secPerKm);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

export function paceFromTime(totalSeconds, distanceKm) {
  return totalSeconds / distanceKm;
}

export function riegelPredict(t1Seconds, d1Km, d2Km) {
  return t1Seconds * Math.pow(d2Km / d1Km, 1.06);
}

export function vo2FromVelocity(v) {
  return -4.60 + 0.182258 * v + 0.000104 * v * v;
}
export function velocityFromVo2(vo2) {
  let lo = 100, hi = 500;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (vo2FromVelocity(mid) < vo2) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
export function pctVo2MaxPourDuree(tMinutes) {
  return 0.8 + 0.1894393 * Math.exp(-0.012778 * tMinutes) + 0.2989558 * Math.exp(-0.1932605 * tMinutes);
}
export function vdotDepuisEffortSousMaximal(vitesseKmMin, dureeMinTenableEnCourse) {
  const vo2 = vo2FromVelocity(vitesseKmMin);
  const pct = pctVo2MaxPourDuree(dureeMinTenableEnCourse);
  return vo2 / pct;
}
export function vitesseDepuisVdotEtDistance(vdot, distanceM) {
  let dureeMinEstimee = distanceM / 200;
  for (let i = 0; i < 20; i++) {
    const pct = pctVo2MaxPourDuree(dureeMinEstimee);
    const vo2Cible = vdot * pct;
    const v = velocityFromVo2(vo2Cible);
    dureeMinEstimee = distanceM / v;
  }
  return distanceM / dureeMinEstimee;
}

export const KM_BY_DISTANCE = { '5K': 5, '10K': 10, 'Semi': 21.1, 'Marathon': 42.2 };

export const RECORDS_MONDE_SECONDES = {
  '5K': 12 * 60 + 49,
  '10K': 26 * 60 + 31,
  'Semi': 57 * 60 + 20,
  'Marathon': 1 * 3600 + 59 * 60 + 30,
};

export const PACE_RATIOS = {
  recup: 1.33,
  E: 1.225,
  T: 0.99,
  I: 0.855,
  V: 0.80
};

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

    if (precedente && semaine.phase !== precedente.phase) {
      if (semaine.phase === 'Affutage') {
        const premierJour = Object.values(semaine.assignment)[0];
        ajouterNote(premierJour, piocher('debut-affutage'));
      } else if (semaine.phase === 'Specifique') {
        const premierJour = Object.values(semaine.assignment)[0];
        ajouterNote(premierJour, piocher('debut-specifique'));
      }
    }

    if (suivante && suivante.phase === 'Affutage' && semaine.phase !== 'Affutage') {
      const jours = Object.values(semaine.assignment);
      const derniereLongue = [...jours].reverse().find(j => j.type === 'longue');
      ajouterNote(derniereLongue, piocher('derniere-longue-avant-affutage'));
    }

    if (idx === semaines.length - 1) {
      const jours = Object.values(semaine.assignment);
      jours.forEach(j => {
        if (j.type === 'ef') ajouterNote(j, piocher('derniere-semaine-avant-course'));
      });
    }
  }
}

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

export const STRIDES_REPETITIONS = 4;
export const STRIDES_DUREE_EFFORT_SEC = 20;
export function estimerKmStrides(alluresSec) {
  const paceApproxSecParKm = (alluresSec.V ?? alluresSec.I) * 1.05;
  const kmParRep = STRIDES_DUREE_EFFORT_SEC / paceApproxSecParKm;
  return Math.round(kmParRep * STRIDES_REPETITIONS * 100) / 100;
}
export const STRIDES_FREQUENCE = 2;

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
        const cle = NOTES_PRATIQUES[seance.sousType] ? seance.sousType : FAMILLE_SOUS_TYPE[seance.sousType];
        if (cle && NOTES_PRATIQUES[cle]) {
          ajouterNote(seance, piocher(cle));
        }
      }
    }
  }
}

export const NOTES_RESSENTI = {
  'seuil': [
    "Effort contrôlé, 3-4 mots max si tu devais parler.",
    "Ça doit rester soutenu mais pas explosif."
  ],
  'seuil-2min': [
    "Sur les portions rapides, vise un effort proche du seuil — pas maximal, mais nettement plus soutenu que l'allure facile qui suit.",
    "L'écart entre le rapide et le facile doit être net — c'est cet écart qui donne son intérêt à cette séance."
  ],
  'vma': [
    "Effort proche du maximum sur chaque répétition, récup complète entre les deux.",
    "L'intensité prime — mieux vaut une répétition de moins mais bien exécutée."
  ]
};

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

export function injecterProgressionRelative(semaines) {
  const ECART_MIN_SEMAINES = 3;
  const SEUIL_SIMILARITE = 0.10;
  const historiqueParFamille = {};

  for (const semaine of semaines) {
    for (const seance of Object.values(semaine.assignment)) {
      if (seance.type !== 'qualite') continue;
      const famille = FAMILLE_SOUS_TYPE[seance.sousType];
      if (!famille) continue;

      const historique = historiqueParFamille[famille] ?? [];
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

export function injecterCoherenceSemaineTest(plan) {
  const piocher = (cle) => {
    const variantes = NOTES_SEMAINE_TEST[cle];
    return variantes[Math.floor(Math.random() * variantes.length)];
  };

  for (const semaine of plan.semaines) {
    const jours = Object.entries(semaine.assignment);
    const indexTest = jours.findIndex(([, s]) => s.estTest);
    if (indexTest === -1) continue;

    const [, premierJour] = jours[0];
    if (premierJour.contenu && !premierJour.estTest) {
      premierJour.contenu = `${premierJour.contenu} ${piocher('annonce')}`;
    }

    if (indexTest > 0) {
      const [, veille] = jours[indexTest - 1];
      if (veille.contenu) {
        veille.role = veille.role ? `${veille.role}+veille-test` : 'veille-test';
        veille.contenu = `${veille.contenu} ${piocher('veille-test')}`;
      }
    }

    if (indexTest < jours.length - 1) {
      const [, lendemain] = jours[indexTest + 1];
      if (lendemain.contenu) {
        lendemain.role = lendemain.role ? `${lendemain.role}+lendemain-test` : 'lendemain-test';
        lendemain.contenu = `${lendemain.contenu} ${piocher('lendemain-test')}`;
      }
    }

    break;
  }
}

// ---------------------------------------------------------------------------
// "Pourquoi cette séance" — explication du rôle physiologique/pédagogique
// d'une séance, affichée dans un repli séparé côté UI (jamais concaténée
// dans `contenu`, contrairement aux autres mécanismes narratifs ci-dessus).
// Champ dédié `seance.pourquoi`, posé sur TOUTE séance (EF, longue, qualité
// par famille, test, repos) — pas seulement les séances qualité : le
// principe "quel est le but de cette séance ?" (cf. synthèse Daniels,
// docs/v2-methodologie/daniels-running-formule-synthese.md §1.1)
// s'applique aussi à l'EF et au repos, pas seulement au travail intense.
//
// Contextualisé par (famille × phase) quand la distinction a un sens
// pédagogique réel — pas systématiquement sur les 3 phases pour chaque
// famille (ex. l'EF a la même fonction physiologique du début à la fin
// d'un plan, inutile de varier ; le seuil/VMA en revanche change de rôle
// entre Construction et Spécifique). Pas de lien avec l'état du coureur
// (fatigue/ACWR) dans cette itération — décision explicite : le moteur de
// décision a déjà son propre mécanisme d'explication pour ses décisions
// réactives (journaliserDecisionEvent), mélanger les deux systèmes pour un
// gain marginal sur des séances simplement placées par le générateur n'a
// pas été jugé pertinent.
//
// Une seule variante par clé (pas de banque à tirage aléatoire comme
// JALONS_TRANSITION/NOTES_PRATIQUES) : le "pourquoi" est une explication
// stable et pédagogique, pas une note d'ambiance — la reformuler
// aléatoirement d'une semaine à l'autre n'apporterait rien et rendrait le
// contenu moins mémorisable pour l'utilisateur qui reviendrait dessus.
export const POURQUOI_SEANCE = {
  'ef': {
    'default': "Une allure facile muscle ton cœur (le débit de chaque battement augmente), développe la circulation sanguine vers tes muscles et renforce ta résistance aux blessures — l'essentiel de la progression se construit ici, pas dans les séances dures."
  },
  'ef-recuperation': {
    'default': "Séance volontairement courte et facile, placée juste après un effort dur — le but est de faire circuler le sang pour aider la récupération, pas d'ajouter de la charge."
  },
  'longue': {
    'default': "La sortie longue développe ton endurance fondamentale et apprend à ton corps à mieux utiliser ses réserves — le pilier de toute préparation, quelle que soit la distance visée."
  },
  'seuil': {
    'Construction': "Ce travail au seuil élève progressivement l'allure que tu peux tenir confortablement — la base sur laquelle viendront s'appuyer les séances plus spécifiques.",
    'Specifique': "Le seuil améliore ta capacité à évacuer l'acide lactique et à tenir un effort soutenu plus longtemps — directement utile pour la fin de ta course.",
    'default': "Ce travail au seuil améliore ta capacité à tenir un effort soutenu sur la durée, sans t'épuiser prématurément."
  },
  'vma': {
    'Construction': "Ce travail à haute intensité développe ta capacité aérobie maximale (VMA) — la base physiologique sur laquelle repose toute vitesse future.",
    'Specifique': "À ce stade, ce travail VMA entretient ta puissance aérobie tout en te préparant à encaisser les changements de rythme d'une vraie course.",
    'default': "Ce travail à haute intensité développe ta capacité aérobie maximale et ta vitesse."
  },
  'allure-course': {
    'default': "Courir précisément à ton allure objectif entraîne ton corps ET ton mental à reconnaître cette sensation — pour que le jour de la course, cette allure te paraisse familière plutôt qu'imposée."
  },
  'test': {
    'default': "Cette séance confirme si ton allure objectif est réellement tenable sur la durée — pas un contre-la-montre, mais une vérification en conditions proches de la course pour ajuster si besoin avant qu'il ne soit trop tard."
  },
  'repos': {
    'default': "Le repos fait partie intégrante de l'entraînement, pas une pause en dehors de celui-ci — c'est pendant la récupération que ton corps s'adapte réellement à l'effort fourni."
  }
};

function determinerCleFamillePourquoi(seance) {
  if (seance.type === 'ef') {
    return seance.role === 'recuperation' ? 'ef-recuperation' : 'ef';
  }
  if (seance.type === 'longue') return 'longue';
  if (seance.type === 'repos') return 'repos';
  if (seance.type === 'qualite') {
    if (seance.estTest) return 'test';
    return FAMILLE_SOUS_TYPE[seance.sousType] ?? null;
  }
  return null;
}

export function injecterPourquoiSeance(plan) {
  for (const semaine of plan.semaines) {
    for (const seance of Object.values(semaine.assignment)) {
      // La séance de course (estCourse) est déjà auto-explicative
      // (genererContenuRace) — pas de "pourquoi" pour elle. Même chose pour
      // la course intermédiaire (estCourseIntermediaire), qui réutilise le
      // même genererContenuRace. La séance test (estTest, clé 'test'
      // ci-dessus) EN reçoit un, distinct de l'annonce/veille/lendemain de
      // injecterCoherenceSemaineTest qui parle du MOMENT, pas du BUT de la
      // séance elle-même.
      if (seance.estCourse || seance.estCourseIntermediaire) continue;

      const cle = determinerCleFamillePourquoi(seance);
      if (!cle || !POURQUOI_SEANCE[cle]) continue;

      const banqueCle = POURQUOI_SEANCE[cle];
      seance.pourquoi = banqueCle[semaine.phase] ?? banqueCle['default'];
    }
  }
}

export function computeAllures({ refTimeSeconds, refDistanceKm, objectifTimeSeconds, distanceCibleKm }) {
  const paceRef10k = paceFromTime(riegelPredict(refTimeSeconds, refDistanceKm, 10), 10);

  const allures = {};
  for (const [zone, ratio] of Object.entries(PACE_RATIOS)) {
    allures[zone] = paceRef10k * ratio;
  }
  allures.C = paceFromTime(objectifTimeSeconds, distanceCibleKm);
  return allures;
}

export function calculerReferenceCouranteAllures({ estimationActuelle, estimationPeriodePrecedente, referenceActuellementUtilisee, regressionDejaEnAttente }) {
  if (estimationPeriodePrecedente == null) {
    return { nouvelleReference: null, statut: 'insuffisant', messageUtilisateur: null };
  }

  const delta = estimationActuelle - estimationPeriodePrecedente;
  const seuil = estimationActuelle * 0.01;

  if (Math.abs(delta) <= seuil) {
    return { nouvelleReference: null, statut: 'stable', messageUtilisateur: null };
  }

  if (delta < 0) {
    return {
      nouvelleReference: estimationActuelle,
      statut: 'progression',
      messageUtilisateur: `Allures resserrées suite à ta progression (${fmtMinSec(estimationPeriodePrecedente)} → ${fmtMinSec(estimationActuelle)}).`
    };
  }

  if (regressionDejaEnAttente) {
    return {
      nouvelleReference: estimationActuelle,
      statut: 'regression_confirmee',
      messageUtilisateur: `Allures ajustées à la baisse — ta forme récente suggère de lever le pied un peu (${fmtMinSec(regressionDejaEnAttente.depuis)} → ${fmtMinSec(estimationActuelle)}).`
    };
  }

  return { nouvelleReference: null, statut: 'regression_en_attente', messageUtilisateur: null };
}

// ---------------------------------------------------------------------------
// Recalibrage de BASE_TIME_REFERENCE suite à une course intermédiaire (cf.
// inventaire-application.md §16, conçu avec Laurent). Une course
// intermédiaire est un événement PONCTUEL et RARE, contrairement aux
// séances SEUIL/VMA/SPEC qui alimentent en continu le prédicteur — elle ne
// rentre donc jamais dans le pipeline pondéré de predictor.js (poids
// SPEC/SEUIL/VMA), qui suppose des mesures répétées, pas un chrono isolé.
//
// Traitement en deux temps, séparé du prédicteur :
// 1. Ici (pure) : mélange one-shot pondéré (jamais un remplacement complet
//    — une course ratée un jour sans ne doit pas effondrer toute la
//    référence, décision actée avec Laurent) entre l'ancienne référence et
//    l'estimation tirée de la course, avec la même asymétrie
//    progression/régression que calculerReferenceCouranteAllures
//    ci-dessus : une progression s'applique immédiatement, une régression
//    nécessite confirmation (ici : redemandée à la prochaine course
//    intermédiaire ou au cycle normal de allures dynamiques, pas de
//    mécanisme de confirmation dédié — une deuxième course intermédiaire
//    étant rare, on ne bloque pas indéfiniment une régression légitime).
// 2. Côté index.html (à écrire) : n'affecte QUE paramsOrigine.tempsReference
//    (donc BASE_TIME_REFERENCE, le calcul du prédicteur) — jamais
//    window.__PLAN_BRUT__.allures (les paces affichées à l'entraînement),
//    qui reste piloté exclusivement par verifierEtAppliquerAlluresDynamiques
//    et son garde-fou de confirmation sur 2 semaines paires consécutives.
//    Le recalibrage de la référence ici alimente ce mécanisme en amont
//    (la prochaine comparaison de allures dynamiques verra une base à jour)
//    sans jamais le court-circuiter.
//
// Conversion via riegelPredict (pas la formule Daniels-Gilbert utilisée
// pour SEUIL dans predictor.js) : une course chronométrée est un effort
// proche du maximum sur SA distance, contrairement au seuil qui est un
// effort sous-maximal — Riegel est donc justifié ici, cf. le même
// raisonnement déjà documenté pour estimerReferenceDepuisSemiCooper.
export const POIDS_COURSE_INTERMEDIAIRE = 0.35;
export const SEUIL_ECART_SUSPECT_COURSE_INTERMEDIAIRE = 0.22; // 22%, cohérent avec le garde-fou 20% de predictor.js (léger relâchement : ici une seule mesure isolée, pas une moyenne de plusieurs séances)

export function calculerNouvelleReferenceCourseIntermediaire({ tempsCourseSec, distanceCourseKm, referenceActuelleSec }) {
  const estimation10K = riegelPredict(tempsCourseSec, distanceCourseKm, 10);

  const ecartRelatif = Math.abs(estimation10K - referenceActuelleSec) / referenceActuelleSec;
  if (ecartRelatif > SEUIL_ECART_SUSPECT_COURSE_INTERMEDIAIRE) {
    return {
      nouvelleReference: null,
      statut: 'suspect',
      messageUtilisateur: `Résultat très éloigné de ta référence actuelle (${fmtMinSec(referenceActuelleSec)}) — écart jugé trop important pour ajuster automatiquement ton estimation. Vérifie que la distance et le temps saisis sont corrects.`
    };
  }

  const nouvelleReference = referenceActuelleSec * (1 - POIDS_COURSE_INTERMEDIAIRE) + estimation10K * POIDS_COURSE_INTERMEDIAIRE;

  if (nouvelleReference < referenceActuelleSec) {
    return {
      nouvelleReference,
      statut: 'progression',
      messageUtilisateur: `Estimation resserrée suite à ta course intermédiaire (${fmtMinSec(referenceActuelleSec)} → ${fmtMinSec(nouvelleReference)}).`
    };
  }

  return {
    nouvelleReference,
    statut: 'regression',
    messageUtilisateur: `Estimation ajustée suite à ta course intermédiaire (${fmtMinSec(referenceActuelleSec)} → ${fmtMinSec(nouvelleReference)}) — un résultat isolé, à confirmer par les séances à venir.`
  };
}

function fmtMinSec(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const PLAFONDS_VOLUME = {
  '5K':       { debutant: [20, 25], intermediaire: [25, 35], confirme: [35, 45] },
  '10K':      { debutant: [25, 35], intermediaire: [35, 50], confirme: [50, 65] },
  'Semi':     { debutant: [35, 45], intermediaire: [45, 60], confirme: [60, 80] },
  'Marathon': { debutant: [35, 40], intermediaire: [45, 55], confirme: [55, 70] }
};

export const VOLUME_MIN_EF_KM = 3;
export const VOLUME_MIN_LONGUE_KM = 5;

export const VOLUME_MIN_PAR_JOURS = {
  '5K': {
    debutant:      { 2: 11, 3: 13, 4: 17, 5: 20, 6: 29, 7: 34 },
    intermediaire: { 2: 11, 3: 14, 4: 18, 5: 25, 6: 29, 7: 36 },
    confirme:      { 2: 14, 3: 18, 4: 20, 5: 28, 6: 32, 7: 36 },
  },
  '10K': {
    debutant:      { 2: 12, 3: 15, 4: 19, 5: 21, 6: 29, 7: 34 },
    intermediaire: { 2: 13, 3: 17, 4: 20, 5: 27, 6: 30, 7: 36 },
    confirme:      { 2: 15, 3: 19, 4: 21, 5: 32, 6: 35, 7: 37 },
  },
  'Semi': {
    debutant:      { 2: 12, 3: 15, 4: 19, 5: 21, 6: 29, 7: 34 },
    intermediaire: { 2: 13, 3: 17, 4: 20, 5: 28, 6: 32, 7: 36 },
    confirme:      { 2: 15, 3: 19, 4: 21, 5: 32, 6: 36, 7: 40 },
  },
  'Marathon': {
    debutant:      { 2: 12, 3: 15, 4: 19, 5: 21, 6: 29, 7: 34 },
    intermediaire: { 2: 14, 3: 18, 4: 21, 5: 29, 6: 33, 7: 36 },
    confirme:      { 2: 17, 3: 20, 4: 23, 5: 34, 6: 36, 7: 41 },
  },
};

export const DUREE_AFFUTAGE_JOURS = {
  '5K': 7,
  '10K': 10,
  'Semi': 10,
  'Marathon': 18
};

const RATIO_CONSTRUCTION = { debutant: 0.55, intermediaire: 0.40, confirme: 0.30 };
const AJUSTEMENT_RATIO_PAR_AMPLEUR = { faible: +0.15, moderee: 0, ambitieuse: -0.05 };

export function categoriserAmpleurObjectif(refTimeSeconds, objectifTimeSeconds) {
  const gain = (refTimeSeconds - objectifTimeSeconds) / refTimeSeconds;
  if (gain < 0.05) return 'faible';
  if (gain <= 0.10) return 'moderee';
  return 'ambitieuse';
}

export function phaseAtDate(plan, dateStr) {
  if (!plan?.dateDebut || !Array.isArray(plan.semaines)) return null;
  const debut = new Date(plan.dateDebut + "T00:00:00Z");
  const cible = new Date(dateStr + "T00:00:00Z");
  const semaineNum = Math.floor((cible - debut) / (7*86400000)) + 1;
  const semaineInfo = plan.semaines.find(s => s.semaineNum === semaineNum);
  return semaineInfo?.phase ?? null;
}

export function computePhases({ dateDebut, dateCourse, distance, niveau, ampleurObjectif }) {
  const debut = new Date(dateDebut);
  const course = new Date(dateCourse);
  const totalJours = Math.round((course - debut) / 86400000);
  const totalSemaines = Math.max(1, Math.ceil(totalJours / 7));

  const warnings = [];
  if (totalJours < 0) {
    warnings.push({ code: 'DATE_INVALIDE', message: "La date de course doit être après le début du plan." });
    return { totalSemaines: 0, phases: [], warnings };
  }

  const affutageJours = DUREE_AFFUTAGE_JOURS[distance];
  const affutageSemaines = Math.max(1, Math.ceil(affutageJours / 7));
  const resteJours = totalJours - affutageJours;

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

// Progression du volume hebdomadaire (+10%/semaine, décharge tous les 4
// semaines, affûtage en fin de plan). volumeDepart s'applique par défaut
// à la semaine 1 (comportement historique, génération initiale d'un
// plan) — semaineDepart (02/08/2026) permet de faire démarrer ce même
// calcul à une semaine ultérieure du plan, en conservant la logique de
// progression/décharge à partir de ce point plutôt que depuis zéro.
export function computeVolumeProgression({ volumeDepart, distance, niveau, totalSemaines, contraintes = [], ampleurObjectif, phases, semaineDepart = 1 }) {
  const [plafondBas, plafondHaut] = PLAFONDS_VOLUME[distance][niveau];
  const plafondPopulation = (plafondBas + plafondHaut) / 2;
  const warnings = [];

  const plafondCible = ampleurObjectif === 'faible'
    ? Math.min(plafondPopulation, volumeDepart * 1.20)
    : plafondPopulation;

  const plafond = Math.max(plafondCible, volumeDepart);

  if (totalSemaines <= 0) {
    return { plafond, volumesParSemaine: [], warnings };
  }

  if (volumeDepart >= plafondCible * 0.9) {
    const messageEcart = volumeDepart > plafondCible
      ? `Volume de départ (${volumeDepart}km) déjà au-dessus du plafond habituel pour ce profil (${Math.round(plafondCible * 10) / 10}km) — le plafond a été relevé pour ne pas te faire régresser.`
      : `Volume de départ (${volumeDepart}km) déjà proche du plafond visé (${Math.round(plafondCible * 10) / 10}km) — marge de progression réduite.`;
    warnings.push({ code: 'MARGE_PROGRESSION_FAIBLE', message: messageEcart });
  }

  const blessureActive = contraintes.includes('blessure-active');
  const tauxMax = blessureActive ? 0.07 : 0.10;

  const semainesAffutage = phases?.find(p => p.nom === 'Affutage')?.semaines ?? 0;
  const semainesProgression = Math.max(1, totalSemaines - semainesAffutage);

  const volumesParSemaine = [];
  let peak = volumeDepart;

  for (let s = 1; s < semaineDepart && s <= semainesProgression; s++) {
    volumesParSemaine.push({ semaine: s, volumeKm: Math.round(volumeDepart * 10) / 10, estDecharge: false });
  }

  for (let s = semaineDepart; s <= semainesProgression; s++) {
    const estDecharge = s % 4 === 0 && s > 1;
    if (s === semaineDepart) {
      volumesParSemaine.push({ semaine: s, volumeKm: Math.round(peak * 10) / 10, estDecharge: false });
      continue;
    }
    if (estDecharge) {
      volumesParSemaine.push({ semaine: s, volumeKm: Math.round(peak * 0.75 * 10) / 10, estDecharge: true });
    } else {
      peak = Math.min(peak * (1 + tauxMax), plafond);
      volumesParSemaine.push({ semaine: s, volumeKm: Math.round(peak * 10) / 10, estDecharge: false });
    }
  }

  const picVolume = peak;

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

  if (picVolume < plafond * 0.85 && !blessureActive && ampleurObjectif !== 'faible') {
    warnings.push({
      code: 'PROGRESSION_INSUFFISANTE',
      message: "L'écart entre le volume de départ et le plafond visé est trop grand pour la durée du plan, même en respectant la règle des 10%."
    });
  }

  return { plafond, volumesParSemaine, warnings };
}

export function nbQualiteFor(nbSeances, niveau) {
  if (niveau === 'grand-debutant') return 0;
  if (nbSeances <= 4) return nbSeances >= 2 ? 1 : 0;
  if (nbSeances === 5) return niveau === 'debutant' ? 1 : 2;
  return 2;
}

function pickLongueDay(joursDisponibles, jourLongueChoisi) {
  if (jourLongueChoisi !== undefined && jourLongueChoisi !== null && joursDisponibles.includes(jourLongueChoisi)) {
    return jourLongueChoisi;
  }
  if (joursDisponibles.includes(6)) return 6;
  if (joursDisponibles.includes(5)) return 5;
  return Math.max(...joursDisponibles);
}

function distanceCirculaire(a, b) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 7 - diff);
}

export function placerSemaine({ joursDisponibles, niveau, modulation = {}, forcerAucuneQualite = false, jourLongueChoisi = null }) {
  const days = [...joursDisponibles].sort((a, b) => a - b);
  const nb = days.length;
  const warnings = [];
  const assignment = {};

  if (nb < 2) {
    warnings.push({ code: 'JOURS_INSUFFISANTS', message: 'Au moins 2 jours disponibles sont nécessaires.' });
    return { assignment, warnings };
  }

  if (niveau === 'grand-debutant') {
    days.forEach(d => { assignment[d] = { type: 'marche-course' }; });
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

  const longueDay = pickLongueDay(days, jourLongueChoisi);
  assignment[longueDay] = { type: 'longue' };

  let pool = days.filter(d => d !== longueDay);
  const nbQualiteBase = forcerAucuneQualite ? 0 : nbQualiteFor(nb, niveau);
  const nbQualite = Math.min(
    nbQualiteBase,
    modulation.quantiteMaxQualite ?? Infinity,
    pool.length
  );
  const qualiteDays = [];

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

  return { assignment, warnings };
}

const DUREE_REACCLIMATATION_SEMAINES = {
  '2-4sem': 0,
  '1-3mois': 1,
  '3-6mois': 2,
  '6mois+': 3.5
};

export function appliquerContraintes({ contraintes, repriseDuree, distance }) {
  const modulation = {
    tauxProgressionMax: 0.10,
    quantiteMaxQualite: null,
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

export function computeFcMaxTanaka(anneeNaissance) {
  const age = new Date().getFullYear() - anneeNaissance;
  return Math.round(208 - 0.7 * age);
}

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

const ROTATION_SOUS_TYPE = {
  '5K': {
    Reacclimatation: [],
    Construction: ['cotes', 'i-30-30'],
    Specifique: ['i-3min', 'vitesse', 'i-3min', 'vitesse', 'i-3min', 'vitesse', 'i-3min', 'vitesse', 'i-3min', 'vitesse', 'i-3min', 'pyramidale'],
    Affutage: ['vitesse', 'i-3min']
  },
  '10K': {
    Reacclimatation: [],
    Construction: ['seuil-court', 'i-30-30'],
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
    Specifique: ['seuil', 'allure-course', 'seuil', 'allure-course', 'seuil', 'allure-course', 'seuil', 'allure-course', 'seuil-negatif', 'seuil', 'allure-course', 'seuil-negatif'],
    Affutage: ['tempo-court', 'allure-course-court']
  }
};

const REPLI_SOUS_TYPE = {
  'vitesse': 'i-3min',
  'i-3min': 'seuil',
  'i-30-30': 'seuil-court',
  'cotes': 'seuil-court',
  'pyramidale': 'seuil',
  'seuil-negatif': 'seuil'
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

const PLAFOND_DANIELS_PAR_ZONE = {
  I: { pctVolumeHebdo: 0.08, reperAbsoluMin: null },        // temps 10K, géré via tempsRef10KSec
  T: { pctVolumeHebdo: 0.10, reperAbsoluMin: 20 },           // 20 min max, quel que soit le volume
  V: { pctVolumeHebdo: 0.05, reperAbsoluKm: 8.05 },          // 5 miles ≈ 8.05km
  C: { pctVolumeHebdo: 0.20, reperAbsoluKm: 28.97 }          // 18 miles ≈ 28.97km (repère "M" chez Daniels)
};

const ZONE_PAR_SOUS_TYPE = {
  'i-3min': 'I', 'i-30-30': 'I', 'pyramidale': 'I',
  'seuil': 'T', 'seuil-court': 'T', 'seuil-2min': 'T', 'tempo-court': 'T', 'seuil-negatif': 'T',
  'vitesse': 'V', 'cotes': 'V',
  'allure-course': 'C', 'allure-course-court': 'C', 'test': 'C'
};

function plafondDureeCorpsSec(sousType, volumeHebdoCibleKm, alluresSecZone, tempsRef10KSec) {
  const zone = ZONE_PAR_SOUS_TYPE[sousType];
  if (!zone) return null;
  const conf = PLAFOND_DANIELS_PAR_ZONE[zone];
  if (!conf) return null;

  const candidats = [];

  if (volumeHebdoCibleKm != null && volumeHebdoCibleKm > 0 && alluresSecZone) {
    const kmPlafondPct = volumeHebdoCibleKm * conf.pctVolumeHebdo;
    candidats.push(kmPlafondPct * alluresSecZone);
  }

  if (zone === 'I' && tempsRef10KSec != null) {
    candidats.push(tempsRef10KSec);
  } else if (conf.reperAbsoluMin != null) {
    candidats.push(conf.reperAbsoluMin * 60);
  } else if (conf.reperAbsoluKm != null && alluresSecZone) {
    candidats.push(conf.reperAbsoluKm * alluresSecZone);
  }

  if (candidats.length === 0) return null;
  return Math.min(...candidats);
}

export function genererContenuQualite({ distance, phase, semaineDansPhase, indexQualiteSemaine, alluresSec, restrictionsAllure, tauxAffutage = 1, estDechargeSemaine = false, nbApparitionsParSousType = {}, niveau = 'intermediaire', volumeHebdoCibleKm = null, tempsRef10KSec = null }) {
  const rotation = ROTATION_SOUS_TYPE[distance]?.[phase] ?? ['seuil'];
  if (rotation.length === 0) return { sousType: null, contenu: 'EF (réacclimatation, pas de qualité cette semaine)', kmEstime: 0 };

  const sousTypeBrut = rotation[(semaineDansPhase + indexQualiteSemaine) % rotation.length];
  const sousType = resoudreSousType(sousTypeBrut, restrictionsAllure);

  const T = alluresSec.T, I = alluresSec.I, V = alluresSec.V, C = alluresSec.C, E = alluresSec.E;
  const kmDepuisMinutes = (min, paceSecParKm) => (min * 60) / paceSecParKm;

  const facteurReductionCorps = phase === 'Affutage' ? tauxAffutage : (estDechargeSemaine ? 0.75 : 1);
  const ajuster = (valeur, floor) =>
    facteurReductionCorps < 1 ? Math.max(floor, Math.round(valeur * facteurReductionCorps)) : valeur;

  const alluresZonePourPlafond = { I, T, V, C };
  const plafondCorpsSec = (zoneSousType) =>
    plafondDureeCorpsSec(zoneSousType, volumeHebdoCibleKm, alluresZonePourPlafond[ZONE_PAR_SOUS_TYPE[zoneSousType]], tempsRef10KSec);

  let contenuCorps, kmCorps, structureIntervalles;

  switch (sousType) {
    case 'seuil-court': {
      const PARAMS_NIVEAU = { debutant:{base:2,cap:4}, intermediaire:{base:3,cap:5}, confirme:{base:4,cap:6} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      let reps = ajuster(reduireSelonNiveauProgression(base, 1, cap, semaineDansPhase), 2);
      const plafondSec = plafondCorpsSec('seuil-court');
      if (plafondSec != null) reps = Math.max(2, Math.min(reps, Math.floor(plafondSec / (6 * 60))));
      kmCorps = kmDepuisMinutes(reps * 6, T);
      contenuCorps = `${reps}×6min @ ${formatPace(T)} (Seuil), récup 90s`;
      structureIntervalles = { blocs: [{ repetitions: reps, dureeEffortSec: 6*60, allure: formatPace(T), dureeRecupSec: 90 }] };
      break;
    }
    case 'seuil': {
      const PARAMS_NIVEAU = { debutant:{base:2,cap:4}, intermediaire:{base:3,cap:5}, confirme:{base:4,cap:6} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      let reps = ajuster(reduireSelonNiveauProgression(base, 1, cap, semaineDansPhase), 2);
      const plafondSec = plafondCorpsSec('seuil');
      if (plafondSec != null) reps = Math.max(2, Math.min(reps, Math.floor(plafondSec / (8 * 60))));
      kmCorps = kmDepuisMinutes(reps * 8, T);
      contenuCorps = `${reps}×8min @ ${formatPace(T)} (Seuil), récup 2min`;
      structureIntervalles = { blocs: [{ repetitions: reps, dureeEffortSec: 8*60, allure: formatPace(T), dureeRecupSec: 2*60 }] };
      break;
    }
    case 'i-30-30': {
      const REPS_PARAMS_PAR_NIVEAU = {
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
      const plafondSec = plafondCorpsSec('i-30-30');
      if (plafondSec != null) {
        const repsMaxTotal = Math.max(4, Math.floor(plafondSec / 30));
        while (series * repsParSerie > repsMaxTotal && repsParSerie > 4) repsParSerie--;
        while (series * repsParSerie > repsMaxTotal && series > 1) series--;
      }
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
      let reps = ajuster(reduireSelonNiveauProgression(base, 1, cap, semaineDansPhase), 2);
      const plafondSec = plafondCorpsSec('i-3min');
      if (plafondSec != null) reps = Math.max(2, Math.min(reps, Math.floor(plafondSec / (3 * 60))));
      kmCorps = kmDepuisMinutes(reps * 3, I);
      contenuCorps = `${reps}×3min @ ${formatPace(I)} (VMA), récup 2min`;
      structureIntervalles = { blocs: [{ repetitions: reps, dureeEffortSec: 3*60, allure: formatPace(I), dureeRecupSec: 2*60 }] };
      break;
    }
    case 'vitesse': {
      const PARAMS_NIVEAU = { debutant:{base:4,cap:8}, intermediaire:{base:6,cap:10}, confirme:{base:8,cap:12} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      let reps = ajuster(reduireSelonNiveauProgression(base, 1, cap, semaineDansPhase), 3);
      const plafondSec = plafondCorpsSec('vitesse');
      if (plafondSec != null && V) reps = Math.max(3, Math.min(reps, Math.floor(plafondSec / (0.3 * V))));
      kmCorps = reps * 0.3;
      contenuCorps = `${reps}×300m @ ${formatPace(V)} (Vitesse), récupération complète`;
      structureIntervalles = { blocs: [{ repetitions: reps, distanceEffortM: 300, allure: formatPace(V), dureeRecupSec: null, recupLabel: 'complète' }] };
      break;
    }
    case 'cotes': {
      const PARAMS_NIVEAU = { debutant:{base:4,cap:8}, intermediaire:{base:6,cap:10}, confirme:{base:8,cap:12} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      let reps = ajuster(reduireSelonNiveauProgression(base, 1, cap, semaineDansPhase), 3);
      const plafondSec = plafondCorpsSec('cotes');
      if (plafondSec != null) reps = Math.max(3, Math.min(reps, Math.floor(plafondSec / 30)));
      kmCorps = kmDepuisMinutes(reps * 0.5, V);
      contenuCorps = `${reps}×30s en côte (effort soutenu), récupération trot`;
      structureIntervalles = { blocs: [{ repetitions: reps, dureeEffortSec: 30, allure: 'effort soutenu (côte)', dureeRecupSec: null, recupLabel: 'trot' }] };
      break;
    }
    case 'allure-course': {
      const PARAMS_NIVEAU = { debutant:{base:2,cap:4}, intermediaire:{base:3,cap:5}, confirme:{base:4,cap:6} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      let reps = ajuster(reduireSelonNiveauProgression(base, 1, cap, semaineDansPhase), 2);
      const plafondSec = plafondCorpsSec('allure-course');
      if (plafondSec != null) reps = Math.max(2, Math.min(reps, Math.floor(plafondSec / (5 * 60))));
      kmCorps = kmDepuisMinutes(reps * 5, C);
      contenuCorps = `${reps}×5min @ ${formatPace(C)} (allure course), récup 2min`;
      structureIntervalles = { blocs: [{ repetitions: reps, dureeEffortSec: 5*60, allure: formatPace(C), dureeRecupSec: 2*60 }] };
      break;
    }
    case 'allure-course-court': {
      const PARAMS_NIVEAU = { debutant:{base:1,cap:2}, intermediaire:{base:2,cap:3}, confirme:{base:3,cap:4} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      let reps = ajuster(reduireSelonNiveauProgression(base, 1, cap, semaineDansPhase), 1);
      const plafondSec = plafondCorpsSec('allure-course-court');
      if (plafondSec != null) reps = Math.max(1, Math.min(reps, Math.floor(plafondSec / (3 * 60))));
      kmCorps = kmDepuisMinutes(reps * 3, C);
      contenuCorps = `${reps}×3min @ ${formatPace(C)} (allure course), récup 2min`;
      structureIntervalles = { blocs: [{ repetitions: reps, dureeEffortSec: 3*60, allure: formatPace(C), dureeRecupSec: 2*60 }] };
      break;
    }
    case 'pyramidale': {
      const PALIERS_PAR_NIVEAU = {
        debutant:      [2, 3, 4],
        intermediaire: [2, 3, 4, 3, 2],
        confirme:      [2, 3, 4, 5, 4, 3, 2],
      };
      let paliers = PALIERS_PAR_NIVEAU[niveau] || PALIERS_PAR_NIVEAU.intermediaire;
      const plafondSec = plafondCorpsSec('pyramidale');
      if (plafondSec != null) {
        const plafondMin = plafondSec / 60;
        let paliersReduits = [...paliers];
        while (paliersReduits.reduce((a, b) => a + b, 0) > plafondMin && paliersReduits.length > 3) {
          paliersReduits.pop();
        }
        paliers = paliersReduits;
      }
      const estDemiPyramide = paliers.every((p, i) => i === 0 || p > paliers[i-1]);
      const totalMin = paliers.reduce((a, b) => a + b, 0);
      kmCorps = kmDepuisMinutes(totalMin, I);
      contenuCorps = estDemiPyramide
        ? `Pyramidale (montée) ${paliers.join('-')}min @ ${formatPace(I)} (VMA), récup égale au temps de l'effort`
        : `Pyramidale ${paliers.join('-')}min @ ${formatPace(I)} (VMA), récup égale au temps de l'effort`;
      structureIntervalles = { blocs: paliers.map(p => ({ repetitions: 1, dureeEffortSec: p*60, allure: formatPace(I), dureeRecupSec: p*60 })) };
      break;
    }
    case 'seuil-negatif': {
      const PARAMS_NIVEAU = { debutant:{base:6,cap:10}, intermediaire:{base:8,cap:12}, confirme:{base:10,cap:14} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      let dureeBloc = ajuster(reduireSelonNiveauProgression(base, 2, cap, semaineDansPhase), 5);
      const plafondSec = plafondCorpsSec('seuil-negatif');
      if (plafondSec != null) dureeBloc = Math.max(5, Math.min(dureeBloc, Math.floor(plafondSec / 60 / 2)));
      const paceBloc2 = T - (T - I) * 0.3;
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
      let duree = ajuster(reduireSelonNiveauProgression(base, 5, cap, semaineDansPhase), 10);
      const plafondSec = plafondCorpsSec('tempo-court');
      if (plafondSec != null) duree = Math.max(10, Math.min(duree, Math.floor(plafondSec / 60)));
      kmCorps = kmDepuisMinutes(duree, T);
      contenuCorps = `${duree}min continu @ ${formatPace(T)} (Seuil léger)`;
      structureIntervalles = { blocs: [{ repetitions: 1, dureeEffortSec: duree*60, allure: formatPace(T), dureeRecupSec: 0 }] };
      break;
    }
    case 'seuil-2min': {
      const PARAMS_NIVEAU = { debutant:{base:3,cap:7}, intermediaire:{base:4,cap:8}, confirme:{base:5,cap:9} };
      const { base, cap } = PARAMS_NIVEAU[niveau] || PARAMS_NIVEAU.intermediaire;
      let reps = ajuster(reduireSelonNiveauProgression(base, 1, cap, semaineDansPhase), 3);
      const plafondSec = plafondCorpsSec('seuil-2min');
      if (plafondSec != null) reps = Math.max(3, Math.min(reps, Math.floor(plafondSec / (2 * 60))));
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

  const facteurReduction = estDechargeSemaine ? 0.75 : (phase === 'Affutage' ? tauxAffutage : 1);
  const DUREE_ECHAUFFEMENT_MIN = Math.max(8, Math.round(15 * facteurReduction));
  const DUREE_RETOUR_CALME_MIN = Math.max(5, Math.round(10 * facteurReduction));
  const kmEchauffement = kmDepuisMinutes(DUREE_ECHAUFFEMENT_MIN, E);
  const kmRetourCalme = kmDepuisMinutes(DUREE_RETOUR_CALME_MIN, E);
  const kmEstime = kmCorps + kmEchauffement + kmRetourCalme;

  const contenu = `Échauffement ${DUREE_ECHAUFFEMENT_MIN}min @ ${formatPace(E)} (EF) + ${contenuCorps} + Retour au calme ${DUREE_RETOUR_CALME_MIN}min @ ${formatPace(E)} (EF)`;

  structureIntervalles.echauffementSec = DUREE_ECHAUFFEMENT_MIN * 60;
  structureIntervalles.retourCalmeSec = DUREE_RETOUR_CALME_MIN * 60;
  structureIntervalles.allureEchauffement = formatPace(E);

  return { sousType, contenu, kmEstime, structureIntervalles };
}

const DUREE_MAX_EF_MIN = 75;
const DUREE_MAX_LONGUE_MIN = { '5K': 90, '10K': 90, 'Semi': 120, 'Marathon': 150 };

export const PALIERS_MARCHE_COURSE = [
  { id: 0,  continu: false, reps: 8, courseSec: 60,  marcheSec: 120, label: '8× (1min course / 2min marche)' },
  { id: 1,  continu: false, reps: 8, courseSec: 90,  marcheSec: 90,  label: '8× (1min30 course / 1min30 marche)' },
  { id: 2,  continu: false, reps: 6, courseSec: 120, marcheSec: 60,  label: '6× (2min course / 1min marche)' },
  { id: 3,  continu: false, reps: 5, courseSec: 180, marcheSec: 60,  label: '5× (3min course / 1min marche)' },
  { id: 4,  continu: false, reps: 3, courseSec: 300, marcheSec: 60,  label: '3× (5min course / 1min marche)' },
  { id: 5,  continu: false, reps: 2, courseSec: 480, marcheSec: 60,  label: '2× (8min course / 1min marche)' },
  { id: 6,  continu: true,  courseMin: 5,  label: '5min de course continue' },
  { id: 7,  continu: true,  courseMin: 8,  label: '8min de course continue' },
  { id: 8,  continu: true,  courseMin: 12, label: '12min de course continue' },
  { id: 9,  continu: true,  courseMin: 16, label: '16min de course continue' },
  { id: 10, continu: true,  courseMin: 20, label: '20min de course continue' },
  { id: 11, continu: true,  courseMin: 25, label: '25min de course continue' },
  { id: 12, continu: true,  courseMin: 30, label: '30min de course continue (transition)' }
];

const DUREE_CIBLE_MARCHE_COURSE_MIN = 25;
const DUREE_MIN_ECHAUFFEMENT_RETOUR_MIN = 5;

export function palierMarcheCourseFor(seancesValideesPalierCourant, palierActuelId = 0) {
  const palier = PALIERS_MARCHE_COURSE[Math.min(palierActuelId, PALIERS_MARCHE_COURSE.length - 1)];
  const pretPourSuivant = seancesValideesPalierCourant >= 1
    && palierActuelId < PALIERS_MARCHE_COURSE.length - 1;
  return { palier, pretPourSuivant };
}

export function genererContenuMarcheCourse({ palierId = 0 }) {
  const palier = PALIERS_MARCHE_COURSE[Math.min(palierId, PALIERS_MARCHE_COURSE.length - 1)];

  if (!palier.continu) {
    const dureeCourseCumuleeMin = (palier.reps * palier.courseSec) / 60;
    const dureeEchauffementRetour = Math.max(
      DUREE_MIN_ECHAUFFEMENT_RETOUR_MIN,
      Math.round((DUREE_CIBLE_MARCHE_COURSE_MIN - dureeCourseCumuleeMin) / 2)
    );
    const courseLabel = palier.courseSec >= 60 ? `${Math.round(palier.courseSec/60*10)/10}min` : `${palier.courseSec}s`;
    const marcheLabel = palier.marcheSec >= 60 ? `${Math.round(palier.marcheSec/60*10)/10}min` : `${palier.marcheSec}s`;
    return {
      contenu: `Échauffement marche ${dureeEchauffementRetour}min + ${palier.reps}× (${courseLabel} course / ${marcheLabel} marche) + retour au calme marche ${dureeEchauffementRetour}min`,
      kmEstime: null,
      palierLabel: palier.label
    };
  }

  const dureeEchauffementRetour = Math.max(
    DUREE_MIN_ECHAUFFEMENT_RETOUR_MIN,
    Math.round((DUREE_CIBLE_MARCHE_COURSE_MIN - palier.courseMin) / 2)
  );

  return {
    contenu: `Échauffement marche ${dureeEchauffementRetour}min + ${palier.courseMin}min de course continue + retour au calme marche ${dureeEchauffementRetour}min`,
    kmEstime: null,
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

  const dureeBruteMin = (kmCible * alluresSec.E) / 60;
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

const POURCENTAGE_CONFIRMATION_ALLURE = { '5K': 0.60, '10K': 0.55, 'Semi': 0.35, 'Marathon': 0.25 };
const TAMPON_TEST_SEMAINES = { '5K': 1, '10K': 1, 'Semi': 2, 'Marathon': 2 };

export function genererContenuTest({ distance, alluresSec, volumeHebdoCibleKm = null }) {
  const distanceCourseKm = KM_BY_DISTANCE[distance] ?? 10;
  const pourcentage = POURCENTAGE_CONFIRMATION_ALLURE[distance] ?? 0.5;
  let distanceTestKm = Math.round(distanceCourseKm * pourcentage * 10) / 10;

  const C = alluresSec.C, E = alluresSec.E;
  const kmDepuisMinutes = (min, paceSecParKm) => (min * 60) / paceSecParKm;

  if (volumeHebdoCibleKm != null && volumeHebdoCibleKm > 0) {
    const confC = PLAFOND_DANIELS_PAR_ZONE.C;
    const kmPlafondPct = volumeHebdoCibleKm * confC.pctVolumeHebdo;
    const kmPlafondAbsolu = confC.reperAbsoluKm;
    const kmPlafond = Math.min(kmPlafondPct, kmPlafondAbsolu);
    distanceTestKm = Math.round(Math.min(distanceTestKm, kmPlafond) * 10) / 10;
  }

  const DUREE_ECHAUFFEMENT_MIN = 15;
  const DUREE_RETOUR_CALME_MIN = 10;
  const dureeConfirmationMin = Math.round((distanceTestKm * C) / 60);
  const kmEchauffement = kmDepuisMinutes(DUREE_ECHAUFFEMENT_MIN, E);
  const kmRetourCalme = kmDepuisMinutes(DUREE_RETOUR_CALME_MIN, E);
  const kmEstime = distanceTestKm + kmEchauffement + kmRetourCalme;
  const contenu = `Échauffement ${DUREE_ECHAUFFEMENT_MIN}min @ ${formatPace(E)} (EF) + ${dureeConfirmationMin}min à allure course (${formatPace(C)}) — ${distanceTestKm}km + Retour au calme ${DUREE_RETOUR_CALME_MIN}min @ ${formatPace(E)} (EF)`;
  const structureIntervalles = {
    blocs: [{ repetitions: 1, dureeEffortSec: dureeConfirmationMin*60, allure: formatPace(C), dureeRecupSec: 0 }],
    echauffementSec: DUREE_ECHAUFFEMENT_MIN*60,
    retourCalmeSec: DUREE_RETOUR_CALME_MIN*60,
    allureEchauffement: formatPace(E)
  };
  return { sousType: 'test', contenu, kmEstime, distanceTestKm, structureIntervalles };
}

const DUREE_TEST_SEMI_COOPER_MIN = 6;
const DUREE_ECHAUFFEMENT_TEST_SEMI_COOPER_MIN = 15;
const DUREE_RETOUR_CALME_TEST_SEMI_COOPER_MIN = 10;

const RATIO_VMA_VERS_10K = 0.90;

export function estimerReferenceDepuisSemiCooper(distanceMetres) {
  const vmaKmh = distanceMetres / 100;
  const allure10kKmh = vmaKmh * RATIO_VMA_VERS_10K;
  const allure10kSecKm = 3600 / allure10kKmh;
  const refTimeSeconds = Math.round(allure10kSecKm * 10);
  return { refTimeSeconds, refDistanceKm: 10, vmaKmh };
}

export function genererContenuTestSemiCooper() {
  const contenu = `Échauffement ${DUREE_ECHAUFFEMENT_TEST_SEMI_COOPER_MIN}min tranquille + Test semi-Cooper : cours le plus loin possible en ${DUREE_TEST_SEMI_COOPER_MIN}min, effort maximal mais régulier (ne pars pas trop vite) + Retour au calme ${DUREE_RETOUR_CALME_TEST_SEMI_COOPER_MIN}min tranquille`;
  const structureIntervalles = {
    blocs: [{ repetitions: 1, dureeEffortSec: DUREE_TEST_SEMI_COOPER_MIN * 60, allure: 'effort maximal régulier', dureeRecupSec: 0 }],
    echauffementSec: DUREE_ECHAUFFEMENT_TEST_SEMI_COOPER_MIN * 60,
    retourCalmeSec: DUREE_RETOUR_CALME_TEST_SEMI_COOPER_MIN * 60,
    allureEchauffement: 'footing tranquille'
  };
  return { sousType: 'test-semi-cooper', contenu, kmEstime: null, structureIntervalles };
}

function genererContenuFootingLibrePreTest() {
  return {
    contenu: "Footing libre, à l'écoute des sensations — pas d'allure imposée cette semaine, en attendant ton test.",
    kmEstime: null
  };
}

export function generatePlanAvecTestSemiCooper(profil, params) {
  const { assignment, warnings: warningsPlacement } = placerSemaine({
    joursDisponibles: profil.joursDisponiblesHabituels,
    niveau: profil.niveau,
    modulation: {},
    forcerAucuneQualite: false,
    jourLongueChoisi: profil.jourLongueChoisi ?? null
  });

  const dateDebutPlan = new Date(params.dateDebut + 'T00:00:00Z');
  const jourSemaineISODebut = (dateDebutPlan.getUTCDay() + 6) % 7;
  const lundiDeLaSemaine = new Date(dateDebutPlan);
  lundiDeLaSemaine.setUTCDate(dateDebutPlan.getUTCDate() - jourSemaineISODebut);

  const joursUtiles = Object.keys(assignment)
    .map(Number)
    .filter(j => {
      const dateJour = new Date(lundiDeLaSemaine);
      dateJour.setUTCDate(lundiDeLaSemaine.getUTCDate() + j);
      return dateJour >= dateDebutPlan;
    });
  const premierJour = joursUtiles.length > 0
    ? Math.min(...joursUtiles)
    : Math.min(...Object.keys(assignment).map(Number));

  for (const [jour, seance] of Object.entries(assignment)) {
    if (Number(jour) === premierJour) {
      const { sousType, contenu, kmEstime, structureIntervalles } = genererContenuTestSemiCooper();
      seance.type = 'qualite';
      seance.sousType = sousType;
      seance.contenu = contenu;
      seance.kmEstime = kmEstime;
      seance.structureIntervalles = structureIntervalles;
      seance.estTest = true;
      delete seance.indexQualite;
    } else if (seance.type === 'ef' || seance.type === 'longue') {
      const { contenu, kmEstime } = genererContenuFootingLibrePreTest();
      seance.contenu = contenu;
      seance.kmEstime = kmEstime;
    } else if (seance.type === 'qualite') {
      seance.type = 'ef';
      delete seance.indexQualite;
      delete seance.sousType;
      delete seance.restrictionsAllure;
      const { contenu, kmEstime } = genererContenuFootingLibrePreTest();
      seance.contenu = contenu;
      seance.kmEstime = kmEstime;
    }
  }

  const semaine1 = {
    semaineNum: 1,
    phase: 'PreTest',
    volumeCibleKm: null,
    estDechargeSemaine: false,
    assignment,
    warnings: warningsPlacement
  };

  return {
    distance: params.distance,
    objectif: params.objectif,
    enAttenteTest: true,
    dateDebut: params.dateDebut,
    dateCourse: params.dateCourse,
    allures: null,
    zoneFC: (() => {
      const fcMax = profil.fcMaxConnue ?? (profil.anneeNaissance ? computeFcMaxTanaka(profil.anneeNaissance) : null);
      if (!fcMax) return null;
      return {
        methode: profil.fcMaxConnue ? 'mesuree' : 'tanaka',
        fcMax,
        zonesParType: computeZonesFC(fcMax)
      };
    })(),
    semaines: [semaine1],
    warnings: warningsPlacement,
    paramsOrigine: { ...params, dateDebut: params.dateDebut },
    profilOrigine: { ...profil }
  };
}

export function completerPlanApresTestSemiCooper(planPartiel, resultatTest) {
  if (!planPartiel.enAttenteTest) {
    throw new Error("Ce plan n'est pas en attente de test — rien à compléter.");
  }

  const dateDebutSuite = new Date(planPartiel.dateDebut);
  dateDebutSuite.setDate(dateDebutSuite.getDate() + 7);
  const dateDebutSuiteStr = dateDebutSuite.toISOString().slice(0, 10);

  const distanceCibleKm = KM_BY_DISTANCE[planPartiel.paramsOrigine?.distance] ?? 10;
  const objectifTimeSeconds = riegelPredict(resultatTest.refTimeSeconds, resultatTest.refDistanceKm, distanceCibleKm);

  const paramsSuite = {
    ...planPartiel.paramsOrigine,
    dateDebut: dateDebutSuiteStr,
    refDistance: `${resultatTest.refDistanceKm}K`,
    tempsReference: formatSecondsToTime(resultatTest.refTimeSeconds),
    objectif: formatSecondsToTime(objectifTimeSeconds)
  };

  const planSuite = generatePlan(planPartiel.profilOrigine, paramsSuite);

  const semainesRenumerotees = planSuite.semaines.map(s => ({ ...s, semaineNum: s.semaineNum + 1 }));

  const allSecondsPreTest = planSuite.allures ? computeAllures({
    refTimeSeconds: parseTimeToSeconds(paramsSuite.tempsReference),
    refDistanceKm: KM_BY_DISTANCE[paramsSuite.refDistance ?? paramsSuite.distance],
    objectifTimeSeconds: parseTimeToSeconds(paramsSuite.objectif),
    distanceCibleKm: distanceCibleKm
  }) : null;
  const DUREE_FOOTING_SEMAINE_TEST_MIN = 40;
  const semaine1Recalculee = {
    ...planPartiel.semaines[0],
    assignment: Object.fromEntries(
      Object.entries(planPartiel.semaines[0].assignment).map(([jour, seance]) => {
        if (seance.estTest || !allSecondsPreTest) return [jour, seance];
        if (seance.type === 'ef' || seance.type === 'longue') {
          const kmCible = (DUREE_FOOTING_SEMAINE_TEST_MIN * 60) / allSecondsPreTest.E;
          const { contenu, kmEstime } = genererContenuEF({ alluresSec: allSecondsPreTest, kmCible });
          return [jour, { ...seance, contenu, kmEstime }];
        }
        return [jour, seance];
      })
    )
  };

  return {
    ...planSuite,
    enAttenteTest: false,
    dateDebut: planPartiel.dateDebut,
    dureeSemaines: (planSuite.dureeSemaines ?? 0) + 1,
    semaines: [semaine1Recalculee, ...semainesRenumerotees],
    warnings: [...(planPartiel.warnings ?? []), ...(planSuite.warnings ?? [])],
    paramsOrigine: paramsSuite,
    profilOrigine: planPartiel.profilOrigine
  };
}

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
  } else if (distanceKmCourse <= 25) {
    const d = distanceKmCourse;
    return calculerSplitsCalibres(d, tempsObjectifSec, [
      { from: 0, to: 5, note: "Départ prudent", offsetSecKm: 5 },
      { from: 5, to: 10, note: "Allure cible, régularité", offsetSecKm: -0.5 },
      { from: 10, to: 15, note: "Allure cible, régularité", offsetSecKm: -0.5 },
    ], "Ajuste au ressenti en fin de course");
  } else {
    const d = distanceKmCourse;
    return calculerSplitsCalibres(d, tempsObjectifSec, [
      { from: 0, to: 5, note: "Marge de sécurité, ne pars pas trop vite", offsetSecKm: 6 },
      { from: 5, to: 10, note: "Encore prudent", offsetSecKm: 3 },
      { from: 10, to: 20, note: "Allure cible, régularité", offsetSecKm: -0.5 },
      { from: 20, to: 30, note: "Allure cible, régularité", offsetSecKm: -0.5 },
      { from: 30, to: 35, note: "Allure cible, régularité", offsetSecKm: -0.5 },
    ], "Ajuste au ressenti en fin de course");
  }
}

export function genererContenuRace({ distance, alluresSec }) {
  const distanceKm = KM_BY_DISTANCE[distance] ?? 10;
  const C = alluresSec.C;
  const tempsObjectifSec = C * distanceKm;

  const splits = calculerStrategieCourse(distanceKm, tempsObjectifSec);

  const segments = splits.map(s =>
    `Km ${Math.round(s.from)}-${Math.round(s.to)} : ${s.note} (${formatPace(s.pace)})`
  );
  const resume = segments.join(' · ');

  const contenu = `🏁 Jour de course — ${distanceKm}km à l'allure objectif ${formatPace(C)}. ${resume}`;
  return { sousType: 'race', contenu, kmEstime: distanceKm };
}

// ---------------------------------------------------------------------------
// Placement de la séance de course finale — CORRECTIF 18/08/2026 (bug
// signalé par Laurent : décaler la date de course via le levier "Modifier
// mon plan" restait sans effet visible SAUF si la nouvelle date tombait
// sur un jour déjà entraîné). Cause : cette fonction cherchait la séance du
// jour de semaine ISO correspondant à dateCourse dans assignment, qui ne
// contient QUE les jours d'entraînement habituels du coureur (2 à 7 clés
// sur 7 possibles) — si jourCourseISO n'y figurait pas (jour habituellement
// non entraîné), le code repliait silencieusement sur le DERNIER jour
// entraîné de la semaine, quel qu'il soit, sans lien avec la date réellement
// choisie. Un coureur choisissant une date sur un jour non entraîné avait
// donc l'impression que rien ne changeait quand la date décalait peu (même
// dernier jour entraîné choisi) et un déplacement erratique sinon.
//
// Corrigé en respectant TOUJOURS le jour de semaine réel de dateCourse,
// même s'il n'a pas d'entrée dans assignment — même principe déjà appliqué
// à placerCourseIntermediaire (cf. son commentaire : "Ne déplace jamais la
// date choisie par le coureur, même si elle tombe sur un jour repos... la
// date est un choix explicite du coureur, elle est respectée telle
// quelle"). Une entrée 'repos' est créée à la volée si nécessaire, plutôt
// que de se limiter aux jours déjà présents.
export function placerSeanceCourse(plan, alluresSec) {
  const derniereSemaine = plan.semaines[plan.semaines.length - 1];
  if (!derniereSemaine) return;

  const jsDay = new Date(plan.dateCourse + 'T00:00:00').getDay();
  const jourCourseISO = (jsDay + 6) % 7;

  // Toujours utiliser le vrai jour de semaine de dateCourse — crée une
  // entrée 'repos' si ce jour n'était pas un jour entraîné habituel,
  // plutôt que de replier vers un autre jour de la semaine.
  if (!derniereSemaine.assignment[jourCourseISO]) {
    derniereSemaine.assignment[jourCourseISO] = { type: 'repos' };
  }
  const jourCourse = derniereSemaine.assignment[jourCourseISO];

  const { sousType, contenu, kmEstime } = genererContenuRace({ distance: plan.distance, alluresSec });
  jourCourse.type = 'race';
  jourCourse.sousType = sousType;
  jourCourse.contenu = contenu;
  jourCourse.kmEstime = kmEstime;
  jourCourse.estCourse = true;
}

export function neutraliserJoursApresCourse(plan) {
  const derniereSemaine = plan.semaines[plan.semaines.length - 1];
  if (!derniereSemaine) return;

  const cleCourse = Object.entries(derniereSemaine.assignment).find(([, j]) => j.estCourse)?.[0];
  if (cleCourse === undefined) return;
  const jourCourseNum = Number(cleCourse);

  for (const [jourStr, jour] of Object.entries(derniereSemaine.assignment)) {
    const jourNum = Number(jourStr);
    if (jourNum <= jourCourseNum) continue;
    if (jour.estCourse) continue;

    jour.type = 'repos';
    jour.sousType = undefined;
    jour.role = 'recuperation-post-course';
    jour.contenu = 'Repos — récupération après la course.';
    jour.kmEstime = 0;
    jour.restrictionsAllure = undefined;
  }
}

// ---------------------------------------------------------------------------
// Course intermédiaire — course choisie par le coureur, insérée dans un plan
// long (cf. inventaire-application.md §16, conçu avec Laurent). Distincte de
// la course finale (estCourse) : n'affecte QUE la semaine où elle tombe
// (allègement du volume de cette semaine + palier de récupération fixe selon
// distance), pas de neutralisation du reste du plan, pas d'approche
// spécifique (injecterApprocheCourse), pas de "pourquoi" dédié. Isolée du
// moteur de décision (R-070) — décision actée avec Laurent : une course
// intermédiaire est un événement ponctuel hors du rythme normal de la
// semaine, pas une séance dont l'issue doit influencer l'analyse tendance/
// état-coureur.
//
// Jamais de Marathon en course intermédiaire (décision Laurent) — distances
// valides : 5K, 10K, Semi.

export const RECUP_COURSE_INTERMEDIAIRE_JOURS = {
  '5K': 1,
  '10K': 2,
  'Semi': 4
};

const TAUX_ALLEGEMENT_COURSE_INTERMEDIAIRE = 0.75; // même taux que les décharges/adaptations existantes

// Trouve la semaine du plan contenant dateStr (même logique que phaseAtDate).
function semaineAtDate(plan, dateStr) {
  if (!plan?.dateDebut || !Array.isArray(plan.semaines)) return null;
  const debut = new Date(plan.dateDebut + "T00:00:00Z");
  const cible = new Date(dateStr + "T00:00:00Z");
  const semaineNum = Math.floor((cible - debut) / (7*86400000)) + 1;
  return plan.semaines.find(s => s.semaineNum === semaineNum) ?? null;
}

// Place la course intermédiaire dans le plan : remplace la séance du jour
// choisi par le contenu de course (réutilise genererContenuRace, comme la
// course finale), allège le volume de la semaine, applique le palier de
// récupération sur les jours suivants (dans la même semaine ET, si le
// palier déborde, sur les premiers jours de la semaine suivante).
//
// Ne déplace jamais la date choisie par le coureur, même si elle tombe sur
// un jour "repos" dans le plan généré — la date est un choix explicite du
// coureur, elle est respectée telle quelle (décision actée avec Laurent).
export function placerCourseIntermediaire(plan, { date, distance }, alluresSec) {
  const semaine = semaineAtDate(plan, date);
  if (!semaine) return { warning: { code: 'COURSE_INTERMEDIAIRE_HORS_PLAN', message: "La date choisie tombe en dehors de la durée du plan." } };

  const debutPlan = new Date(plan.dateDebut + 'T00:00:00Z');
  const jourIndex = Math.round((new Date(date + 'T00:00:00Z') - debutPlan) / 86400000) % 7;

  const jourCourse = semaine.assignment[jourIndex];
  if (!jourCourse) return { warning: { code: 'COURSE_INTERMEDIAIRE_JOUR_INTROUVABLE', message: "Impossible de localiser ce jour dans la semaine du plan." } };

  const { sousType, contenu, kmEstime } = genererContenuRace({ distance, alluresSec });
  jourCourse.type = 'race-intermediaire';
  jourCourse.sousType = sousType;
  jourCourse.contenu = contenu;
  jourCourse.kmEstime = kmEstime;
  jourCourse.estCourseIntermediaire = true;
  jourCourse.distanceCourseIntermediaireKm = KM_BY_DISTANCE[distance];
  delete jourCourse.indexQualite;
  delete jourCourse.restrictionsAllure;

  // Allègement de la semaine en cours uniquement — recalcule EF/longue avec
  // le volume réduit, même mécanique que appliquerAdaptations.
  if (semaine.volumeCibleKm != null) {
    const nouveauVolume = Math.round(semaine.volumeCibleKm * TAUX_ALLEGEMENT_COURSE_INTERMEDIAIRE * 10) / 10;
    let kmQualiteTotal = jourCourse.kmEstime ?? 0;
    for (const [j, s] of Object.entries(semaine.assignment)) {
      if (Number(j) === jourIndex) continue;
      if (s.type === 'qualite') kmQualiteTotal += s.kmEstime ?? 0;
    }
    const assignmentSansCourse = Object.fromEntries(
      Object.entries(semaine.assignment).filter(([j]) => Number(j) !== jourIndex)
    );
    recalculerRepartitionEFLongue({
      assignment: assignmentSansCourse,
      volumeCibleKm: nouveauVolume,
      kmQualiteTotal,
      distance: plan.distance,
      phase: semaine.phase,
      alluresSec,
      nbJours: Object.keys(semaine.assignment).length - 1
    });
    semaine.volumeCibleKm = nouveauVolume;
  }

  appliquerRecuperationCourseIntermediaire(plan, semaine, jourIndex, distance, alluresSec);

  return { warning: null };
}

// Remplace les séances qualité/longue par du EF léger sur la fenêtre de
// récupération (RECUP_COURSE_INTERMEDIAIRE_JOURS selon distance), à partir
// du lendemain de la course — peut déborder sur la semaine suivante.
function appliquerRecuperationCourseIntermediaire(plan, semaineCourse, jourCourseIndex, distance, alluresSec) {
  const nbJoursRecup = RECUP_COURSE_INTERMEDIAIRE_JOURS[distance];
  if (!nbJoursRecup) return;

  const semainesTriees = [...plan.semaines].sort((a, b) => a.semaineNum - b.semaineNum);
  const idxSemaineCourse = semainesTriees.findIndex(s => s.semaineNum === semaineCourse.semaineNum);

  let offsetGlobal = jourCourseIndex + 1; // premier jour de récup = lendemain
  let idxSemaine = idxSemaineCourse;

  for (let i = 0; i < nbJoursRecup; i++) {
    if (offsetGlobal >= 7) {
      offsetGlobal -= 7;
      idxSemaine += 1;
    }
    const semaineCible = semainesTriees[idxSemaine];
    if (!semaineCible) break;

    const jour = semaineCible.assignment[offsetGlobal];
    if (jour && (jour.type === 'qualite' || jour.type === 'longue')) {
      jour.type = 'ef';
      jour.sousType = undefined;
      jour.structureIntervalles = undefined;
      jour.role = 'recuperation-course-intermediaire';
      const kmCibleRecup = (30 * 60) / alluresSec.E; // 30min léger, indépendant du volume cible de la semaine
      const { contenu, kmEstime } = genererContenuEF({ alluresSec, kmCible: kmCibleRecup, role: 'recuperation' });
      jour.contenu = contenu;
      jour.kmEstime = kmEstime;
      delete jour.indexQualite;
      delete jour.restrictionsAllure;
    }

    offsetGlobal += 1;
  }
}

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

export function injecterApprocheCourse(plan) {
  const piocher = (cle) => {
    const variantes = NOTES_APPROCHE_COURSE[cle];
    return variantes[Math.floor(Math.random() * variantes.length)];
  };

  const derniereSemaine = plan.semaines[plan.semaines.length - 1];
  if (!derniereSemaine) return;

  const cleCourse = Object.entries(derniereSemaine.assignment).find(([, j]) => j.estCourse)?.[0];
  if (cleCourse === undefined) return;
  const jourCourseNum = Number(cleCourse);

  [1, 2].forEach(decalage => {
    const jour = derniereSemaine.assignment[jourCourseNum - decalage];
    if (jour && jour.type === 'qualite') {
      jour.type = 'ef';
      jour.sousType = undefined;
      jour.role = 'recuperation';
      jour.contenu = `Footing très léger, aucune intensité à ${decalage} jour${decalage > 1 ? 's' : ''} de la course.`;
      jour.kmEstime = (jour.kmEstime ?? 0) * 0.4;
    }
  });

  const cles = ['j3', 'j2', 'veille'];
  cles.forEach((cle, i) => {
    const decalage = cles.length - i;
    const jour = derniereSemaine.assignment[jourCourseNum - decalage];
    if (jour && jour.contenu) {
      jour.contenu = `${jour.contenu} ${piocher(cle)}`;
    }
  });
}

export function placerSeanceTest(plan, alluresSec) {
  const phaseSpecifique = plan.phases.find(p => p.nom === 'Specifique');
  if (!phaseSpecifique || phaseSpecifique.semaines <= 0) return;

  let curseur = 0;
  for (const p of plan.phases) {
    if (p.nom === 'Specifique') break;
    curseur += p.semaines;
  }
  const debutSpecifique = curseur + 1;

  const tampon = TAMPON_TEST_SEMAINES[plan.distance] ?? 1;
  const semaineViseeIndex = Math.max(0, phaseSpecifique.semaines - tampon - 1);
  const semaineNumCible = debutSpecifique + semaineViseeIndex;

  const semaine = plan.semaines.find(s => s.semaineNum === semaineNumCible);
  if (!semaine) return;

  const jourQualite = Object.entries(semaine.assignment).find(([, s]) => s.type === 'qualite');
  if (!jourQualite) return;
  const [jour, seance] = jourQualite;

  const { sousType, contenu, kmEstime, distanceTestKm, structureIntervalles } = genererContenuTest({ distance: plan.distance, alluresSec, volumeHebdoCibleKm: semaine.volumeCibleKm });
  seance.sousType = sousType;
  seance.contenu = contenu;
  seance.kmEstime = kmEstime;
  seance.estTest = true;
  seance.distanceTestKm = distanceTestKm;
  seance.structureIntervalles = structureIntervalles;

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
    alluresSec,
    nbJours: Object.keys(semaine.assignment).length
  });

  semaine.aUneSeanceTest = true;
}

function recalculerRepartitionEFLongue({ assignment, volumeCibleKm, kmQualiteTotal, distance, phase, alluresSec, nbJours }) {
  const nbEF = Object.values(assignment).filter(s => s.type === 'ef').length;
  const aLongue = Object.values(assignment).some(s => s.type === 'longue');
  const nbJoursEffectif = nbJours ?? Object.keys(assignment).length;
  const { kmLongue, kmParEF, warning: warningRepartition } = repartirVolumeSemaine({
    volumeCibleKm, kmQualiteTotal, nbEF, aLongue, nbJours: nbJoursEffectif
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
  return { warnings, kmLongue, kmParEF, nbEF, aLongue };
}

const POIDS_LONGUE = 1.6;

export function repartirVolumeSemaine({ volumeCibleKm, kmQualiteTotal, nbEF, aLongue, nbJours }) {
  const kmRestant = Math.max(0, volumeCibleKm - kmQualiteTotal);
  let kmLongue = 0, kmParEF = 0;

  if (aLongue) {
    if (nbEF > 0) {
      const nbPartsTotal = POIDS_LONGUE + nbEF;
      kmLongue = (kmRestant * POIDS_LONGUE) / nbPartsTotal;
      kmParEF = (kmRestant * 1) / nbPartsTotal;
    } else {
      kmLongue = kmRestant;
    }
  } else {
    kmParEF = nbEF > 0 ? kmRestant / nbEF : 0;
  }

  let warning = null;
  const seanceMinKm = Math.min(aLongue ? kmLongue : Infinity, nbEF > 0 ? kmParEF : Infinity);
  if (kmRestant > 0 && seanceMinKm < VOLUME_MIN_EF_KM) {
    warning = {
      code: 'VOLUME_HEBDO_TROP_FAIBLE_POUR_REPARTITION',
      message: `Volume hebdo restant (${Math.round(kmRestant * 10) / 10}km) trop faible pour des séances EF/longue substantielles.`
    };
  }

  return { kmLongue, kmParEF, warning };
}

function differencierEF({ assignment, kmParEF }) {
  const efDays = Object.entries(assignment).filter(([, s]) => s.type === 'ef').map(([j]) => parseInt(j));
  const hardDays = Object.entries(assignment).filter(([, s]) => s.type === 'qualite' || s.type === 'longue').map(([j]) => parseInt(j));

  if (efDays.length <= 1) {
    return Object.fromEntries(efDays.map(j => [j, { role: 'standard', kmCible: kmParEF }]));
  }

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

export function generatePlan(profil, params) {
  const nbJoursProfil = profil.joursDisponiblesHabituels?.length ?? 0;
  const volumeMinRequis = VOLUME_MIN_PAR_JOURS[params.distance]?.[profil.niveau]?.[nbJoursProfil]
    ?? VOLUME_MIN_PAR_JOURS[params.distance]?.intermediaire?.[nbJoursProfil];
  if (volumeMinRequis !== undefined && params.volumeActuel < volumeMinRequis) {
    return {
      planInvalide: true,
      code: 'VOLUME_MIN_JOURS_NON_ATTEINT',
      message: `Avec ${nbJoursProfil} jour(s) d'entraînement par semaine pour un objectif ${params.distance}, un volume de départ d'au moins ${volumeMinRequis}km est nécessaire pour générer un plan cohérent (sortie longue et séances qualité/EF substantielles). Volume actuel : ${params.volumeActuel}km. Augmente le volume de départ ou réduis le nombre de jours disponibles.`,
    };
  }

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

  const tempsRef10KSec = riegelPredict(
    refTimeSeconds,
    KM_BY_DISTANCE[params.refDistance ?? params.distance],
    10
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
    phases,
    semaineDepart: params.semaineDepartVolume ?? 1
  });

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
  const nbApparitionsParSousType = {};
  let nbSemainesConstructionTotal = 0;
  let nbSemainesConstructionSousSeuil = 0;
  let nbSemainesLongueExcessive2j = 0;
  for (const phase of phasesAvecReacclimatation) {
    for (let i = 0; i < phase.semaines; i++) {
      semaineGlobale++;
      const { assignment, warnings: warningsPlacement } = placerSemaine({
        joursDisponibles: profil.joursDisponiblesHabituels,
        niveau: profil.niveau,
        modulation,
        forcerAucuneQualite: phase.nom === 'Reacclimatation',
        jourLongueChoisi: profil.jourLongueChoisi ?? null
      });

      let kmQualiteTotal = 0;
      const entreeVolumeSemaine = volumesParSemaine.find(v => v.semaine === semaineGlobale);
      const semaineHorsProgression = entreeVolumeSemaine === undefined;
      const tauxAffutageSemaine = entreeVolumeSemaine?.fractionPic ?? 1;
      const dechargeSemaine = entreeVolumeSemaine?.estDecharge ?? false;
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
            niveau: profil.niveau,
            volumeHebdoCibleKm: entreeVolumeSemaine?.volumeKm ?? null,
            tempsRef10KSec
          });
          seance.sousType = sousType;
          seance.contenu = contenu;
          seance.kmEstime = kmEstime;
          seance.structureIntervalles = structureIntervalles;
          if (sousType) nbApparitionsParSousType[sousType] = (nbApparitionsParSousType[sousType] ?? 0) + 1;
          kmQualiteTotal += kmEstime;
        }
      }

      // Repli sur params.volumeActuel plutôt que 0 (18/08/2026, filet de
      // sécurité supplémentaire suite au bug EF/longue à 0min) — au cas où
      // une semaine tomberait encore hors progression malgré le comblement
      // ajouté dans computeVolumeProgression (semaineDepart > 1), mieux
      // vaut un volume plat raisonnable qu'un volume nul qui produit des
      // séances vides.
      const volumeCibleSemaine = entreeVolumeSemaine?.volumeKm ?? params.volumeActuel ?? 0;
      const { warnings: warningsRepartition, kmLongue, kmParEF, nbEF, aLongue } = recalculerRepartitionEFLongue({
        assignment,
        volumeCibleKm: volumeCibleSemaine,
        kmQualiteTotal,
        distance: params.distance,
        phase: phase.nom,
        alluresSec: allSeconds,
        nbJours: profil.joursDisponiblesHabituels.length
      });
      if (!(phase.nom === 'Affutage' || dechargeSemaine || semaineHorsProgression)) {
        warningsRepartition.forEach(w => {
          const suffixeJour = w.jour !== undefined && w.code !== 'VOLUME_HEBDO_TROP_FAIBLE_POUR_REPARTITION' ? ` (jour ${w.jour})` : '';
          warningsSemaines.push({ ...w, message: `S${semaineGlobale}${suffixeJour} : ${w.message}` });
        });
      }

      if (phase.nom === 'Construction' && !dechargeSemaine && !semaineHorsProgression) {
        nbSemainesConstructionTotal++;
        const longueSousSeuil = aLongue && kmLongue < VOLUME_MIN_LONGUE_KM;
        const efSousSeuil = nbEF > 0 && kmParEF < VOLUME_MIN_EF_KM;
        if (longueSousSeuil || efSousSeuil) nbSemainesConstructionSousSeuil++;

        if (nbEF === 0 && aLongue) {
          const dureeMaxLongueMin = DUREE_MAX_LONGUE_MIN[params.distance] ?? 120;
          const kmLongueMaxRaisonnable = (dureeMaxLongueMin * 60) / allSeconds.E;
          if (kmLongue > kmLongueMaxRaisonnable) nbSemainesLongueExcessive2j++;
        }
      }

      semaines.push({
        semaineNum: semaineGlobale,
        phase: phase.nom,
        volumeCibleKm: entreeVolumeSemaine?.volumeKm ?? null,
        estDechargeSemaine: entreeVolumeSemaine?.estDecharge ?? false,
        assignment,
        warnings: warningsPlacement
      });
    }
  }

  if (nbSemainesConstructionTotal > 0 && nbSemainesConstructionSousSeuil > nbSemainesConstructionTotal / 2) {
    return {
      planInvalide: true,
      code: 'VOLUME_JOURS_INCOMPATIBLE',
      message: `Le volume de départ (${params.volumeActuel}km/semaine) est trop faible pour ${profil.joursDisponiblesHabituels.length} jours disponibles par semaine : ${nbSemainesConstructionSousSeuil} semaine(s) sur ${nbSemainesConstructionTotal} auraient des séances EF ou une sortie longue sans substance réelle (moins de ${VOLUME_MIN_EF_KM}km / ${VOLUME_MIN_LONGUE_KM}km). Réduis le nombre de jours disponibles ou augmente le volume de départ.`,
    };
  }

  if (nbSemainesLongueExcessive2j > 0) {
    warningsSemaines.push({
      code: 'VOLUME_LONGUE_EXCESSIVE_2J',
      message: `Avec seulement 2 jours d'entraînement par semaine, ton volume actuel (${params.volumeActuel}km) demanderait une sortie longue très importante en une seule séance — le contenu généré reste plafonné à une durée raisonnable, donc une partie du volume prévu ne peut pas être reflétée. Passer à 3 jours ou plus permettrait de mieux répartir ce volume.`
    });
  }

  const warnings = [
    ...warningsPhases,
    ...warningsVolume,
    ...modulation.warnings,
    ...semaines.flatMap(s => s.warnings),
    ...warningsSemaines
  ];

  injecterJalonsTransition(semaines);
  injecterNotesPratiques(semaines);
  injecterStrides(semaines, allSeconds);
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

  placerSeanceTest(plan, allSeconds);
  injecterCoherenceSemaineTest(plan);
  placerSeanceCourse(plan, allSeconds);
  neutraliserJoursApresCourse(plan);
  injecterApprocheCourse(plan);

  if (params.courseIntermediaire?.date && params.courseIntermediaire?.distance) {
    const resultatPlacement = placerCourseIntermediaire(plan, params.courseIntermediaire, allSeconds);
    if (resultatPlacement.warning) {
      warnings.push(resultatPlacement.warning);
    }
  }

  injecterPourquoiSeance(plan);

  return plan;
}

export const ACWR_SEUIL_RISQUE = 1.5;
export const ACWR_SEUIL_VIGILANCE = 1.3;
export const ACWR_SEUIL_SOUS_CHARGE = 0.8;

const POIDS_STATUT = { '❌': 1, '⚠️': 0.5, '✅': 0 };

export const GARDE_FOU_SEMAINES_MARCHE_COURSE = 12;

export function analyserProgressionMarcheCourse(plan) {
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

export function analyserAdaptations(plan) {
  const semainesAAdapter = new Map();
  let consecutives = 0;
  let maxConsecutives = 0;

  const semainesTriees = [...plan.semaines].sort((a, b) => a.semaineNum - b.semaineNum);

  for (const semaine of semainesTriees) {
    const score = calculerScoreSemaine(semaine, plan.statuses);
    if (score === null) { consecutives = 0; continue; }

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

export function appliquerAdaptations(plan) {
  const { semainesAAdapter, adaptationsConsecutivesMax } = analyserAdaptations(plan);
  const nouveauxWarnings = [];

  if (semainesAAdapter.size === 0) return nouveauxWarnings;

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

  const tempsRef10KSec = riegelPredict(
    parseTimeToSeconds(plan.paramsOrigine.tempsReference),
    KM_BY_DISTANCE[plan.paramsOrigine.refDistance ?? plan.paramsOrigine.distance],
    10
  );

  let curseur = 0;
  const bornesPhases = plan.phases.map(p => {
    const debut = curseur;
    curseur += p.semaines;
    return { nom: p.nom, debut, fin: curseur };
  });

  for (const [semaineNum, { dejaDecharge }] of semainesAAdapter.entries()) {
    const semaine = plan.semaines.find(s => s.semaineNum === semaineNum);
    if (!semaine) continue;

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
        estDechargeSemaine: true,
        nbApparitionsParSousType,
        niveau: plan.profilOrigine?.niveau,
        volumeHebdoCibleKm: nouveauVolume,
        tempsRef10KSec
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
      alluresSec,
      nbJours: Object.keys(semaine.assignment).length
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

  const tempsRef10KSec = riegelPredict(
    parseTimeToSeconds(plan.paramsOrigine.tempsReference),
    KM_BY_DISTANCE[plan.paramsOrigine.refDistance ?? plan.paramsOrigine.distance],
    10
  );

  let curseur = 0;
  const bornesPhases = plan.phases.map(p => {
    const debut = curseur;
    curseur += p.semaines;
    return { nom: p.nom, debut, fin: curseur };
  });

  let nbMisesAJour = 0;
  const nbApparitionsParSousType = {};
  const debutPlanGF = plan.dateDebut ? new Date(plan.dateDebut + 'T00:00:00Z') : null;
  const aujourdhuiGF = new Date();
  const aujourdhuiStrGF = new Date(Date.UTC(aujourdhuiGF.getFullYear(), aujourdhuiGF.getMonth(), aujourdhuiGF.getDate())).toISOString().slice(0, 10);

  for (const semaine of plan.semaines) {
    const phaseInfo = bornesPhases.find(b => b.nom === semaine.phase && semaine.semaineNum > b.debut && semaine.semaineNum <= b.fin);
    const semaineDansPhase = phaseInfo ? semaine.semaineNum - phaseInfo.debut - 1 : 0;

    for (const [jourIndex, seance] of Object.entries(semaine.assignment)) {
      if (seance.type !== 'qualite') continue;
      if (seance.sousType) nbApparitionsParSousType[seance.sousType] = (nbApparitionsParSousType[seance.sousType] ?? 0) + 1;
      if (seance.structureIntervalles) continue;

      if (debutPlanGF) {
        const dateSeanceGF = new Date(debutPlanGF);
        dateSeanceGF.setUTCDate(debutPlanGF.getUTCDate() + (semaine.semaineNum - 1) * 7 + Number(jourIndex));
        const dateSeanceStrGF = dateSeanceGF.toISOString().slice(0, 10);
        if (dateSeanceStrGF < aujourdhuiStrGF) continue;
      }

      if (seance.estTest) {
        const { structureIntervalles } = genererContenuTest({ distance: plan.paramsOrigine.distance, alluresSec, volumeHebdoCibleKm: semaine.volumeCibleKm });
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
        niveau: plan.profilOrigine?.niveau,
        volumeHebdoCibleKm: semaine.volumeCibleKm,
        tempsRef10KSec
      });

      if (sousType !== seance.sousType) continue;

      seance.structureIntervalles = structureIntervalles;
      nbMisesAJour++;
    }
  }

  return nbMisesAJour;
}
