import { injecterRepereRessenti, injecterProgressionRelative, NOTES_RESSENTI } from './plan-generator.js';

function creerSemaine(semaineNum, assignment) {
  return { semaineNum, phase: 'Construction', assignment };
}

console.log('--- Test 1 : ressenti sur famille seuil ---');
{
  const semaines = [creerSemaine(1, { 2: { type: 'qualite', sousType: 'seuil-court', contenu: 'Séance seuil' } })];
  injecterRepereRessenti(semaines);
  const ok = NOTES_RESSENTI['seuil'].some(v => semaines[0].assignment[2].contenu.includes(v));
  console.log('Note ressenti seuil présente :', ok ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 2 : ressenti absent sur allure-course (pas de banque définie) ---');
{
  const semaines = [creerSemaine(1, { 2: { type: 'qualite', sousType: 'allure-course', contenu: 'Séance allure' } })];
  injecterRepereRessenti(semaines);
  const inchange = semaines[0].assignment[2].contenu === 'Séance allure';
  console.log('Contenu inchangé (pas de banque ressenti pour allure-course) :', inchange ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 3 : progression relative, bug historique corrigé ---');
console.log('(reproduit le bug trouvé le 6 juillet 2026 : le pointeur "dernière occurrence"');
console.log(' glissait à chaque semaine, empêchant tout match avec écart >= 3 semaines)');
{
  // 5 semaines, même famille (seuil), même kmEstime à chaque fois (cas le
  // plus favorable à un match) — le bug faisait que ça ne matchait JAMAIS,
  // peu importe l'identité du volume, car la comparaison se faisait
  // toujours contre la semaine immédiatement précédente (écart de 1, jamais
  // >= 3)
  const semaines = [1, 2, 3, 4, 5].map(n =>
    creerSemaine(n, { 2: { type: 'qualite', sousType: 'seuil-court', contenu: `Séance seuil S${n}`, kmEstime: 8 } })
  );
  injecterProgressionRelative(semaines);
  const s4MatchS1 = semaines[3].assignment[2].contenu.includes('Volume similaire à S1');
  const s5MatchS2 = semaines[4].assignment[2].contenu.includes('Volume similaire à S2');
  console.log('S4 matche S1 (écart 3 semaines, volume identique) :', s4MatchS1 ? 'OK' : 'ÉCHEC');
  console.log('S5 matche S2 (écart 3 semaines, pas S4 à écart 1) :', s5MatchS2 ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 4 : pas de match si écart < 3 semaines, même volume identique ---');
{
  const semaines = [1, 2].map(n =>
    creerSemaine(n, { 2: { type: 'qualite', sousType: 'seuil-court', contenu: `Séance seuil S${n}`, kmEstime: 8 } })
  );
  injecterProgressionRelative(semaines);
  const inchange = !semaines[1].assignment[2].contenu.includes('Volume similaire');
  console.log('Pas de note (écart de 1 semaine seulement) :', inchange ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 5 : pas de match si volume trop différent, même écart suffisant ---');
{
  const semaines = [
    creerSemaine(1, { 2: { type: 'qualite', sousType: 'seuil-court', contenu: 'Séance seuil S1', kmEstime: 5 } }),
    creerSemaine(2, { 2: { type: 'qualite', sousType: 'seuil-court', contenu: 'Séance seuil S2', kmEstime: 5.2 } }),
    creerSemaine(3, { 2: { type: 'qualite', sousType: 'seuil-court', contenu: 'Séance seuil S3', kmEstime: 5.3 } }),
    creerSemaine(4, { 2: { type: 'qualite', sousType: 'seuil-court', contenu: 'Séance seuil S4', kmEstime: 9 } }), // +80% vs S1
  ];
  injecterProgressionRelative(semaines);
  const inchange = !semaines[3].assignment[2].contenu.includes('Volume similaire');
  console.log('Pas de note (volume trop différent malgré écart suffisant) :', inchange ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 6 : familles différentes ne se comparent jamais entre elles ---');
{
  const semaines = [
    creerSemaine(1, { 2: { type: 'qualite', sousType: 'seuil-court', contenu: 'Séance seuil', kmEstime: 8 } }),
    creerSemaine(2, { 2: {} }),
    creerSemaine(3, { 2: {} }),
    creerSemaine(4, { 2: { type: 'qualite', sousType: 'i-30-30', contenu: 'Séance VMA', kmEstime: 8 } }), // même km, famille différente
  ];
  injecterProgressionRelative(semaines);
  const inchange = !semaines[3].assignment[2].contenu.includes('Volume similaire');
  console.log('Pas de note (familles différentes, seuil vs vma) :', inchange ? 'OK' : 'ÉCHEC');
}
