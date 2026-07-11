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

console.log('\n--- Progression VMA i-30-30 (section 2.2, v2.2, décidé le 8 juillet 2026) ---');
console.log('(Laurent a repéré que la séance passait directement de "2 séries de 8" à "3 séries');
console.log(' de 8" — un saut de +50% du volume en une semaine, aucune progression des répétitions');
console.log(' par série. Vérifié contre plusieurs sources : le principe de "surcharge progressive"');
console.log(' impose d\'augmenter UNE seule variable à la fois)');
{
  const paramsLong = { distance: '10K', refDistance: '10K', tempsReference: '50:21', objectif: '48:30', dateDebut: '2026-07-07', dateCourse: '2026-11-01', volumeActuel: 30, contraintesPonctuelles: [] };
  const planLong = generatePlan(profil, paramsLong);
  const apparitionsI3030 = [];
  planLong.semaines.forEach(s => {
    Object.values(s.assignment).forEach(a => {
      if (a.sousType === 'i-30-30') {
        const m = a.contenu.match(/(\d+) séries de (\d+)×30s-30s|(\d+)×30s-30s/);
        const series = m ? (m[1] ? parseInt(m[1]) : 1) : null;
        const reps = m ? parseInt(m[2] || m[3]) : null;
        apparitionsI3030.push({ semaine: s.semaineNum, series, reps, total: series*reps, decharge: s.estDechargeSemaine });
      }
    });
  });
  console.log('Apparitions i-30-30 :', apparitionsI3030.map(a => `S${a.semaine}${a.decharge?'(D)':''}: ${a.series}×${a.reps} (${a.total})`).join(', '));

  // Vérifie qu'aucun saut de plus de 30% du total ne se produit d'une
  // apparition à l'autre — hors transitions impliquant une décharge (avant
  // ou après), qui réduisent/rétablissent volontairement le volume et ne
  // sont pas concernées par la logique de progression elle-même
  let progressionDouce = true;
  for (let i = 1; i < apparitionsI3030.length; i++) {
    if (apparitionsI3030[i-1].decharge || apparitionsI3030[i].decharge) continue; // transition avec décharge, pas concernée
    const avant = apparitionsI3030[i-1].total, apres = apparitionsI3030[i].total;
    if (apres > avant * 1.30) { progressionDouce = false; console.log('Saut détecté entre S'+apparitionsI3030[i-1].semaine+' ('+avant+') et S'+apparitionsI3030[i].semaine+' ('+apres+')'); }
  }
  console.log('Aucun saut brutal (>30%) hors transitions de décharge :', progressionDouce ? 'OK' : 'ÉCHEC');

  // Vérifie que la toute première apparition ne démarre PAS déjà à 8 répétitions
  console.log('Première apparition ne démarre pas au plafond (8 reps) :', apparitionsI3030[0]?.reps < 8 ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Influence du niveau du coureur sur la progression VMA (v2.2, demandé le 11 juillet 2026) ---');
console.log('(Laurent a repéré que profil.niveau n\'avait AUCUNE influence sur les séances qualité —');
console.log(' vérifié contre la littérature : débutants doivent démarrer plus bas et progresser plus');
console.log(' prudemment que les coureurs confirmés)');
{
  const parReps = (contenu) => {
    const m = contenu.match(/(\d+)×30s-30s/);
    return m ? parseInt(m[1]) : null;
  };
  const premiereRepParNiveau = {};
  ['debutant', 'intermediaire', 'confirme'].forEach(niveau => {
    const p = generatePlan({ ...profil, niveau }, params);
    for (const s of p.semaines) {
      const a = Object.values(s.assignment).find(a => a.sousType === 'i-30-30');
      if (a) { premiereRepParNiveau[niveau] = parReps(a.contenu); break; }
    }
  });
  console.log('Première répétition par niveau :', JSON.stringify(premiereRepParNiveau));
  console.log('Débutant < Intermédiaire < Confirmé :',
    (premiereRepParNiveau.debutant < premiereRepParNiveau.intermediaire && premiereRepParNiveau.intermediaire < premiereRepParNiveau.confirme) ? 'OK' : 'ÉCHEC');
}

console.log('\n--- Extension du niveau aux 9 autres sous-types à répétitions/durée simples (11 juillet 2026) ---');
console.log('(seuil-court, seuil, i-3min, vitesse, cotes, allure-course, allure-course-court,');
console.log(' seuil-negatif, tempo-court, seuil-2min — vérifie que débutant < intermédiaire < confirmé');
console.log(' pour chacun, en cherchant sur plusieurs distances pour être sûr de les rencontrer tous)');
{
  const extractPremiereValeur = (sousType, contenu) => {
    if (sousType === 'seuil-negatif') { const m = contenu.match(/EF\) \+ (\d+)min/); return m ? parseInt(m[1]) : null; }
    if (sousType === 'tempo-court') { const m = contenu.match(/(\d+)min continu/); return m ? parseInt(m[1]) : null; }
    const m = contenu.match(/EF\) \+ (\d+)×/);
    return m ? parseInt(m[1]) : null;
  };
  const sousTypesACouvrir = ['seuil-court','seuil','i-3min','vitesse','cotes','allure-course','allure-course-court','seuil-negatif','tempo-court','seuil-2min'];
  const trouves = {};
  ['10K','Semi','Marathon'].forEach(distance => {
    const p2 = { ...params, distance, refDistance:'10K' };
    ['debutant','intermediaire','confirme'].forEach(niveau => {
      const p = generatePlan({ ...profil, niveau }, p2);
      p.semaines.forEach(s => {
        if (s.estDechargeSemaine || s.phase === 'Affutage') return; // exclure les semaines réduites, faussent la comparaison de base
        Object.values(s.assignment).forEach(a => {
          if (sousTypesACouvrir.includes(a.sousType) && !(trouves[a.sousType]?.[niveau])) {
            trouves[a.sousType] = trouves[a.sousType] || {};
            trouves[a.sousType][niveau] = extractPremiereValeur(a.sousType, a.contenu);
          }
        });
      });
    });
  });
  let tousOk = true;
  sousTypesACouvrir.forEach(st => {
    const v = trouves[st];
    if (!v || v.debutant == null || v.intermediaire == null || v.confirme == null) {
      console.log(st + ' : PAS RENCONTRÉ dans les distances testées (ignoré, pas un échec)');
      return;
    }
    const ok = v.debutant < v.intermediaire && v.intermediaire < v.confirme;
    if (!ok) tousOk = false;
    console.log(st + ' : debutant=' + v.debutant + ' intermediaire=' + v.intermediaire + ' confirme=' + v.confirme, ok ? 'OK' : 'ÉCHEC');
  });
  console.log('Tous les sous-types rencontrés respectent debutant < intermediaire < confirme :', tousOk ? 'OK' : 'ÉCHEC');
}
