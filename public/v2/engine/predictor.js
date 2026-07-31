/**
 * predictor.js
 * Prédicteur 10K — extrait de index.html le 31/07/2026 pour réduire la
 * taille du fichier principal (module B du chantier prédicteur, après
 * session-analysis.js).
 *
 * Vrai module ES (pas de script classique) — même principe que badges.js/
 * session-analysis.js (cf. leurs en-têtes pour le détail). Toutes les
 * fonctions ci-dessous sont des calculs PURS : aucune n'orchestre l'UI
 * (pas de render(), pas de mutation de window.__badgesCache__/
 * isRebuilding), aucune n'appelle Supabase directement.
 *
 * Point d'attention structurel : predHistory est un tableau MUTABLE muté
 * en PLACE par predict10K() (push/shift/réaffectation d'un index) — reçu
 * ici par référence depuis l'appelant (index.html), ces mutations en
 * place se répercutent automatiquement sans qu'aucun retour spécial soit
 * nécessaire. En revanche, la RECONSTRUCTION COMPLÈTE de predHistory
 * (rebuildPredHistorySequentielle, qui construit un nouveau tableau) est
 * volontairement restée pure ici : elle RETOURNE le nouveau tableau sans
 * jamais réassigner la variable predHistory elle-même — c'est à
 * l'appelant (le wrapper rebuildPredHistory() resté dans index.html) de
 * faire `predHistory = rebuildPredHistorySequentielle(...)`. Un module ES
 * ne peut pas réassigner une variable `let` du scope appelant à travers un
 * simple paramètre — voir la discussion de conception avant ce chantier.
 *
 * Fonctions volontairement RESTÉES dans index.html (pas dans ce module),
 * car trop couplées à l'orchestration UI/état global pour rester pures :
 * - rebuildPredHistory() : mute isRebuilding/lastRebuildDate, appelle
 *   render(), réassigne predHistory en entier.
 * - verifierEtAppliquerAlluresDynamiques() : mute window.__PLAN_BRUT__.
 *   allures, déclenche un badge, appelle Supabase (LkSync).
 */

// ── Détection de nouvelles données de qualité un jour donné ────────────
// Utilisée à la fois par rebuildPredHistorySequentielle() (reconstruction
// rétroactive) et predict10K() (aujourd'hui) — même fonction partagée,
// pas deux logiques divergentes.
export function aDesNouvellesDonneesQualite(dateStr, allSessions, statuses, stravaActivities, manualPerf) {
  return allSessions.some(s =>
    s.date === dateStr && (s.type==="SEUIL"||s.type==="VMA"||s.type==="SPEC") &&
    statuses[s.uid] && statuses[s.uid]!=="❌" &&
    (stravaActivities.some(a=>(a.type==="Run"||a.sport_type==="Run") && a.start_date_local?.slice(0,10)===dateStr) || manualPerf[s.uid]?.average_speed)
  );
}

// ── Fiabilité du plan pondérée par récence ──────────────────────────────
// Calcule un taux de réussite sur TOUTES les séances (pas seulement les
// séances de qualité — une LONGUE ou EF ratée est un vrai signal de
// fatigue/désengagement qui doit freiner la convergence, même si elle ne
// dit rien sur la vitesse), pondéré par récence : poids décroissant avec
// l'ancienneté sur toute la durée du plan (mémoire longue, mais séances
// récentes plus influentes). Décroissance : demi-vie ≈ 3 semaines (poids
// divisé par 2 tous les 21j).
//
// Recalcule statutEffectif localement PAR RAPPORT À dateStr (pas le champ
// figé calculé par rapport à aujourd'hui) — nécessaire pour la
// reconstruction rétroactive (chaque date passée simulée a son propre
// "aujourd'hui" relatif).
export function fiabilitePlanPonderee(dateStr, allSessions, statuses) {
  const HALF_LIFE_JOURS = 21;
  const seancesPassees = allSessions.filter(s => {
    if (s.date > dateStr) return false;
    const statutBrut = statuses[s.uid];
    const estPasseParRapportADate = s.date < dateStr;
    const statutEffectifADate = (!statutBrut || statutBrut === "—") && estPasseParRapportADate && s.type !== "REPOS"
      ? "😴"
      : (statutBrut || "—");
    return statutEffectifADate !== "—";
  });
  if (!seancesPassees.length) return 1; // pas d'historique : pas de raison de freiner
  let poidsTotal = 0, poidsReussite = 0;
  seancesPassees.forEach(s => {
    const statutBrut = statuses[s.uid];
    const estPasseParRapportADate = s.date < dateStr;
    const st = (!statutBrut || statutBrut === "—") && estPasseParRapportADate && s.type !== "REPOS" ? "😴" : (statutBrut || "—");
    const joursEcart = Math.max(0, (new Date(dateStr) - new Date(s.date)) / 86400000);
    const poids = Math.pow(0.5, joursEcart / HALF_LIFE_JOURS);
    poidsTotal += poids;
    // ✅ = 1 (pleine confiance), ⚠️ = 0.5 (partiel), ❌/😴 = 0 (raté/sauté)
    const score = st === "✅" ? 1 : st === "⚠️" ? 0.5 : 0;
    poidsReussite += poids * score;
  });
  if (!poidsTotal) return 1;
  return poidsReussite / poidsTotal; // 0..1
}

// ── Helper partagé : vitesse moyenne pondérée par durée d'effort ───────────
// Pour un type de séance, calcule la vitesse moyenne pondérée par la durée
// totale d'effort de chaque séance (séances plus longues = plus de poids).
//
// ctx attend : { allSessions, sessionTargets, manualPerf,
// detecterTypeEffortFn, getLapsAffichageFn, distanceEffortStructureFn } —
// detecterTypeEffortFn/getLapsAffichageFn viennent du module
// session-analysis.js (déjà chargé côté index.html), distanceEffortStructureFn
// est une fonction locale au script principal d'index.html.
export function weightedAvgByEffortDuration(sessionType, runs, dateDebutPlan, ctx) {
  // Une activité "appartient" au type sessionType selon deux méthodes,
  // par ordre de priorité :
  // 1. Si une séance du plan existe à cette date avec structureIntervalles
  //    (structure programmée fidèlement sur la montre) ET que son type
  //    correspond à sessionType : source de vérité fiable, pas besoin de
  //    deviner par tolérance de vitesse.
  // 2. Sinon (pas de structure pour cette date, ancien plan), repli sur
  //    l'ancienne détection par tolérance de vitesse (detecterTypeEffort).
  // Dates couvertes par une saisie manuelle : la saisie manuelle prime
  // automatiquement sur Strava pour ces dates-là, sans hiérarchie ni
  // fusion — on exclut donc ici les activités Strava dont la date a une
  // entrée manualPerf, pour éviter tout double comptage dans le poids
  // agrégé.
  const { allSessions, sessionTargets, manualPerf, detecterTypeEffortFn, getLapsAffichageFn, distanceEffortStructureFn } = ctx;
  const datesManuelles = new Set(
    allSessions.filter(sess => sess.type===sessionType && manualPerf[sess.uid]?.average_speed).map(sess => sess.date)
  );
  const sessionRuns = sessionTargets[sessionType] ? runs.filter(r => {
    if (!r.laps || r.laps.length < 4) return false;
    const date = r.start_date_local?.slice(0,10);
    if (datesManuelles.has(date)) return false;
    const planSess = date ? allSessions.find(s => s.date === date) : null;
    if (planSess?.structureIntervalles && planSess.type === sessionType) return true;
    if (planSess?.structureIntervalles) return false; // structure connue mais pour un AUTRE type : pas de repli sur la détection par tolérance, qui pourrait se tromper
    const middle = r.laps.slice(1, -2);
    if (!middle.length) return false;
    const detection = detecterTypeEffortFn(middle);
    return detection && detection.type === sessionType;
  }) : [];

  // Séances du même type validées avec une saisie manuelle (allure
  // renseignée) — injectées comme un "lap virtuel" unique par séance dans
  // le même agrégat pondéré par durée d'effort, à poids strictement égal
  // aux laps Strava (aucune décote).
  const manualSessions = allSessions.filter(sess =>
    sess.type===sessionType && manualPerf[sess.uid]?.average_speed &&
    (!dateDebutPlan || sess.date >= dateDebutPlan)
  );

  if (!sessionRuns.length && !manualSessions.length) return null;

  let totalWeight = 0;
  let weightedSpeed = 0;
  let allLaps = [];

  sessionRuns.forEach(r => {
    const date = r.start_date_local?.slice(0,10);
    const planSess = date ? allSessions.find(s => s.date === date) : null;
    const laps = getLapsAffichageFn(r, planSess?.structureIntervalles);
    if (!laps.length) return;
    const effortDuration = laps.reduce((s,l) => s + l.distance / l.average_speed, 0);
    const avgSpeed = laps.reduce((s,l) => s + l.average_speed, 0) / laps.length;
    weightedSpeed += avgSpeed * effortDuration;
    totalWeight += effortDuration;
    allLaps = allLaps.concat(laps);
  });

  manualSessions.forEach(sess => {
    const mp = manualPerf[sess.uid];
    const distance = mp.distance || distanceEffortStructureFn(sess.structureIntervalles) || 0;
    if (!distance) return; // pas de distance connue : lap virtuel impossible à pondérer, ignoré plutôt que fausser le calcul
    const effortDuration = distance / mp.average_speed;
    weightedSpeed += mp.average_speed * effortDuration;
    totalWeight += effortDuration;
    allLaps.push({ average_speed: mp.average_speed, distance, average_heartrate: mp.average_heartrate||null });
  });

  if (!totalWeight) return null;
  return { speed: weightedSpeed / totalWeight, laps: allLaps, runs: sessionRuns, manualCount: manualSessions.length };
}

// ── Borne brute (mesure physio pure, non lissée) à une date donnée ──────
// Sert de plafond/plancher de tolérance à la convergence progressive dans
// predict10K() et rebuildPredHistorySequentielle(). Réutilise
// weightedAvgByEffortDuration() pour SPEC/SEUIL/VMA, avec la même formule
// de lavendouWeight que predict10K() — seule différence structurelle
// assumée : pas de garde-fou d'exclusion (écart >20% vs référence) ni de
// prise en compte de "séance intensive récente" (non pertinent pour une
// date passée reconstruite rétroactivement).
//
// ctx attend, en plus des champs de weightedAvgByEffortDuration : {
// baseTimeReference, distanceMReference, planBrut, stravaActivities,
// vdotDepuisEffortSousMaximalFn, vitesseDepuisVdotEtDistanceFn }.
export function calculerBorneBruteAtDate(dateStr, ctx) {
  const { baseTimeReference, distanceMReference, planBrut, stravaActivities, vdotDepuisEffortSousMaximalFn, vitesseDepuisVdotEtDistanceFn } = ctx;
  const BASE_TIME = baseTimeReference;
  const dateDebutPlan = planBrut?.dateDebut;
  const runs = stravaActivities.filter(a =>
    (a.type === "Run" || a.sport_type === "Run") &&
    a.start_date_local?.slice(0,10) <= dateStr &&
    (!dateDebutPlan || a.start_date_local?.slice(0,10) >= dateDebutPlan)
  );
  const estimates = [];

  const specData = weightedAvgByEffortDuration("SPEC", runs, dateDebutPlan, ctx);
  if (specData) estimates.push({ value: distanceMReference / specData.speed, weight: 0.45 });

  const seuilData = weightedAvgByEffortDuration("SEUIL", runs, dateDebutPlan, ctx);
  if (seuilData && seuilData.runs.length >= 3) {
    // Formule Daniels-Gilbert : remplace Riegel, structurellement
    // pessimiste sur une allure sous-maximale comme le seuil (cf.
    // commentaire détaillé dans plan-generator.js,
    // vdotDepuisEffortSousMaximal). Le seuil est tenable ~60 minutes en
    // course (Daniels, chapitre 4) : on en déduit un VDOT représentatif,
    // puis la vitesse équivalente sur la distance de référence du plan.
    const vitesseSeuilMMin = seuilData.speed * 60; // m/s → m/min
    const vdotSeuil = vdotDepuisEffortSousMaximalFn(vitesseSeuilMMin, 60);
    const vitesseEquivalente = vitesseDepuisVdotEtDistanceFn(vdotSeuil, distanceMReference);
    const estimationSeuil = distanceMReference / vitesseEquivalente * 60; // m/min → secondes
    estimates.push({ value: estimationSeuil, weight: 0.10 });
  }

  const vmaData = weightedAvgByEffortDuration("VMA", runs, dateDebutPlan, ctx);
  if (vmaData) estimates.push({ value: distanceMReference / (vmaData.speed * 0.87), weight: 0.35 });

  if (estimates.length === 0) return BASE_TIME;

  // Pondération Lavandou (même formule que predict10K(), sans le garde-fou
  // "séance récente" qui n'a pas de sens pour une date passée reconstruite).
  const hasVma = vmaData !== null;
  const hasSpec = specData !== null;
  const hasSeuil = seuilData && seuilData.laps.length > 0;
  const semainesEcoulees = dateDebutPlan
    ? Math.floor((new Date(dateStr) - new Date(dateDebutPlan)) / (7*86400000)) + 1
    : 1;
  const POIDS_DEPART = 0.90, POIDS_PLANCHER = 0.10, DUREE_DECROISSANCE_SEMAINES = 8;
  const progression = Math.min(Math.max((semainesEcoulees - 1) / (DUREE_DECROISSANCE_SEMAINES - 1), 0), 1);
  let lavendouWeight = POIDS_DEPART - progression * (POIDS_DEPART - POIDS_PLANCHER);
  if (!hasVma && !hasSpec && hasSeuil) lavendouWeight = Math.max(lavendouWeight, 0.70);
  if (!hasVma && !hasSpec && !hasSeuil) lavendouWeight = 1.00;

  const totalWeight = estimates.reduce((s,e) => s+e.weight, 0);
  const weighted = estimates.reduce((s,e) => s+e.value*e.weight, 0) / totalWeight;
  return Math.round(BASE_TIME * lavendouWeight + weighted * (1 - lavendouWeight));
}

// ── Convergence rejouée séquentiellement (rétroactif) ────────────────────
// Applique le même pas de convergence que predict10K() mais jour par jour,
// dans l'ordre chronologique, en partant de BASE_TIME_REFERENCE —
// nécessaire car la convergence dépend de la veille (departConvergence),
// impossible à calculer une date isolée sans rejouer toute la séquence
// depuis le début.
//
// RETOURNE le nouveau tableau, ne mute JAMAIS predHistory lui-même — cf.
// en-tête de ce fichier. L'appelant (rebuildPredHistory() dans index.html)
// est responsable de la réassignation `predHistory = résultat`.
//
// ctx attend, en plus des champs de calculerBorneBruteAtDate : {
// allSessions, statuses, manualPerf, predictorVersion, phaseAtDateFn }.
export function rebuildPredHistorySequentielle(startDate, endDate, ctx) {
  const { baseTimeReference, allSessions, statuses, stravaActivities, manualPerf, predictorVersion, planBrut, phaseAtDateFn } = ctx;
  const PAS_CONVERGENCE_BASE = 0.15;
  const newHistory = [];
  let estimateCourante = baseTimeReference;
  let d = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  while (d <= end) {
    const dateStr = d.toISOString().slice(0,10);
    const borneBrute = calculerBorneBruteAtDate(dateStr, ctx);
    const fiabilite = fiabilitePlanPonderee(dateStr, allSessions, statuses);
    if (aDesNouvellesDonneesQualite(dateStr, allSessions, statuses, stravaActivities, manualPerf)) {
      const pas = PAS_CONVERGENCE_BASE * fiabilite;
      estimateCourante = estimateCourante + (borneBrute - estimateCourante) * pas;
    }
    const borneMin = Math.min(borneBrute, baseTimeReference);
    const borneMax = Math.max(borneBrute, baseTimeReference);
    const estimateClampee = Math.min(Math.max(estimateCourante, borneMin), borneMax);
    const aDesDonnees = stravaActivities.some(a=>a.start_date_local?.slice(0,10)<=dateStr) ||
      Object.entries(manualPerf).some(([uid,m])=>m?.average_speed && allSessions.find(s=>s.uid===uid && s.date<=dateStr));
    const confidence = aDesDonnees ? 45 : 30;
    // Bande stockée = incertitude autour de l'estimation (±0-90s selon
    // confidence), même formule que predict10K() — pas l'intervalle de
    // convergence (BASE↔borneBrute), qui reste utilisé seulement pour le
    // clamp ci-dessus.
    const margin = Math.round((1 - confidence/100) * 90);
    newHistory.push({
      date: dateStr, time: Math.round(estimateClampee), confidence,
      predictorVersion: predictorVersion,
      borneMin: Math.round(estimateClampee) - margin, borneMax: Math.round(estimateClampee) + margin,
      phase: phaseAtDateFn(planBrut, dateStr),
    });
    d.setDate(d.getDate()+1);
  }
  return newHistory;
}

// ── Prédiction 10K affichée ──────────────────────────────────────────────
// L'estimation AFFICHÉE ne saute plus directement à la mesure physio brute
// (borneBrute) à chaque séance — elle part de BASE_TIME_REFERENCE en
// début de plan et s'en rapproche par petits pas à chaque nouvelle séance
// de qualité (SEUIL/VMA/SPEC), clampée pour ne jamais dépasser borneBrute
// (qui sert de plafond/plancher de tolérance). Le pas de convergence est
// modulé par la fiabilité globale du plan (toutes séances, pondérées par
// récence) : bonne fiabilité récente → convergence normale, ratés récents
// → convergence ralentie voire gelée.
//
// MUTE predHistory EN PLACE (push/shift/réassignation d'un index) — reçu
// par référence depuis l'appelant, ces mutations se répercutent
// automatiquement (cf. en-tête de ce fichier). Ne réassigne jamais
// predHistory lui-même (contrairement à rebuildPredHistorySequentielle,
// dont le résultat DOIT être réassigné par l'appelant).
//
// ctx attend, en plus des champs de calculerBorneBruteAtDate/
// rebuildPredHistorySequentielle : { objectifReference, predHistory,
// todayFn, saveFn, clePourPlanFn, fmtPaceFn, fmtTimeFn,
// vdotDepuisEffortSousMaximalFn, vitesseDepuisVdotEtDistanceFn }.
export function predict10K(ctx) {
  const {
    baseTimeReference, objectifReference, distanceMReference, planBrut,
    allSessions, statuses, stravaActivities, manualPerf, predHistory,
    predictorVersion, todayFn, saveFn, clePourPlanFn, phaseAtDateFn,
  } = ctx;
  const BASE_TIME = baseTimeReference; // référence lue depuis le plan chargé
  // Ne prend en compte que les activités depuis le début du plan actuellement
  // affiché — sans ce filtre, la prédiction mélangeait des séances
  // antérieures à ce plan.
  const dateDebutPlan = planBrut?.dateDebut;
  // Repli sport_type — a.type seul ratait certaines activités selon la
  // source de synchro.
  const runs = stravaActivities.filter(a =>
    (a.type === "Run" || a.sport_type === "Run") && (!dateDebutPlan || a.start_date_local?.slice(0,10) >= dateDebutPlan)
  );
  const estimates = [];
  const details = [];

  // Wrapper local — préserve la signature d'appel existante
  // (weightedAvg("SPEC")) utilisée plus bas dans cette fonction.
  const weightedAvg = (sessionType) => weightedAvgByEffortDuration(sessionType, runs, dateDebutPlan, ctx);

  // ── 1. SPEC → allure directe ──────────────────────────────────────────────
  const specData = weightedAvg("SPEC");
  if (specData) {
    const estimate10k = distanceMReference / specData.speed;
    estimates.push({ value: estimate10k, weight: 0.45 });
    const lastSpecDate = specData.runs.map(r=>r.start_date_local?.slice(0,10)).filter(Boolean).sort().pop();
    details.push({ label:`SPEC · ${specData.runs.length} séance${specData.runs.length>1?"s":""} · dernier ${lastSpecDate||"?"}`, value:ctx.fmtPaceFn(specData.speed)+"/km → "+ctx.fmtTimeFn(Math.round(estimate10k)) });
  }

  // ── 2. SEUIL → contribue uniquement à partir de 3 séances ─────────────────
  // Formule Daniels-Gilbert : remplace Riegel, structurellement pessimiste
  // sur une allure sous-maximale comme le seuil (bug réel : un bon seuil à
  // 4:59/km donnait 52:58 via Riegel contre 49:15 en VDOT, sur une même
  // séance qui aurait dû faire progresser l'estimation).
  const seuilData = weightedAvg("SEUIL");
  if (seuilData && seuilData.runs.length >= 3) {
    const vitesseSeuilMMin = seuilData.speed * 60; // m/s → m/min
    const vdotSeuil = ctx.vdotDepuisEffortSousMaximalFn(vitesseSeuilMMin, 60);
    const vitesseEquivalente = ctx.vitesseDepuisVdotEtDistanceFn(vdotSeuil, distanceMReference);
    const estimationSeuil = distanceMReference / vitesseEquivalente * 60; // m/min → secondes
    estimates.push({ value: estimationSeuil, weight: 0.10 });
    const totalEffortDist = seuilData.laps.reduce((s,l) => s + l.distance, 0);
    details.push({ label:`SEUIL · ${seuilData.runs.length} séances · ${Math.round(totalEffortDist)}m effort`, value:ctx.fmtPaceFn(seuilData.speed)+"/km → "+ctx.fmtTimeFn(Math.round(estimationSeuil)) });
  }

  // ── 3. VMA → vitesse × 0.87 ──────────────────────────────────────────────
  const vmaData = weightedAvg("VMA");
  if (vmaData) {
    const estimate10k = distanceMReference / (vmaData.speed * 0.87);
    estimates.push({ value: estimate10k, weight: 0.35 });
    const lastVmaDate = vmaData.runs.map(r=>r.start_date_local?.slice(0,10)).filter(Boolean).sort().pop();
    details.push({ label:`VMA · ${vmaData.runs.length} séance${vmaData.runs.length>1?"s":""} · dernier ${lastVmaDate||"?"}`, value:ctx.fmtPaceFn(vmaData.speed)+"/km → "+ctx.fmtTimeFn(Math.round(estimate10k)) });
  }

  // ── Garde-fou : exclure une source manifestement aberrante ────────────────
  // Limite structurelle connue : les séances VMA très fractionnées (ex.
  // 2×8×30″-30″) ne se segmentent pas correctement en laps Strava
  // classiques quand la montre ne crée pas un vrai lap par répétition —
  // une activité avec moins de laps que de répétitions attendues mélange
  // phases rapides et lentes dans un même lap, donnant une vitesse
  // moyenne diluée sans rapport avec l'effort réel.
  //
  // Comparaison à BASE_TIME (référence connue), pas à la médiane des
  // autres estimations : avec seulement 2 sources, chaque valeur est
  // mécaniquement à égale distance de leur propre moyenne, donc aucune
  // n'est jamais détectée comme aberrante par une comparaison mutuelle.
  //
  // Écart >20% par rapport à BASE_TIME est un signal fort d'erreur de
  // détection plutôt qu'une vraie variance de performance — filet de
  // sécurité en attendant une analyse seconde par seconde plus fiable.
  for (let i = estimates.length - 1; i >= 0; i--) {
    const ecartRelatif = Math.abs(estimates[i].value - BASE_TIME) / BASE_TIME;
    if (ecartRelatif > 0.20) {
      details.push({ label: "⚠️ Source écartée (résultat incohérent)", value: ctx.fmtTimeFn(Math.round(estimates[i].value)) + " — écart trop important vs référence connue" });
      // Marque la source correspondante comme écartée (vmaData/specData/
      // seuilData ne sont pas directement liés à estimates[i], donc on
      // retrouve la source par son poids caractéristique : VMA=0.35,
      // SPEC=0.45, SEUIL=0.10).
      if (Math.abs(estimates[i].weight - 0.35) < 0.01) vmaData._exclu = true;
      else if (Math.abs(estimates[i].weight - 0.45) < 0.01) specData._exclu = true;
      else if (Math.abs(estimates[i].weight - 0.10) < 0.01) seuilData._exclu = true;
      estimates.splice(i, 1);
    }
  }

  // ── Pondération Lavandou selon le TEMPS écoulé (pas la quantité de
  // données) ────────────────────────────────────────────────────────────
  // La pertinence de la référence de base diminue naturellement avec le
  // TEMPS qui passe (la forme évolue avec les semaines d'entraînement),
  // pas avec un comptage brut de séances.
  //
  // Décroissance linéaire de 90% (semaine 1) à 10% (semaine 8+), avec un
  // garde-fou : si aucune séance intensive (VMA/SPEC) dans les 3 dernières
  // semaines, le poids ne descend jamais sous 50% peu importe où on en est
  // dans la décroissance — évite qu'une pause/blessure fasse s'effondrer
  // le poids de la référence sans vraies données récentes pour la
  // remplacer.
  const hasVma   = vmaData !== null && !vmaData._exclu;
  const hasSpec  = specData !== null && !specData._exclu;
  const hasSeuil = seuilData !== null && seuilData.laps.length > 0 && !seuilData._exclu;

  const semainesEcoulees = planBrut?.dateDebut
    ? Math.floor((new Date(todayFn()) - new Date(planBrut.dateDebut)) / (7*86400000)) + 1
    : 1;
  const POIDS_DEPART = 0.90, POIDS_PLANCHER = 0.10, DUREE_DECROISSANCE_SEMAINES = 8;
  const progression = Math.min(Math.max((semainesEcoulees - 1) / (DUREE_DECROISSANCE_SEMAINES - 1), 0), 1);
  let lavendouWeight = POIDS_DEPART - progression * (POIDS_DEPART - POIDS_PLANCHER);

  // Garde-fou : dernière séance VMA ou SPEC dans les 3 dernières semaines ?
  const dateLimiteRecente = new Date(new Date(todayFn()).getTime() - 21*86400000).toISOString().slice(0,10);
  const dateVmaRecente = hasVma ? vmaData.runs.some(r => r.start_date_local?.slice(0,10) >= dateLimiteRecente) : false;
  const dateSpecRecente = hasSpec ? specData.runs.some(r => r.start_date_local?.slice(0,10) >= dateLimiteRecente) : false;
  const donneesRecentes = dateVmaRecente || dateSpecRecente;
  if (!donneesRecentes) lavendouWeight = Math.max(lavendouWeight, 0.50);

  // Repli sur le seuil si ni VMA ni SPEC n'existent du tout.
  if (!hasVma && !hasSpec && hasSeuil) lavendouWeight = Math.max(lavendouWeight, 0.70);
  if (!hasVma && !hasSpec && !hasSeuil) lavendouWeight = 1.00;

  let borneBrute = BASE_TIME; // ex-"estimate" : mesure physio pure (non lissée), sert de plafond/plancher de tolérance
  let confidence = 30;
  let method = "Référence (" + ctx.fmtTimeFn(baseTimeReference) + ")";

  if (estimates.length > 0) {
    const totalWeight = estimates.reduce((s,e) => s+e.weight, 0);
    const weighted = estimates.reduce((s,e) => s+e.value*e.weight, 0) / totalWeight;
    borneBrute = BASE_TIME * lavendouWeight + weighted * (1 - lavendouWeight);
    confidence = Math.min(30 + (vmaData?.laps.length||0)*3 + (specData?.laps.length||0)*5 + (seuilData?.laps.length||0)*2, 95);
    method = estimates.length===1 ? "1 source" : estimates.length+" sources combinées";
    // La référence de base contribue toujours au calcul final (via
    // lavendouWeight), mais n'apparaissait jamais dans la liste des
    // sources affichée au tap. Ajoutée en dernier (après les autres
    // sources réelles, cohérent avec son rôle de repli/stabilisateur
    // plutôt que de source principale).
    details.push({ label: `Référence · poids ${Math.round(lavendouWeight*100)}%`, value: ctx.fmtTimeFn(baseTimeReference) });
  }

  // ── Convergence progressive vers l'objectif ───────────────────────────────
  const todayStrConv = todayFn();
  const dernierePred = predHistory.length ? predHistory[predHistory.length-1] : null;
  const departConvergence = dernierePred && dernierePred.date !== todayStrConv
    ? dernierePred.time
    : (dernierePred && dernierePred.date === todayStrConv && predHistory.length >= 2 ? predHistory[predHistory.length-2].time : BASE_TIME);
  const fiabilite = fiabilitePlanPonderee(todayStrConv, allSessions, statuses);
  // Pas de base 15% de l'écart restant vers la borne, modulé 0..1 par la
  // fiabilité (à fiabilité 0, la convergence est gelée : pas de mouvement).
  const PAS_CONVERGENCE_BASE = 0.15;
  const pas = PAS_CONVERGENCE_BASE * fiabilite;
  let estimate = aDesNouvellesDonneesQualite(todayStrConv, allSessions, statuses, stravaActivities, manualPerf)
    ? departConvergence + (borneBrute - departConvergence) * pas
    : departConvergence; // pas de nouvelle donnée de qualité aujourd'hui : l'estimation ne bouge pas
  // Clamp : l'estimation lissée ne peut jamais dépasser la borne brute
  // (tolérance) — ni être plus optimiste, ni être plus pessimiste que ce
  // que les séances mesurent réellement.
  const borneMin = Math.min(borneBrute, BASE_TIME);
  const borneMax = Math.max(borneBrute, BASE_TIME);
  estimate = Math.min(Math.max(estimate, borneMin), borneMax);

  const target = objectifReference;
  const gap = estimate - target;

  // Fourchette selon la confiance — calculée ici (avant l'enregistrement
  // dans l'historique) car utilisée à la fois pour l'entrée predHistory du
  // jour (bande de tolérance affichée dans le graphe Stats) et pour le
  // retour de la fonction plus bas.
  const margin = Math.round((1 - confidence/100) * 90); // ±0-90 sec selon confiance
  const estimateLow = Math.round(estimate) - margin;
  const estimateHigh = Math.round(estimate) + margin;

  // Enregistrer l'estimation du jour dans l'historique — cherche l'entrée
  // existante pour todayStr PARTOUT dans le tableau (findIndex), pas
  // seulement en dernière position, pour éviter les doublons si
  // predict10K() est appelée plusieurs fois dans la même journée (ex.
  // rebuildPredHistory() et cet appel individuel qui s'entrelacent).
  const todayStr = todayFn();
  const idxEntryDuJour = predHistory.findIndex(p => p.date === todayStr);
  const entryDuJour = { date: todayStr, time: Math.round(estimate), confidence, predictorVersion: predictorVersion, borneMin: estimateLow, borneMax: estimateHigh, phase: phaseAtDateFn(planBrut, todayStr) };
  if (idxEntryDuJour === -1) {
    predHistory.push(entryDuJour);
    if (predHistory.length > 80) predHistory.shift();
    saveFn(clePourPlanFn("lk_pred_history"), predHistory);
  } else if (predHistory[idxEntryDuJour].time !== Math.round(estimate)) {
    // Mettre à jour l'entrée du jour si l'estimation a changé
    predHistory[idxEntryDuJour] = entryDuJour;
    saveFn(clePourPlanFn("lk_pred_history"), predHistory);
  }

  return {
    time: Math.round(estimate), timeStr: ctx.fmtTimeFn(Math.round(estimate)),
    timeLow: ctx.fmtTimeFn(estimateLow), timeHigh: ctx.fmtTimeFn(estimateHigh),
    target: ctx.fmtTimeFn(target), gap: Math.round(gap),
    gapStr: (gap>0?"+":"")+ctx.fmtTimeFn(Math.abs(Math.round(gap))),
    onTrack: gap<=30, confidence, method, details,
    // Bornes de tolérance (mesure physio brute non lissée) — utiles pour
    // affichage graphe Stats.
    borneBrute: Math.round(borneBrute), borneMin: Math.round(borneMin), borneMax: Math.round(borneMax),
    fiabilite: Math.round(fiabilite*100),
  };
}
