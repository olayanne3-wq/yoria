// Test de génération de plans variés (24/07/2026)
// -------------------------------------------------------------------------
// Objectif : vérifier qu'une dizaine de profils représentatifs (cas connus
// comme sensibles : grand débutant, profil incomplet, Mode Forme, dates
// limites, changement de niveau) génèrent un plan SANS PLANTER, et que ce
// plan respecte quelques règles structurelles objectives (documentées
// ci-dessous). Ne vérifie PAS la qualité pédagogique du plan — c'est un
// jugement d'expert qui reste celui de Laurent, pas quelque chose qu'un
// test peut coder sans risque de figer une règle discutable en dur
// (décision actée avec Laurent le 24/07/2026).
//
// Usage : node scripts/test-plans-varies.js
//
// Pour ajouter un profil : ajouter une entrée au tableau PROFILS ci-dessous.
// Le champ `generer` reçoit (helpers) et doit retourner un plan complet
// (même forme que le retour de generatePlan()).

import {
  generatePlan,
  generatePlanAvecTestSemiCooper,
  completerPlanApresTestSemiCooper,
} from '../public/v2/engine/plan-generator.js';

import {
  generatePlanForme,
  generatePlanFormeAvecTest,
  completerBlocApresTest,
  estimerReferenceDepuisSemiCooper as estimerReferenceDepuisSemiCooperForme,
} from '../public/v2/engine/plan-forme.js';

// ---------------------------------------------------------------------
// RÈGLES STRUCTURELLES VÉRIFIÉES (niveau 2 — objectives, sans ambiguïté)
// ---------------------------------------------------------------------
// Chaque règle reçoit le plan complet et retourne un tableau de messages
// d'erreur (vide si tout va bien). Ajouter une règle ici l'applique
// automatiquement à tous les profils.

function regleValeursNumeriquesValides(plan) {
  const erreurs = [];
  const estInvalide = (v) => typeof v === 'number' && (Number.isNaN(v) || !Number.isFinite(v));

  if (estInvalide(plan.dureeSemaines)) erreurs.push(`dureeSemaines invalide: ${plan.dureeSemaines}`);
  if (estInvalide(plan.volumePlafondKm)) erreurs.push(`volumePlafondKm invalide: ${plan.volumePlafondKm}`);

  for (const semaine of plan.semaines ?? []) {
    if (estInvalide(semaine.volumeCibleKm) && semaine.volumeCibleKm !== null) {
      erreurs.push(`Semaine ${semaine.semaineNum} : volumeCibleKm invalide (${semaine.volumeCibleKm})`);
    }
    for (const [jour, seance] of Object.entries(semaine.assignment ?? {})) {
      if (estInvalide(seance.kmEstime) && seance.kmEstime !== null) {
        erreurs.push(`Semaine ${semaine.semaineNum}, jour ${jour} : kmEstime invalide (${seance.kmEstime})`);
      }
    }
  }
  return erreurs;
}

function regleSemainesNonVides(plan) {
  const erreurs = [];
  for (const semaine of plan.semaines ?? []) {
    const jours = Object.keys(semaine.assignment ?? {});
    if (jours.length === 0) {
      erreurs.push(`Semaine ${semaine.semaineNum} : assignment vide (aucun jour)`);
    }
  }
  return erreurs;
}

function regleAucuneQualiteConsecutive(plan) {
  const erreurs = [];
  for (const semaine of plan.semaines ?? []) {
    const joursQualite = Object.entries(semaine.assignment ?? {})
      .filter(([, s]) => s.type === 'qualite')
      .map(([j]) => Number(j))
      .sort((a, b) => a - b);
    for (let i = 1; i < joursQualite.length; i++) {
      if (joursQualite[i] - joursQualite[i - 1] === 1) {
        erreurs.push(`Semaine ${semaine.semaineNum} : séances qualité consécutives (jours ${joursQualite[i - 1]} et ${joursQualite[i]})`);
      }
    }
  }
  return erreurs;
}

function regleAlluresCoherentes(plan) {
  // Ordre attendu du système Daniels : E plus lent que M, plus lent que T,
  // plus lent que I, plus lent que R (allure en sec/km : E a la valeur la
  // PLUS ÉLEVÉE, R la plus faible). Vérifié seulement si allures présentes
  // (absent pour un plan Mode Forme en attente de test, cf. enAttenteTest).
  const erreurs = [];
  if (!plan.allures) return erreurs;

  const parseAllureEnSecPerKm = (str) => {
    // format attendu type "5:30" (min:sec par km)
    if (typeof str !== 'string' || !str.includes(':')) return null;
    const [min, sec] = str.split(':').map(Number);
    if (Number.isNaN(min) || Number.isNaN(sec)) return null;
    return min * 60 + sec;
  };

  const ordreAttendu = ['E', 'M', 'T', 'I', 'R'];
  const valeurs = ordreAttendu.map(k => ({ k, v: parseAllureEnSecPerKm(plan.allures[k]) })).filter(o => o.v !== null);

  for (let i = 1; i < valeurs.length; i++) {
    if (valeurs[i].v >= valeurs[i - 1].v) {
      erreurs.push(`Allure ${valeurs[i].k} (${plan.allures[valeurs[i].k]}) devrait être plus rapide que ${valeurs[i - 1].k} (${plan.allures[valeurs[i - 1].k]})`);
    }
  }
  return erreurs;
}

function regleDerniereSemaineContientCourse(plan) {
  // Ne s'applique pas à un plan Mode Forme (pas de dateCourse à proprement
  // parler dans ce contexte de test — generatePlan() seul ne sait pas
  // distinguer Mode Forme de plan course, ce champ est ajouté après coup
  // par l'appelant, cf. index.html ESTMODEFORME). On vérifie seulement
  // quand dateCourse est fourni.
  const erreurs = [];
  if (!plan.dateCourse) return erreurs;

  const derniereSemaine = (plan.semaines ?? [])[plan.semaines.length - 1];
  if (!derniereSemaine) return erreurs;

  const contientRace = Object.values(derniereSemaine.assignment ?? {}).some(s => s.type === 'race');
  if (!contientRace) {
    erreurs.push(`Dernière semaine (${derniereSemaine.semaineNum}) ne contient aucune séance de type 'race' alors que dateCourse est définie`);
  }
  return erreurs;
}

const REGLES = [
  { nom: 'Valeurs numériques valides', fn: regleValeursNumeriquesValides },
  { nom: 'Semaines non vides', fn: regleSemainesNonVides },
  { nom: 'Aucune qualité consécutive', fn: regleAucuneQualiteConsecutive },
  { nom: 'Allures cohérentes (E>M>T>I>R)', fn: regleAlluresCoherentes },
  { nom: 'Dernière semaine contient la course', fn: regleDerniereSemaineContientCourse },
];

// ---------------------------------------------------------------------
// 10 PROFILS — cas connus comme sensibles (bugs déjà rencontrés,
// combinaisons limites documentées dans l'inventaire)
// ---------------------------------------------------------------------

const PROFILS = [
  {
    nom: '1. Grand débutant (Mode Forme marche-course)',
    // CORRIGÉ (24/07/2026) : mon premier essai appelait generatePlan()
    // (plan-generator.js) avec niveau='grand-debutant' + dateCourse — un
    // cas qui n'existe jamais en usage réel. index.html (§17.9, ligne
    // ~7795) documente explicitement qu'un profil grand-débutant ne peut
    // déclencher QUE le flux Mode Forme marche-course
    // (generatePlanForme → generatePlanFormeMarcheCourse en interne,
    // plan-forme.js). PLAFONDS_VOLUME (plan-generator.js) n'a d'ailleurs
    // aucune entrée 'grand-debutant', confirmant que ce niveau n'a jamais
    // été prévu pour passer par computeVolumeProgression() — mon profil
    // de test initial se basait sur une hypothèse fausse, pas un vrai bug
    // applicatif.
    generer: () => generatePlanForme(
      { niveau: 'grand-debutant', joursDisponiblesHabituels: [1, 3, 5], renforcementMusculaire: false, fcMaxConnue: null, palierMarcheCourse: 0 },
      { dateDebut: '2026-08-01', nbSemainesBloc: 4 }
    ),
  },
  {
    nom: '2. Débutant, profil minimal (sans FC)',
    generer: () => generatePlan(
      { niveau: 'debutant', joursDisponiblesHabituels: [1, 2, 4, 6], renforcementMusculaire: false, fcMaxConnue: null },
      { distance: '10K', refDistance: '10K', tempsReference: '55:00', objectif: '50:00', dateDebut: '2026-08-01', dateCourse: '2026-11-01', volumeActuel: 15, contraintesPonctuelles: [] }
    ),
  },
  {
    nom: '3. Intermédiaire, semi, profil complet',
    generer: () => generatePlan(
      { niveau: 'intermediaire', joursDisponiblesHabituels: [1, 2, 3, 4, 5, 6], renforcementMusculaire: true, fcMaxConnue: 185, anneeNaissance: 1990 },
      { distance: 'Semi', refDistance: '10K', tempsReference: '48:00', objectif: '1:45:00', dateDebut: '2026-08-01', dateCourse: '2026-12-01', volumeActuel: 35, contraintesPonctuelles: [] }
    ),
  },
  {
    nom: '4. Confirmé, marathon, contraintes ponctuelles',
    generer: () => generatePlan(
      { niveau: 'confirme', joursDisponiblesHabituels: [1, 2, 3, 4, 5, 6, 0], renforcementMusculaire: true, fcMaxConnue: 190, anneeNaissance: 1985 },
      { distance: 'Marathon', refDistance: 'Semi', tempsReference: '1:35:00', objectif: '3:15:00', dateDebut: '2026-08-01', dateCourse: '2027-01-15', volumeActuel: 60, contraintesPonctuelles: [{ type: 'voyage', dateDebut: '2026-09-01', dateFin: '2026-09-07' }] }
    ),
  },
  {
    nom: '5. Mode Forme via test semi-Cooper',
    // CORRIGÉ (24/07/2026) : generatePlanAvecTestSemiCooper (utilisé dans
    // mon premier essai) vient de plan-generator.js — c'est le flux pour
    // un plan COURSE en attente de référence, pas Mode Forme. Le vrai
    // équivalent Mode Forme est generatePlanFormeAvecTest/
    // completerBlocApresTest (plan-forme.js), avec sa propre fonction
    // estimerReferenceDepuisSemiCooper (légèrement différente de celle de
    // plan-generator.js, donc importée sous un alias distinct).
    generer: () => {
      const planPartiel = generatePlanFormeAvecTest(
        { niveau: 'intermediaire', joursDisponiblesHabituels: [1, 2, 3, 4, 5], renforcementMusculaire: true, fcMaxConnue: 182, volumeActuel: 20 },
        { dateDebut: '2026-08-01', nbSemainesBloc: 4, accent: 'polyvalent' }
      );
      const resultatTest = estimerReferenceDepuisSemiCooperForme(1400);
      return completerBlocApresTest(planPartiel, planPartiel.profilOrigine, resultatTest);
    },
  },
  {
    nom: '6. Plan course, date très proche (3 semaines)',
    generer: () => generatePlan(
      { niveau: 'intermediaire', joursDisponiblesHabituels: [1, 2, 3, 4, 5, 6], renforcementMusculaire: true, fcMaxConnue: 183 },
      { distance: '10K', refDistance: '10K', tempsReference: '48:00', objectif: '47:00', dateDebut: '2026-08-01', dateCourse: '2026-08-22', volumeActuel: 40, contraintesPonctuelles: [] }
    ),
  },
  {
    nom: '7. Plan course, date lointaine (7 mois)',
    generer: () => generatePlan(
      { niveau: 'intermediaire', joursDisponiblesHabituels: [1, 2, 3, 4, 5, 6], renforcementMusculaire: true, fcMaxConnue: 183 },
      { distance: 'Marathon', refDistance: '10K', tempsReference: '48:00', objectif: '3:30:00', dateDebut: '2026-08-01', dateCourse: '2027-03-01', volumeActuel: 30, contraintesPonctuelles: [] }
    ),
  },
  {
    nom: '8. Changement de niveau en cours (grand-débutant → debutant)',
    // CORRIGÉ (24/07/2026) : mêmes raisons que le profil 1 — grand-débutant
    // ne passe jamais par generatePlan() (plan-generator.js), seulement
    // par generatePlanForme() (plan-forme.js). Simule un changement de
    // palier réaliste (fin d'un bloc marche-course, passage à un vrai
    // bloc Mode Forme classique) : ne teste pas changerPalierGrandDebutant
    // elle-même (logique applicative dans index.html, hors du moteur pur
    // testable ici) — teste seulement que les deux fonctions restent
    // cohérentes enchaînées avec des niveaux différents pour un même
    // profil de base.
    generer: () => {
      const planInitial = generatePlanForme(
        { niveau: 'grand-debutant', joursDisponiblesHabituels: [1, 3, 5], renforcementMusculaire: false, fcMaxConnue: null, palierMarcheCourse: 0 },
        { dateDebut: '2026-08-01', nbSemainesBloc: 4 }
      );
      const planApresChangement = generatePlanForme(
        { niveau: 'debutant', joursDisponiblesHabituels: [1, 2, 3, 5], renforcementMusculaire: false, fcMaxConnue: null },
        { dateDebut: '2026-09-01', nbSemainesBloc: 4, tempsReference: '32:00', refDistance: '5K', volumeActuel: 12 }
      );
      if (!planInitial || !planApresChangement) throw new Error('Un des deux plans du changement de niveau est vide');
      return planApresChangement;
    },
  },
  {
    nom: '9. Profil incomplet extrême (aucune FC, refDistance différent)',
    generer: () => generatePlan(
      { niveau: 'debutant', joursDisponiblesHabituels: [2, 4], renforcementMusculaire: false, fcMaxConnue: null, anneeNaissance: null },
      { distance: 'Semi', refDistance: '5K', tempsReference: '28:00', objectif: '2:00:00', dateDebut: '2026-08-01', dateCourse: '2026-12-15', volumeActuel: 10, contraintesPonctuelles: [] }
    ),
  },
  {
    nom: '10. Contraintes ponctuelles + reprise après coupure',
    generer: () => generatePlan(
      { niveau: 'intermediaire', joursDisponiblesHabituels: [1, 2, 3, 4, 5, 6], renforcementMusculaire: true, fcMaxConnue: 180 },
      { distance: '10K', refDistance: '10K', tempsReference: '52:00', objectif: '49:00', dateDebut: '2026-08-01', dateCourse: '2026-11-15', volumeActuel: 20, repriseDuree: 3, contraintesPonctuelles: [{ type: 'blessure', dateDebut: '2026-09-15', dateFin: '2026-09-29' }] }
    ),
  },
];

// ---------------------------------------------------------------------
// EXÉCUTION
// ---------------------------------------------------------------------

function resumerPlan(plan) {
  const nbSemaines = plan.semaines?.length ?? 0;
  const volumeMax = Math.max(0, ...(plan.semaines ?? []).map(s => s.volumeCibleKm ?? 0));
  return { nbSemaines, volumeMax: volumeMax ? `${volumeMax.toFixed(1)} km` : '-' };
}

function main() {
  const resultats = [];

  for (const profil of PROFILS) {
    let plan = null;
    let erreurFatale = null;
    try {
      plan = profil.generer();
    } catch (e) {
      erreurFatale = e;
    }

    if (erreurFatale) {
      resultats.push({ nom: profil.nom, statut: 'FAIL', erreurs: [`Exception : ${erreurFatale.message}`], resume: null });
      continue;
    }

    // Refus volontaire du moteur (24/07/2026, cf. VOLUME_JOURS_INCOMPATIBLE
    // dans plan-generator.js) — le moteur a détecté une combinaison
    // jours/volume structurellement incompatible et a choisi de ne pas
    // générer de plan plutôt que d'en produire un avec des séances sans
    // substance. C'est un comportement voulu, pas une erreur : statut
    // distinct 'REFUSÉ', ni OK ni FAIL.
    if (plan?.planInvalide) {
      resultats.push({ nom: profil.nom, statut: 'REFUSÉ', erreurs: [plan.message ?? plan.code], resume: null });
      continue;
    }

    const erreurs = REGLES.flatMap(regle => regle.fn(plan).map(msg => `[${regle.nom}] ${msg}`));
    resultats.push({
      nom: profil.nom,
      statut: erreurs.length === 0 ? 'OK' : 'FAIL',
      erreurs,
      resume: resumerPlan(plan),
    });
  }

  // --- Tableau récapitulatif ---
  console.log('\n=== Résumé ===\n');
  const largeurNom = Math.max(...resultats.map(r => r.nom.length), 20);
  console.log(
    'Profil'.padEnd(largeurNom) + ' | Statut  | Semaines | Volume max | Erreurs'
  );
  console.log('-'.repeat(largeurNom + 46));
  for (const r of resultats) {
    const statutAffiche = r.statut === 'OK' ? '✅ OK   ' : r.statut === 'REFUSÉ' ? '🚫 REFUS' : '❌ FAIL ';
    const semaines = r.resume ? String(r.resume.nbSemaines).padEnd(8) : '-'.padEnd(8);
    const volume = r.resume ? r.resume.volumeMax.padEnd(10) : '-'.padEnd(10);
    const erreurResume = r.erreurs.length > 0 ? `${r.erreurs.length} erreur(s)` : '-';
    console.log(`${r.nom.padEnd(largeurNom)} | ${statutAffiche} | ${semaines} | ${volume} | ${erreurResume}`);
  }

  // --- Détail des échecs ET des refus (utile pour vérifier le message) ---
  const echecs = resultats.filter(r => r.statut === 'FAIL');
  const refus = resultats.filter(r => r.statut === 'REFUSÉ');
  if (echecs.length > 0) {
    console.log('\n=== Détail des échecs ===\n');
    for (const r of echecs) {
      console.log(`--- ${r.nom} ---`);
      for (const err of r.erreurs) console.log(`  • ${err}`);
      console.log('');
    }
  }
  if (refus.length > 0) {
    console.log('\n=== Détail des refus volontaires du moteur ===\n');
    for (const r of refus) {
      console.log(`--- ${r.nom} ---`);
      for (const err of r.erreurs) console.log(`  • ${err}`);
      console.log('');
    }
  }

  console.log(`\n${resultats.length - echecs.length - refus.length}/${resultats.length} profils OK` +
    (refus.length > 0 ? ` (+ ${refus.length} refusé(s) volontairement par le moteur)` : '') + `.\n`);
  process.exit(echecs.length > 0 ? 1 : 0);
}

main();
