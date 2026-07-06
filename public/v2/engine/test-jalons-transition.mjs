import { injecterJalonsTransition, JALONS_TRANSITION } from './plan-generator.js';

// --- Fixture minimale : 3 semaines, une par phase, un jour "longue" et un "ef" chacune ---
function creerSemaineTest(semaineNum, phase, options = {}) {
  return {
    semaineNum,
    phase,
    assignment: {
      0: { type: 'repos', contenu: 'Repos' },
      6: { type: 'longue', contenu: 'Sortie longue' },
      ...(options.avecEF ? { 1: { type: 'ef', contenu: 'Séance EF' } } : {})
    }
  };
}

console.log('--- Test 1 : transition Construction -> Specifique ---');
{
  const semaines = [
    creerSemaineTest(1, 'Construction'),
    creerSemaineTest(2, 'Specifique'),
  ];
  injecterJalonsTransition(semaines);
  const notePresente = JALONS_TRANSITION['debut-specifique'].some(v => semaines[1].assignment[0].contenu.includes(v));
  console.log('Note "début spécifique" sur S2 lundi :', notePresente ? 'OK' : 'ÉCHEC');
  console.log('S1 lundi inchangé (pas de note, 1ère semaine) :', semaines[0].assignment[0].contenu === 'Repos' ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 2 : transition vers Affûtage (dernière longue + début affûtage) ---');
{
  const semaines = [
    creerSemaineTest(1, 'Specifique'),
    creerSemaineTest(2, 'Affutage'),
  ];
  injecterJalonsTransition(semaines);
  const noteLongue = JALONS_TRANSITION['derniere-longue-avant-affutage'].some(v => semaines[0].assignment[6].contenu.includes(v));
  const noteDebut = JALONS_TRANSITION['debut-affutage'].some(v => semaines[1].assignment[0].contenu.includes(v));
  console.log('Note "dernière longue avant affûtage" sur S1 dimanche :', noteLongue ? 'OK' : 'ÉCHEC');
  console.log('Note "début affûtage" sur S2 lundi :', noteDebut ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 3 : dernière semaine du plan (notes sur toutes les EF) ---');
{
  const semaines = [
    creerSemaineTest(1, 'Affutage'),
    creerSemaineTest(2, 'Affutage', { avecEF: true }),
  ];
  injecterJalonsTransition(semaines);
  const noteEF = JALONS_TRANSITION['derniere-semaine-avant-course'].some(v => semaines[1].assignment[1].contenu.includes(v));
  console.log('Note "avant course" sur la séance EF de la dernière semaine :', noteEF ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 4 : pas de note si aucune transition (2 semaines même phase) ---');
{
  const semaines = [
    creerSemaineTest(1, 'Construction'),
    creerSemaineTest(2, 'Construction'),
  ];
  const contenuAvant = semaines[1].assignment[0].contenu;
  injecterJalonsTransition(semaines);
  console.log('Pas de note ajoutée (même phase) :', semaines[1].assignment[0].contenu === contenuAvant ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 5 : variété du tirage aléatoire (au moins 2 variantes différentes sur 30 tirages) ---');
{
  const variantesVues = new Set();
  for (let i = 0; i < 30; i++) {
    const semaines = [
      creerSemaineTest(1, 'Construction'),
      creerSemaineTest(2, 'Affutage'),
    ];
    injecterJalonsTransition(semaines);
    variantesVues.add(semaines[1].assignment[0].contenu);
  }
  console.log('Variantes distinctes observées sur 30 tirages :', variantesVues.size, variantesVues.size >= 2 ? '(OK)' : '(ÉCHEC — pas de vraie variété)');
}
