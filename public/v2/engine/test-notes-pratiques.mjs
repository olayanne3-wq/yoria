import { injecterNotesPratiques, NOTES_PRATIQUES } from './plan-generator.js';

function creerSemaineTest(assignment) {
  return { semaineNum: 1, phase: 'Construction', assignment };
}

console.log('--- Test 1 : sortie longue reçoit une note hydratation ---');
{
  const semaines = [creerSemaineTest({ 6: { type: 'longue', contenu: 'Sortie longue' } })];
  injecterNotesPratiques(semaines);
  const ok = NOTES_PRATIQUES['longue'].some(v => semaines[0].assignment[6].contenu.includes(v));
  console.log('Note longue présente :', ok ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 2 : séance qualité Seuil reçoit une note famille seuil ---');
{
  const semaines = [creerSemaineTest({ 2: { type: 'qualite', sousType: 'seuil-court', contenu: 'Séance seuil' } })];
  injecterNotesPratiques(semaines);
  const ok = NOTES_PRATIQUES['seuil'].some(v => semaines[0].assignment[2].contenu.includes(v));
  console.log('Note seuil présente :', ok ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 3 : séance qualité VMA reçoit une note famille vma ---');
{
  const semaines = [creerSemaineTest({ 4: { type: 'qualite', sousType: 'i-30-30', contenu: 'Séance VMA' } })];
  injecterNotesPratiques(semaines);
  const ok = NOTES_PRATIQUES['vma'].some(v => semaines[0].assignment[4].contenu.includes(v));
  console.log('Note VMA présente :', ok ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 4 : séance qualité "test" ne reçoit aucune note pratique (traité à part, 2.6) ---');
{
  const semaines = [creerSemaineTest({ 2: { type: 'qualite', sousType: 'test', contenu: 'Séance test' } })];
  injecterNotesPratiques(semaines);
  const inchange = semaines[0].assignment[2].contenu === 'Séance test';
  console.log('Contenu inchangé :', inchange ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 5 : séance EF simple ne reçoit aucune note ---');
{
  const semaines = [creerSemaineTest({ 1: { type: 'ef', contenu: 'Séance EF' } })];
  injecterNotesPratiques(semaines);
  const inchange = semaines[0].assignment[1].contenu === 'Séance EF';
  console.log('Contenu inchangé :', inchange ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 6 : séance qualité allure-course reçoit une note famille allure-course ---');
{
  const semaines = [creerSemaineTest({ 2: { type: 'qualite', sousType: 'allure-course', contenu: 'Séance allure course' } })];
  injecterNotesPratiques(semaines);
  const ok = NOTES_PRATIQUES['allure-course'].some(v => semaines[0].assignment[2].contenu.includes(v));
  console.log('Note allure-course présente :', ok ? 'OK' : 'ÉCHEC');
}
