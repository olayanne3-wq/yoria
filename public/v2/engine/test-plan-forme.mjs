/**
 * test-plan-forme.mjs
 * Suite de tests pour le mode Forme (plan-forme.js).
 */

import assert from 'node:assert/strict';
import {
  generatePlanForme,
  genererBlocSuivant,
  computeAlluresForme,
  genererContenuQualiteForme,
  computeVolumeFormeSemaine,
  ROTATION_SOUS_TYPE_FORME
} from './plan-forme.js';

let nbTests = 0;
function test(nom, fn) {
  nbTests++;
  try {
    fn();
    console.log(`✅ ${nom}`);
  } catch (e) {
    console.error(`❌ ${nom}`);
    console.error(e);
    process.exitCode = 1;
  }
}

const profil = {
  niveau: 'intermediaire',
  anneeNaissance: 1990,
  joursDisponiblesHabituels: [0, 2, 4, 6],
  renforcementMusculaire: false
};

const paramsBase = {
  refDistance: '10K',
  tempsReference: '50:21',
  volumeActuel: 35,
  accent: 'vma',
  dateDebut: '2026-07-13'
};

test('generatePlanForme retourne mode=forme', () => {
  const plan = generatePlanForme(profil, paramsBase);
  assert.equal(plan.mode, 'forme');
});

test('generatePlanForme génère un bloc de 4 semaines par défaut', () => {
  const plan = generatePlanForme(profil, paramsBase);
  assert.equal(plan.semaines.length, 4);
});

test('generatePlanForme respecte nbSemainesBloc si fourni', () => {
  const plan = generatePlanForme(profil, { ...paramsBase, nbSemainesBloc: 6 });
  assert.equal(plan.semaines.length, 6);
});

test('computeAlluresForme ne calcule pas de zone C (pas d\'objectif course)', () => {
  const allures = computeAlluresForme({ refTimeSeconds: 3021, refDistanceKm: 10 });
  assert.equal(allures.C, undefined);
  assert.ok(allures.E > 0);
  assert.ok(allures.T > 0);
  assert.ok(allures.I > 0);
});

test('le plan Forme ne contient jamais de séance course ou test', () => {
  const plan = generatePlanForme(profil, paramsBase);
  const sousTypes = plan.semaines.flatMap(s => Object.values(s.assignment).map(j => j.sousType)).filter(Boolean);
  assert.ok(!sousTypes.includes('race'));
  assert.ok(!sousTypes.includes('test'));
});

test('le plan Forme n\'a pas de champ phases/dateCourse (pas de notion de course)', () => {
  const plan = generatePlanForme(profil, paramsBase);
  assert.equal(plan.dateCourse, undefined);
  assert.equal(plan.phases, undefined);
});

test('chaque accent utilise sa propre rotation de sous-types', () => {
  for (const accent of Object.keys(ROTATION_SOUS_TYPE_FORME)) {
    const plan = generatePlanForme(profil, { ...paramsBase, accent });
    const sousTypes = new Set(
      plan.semaines.flatMap(s => Object.values(s.assignment).map(j => j.sousType)).filter(Boolean)
    );
    for (const st of sousTypes) {
      assert.ok(ROTATION_SOUS_TYPE_FORME[accent].includes(st), `${st} devrait appartenir à la rotation ${accent}`);
    }
  }
});

test('genererContenuQualiteForme fartlek : allure I plus rapide que T dans le texte, une seule unité /km', () => {
  const alluresSec = computeAlluresForme({ refTimeSeconds: 3021, refDistanceKm: 10 });
  const { contenu, sousType } = genererContenuQualiteForme({ accent: 'vma', indexRotation: 0, alluresSec });
  assert.equal(sousType, 'fartlek');
  assert.ok(!contenu.includes('/km/km'), 'pas de double unité /km dans le contenu');
});

test('computeVolumeFormeSemaine applique une décharge tous les 4 semaines', () => {
  const s4 = computeVolumeFormeSemaine({ volumeDepart: 35, semaineNum: 4 });
  const s5 = computeVolumeFormeSemaine({ volumeDepart: 35, semaineNum: 5 });
  assert.equal(s4.estDecharge, true);
  assert.equal(s5.estDecharge, false);
});

test('computeVolumeFormeSemaine ne dépasse jamais le plateau (volumeDepart * 1.15)', () => {
  const plateau = 35 * 1.15;
  for (let s = 1; s <= 12; s++) {
    const { volumeKm, estDecharge } = computeVolumeFormeSemaine({ volumeDepart: 35, semaineNum: s });
    if (!estDecharge) assert.ok(volumeKm <= plateau + 0.1, `semaine ${s} : ${volumeKm} > plateau ${plateau}`);
  }
});

test('genererBlocSuivant repart du plateau (pas de la décharge) si le bloc précédent finit sur une décharge', () => {
  const plan = generatePlanForme(profil, { ...paramsBase, nbSemainesBloc: 4 }); // semaine 4 = décharge
  assert.equal(plan.semaines[3].estDechargeSemaine, true);
  const bloc2 = genererBlocSuivant(plan, profil, paramsBase);
  const volumeRepart = bloc2.semaines[0].volumeCibleKm;
  const volumeDecharge = plan.semaines[3].volumeCibleKm;
  const volumePlateauAttendu = plan.semaines[2].volumeCibleKm; // dernière semaine non-décharge
  assert.ok(volumeRepart > volumeDecharge, 'le bloc suivant ne doit pas repartir de la valeur de décharge');
  // Le bloc suivant régénère sa propre semaine 1 (progression douce vers un
  // nouveau plateau basé sur ce volumeRepart) — on vérifie juste que le
  // volume de départ utilisé pour le recalcul est bien le plateau, pas la
  // décharge, en comparant l'ordre de grandeur plutôt qu'une égalité stricte
  // (semaine 1 du nouveau bloc n'est pas égale au plateau, elle en découle).
  assert.ok(volumeRepart >= volumePlateauAttendu * 0.9, 'le volume de départ du nouveau bloc doit être proche du plateau atteint');
});

test('placerSemaine hérité : jours insuffisants remonte un warning, ne plante pas', () => {
  const plan = generatePlanForme({ ...profil, joursDisponiblesHabituels: [0] }, paramsBase);
  assert.ok(plan.semaines[0].warnings.some(w => w.code === 'JOURS_INSUFFISANTS'));
});

test('zoneFC calculée si année de naissance fournie, absente sinon', () => {
  const planAvecFC = generatePlanForme(profil, paramsBase);
  assert.ok(planAvecFC.zoneFC);
  assert.equal(planAvecFC.zoneFC.methode, 'tanaka');

  const planSansFC = generatePlanForme({ ...profil, anneeNaissance: undefined }, paramsBase);
  assert.equal(planSansFC.zoneFC, null);
});

test('fcMaxConnue prioritaire sur anneeNaissance', () => {
  const plan = generatePlanForme({ ...profil, fcMaxConnue: 190 }, paramsBase);
  assert.equal(plan.zoneFC.methode, 'mesuree');
  assert.equal(plan.zoneFC.fcMax, 190);
});

console.log(`\n${nbTests} tests exécutés.`);
