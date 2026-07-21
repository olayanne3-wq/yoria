/**
 * plan-forme.js
 * Moteur de génération de plan — Mode Forme (Yoria v2.6)
 *
 * Mode alternatif au plan course (plan-generator.js) : pas de date de fin,
 * pas de phases Construction/Spécifique/Affûtage, pas de séance test/course.
 * Cycle glissant en blocs de N semaines, régénérable indéfiniment. Réutilise
 * directement les briques génériques de plan-generator.js (placement des
 * jours, contenu EF/longue, répartition du volume, allures, ACWR,
 * adaptations) — n'y importe QUE ce qui est indépendant de la notion de
 * course. N'importe jamais computePhases, ROTATION_SOUS_TYPE,
 * placerSeanceTest, placerSeanceCourse ni injecterApprocheCourse.
 *
 * Module pur (aucune dépendance DOM) — testable en isolation, même
 * convention que plan-generator.js (allures en secondes/km en interne).
 */

import {
  formatPace,
  paceFromTime,
  riegelPredict,
  parseTimeToSeconds,
  PACE_RATIOS,
  placerSemaine,
  genererContenuEF,
  genererContenuLongue,
  repartirVolumeSemaine,
  computeFcMaxTanaka,
  computeZonesFC,
  genererContenuMarcheCourse,
  PALIERS_MARCHE_COURSE
} from './plan-generator.js';

// ---------------------------------------------------------------------------
// Allures — variante sans objectif de course (pas de zone C). Réutilise
// PACE_RATIOS tel quel (mêmes ratios recup/E/T/I/V que le moteur course,
// calibrés sur le même profil réel) : rien ne justifie une recalibration,
// seule la zone C (allure course) n'a pas de sens ici et est omise.
// ---------------------------------------------------------------------------

export function computeAlluresForme({ refTimeSeconds, refDistanceKm }) {
  const paceRef10k = paceFromTime(riegelPredict(refTimeSeconds, refDistanceKm, 10), 10);
  const allures = {};
  for (const [zone, ratio] of Object.entries(PACE_RATIOS)) {
    allures[zone] = paceRef10k * ratio;
  }
  return allures; // secondes/km par zone — pas de zone C
}

// ---------------------------------------------------------------------------
// Test semi-Cooper (6 minutes) — estimation de référence quand le coureur
// n'a aucun temps de course récent à donner (21/07/2026, décision avec
// Laurent). Formule : VMA (km/h) = distance parcourue en mètres ÷ 100
// (protocole "demi-Cooper", plus simple que le Cooper classique 12min et
// généralement jugé plus fiable en usage libre — moins d'erreur de gestion
// d'allure sur une durée plus courte).
//
// La VMA estimée correspond directement à l'allure I (VMA) du système de
// zones existant (PACE_RATIOS.I = 0.855, calibré sur le profil réel de
// Laurent) — on en déduit un temps 10K équivalent pour rester compatible
// avec computeAlluresForme(), qui attend un couple (refTimeSeconds,
// refDistanceKm) plutôt qu'une VMA directe. Évite de repasser par un temps
// de course simulé + Riegel (double approximation) : conversion directe
// via le ratio déjà utilisé pour dériver les zones.
// ---------------------------------------------------------------------------

export function estimerReferenceDepuisSemiCooper(distanceMetres) {
  const vmaKmh = distanceMetres / 100;
  const allureISecKm = 3600 / vmaKmh;
  const allure10kSecKm = allureISecKm / PACE_RATIOS.I;
  const refTimeSeconds = Math.round(allure10kSecKm * 10);
  return { refTimeSeconds, refDistanceKm: 10, vmaKmh };
}

// ---------------------------------------------------------------------------
// Plafonds de volume — pas de distance de course, donc pas de PLAFONDS_VOLUME
// par distance. Le mode Forme vise un plateau autour du volume de départ
// choisi, pas une progression vers un plafond de population : la marge de
// progression est volontairement modeste (le but est l'entretien, pas la
// performance). Ratio validé au même titre que les autres constantes de
// plan-generator.js : à ajuster si l'usage réel montre un plateau trop bas
// ou trop haut.
// ---------------------------------------------------------------------------

const MARGE_PROGRESSION_PLATEAU = 1.15; // plateau cible = volume départ + 15% max

// ---------------------------------------------------------------------------
// Rotation de séances qualité par accent — VMA / Endurance / Polyvalent.
// Registre volontairement distinct de ROTATION_SOUS_TYPE (plan-generator.js) :
// contenu dans l'esprit "jeu avec l'allure", moins protocolaire que les
// séances course (cf. échange du 13 juillet 2026 avec Laurent — fartlek,
// pyramidale, variations d'allure plutôt que répétitions chronométrées
// figées). Les sous-types ici sont propres au mode Forme et générés par
// genererContenuQualiteForme ci-dessous, pas par genererContenuQualite du
// moteur course (dont les sous-types calibrés sur allure C/rotation par
// phase n'ont pas de sens sans date de course).
// ---------------------------------------------------------------------------

export const ROTATION_SOUS_TYPE_FORME = {
  vma: ['fartlek', 'pyramidale-forme', 'i-30-30-forme', 'fartlek', 'cotes-forme'],
  endurance: ['fartlek', 'seuil-forme', 'fartlek'],
  polyvalent: ['fartlek', 'seuil-forme', 'pyramidale-forme', 'i-30-30-forme']
};

/**
 * Génère le contenu concret d'une séance qualité Forme (texte affichable).
 * alluresSec : allures en secondes/km (sortie de computeAlluresForme).
 * Registre séparé de genererContenuQualite (plan-generator.js) : les
 * sous-types 'fartlek'/'pyramidale-forme'/etc. sont propres au mode Forme,
 * jamais ceux du moteur course.
 */
export function genererContenuQualiteForme({ accent, indexRotation, alluresSec, semaineDansCycle = 0 }) {
  const rotation = ROTATION_SOUS_TYPE_FORME[accent] ?? ROTATION_SOUS_TYPE_FORME.polyvalent;
  const sousType = rotation[indexRotation % rotation.length];

  const { E, T, I } = alluresSec;
  const kmDepuisMinutes = (min, paceSecParKm) => (min * 60) / paceSecParKm;

  let contenuCorps, kmCorps, structureIntervalles;

  switch (sousType) {
    case 'fartlek': {
      // Cadré par allures existantes mais repères souples (cf. décision du
      // 13 juillet 2026) : fourchette d'allure entre T et I, durée totale
      // imposée, sans découpage en blocs fixes — garde une estimation km
      // fiable (moyenne T/I) sans reproduire la rigidité des séances course.
      const dureeMin = 25;
      const paceMoyen = (T + I) / 2;
      kmCorps = kmDepuisMinutes(dureeMin, paceMoyen);
      contenuCorps = `${dureeMin}min en jouant avec l'allure, entre ${formatPace(I)} et ${formatPace(T)} — change de rythme librement, sans contrainte de timing`;
      structureIntervalles = { blocs: [{ repetitions: 1, dureeEffortSec: dureeMin * 60, allure: `${formatPace(T)}-${formatPace(I)}`, dureeRecupSec: 0 }], libre: true };
      break;
    }
    case 'pyramidale-forme': {
      // Variante Forme de la pyramidale : allure T (seuil) plutôt que I
      // (VMA) — effort soutenu mais pas au max, dans l'esprit entretien
      // plutôt que performance (cf. décision du 13 juillet 2026).
      const paliers = [2, 3, 4, 3, 2];
      const totalMin = paliers.reduce((a, b) => a + b, 0);
      kmCorps = kmDepuisMinutes(totalMin, T);
      contenuCorps = `Pyramidale ${paliers.join('-')}min @ ${formatPace(T)} (Seuil), récup égale au temps de l'effort`;
      structureIntervalles = { blocs: paliers.map(p => ({ repetitions: 1, dureeEffortSec: p * 60, allure: formatPace(T), dureeRecupSec: p * 60 })) };
      break;
    }
    case 'i-30-30-forme': {
      const reps = 8;
      kmCorps = kmDepuisMinutes(reps * 0.5, I);
      contenuCorps = `${reps}×30s-30s @ ${formatPace(I)} (VMA)`;
      structureIntervalles = { blocs: [{ repetitions: reps, dureeEffortSec: 30, allure: formatPace(I), dureeRecupSec: 30 }] };
      break;
    }
    case 'cotes-forme': {
      const reps = 6;
      kmCorps = kmDepuisMinutes(reps * 0.5, I);
      contenuCorps = `${reps}×30s en côte (effort soutenu), récupération trot`;
      structureIntervalles = { blocs: [{ repetitions: reps, dureeEffortSec: 30, allure: 'effort soutenu (côte)', dureeRecupSec: null, recupLabel: 'trot' }] };
      break;
    }
    case 'seuil-forme': {
      const reps = 3;
      kmCorps = kmDepuisMinutes(reps * 8, T);
      contenuCorps = `${reps}×8min @ ${formatPace(T)} (Seuil), récup 2min`;
      structureIntervalles = { blocs: [{ repetitions: reps, dureeEffortSec: 8 * 60, allure: formatPace(T), dureeRecupSec: 2 * 60 }] };
      break;
    }
    default: {
      kmCorps = kmDepuisMinutes(20, T);
      contenuCorps = `20min @ ${formatPace(T)} (Seuil)`;
      structureIntervalles = { blocs: [{ repetitions: 1, dureeEffortSec: 20 * 60, allure: formatPace(T), dureeRecupSec: 0 }] };
    }
  }

  const DUREE_ECHAUFFEMENT_MIN = 15;
  const DUREE_RETOUR_CALME_MIN = 10;
  const kmEchauffement = kmDepuisMinutes(DUREE_ECHAUFFEMENT_MIN, E);
  const kmRetourCalme = kmDepuisMinutes(DUREE_RETOUR_CALME_MIN, E);
  const kmEstime = kmCorps + kmEchauffement + kmRetourCalme;

  const contenu = `Échauffement ${DUREE_ECHAUFFEMENT_MIN}min @ ${formatPace(E)} (EF) + ${contenuCorps} + Retour au calme ${DUREE_RETOUR_CALME_MIN}min @ ${formatPace(E)} (EF)`;

  structureIntervalles.echauffementSec = DUREE_ECHAUFFEMENT_MIN * 60;
  structureIntervalles.retourCalmeSec = DUREE_RETOUR_CALME_MIN * 60;
  structureIntervalles.allureEchauffement = formatPace(E);

  return { sousType, contenu, kmEstime, structureIntervalles };
}

// ---------------------------------------------------------------------------
// Volume — plateau glissant, même règle de décharge que le moteur course
// (tous les 3-4 semaines, -25%) mais sans notion de plafond de population
// ni d'affûtage. Le volume progresse doucement vers le plateau
// (volumeDepart * MARGE_PROGRESSION_PLATEAU) puis s'y stabilise.
// ---------------------------------------------------------------------------

export function computeVolumeFormeSemaine({ volumeDepart, semaineNum }) {
  const plateau = volumeDepart * MARGE_PROGRESSION_PLATEAU;
  const estDecharge = semaineNum % 4 === 0 && semaineNum > 1;
  if (estDecharge) {
    return { volumeKm: Math.round(plateau * 0.75 * 10) / 10, estDecharge: true };
  }
  // Montée douce sur les 3 premières semaines du tout premier cycle, puis
  // plateau stable — pas de croissance perpétuelle (contrairement au moteur
  // course qui vise un pic avant affûtage, ici il n'y a pas de pic à viser)
  const progression = Math.min(1, semaineNum / 3);
  const volume = volumeDepart + (plateau - volumeDepart) * progression;
  return { volumeKm: Math.round(volume * 10) / 10, estDecharge: false };
}

// ---------------------------------------------------------------------------
// Grand débutant — v2.8 (§17.1, correction du 14/07/2026 par rapport à la
// première version du chantier marche-course, où ce niveau vivait dans
// plan-generator.js/generatePlan). Le Mode Forme est la bonne maison pour ce
// profil : pas de date de fin, cycle glissant — cohérent avec l'esprit
// "pas de pression d'échéance" pour quelqu'un qui commence tout juste à
// courir. Réutilise PALIERS_MARCHE_COURSE/genererContenuMarcheCourse
// (plan-generator.js) tels quels, dans le contexte bloc glissant plutôt que
// date de fin fixe. Toutes les séances du bloc sont identiques (même palier),
// pas de distinction longue/EF/qualité (cf. placerSemaine, cas
// grand-debutant déjà géré côté plan-generator.js).
// ---------------------------------------------------------------------------

function generatePlanFormeMarcheCourse(profil, params) {
  const nbSemaines = params.nbSemainesBloc ?? TAILLE_BLOC_SEMAINES;
  const palierId = profil.palierMarcheCourse ?? 0;
  const semaines = [];
  const warnings = [];

  for (let semaineNum = 1; semaineNum <= nbSemaines; semaineNum++) {
    const { assignment, warnings: warningsPlacement } = placerSemaine({
      joursDisponibles: profil.joursDisponiblesHabituels,
      niveau: 'grand-debutant',
      renforcementActif: false
    });
    for (const seance of Object.values(assignment)) {
      if (seance.type === 'marche-course') {
        const { contenu, kmEstime, palierLabel } = genererContenuMarcheCourse({ palierId });
        seance.contenu = contenu;
        seance.kmEstime = kmEstime;
        seance.palierLabel = palierLabel;
      }
    }
    warningsPlacement.forEach(w => warnings.push({ ...w, message: `S${semaineNum} : ${w.message}` }));
    semaines.push({ semaineNum, phase: 'MarcheCourse', estDechargeSemaine: false, assignment, warnings: warningsPlacement });
  }

  return {
    mode: 'forme',
    sousMode: 'marche-course', // distingue ce cas du Mode Forme classique côté app (index.html)
    accent: null,
    dateDebut: params.dateDebut,
    dateCloture: params.dateCloture || undefined,
    tailleBlocSemaines: nbSemaines,
    allures: null, // pas d'allure établie à ce stade (cf. plan-generator.js, generatePlanMarcheCourse)
    zoneFC: null,
    palierMarcheCourse: palierId,
    semaines,
    warnings
  };
}

// ---------------------------------------------------------------------------
// Orchestrateur — génère un bloc glissant de N semaines (défaut 4). Conforme
// à un schéma de plan minimal compatible avec l'affichage existant
// (semaines[].assignment, phase absente ou 'Forme' générique), avec
// plan.mode = 'forme' comme discriminant pour l'app (index.html).
// ---------------------------------------------------------------------------

const TAILLE_BLOC_SEMAINES = 4;

export function generatePlanForme(profil, params) {
  if (profil.niveau === 'grand-debutant') {
    return generatePlanFormeMarcheCourse(profil, params);
  }

  const refTimeSeconds = parseTimeToSeconds(params.tempsReference);
  const refDistanceKm = { '5K': 5, '10K': 10, 'Semi': 21.1, 'Marathon': 42.2 }[params.refDistance ?? '10K'];

  const allSeconds = computeAlluresForme({ refTimeSeconds, refDistanceKm });
  const allures = Object.fromEntries(Object.entries(allSeconds).map(([k, v]) => [k, formatPace(v)]));

  const accent = params.accent ?? 'polyvalent';
  const nbSemaines = params.nbSemainesBloc ?? TAILLE_BLOC_SEMAINES;

  const semaines = [];
  const warnings = [];
  let indexRotation = 0;

  for (let semaineNum = 1; semaineNum <= nbSemaines; semaineNum++) {
    const { assignment, warnings: warningsPlacement } = placerSemaine({
      joursDisponibles: profil.joursDisponiblesHabituels,
      niveau: profil.niveau,
      renforcementActif: profil.renforcementMusculaire,
      modulation: {},
      forcerAucuneQualite: false
    });

    const { volumeKm, estDecharge } = computeVolumeFormeSemaine({ volumeDepart: params.volumeActuel, semaineNum });

    let kmQualiteTotal = 0;
    for (const seance of Object.values(assignment)) {
      if (seance.type === 'qualite') {
        const { sousType, contenu, kmEstime, structureIntervalles } = genererContenuQualiteForme({
          accent,
          indexRotation,
          alluresSec: allSeconds,
          semaineDansCycle: semaineNum - 1
        });
        seance.sousType = sousType;
        seance.contenu = contenu;
        seance.kmEstime = kmEstime;
        seance.structureIntervalles = structureIntervalles;
        indexRotation++;
        kmQualiteTotal += kmEstime;
      }
    }

    const nbEF = Object.values(assignment).filter(s => s.type === 'ef').length;
    const aLongue = Object.values(assignment).some(s => s.type === 'longue');
    const { kmLongue, kmParEF, warning: warningRepartition } = repartirVolumeSemaine({
      volumeCibleKm: volumeKm, kmQualiteTotal, nbEF, aLongue
    });
    if (warningRepartition) warnings.push({ ...warningRepartition, message: `S${semaineNum} : ${warningRepartition.message}` });

    for (const [jour, seance] of Object.entries(assignment)) {
      if (seance.type === 'ef') {
        const { contenu, kmEstime, warning } = genererContenuEF({ alluresSec: allSeconds, kmCible: kmParEF, role: 'standard' });
        seance.contenu = contenu;
        seance.kmEstime = kmEstime;
        if (warning) warnings.push({ ...warning, message: `S${semaineNum} (jour ${jour}) : ${warning.message}` });
      } else if (seance.type === 'longue') {
        // pas de notion de phase ni de segment allure course en Forme :
        // genererContenuLongue avec phase indéfinie retombe sur la sortie
        // longue simple à allure EF (avecSegmentCourse ne se déclenche que
        // pour Semi/Marathon en phase Specifique/Affutage, jamais ici)
        const { contenu, kmEstime, warning } = genererContenuLongue({ distance: undefined, phase: undefined, alluresSec: allSeconds, kmCible: kmLongue });
        seance.contenu = contenu;
        seance.kmEstime = kmEstime;
        if (warning) warnings.push({ ...warning, message: `S${semaineNum} (jour ${jour}) : ${warning.message}` });
      }
    }

    semaines.push({
      semaineNum,
      phase: 'Forme',
      volumeCibleKm: volumeKm,
      estDechargeSemaine: estDecharge,
      assignment,
      warnings: warningsPlacement
    });
  }

  warnings.push(...semaines.flatMap(s => s.warnings));

  const plan = {
    mode: 'forme',
    accent,
    dateDebut: params.dateDebut,
    // Date de clôture optionnelle (13 juillet 2026, décision avec Laurent) :
    // permet de définir une fin explicite au plan Forme, pour pouvoir
    // planifier un plan course à sa suite sans conflit — cf.
    // trouverPlanEnConflit()/estPlanEnCours() dans gist-sync.js, qui
    // considèrent un plan Forme "en cours" indéfiniment (pas de fin
    // naturelle liée aux blocs générés) tant qu'aucune dateCloture n'est
    // fixée. undefined si non renseignée, jamais une chaîne vide.
    dateCloture: params.dateCloture || undefined,
    tailleBlocSemaines: nbSemaines,
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
    semaines,
    warnings
  };

  return plan;
}

/**
 * Régénère le bloc suivant (mêmes profil/params d'origine), à enchaîner
 * quand le bloc courant est terminé — c'est ce qui fait du plan Forme un
 * cycle "glissant" plutôt qu'un plan à durée fixe. Le volume de départ du
 * nouveau bloc repart du plateau atteint en fin de bloc précédent (pas du
 * volumeActuel d'origine, et pas de la dernière semaine si celle-ci est une
 * décharge — la décharge est un creux temporaire, pas le nouveau niveau de
 * référence), pour que la progression ne redémarre pas de zéro ni ne recule
 * à chaque enchaînement de bloc.
 *
 * IMPORTANT (13 juillet 2026) : ne jamais appeler cette fonction sur un plan
 * dont dateCloture est déjà fixée — un plan Forme clôturé est figé de façon
 * permanente (cf. sauvegarderPlan() dans gist-sync.js, qui rejette toute
 * écriture ultérieure sur un tel plan). Ce module étant un générateur pur,
 * il ne vérifie pas lui-même ce garde-fou : c'est à l'appelant (index.html)
 * de contrôler planPrecedent.dateCloture avant d'invoquer genererBlocSuivant,
 * et de ne jamais tenter de sauvegarder le résultat si le plan est clôturé.
 */
export function genererBlocSuivant(planPrecedent, profilOrigine, paramsOrigine) {
  const derniereSemaine = planPrecedent.semaines[planPrecedent.semaines.length - 1];
  const volumeRepart = derniereSemaine?.estDechargeSemaine
    ? (planPrecedent.semaines[planPrecedent.semaines.length - 2]?.volumeCibleKm ?? paramsOrigine.volumeActuel)
    : (derniereSemaine?.volumeCibleKm ?? paramsOrigine.volumeActuel);

  return generatePlanForme(profilOrigine, { ...paramsOrigine, volumeActuel: volumeRepart });
}
