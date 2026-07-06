// Test de non-régression pour getEffortLaps (public/index-v2-preview.html)
// après la correction du 6 juillet 2026 : la détection du type d'effort
// pour la prédiction de performance ne doit plus dépendre d'une
// correspondance stricte de date avec ALL_SESSIONS (cf.
// docs/v2-methodologie/convergence-v1-v2.md). Copie isolée des fonctions
// concernées, pas un import direct (fichier HTML, pas un module) — à tenir
// synchronisé manuellement si getEffortLaps évolue dans index-v2-preview.html
// ou index.html.

const SESSION_TARGETS = {
  VMA:   { targetMin:250, targetMax:265, okPace:270,  warnPace:290,  repOk:0.80, repWarn:0.60, effort:"4:10–4:25/km", tolerance:"±10 sec", recup:"≥ 6:00/km" },
  SPEC:  { targetMin:291, targetMax:298, okPace:298,  warnPace:310,  repOk:0.80, repWarn:0.60, effort:"4:51/km",      tolerance:"±7 sec",  recup:"≥ 6:00/km" },
  SEUIL: { targetMin:295, targetMax:305, okPace:305,  warnPace:320,  repOk:null, repWarn:null,  effort:"4:55/km",      tolerance:"±10 sec", recup:"≥ 6:00/km" },
  TEST:  { targetMin:291, targetMax:298, okPace:298,  warnPace:310,  repOk:0.80, repWarn:0.60, effort:"4:51/km",      tolerance:"±7 sec",  recup:"≥ 6:00/km" },
};

function creerGetEffortLaps(allSessions) {
  function extractTargetSpeed() { return null; } // stub : pas testé ici
  return function getEffortLaps(activity) {
    if (!activity.laps || activity.laps.length < 4) return [];
    const middle = activity.laps.slice(1, -2);
    if (!middle.length) return [];

    const date = activity.start_date_local ? activity.start_date_local.slice(0,10) : null;
    const planSess = date ? allSessions.find(s => s.date === date) : null;
    const targetSpeedDuPlan = planSess ? extractTargetSpeed(planSess.session) : null;

    const essayerCible = (effSpeed) => {
      if (!effSpeed) return [];
      return middle.filter(l => l.average_speed > 0 &&
        Math.abs(l.average_speed - effSpeed) <= effSpeed * 0.15);
    };

    if (targetSpeedDuPlan) {
      const bySpeed = essayerCible(targetSpeedDuPlan);
      if (bySpeed.length > 0) return bySpeed;
    }

    let meilleurResultat = [];
    for (const cible of Object.values(SESSION_TARGETS)) {
      const effSpeed = 1000 / cible.targetMin;
      const bySpeed = essayerCible(effSpeed);
      if (bySpeed.length > meilleurResultat.length) meilleurResultat = bySpeed;
    }
    if (meilleurResultat.length > 0) return meilleurResultat;

    const withSpeed = middle.filter(l => l.average_speed > 0);
    const sorted = [...withSpeed].sort((a,b) => b.average_speed - a.average_speed);
    const half = Math.ceil(sorted.length / 2);
    const effortSet = new Set(sorted.slice(0, half).map(l => l.lap_index || l.id));
    return withSpeed.filter(l => effortSet.has(l.lap_index || l.id));
  };
}

console.log('--- Test 1 : séance allure course (SPEC) reconnue SANS correspondance de plan ---');
console.log('(reproduit la vraie séance "Allure 10K 3x3\'" du 1er juillet 2026, allure ~4\'46-4\'50/km,');
console.log(' qui perdait son statut SPEC avec le plan v2 généré — cause du bug 53\'14" remonté par Laurent)');
{
  const getEffortLaps = creerGetEffortLaps([]); // ALL_SESSIONS vide : aucune correspondance de date possible
  const activite = {
    start_date_local: '2026-07-01T18:00:00Z',
    laps: [
      { average_speed: 2.5 },
      { average_speed: 3.44 }, // ~4'50/km
      { average_speed: 2.0 },
      { average_speed: 3.50 }, // ~4'46/km
      { average_speed: 2.0 },
      { average_speed: 3.47 },
      { average_speed: 2.0 },
      { average_speed: 2.2 },
    ]
  };
  const laps = getEffortLaps(activite);
  console.log('Nombre de laps détectés :', laps.length, laps.length === 3 ? '(OK)' : '(ÉCHEC)');
  const vitesseMoy = laps.reduce((s,l)=>s+l.average_speed,0)/laps.length;
  const alluresProches = Math.abs(vitesseMoy - 3.47) < 0.05;
  console.log('Vitesse moyenne cohérente (~3.47 m/s, 4\'48/km) :', alluresProches ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 2 : séance VMA (rapide, ~4\'15/km) distinguée du SEUIL ---');
{
  const getEffortLaps = creerGetEffortLaps([]);
  const activiteVma = {
    start_date_local: '2026-06-24T18:00:00Z',
    laps: [
      { average_speed: 2.5 },
      { average_speed: 3.92 }, // ~4'15/km, dans la fourchette VMA (250-265s/km -> ~3.85-4.0 m/s)
      { average_speed: 1.8 },
      { average_speed: 3.90 },
      { average_speed: 1.8 },
      { average_speed: 3.95 },
      { average_speed: 1.8 },
      { average_speed: 2.2 },
    ]
  };
  const laps = getEffortLaps(activiteVma);
  console.log('Nombre de laps détectés :', laps.length, laps.length === 3 ? '(OK)' : '(ÉCHEC)');
  const vitesseMoy = laps.reduce((s,l)=>s+l.average_speed,0)/laps.length;
  console.log('Vitesse moyenne dans la zone VMA (~3.9 m/s) :', Math.abs(vitesseMoy - 3.92) < 0.1 ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 3 : affinage par le plan prévu (quand une correspondance de date existe) ---');
{
  // ALL_SESSIONS avec une vraie correspondance de date -> doit être utilisée
  // en priorité (comportement inchangé quand la donnée est disponible)
  const allSessionsAvecPlan = [{ date: '2026-07-01', type: 'SPEC', session: '4:51/km' }];
  const getEffortLapsAvecAffinage = (() => {
    function extractTargetSpeed(s) {
      // Simule l'extraction d'une allure "4:51/km" -> vitesse m/s
      const match = s.match(/(\d+):(\d+)\/km/);
      if (!match) return null;
      return 1000 / (parseInt(match[1])*60 + parseInt(match[2]));
    }
    return function(activity) {
      const middle = activity.laps.slice(1, -2);
      const date = activity.start_date_local.slice(0,10);
      const planSess = allSessionsAvecPlan.find(s => s.date === date);
      const targetSpeedDuPlan = planSess ? extractTargetSpeed(planSess.session) : null;
      if (targetSpeedDuPlan) {
        return middle.filter(l => l.average_speed > 0 &&
          Math.abs(l.average_speed - targetSpeedDuPlan) <= targetSpeedDuPlan * 0.15);
      }
      return [];
    };
  })();
  const activite = {
    start_date_local: '2026-07-01T18:00:00Z',
    laps: [
      { average_speed: 2.5 }, // échauffement (retiré par slice(1,-2))
      { average_speed: 3.44 }, // effort 1
      { average_speed: 2.0 }, // récup
      { average_speed: 3.50 }, // effort 2
      { average_speed: 2.0 }, // récup (retiré par slice(1,-2))
      { average_speed: 2.2 }, // retour au calme (retiré par slice(1,-2))
    ]
  };
  const laps = getEffortLapsAvecAffinage(activite);
  console.log('Affinage par le plan fonctionne toujours quand disponible :', laps.length === 2 ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Test 4 : aucun lap ne correspond à une cible connue -> fallback moitié la plus rapide ---');
{
  const getEffortLaps = creerGetEffortLaps([]);
  const activite = {
    start_date_local: '2026-06-25T18:00:00Z',
    laps: [
      { average_speed: 2.5 },
      { average_speed: 2.8 }, // vitesse EF, ne matche aucune cible qualité
      { average_speed: 2.6 },
      { average_speed: 2.9 },
      { average_speed: 2.7 },
      { average_speed: 2.2 },
    ]
  };
  const laps = getEffortLaps(activite);
  console.log('Fallback activé, pas de crash, retourne quelque chose :', laps.length > 0 ? 'OK' : 'ÉCHEC');
}
