import { generatePlan, regenererStructuresIntervalles } from './plan-generator.js';

const profil = {
  niveau: 'intermediaire',
  joursDisponiblesHabituels: [1,2,3,4,5,6], // Mar-Dim comme le vrai plan
  renforcementMusculaire: true
};

const params = {
  distance: '10K',
  refDistance: '10K',
  tempsReference: '50:21',
  objectif: '48:30',
  dateDebut: '2026-06-22',
  dateCourse: '2026-09-06',
  volumeActuel: 30,
  contraintesPonctuelles: []
};

const plan = generatePlan(profil, params);

console.log('--- Allures calculées ---');
console.log(plan.allures);
console.log('--- Comparaison avec le plan réel ---');
console.log('Réel  : Récup >6:40 | E 6:00-6:20 | Seuil 4:55-5:05 | 10k cible 4:51 | VMA 4:10-4:25');
console.log('Calc  :', `Récup ${plan.allures.recup} | E ${plan.allures.E} | T ${plan.allures.T} | C ${plan.allures.C} | I ${plan.allures.I} | V ${plan.allures.V}`);

console.log('\n--- Phases ---');
console.log('Durée totale (semaines):', plan.dureeSemaines);
console.log('Réel  : Construction 5 / Spécifique(ex-Affûtage) 4 / Affûtage(ex-Pic) ~1.5');
console.log('Calc  :', plan.phases.map(p => `${p.nom} ${p.semaines}sem`).join(' / '));

console.log('\n--- Volume plafond visé ---');
console.log('Plafond calculé (km/sem):', plan.volumePlafondKm);

console.log('\n--- Placement semaine type (hors décharge) ---');
const dayNames = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const sem2 = plan.semaines[1];
for (let i=0;i<7;i++){
  const a = sem2.assignment[i];
  console.log(dayNames[i], ':', a ? a.type + (a.renfo ? ' +renfo' : '') : 'repos');
}
console.log('Réel  : Lun repos | Mar EF | Mer Qualité | Jeu EF | Ven Qualité | Sam EF | Dim Longue');

console.log('\n--- Progression volume (10 premières semaines) ---');
plan.semaines.slice(0,10).forEach(s => console.log(`S${s.semaineNum} [${s.phase}] : ${s.volumeCibleKm}km${s.estDechargeSemaine ? ' (décharge)' : ''}`));

console.log('\n--- Warnings ---');
console.log(plan.warnings.length ? plan.warnings : 'Aucun');

console.log('\n--- regenererStructuresIntervalles (section 2.8, demandé le 8 juillet 2026) ---');
console.log('(ajout rétroactif de structureIntervalles sur un plan déjà existant, sans');
console.log(' toucher au contenu textuel ni au reste du plan — Laurent voulait un effet');
console.log(' rétroactif sur son plan Semi déjà existant plutôt que de le recréer)');
{
  const planPourTest = generatePlan(profil, params);
  planPourTest.paramsOrigine = params;
  planPourTest.profilOrigine = profil;
  // Simule un plan "ancien" : retire structureIntervalles de toutes les séances
  planPourTest.semaines.forEach(s => {
    Object.values(s.assignment).forEach(a => { if (a.structureIntervalles) delete a.structureIntervalles; });
  });
  const contenuAvant = JSON.stringify(planPourTest.semaines.map(s => Object.values(s.assignment).map(a => a.contenu)));

  const nbMisesAJour = regenererStructuresIntervalles(planPourTest);
  console.log('Séances mises à jour :', nbMisesAJour, nbMisesAJour > 0 ? '(OK)' : '(ÉCHEC, attendu > 0)');

  let toutesOntStructure = true;
  planPourTest.semaines.forEach(s => Object.values(s.assignment).forEach(a => {
    if (a.type === 'qualite' && !a.structureIntervalles) toutesOntStructure = false;
  }));
  console.log('Toutes les séances qualité ont une structure :', toutesOntStructure ? 'OK' : 'ÉCHEC');

  const contenuApres = JSON.stringify(planPourTest.semaines.map(s => Object.values(s.assignment).map(a => a.contenu)));
  console.log('Contenu textuel INCHANGÉ (garde-fou) :', contenuAvant === contenuApres ? 'OK' : 'ÉCHEC');

  // Second appel : ne doit rien re-régénérer (déjà présentes)
  const nbSecondAppel = regenererStructuresIntervalles(planPourTest);
  console.log('Second appel idempotent (0 mise à jour) :', nbSecondAppel === 0 ? 'OK' : 'ÉCHEC (valeur: ' + nbSecondAppel + ')');
}
