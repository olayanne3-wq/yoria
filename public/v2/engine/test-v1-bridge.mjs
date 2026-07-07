import { traduirePlanVersFormatV1, construireAllSessions } from './v1-bridge.js';
import { generatePlan } from './plan-generator.js';

console.log('--- Test 1 : structure globale (11 semaines, dates correctes) ---');
{
  const plan = generatePlan(
    { niveau: 'intermediaire', joursDisponiblesHabituels: [1,2,3,4,5,6], renforcementMusculaire: true },
    { distance: '10K', refDistance: '10K', tempsReference: '50:21', objectif: '48:30', dateDebut: '2026-06-22', dateCourse: '2026-09-06', volumeActuel: 30, contraintesPonctuelles: [] }
  );
  const planV1 = traduirePlanVersFormatV1(plan);
  console.log('Nombre de semaines :', planV1.length, planV1.length === 11 ? '(OK)' : '(ÉCHEC)');
  console.log('Semaine 1, lundi, date correcte (2026-06-22) :', planV1[0].sessions[0].date === '2026-06-22' ? 'OK' : 'ÉCHEC');
  console.log('Dernière semaine, dimanche, date correcte (2026-09-06) :', planV1[10].sessions[6].date === '2026-09-06' ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 2 : mapping des types (SEUIL vs VMA vs SPEC distincts) ---');
{
  const plan = generatePlan(
    { niveau: 'intermediaire', joursDisponiblesHabituels: [1,2,3,4,5,6], renforcementMusculaire: true },
    { distance: '10K', refDistance: '10K', tempsReference: '50:21', objectif: '48:30', dateDebut: '2026-06-22', dateCourse: '2026-09-06', volumeActuel: 30, contraintesPonctuelles: [] }
  );
  const planV1 = traduirePlanVersFormatV1(plan);
  const typesVus = new Set();
  planV1.forEach(s => s.sessions.forEach(sess => typesVus.add(sess.type)));
  console.log('Types rencontrés :', [...typesVus].sort().join(', '));
  const ok = typesVus.has('REPOS') && typesVus.has('EF') && typesVus.has('LONGUE') && typesVus.has('RACE');
  console.log('Types de base présents (REPOS/EF/LONGUE/RACE) :', ok ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 3 : parsing warmup/session/cooldown sur une séance qualité ---');
{
  const plan = generatePlan(
    { niveau: 'intermediaire', joursDisponiblesHabituels: [1,2,3,4,5,6], renforcementMusculaire: true },
    { distance: '10K', refDistance: '10K', tempsReference: '50:21', objectif: '48:30', dateDebut: '2026-06-22', dateCourse: '2026-09-06', volumeActuel: 30, contraintesPonctuelles: [] }
  );
  const planV1 = traduirePlanVersFormatV1(plan);
  const seanceQualite = planV1[0].sessions.find(s => s.type === 'SEUIL' || s.type === 'VMA' || s.type === 'SPEC');
  const ok = seanceQualite && seanceQualite.warmup !== '' && seanceQualite.cooldown !== '' && seanceQualite.session !== '';
  console.log('warmup/session/cooldown tous non-vides sur une séance qualité :', ok ? 'OK' : 'ÉCHEC');
  console.log('Exemple :', JSON.stringify({ warmup: seanceQualite?.warmup, session: seanceQualite?.session, cooldown: seanceQualite?.cooldown }));
}

console.log('\n--- Test 4 : cas du garde-fou J-2 (pas de distance chiffrée dans le contenu) ---');
console.log('(régression testée le 6 juillet 2026 : avant correction, tout le texte');
console.log(' finissait dans session sans notes séparées, pour ce format précis)');
{
  const plan = generatePlan(
    { niveau: 'intermediaire', joursDisponiblesHabituels: [1,2,3,4,5,6], renforcementMusculaire: true },
    { distance: '10K', refDistance: '10K', tempsReference: '50:21', objectif: '48:30', dateDebut: '2026-06-22', dateCourse: '2026-09-06', volumeActuel: 30, contraintesPonctuelles: [] }
  );
  const planV1 = traduirePlanVersFormatV1(plan);
  const derniere = planV1[planV1.length - 1];
  const jourJ2 = derniere.sessions.find(s => s.session.includes('Footing très léger'));
  const ok = jourJ2 && jourJ2.notes !== '' && !jourJ2.session.includes('Hydratation');
  console.log('Notes bien séparées du contenu principal :', ok ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 5 : construireAllSessions produit des uid uniques ---');
{
  const plan = generatePlan(
    { niveau: 'intermediaire', joursDisponiblesHabituels: [1,2,3,4,5,6], renforcementMusculaire: true },
    { distance: '10K', refDistance: '10K', tempsReference: '50:21', objectif: '48:30', dateDebut: '2026-06-22', dateCourse: '2026-09-06', volumeActuel: 30, contraintesPonctuelles: [] }
  );
  const planV1 = traduirePlanVersFormatV1(plan);
  const allSessions = construireAllSessions(planV1);
  const uids = allSessions.map(s => s.uid);
  const uidsUniques = new Set(uids);
  console.log('Nombre total de séances :', allSessions.length, '(attendu: 11 semaines × 7 jours = 77)');
  console.log('Tous les uid sont uniques :', uids.length === uidsUniques.size ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 6 : repli si le contenu ne correspond à aucun pattern connu ---');
{
  // Fixture directe, pas via generatePlan : un contenu totalement inattendu
  const planMinimal = {
    dateDebut: '2026-06-22',
    semaines: [{ semaineNum: 1, phase: 'Construction', assignment: {
      1: { type: 'ef', contenu: 'Un texte complètement différent sans point ni distance' }
    }}]
  };
  const planV1 = traduirePlanVersFormatV1(planMinimal);
  const seance = planV1[0].sessions[1];
  console.log('Repli : contenu brut affiché, pas de crash :', seance.session.includes('complètement différent') ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 7 : kmEstime et volumeCibleKm propagés (bug trouvé le 7 juillet 2026) ---');
console.log("(index.html reparsait le texte des séances avec une regex qui ne gérait pas");
console.log(' les formats "N×Xmin" — ex. "3×6min" comptait comme 6min réels, pas 18min —');
console.log(' sous-comptant fortement les séances qualité, 27km affichés au lieu de 40km');
console.log(' réels pour un volume saisi de 40km. Corrigé en propageant kmEstime/volumeCibleKm,');
console.log(' calculés précisément par le moteur, plutôt que de les reconstruire depuis le texte)');
{
  const plan = generatePlan(
    { niveau: 'intermediaire', joursDisponiblesHabituels: [1,2,3,4,5,6], renforcementMusculaire: true },
    { distance: '10K', refDistance: '10K', tempsReference: '50:21', objectif: '48:30', dateDebut: '2026-07-07', dateCourse: '2026-09-06', volumeActuel: 40, contraintesPonctuelles: [] }
  );
  const planV1 = traduirePlanVersFormatV1(plan);
  const semaine1 = planV1[0];

  console.log('volumeCibleKm de la semaine 1 présent :', semaine1.volumeCibleKm != null ? 'OK' : 'ÉCHEC');
  console.log('volumeCibleKm == 40 (volume saisi) :', semaine1.volumeCibleKm === 40 ? 'OK' : 'ÉCHEC (valeur: ' + semaine1.volumeCibleKm + ')');

  const toutesLesSeancesOntKmEstime = semaine1.sessions.every(s => typeof s.kmEstime === 'number');
  console.log('Toutes les séances ont un kmEstime numérique :', toutesLesSeancesOntKmEstime ? 'OK' : 'ÉCHEC');

  const sommeKmEstime = semaine1.sessions.reduce((s, ses) => s + ses.kmEstime, 0);
  const coherent = Math.abs(sommeKmEstime - semaine1.volumeCibleKm) < 0.5; // tolérance d'arrondi
  console.log('Somme des kmEstime cohérente avec volumeCibleKm :', coherent ? 'OK' : 'ÉCHEC (somme: ' + sommeKmEstime.toFixed(1) + ', cible: ' + semaine1.volumeCibleKm + ')');

  // Reproduit précisément le bug : une séance "3×6min" comptait comme 6min
  // avec l'ancienne regex, alors que kmEstime capture la vraie durée totale
  const seanceQualite = semaine1.sessions.find(s => s.type === 'SEUIL' || s.type === 'VMA' || s.type === 'SPEC');
  if (seanceQualite) {
    console.log('Séance qualité a un kmEstime > 0 (pas juste échauffement/RAC) :', seanceQualite.kmEstime > 2 ? 'OK' : 'ÉCHEC (valeur: ' + seanceQualite.kmEstime + ')');
  }
}
