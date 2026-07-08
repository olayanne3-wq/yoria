import { enrichirSeanceAvecMeteo, recupererPrevisionMeteo, NOTE_CHALEUR } from './weather.js';

function creerStorageMock() {
  const data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; }
  };
}

console.log('--- Test 1 : enrichirSeanceAvecMeteo ajoute la note si alerteChaleur ---');
{
  const seance = { contenu: 'Séance EF' };
  enrichirSeanceAvecMeteo(seance, { disponible: true, alerteChaleur: true, temperatureMaxC: 32 });
  console.log('Note de chaleur ajoutée :', seance.contenu.includes(NOTE_CHALEUR) ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 2 : pas de note si alerteChaleur est false ---');
{
  const seance = { contenu: 'Séance EF' };
  enrichirSeanceAvecMeteo(seance, { disponible: true, alerteChaleur: false, temperatureMaxC: 20 });
  console.log('Contenu inchangé :', seance.contenu === 'Séance EF' ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 3 : pas de note si prévision non disponible ---');
{
  const seance = { contenu: 'Séance EF' };
  enrichirSeanceAvecMeteo(seance, { disponible: false });
  console.log('Contenu inchangé (prévision indisponible) :', seance.contenu === 'Séance EF' ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 4 : séance sans contenu ne plante pas ---');
{
  const seance = {};
  try {
    enrichirSeanceAvecMeteo(seance, { disponible: true, alerteChaleur: true });
    console.log('Pas de crash sur séance sans contenu : OK');
  } catch (e) {
    console.log('Pas de crash sur séance sans contenu : ÉCHEC -', e.message);
  }
}

console.log('\n--- Test 4bis : idempotence — appels multiples ne dupliquent pas la note ---');
console.log('(bug trouvé le 7 juillet 2026, capture d\'écran de Laurent : la note apparaissait');
console.log(' 3 fois d\'affilée dans le contenu d\'une séance, car verifierMeteoSeanceDemain() est');
console.log(' appelée à chaque renderResults() du wizard — 3 régénérations = 3 notes empilées)');
{
  const seance = { contenu: 'Séance EF' };
  const prevision = { disponible: true, alerteChaleur: true, temperatureMaxC: 32 };
  enrichirSeanceAvecMeteo(seance, prevision);
  enrichirSeanceAvecMeteo(seance, prevision);
  enrichirSeanceAvecMeteo(seance, prevision);
  const occurrences = seance.contenu.split(NOTE_CHALEUR).length - 1;
  console.log('Nombre d\'occurrences de la note après 3 appels :', occurrences, occurrences === 1 ? '(OK)' : '(ÉCHEC)');
}

console.log('\n--- Test 5 : recupererPrevisionMeteo utilise le cache si présent ---');
{
  const storage = creerStorageMock();
  const donneesCachees = { disponible: true, alerteChaleur: true, temperatureMaxC: 30 };
  storage.setItem('v2_weather_cache_2026-08-15', JSON.stringify(donneesCachees));

  // Pas de mock de fetch ici : si le cache fonctionne, fetch ne devrait
  // jamais être appelé. On le remplace par une fonction qui lève une
  // erreur si jamais elle est invoquée, pour détecter un appel réseau
  // non voulu.
  const fetchOriginal = global.fetch;
  global.fetch = () => { throw new Error('fetch ne devrait pas être appelé (cache présent)'); };

  const resultat = await recupererPrevisionMeteo({ latitude: 43.1, longitude: 5.9, date: '2026-08-15' }, storage);
  global.fetch = fetchOriginal;

  console.log('Résultat vient du cache :', JSON.stringify(resultat) === JSON.stringify(donneesCachees) ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 6 : recupererPrevisionMeteo retourne une erreur gérée si fetch échoue ---');
{
  const storage = creerStorageMock();
  const fetchOriginal = global.fetch;
  global.fetch = () => { throw new Error('Réseau indisponible'); };

  const resultat = await recupererPrevisionMeteo({ latitude: 43.1, longitude: 5.9, date: '2026-08-15' }, storage);
  global.fetch = fetchOriginal;

  console.log('Erreur gérée sans crash :', resultat.disponible === false && resultat.erreur ? 'OK' : 'ÉCHEC');
}
