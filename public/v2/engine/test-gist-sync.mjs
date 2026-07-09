import { getGithubToken, setGithubToken, getV2GistId, setV2GistId, datesChevauchent, trouverPlanEnConflit } from './gist-sync.js';

// --- Mock localStorage minimal ---
function creerStorageMock() {
  const data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
    _dump: () => ({ ...data })
  };
}

console.log('--- getGithubToken / setGithubToken ---');
const storage1 = creerStorageMock();
console.log('Token avant set :', getGithubToken(storage1), '(attendu: "")');
setGithubToken('abc123', storage1);
console.log('Token après set :', getGithubToken(storage1), '(attendu: "abc123")');

console.log('\n--- getV2GistId / setV2GistId ---');
const storage2 = creerStorageMock();
console.log('GistId avant set :', getV2GistId(storage2), '(attendu: "")');
setV2GistId('gist-xyz', storage2);
console.log('GistId après set :', getV2GistId(storage2), '(attendu: "gist-xyz")');

console.log('\n--- Isolation entre storages distincts (pas de fuite globale) ---');
const storageA = creerStorageMock();
const storageB = creerStorageMock();
setGithubToken('token-A', storageA);
setGithubToken('token-B', storageB);
console.log('storageA:', getGithubToken(storageA), '(attendu: "token-A")');
console.log('storageB:', getGithubToken(storageB), '(attendu: "token-B")');

console.log('\n--- chargerPlans sans token ni gistId ---');
// Import dynamique pour tester avec un fetch non défini (ne doit pas planter,
// doit retourner [] avant même d'appeler fetch)
import('./gist-sync.js').then(async ({ chargerPlans }) => {
  const storageVide = creerStorageMock();
  const plans = await chargerPlans(storageVide);
  console.log('Plans (sans token/gistId) :', plans, '(attendu: [])');
});

console.log('\n--- datesChevauchent (section 7ter) ---');
console.log('Chevauchement net (22/06-06/09 vs 01/08-15/10) :', datesChevauchent('2026-06-22','2026-09-06','2026-08-01','2026-10-15'), '(attendu: true)');
console.log('Pas de chevauchement (dates disjointes) :', datesChevauchent('2026-06-22','2026-07-01','2026-08-01','2026-09-01'), '(attendu: false)');
console.log('Bornes qui se touchent exactement (fin A = début B) :', datesChevauchent('2026-06-22','2026-08-01','2026-08-01','2026-09-01'), '(attendu: true, intersection stricte incluant les bornes)');
console.log('Plage B entièrement contenue dans A :', datesChevauchent('2026-01-01','2026-12-31','2026-06-01','2026-06-30'), '(attendu: true)');

console.log('\n--- trouverPlanEnConflit (section 7ter) ---');
{
  const plansExistants = [
    { id: 'plan-1', nom: '10K Gem\'Aubagne', distance: '10K', objectif: '48:30', dateDebut: '2026-06-22', dateCourse: '2026-09-06' },
    { id: 'plan-2', nom: 'Semi octobre', distance: 'Semi', objectif: '1:45:00', dateDebut: '2026-09-15', dateCourse: '2026-10-20' },
  ];
  const conflitTrouve = trouverPlanEnConflit(plansExistants, '2026-10-01', '2026-11-01', 'plan-nouveau');
  console.log('Conflit détecté avec le bon plan :', conflitTrouve?.id === 'plan-2' ? 'OK' : 'ÉCHEC');

  const pasDeConflit = trouverPlanEnConflit(plansExistants, '2026-10-25', '2026-12-01', 'plan-nouveau');
  console.log('Pas de conflit sur une plage libre :', pasDeConflit === null ? 'OK' : 'ÉCHEC');

  // Une mise à jour du plan lui-même (même id) ne doit jamais se voir comme
  // un conflit avec lui-même
  const pasDeConflitAvecSoiMeme = trouverPlanEnConflit(plansExistants, '2026-06-22', '2026-09-06', 'plan-1');
  console.log('Pas de conflit avec soi-même (mise à jour) :', pasDeConflitAvecSoiMeme === null ? 'OK' : 'ÉCHEC');
}

console.log('\n--- getGithubToken lit correctement le format JSON.stringify de save() (v1) ---');
console.log('(bug trouvé le 7 juillet 2026 : Laurent saisit son token via le champ de');
console.log(' Paramètres dans index.html, qui utilise save() -> JSON.stringify(val),');
console.log(' ajoutant des guillemets autour du token ("ghp_..." au lieu de ghp_...).');
console.log(' getGithubToken() lisait la valeur brute sans JSON.parse(), donc le token');
console.log(' réellement transmis à GitHub contenait 2 guillemets en trop -> 401 systématique,');
console.log(' confirmé "never used" côté GitHub malgré un token par ailleurs valide)');
{
  const storage = creerStorageMock();
  // Simule exactement ce qu'écrit save() de index.html : JSON.stringify(val)
  storage.setItem('lk_github_token', JSON.stringify('ghp_exempleFictifPourLeTest0000000000'));
  const token = getGithubToken(storage);
  console.log('Token lu (doit être sans guillemets) :', token);
  console.log('Aucun guillemet dans le résultat :', !token.includes('"') ? 'OK' : 'ÉCHEC');
  console.log('Token exact attendu :', token === 'ghp_exempleFictifPourLeTest0000000000' ? 'OK' : 'ÉCHEC');
}

console.log('\n--- getGithubToken lit toujours correctement le format brut (setGithubToken, v2) ---');
{
  const storage = creerStorageMock();
  setGithubToken('ghp_AutreTokenBrutSansGuillemets123456', storage);
  const token = getGithubToken(storage);
  console.log('Token lu (format brut, non-régression) :', token === 'ghp_AutreTokenBrutSansGuillemets123456' ? 'OK' : 'ÉCHEC');
}

