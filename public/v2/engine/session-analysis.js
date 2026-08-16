/**
 * session-analysis.js
 * Analyse des répétitions/laps d'une séance (score d'économie, détection
 * du type d'effort, isolement des laps d'effort, dérive FC, ligne
 * d'affichage d'une répétition) — extrait de index.html le 31/07/2026
 * pour réduire la taille du fichier principal.
 *
 * Vrai module ES (pas de script classique) — même principe que badges.js
 * (cf. son en-tête pour le détail) : aucune variable/fonction du scope
 * implicite d'index.html (ALL_SESSIONS, SESSION_TARGETS, stravaActivities,
 * runnerFcMax, el()...) n'est utilisée directement ici ; tout est reçu en
 * paramètre depuis l'appelant.
 *
 * Ce module ne contient QUE des fonctions pures (aucune mutation d'état
 * partagé, contrairement au prédicteur 10K qui mute predHistory — cf.
 * predictor.js, module séparé pour cette raison précise). getLapsAffichage
 * appelle en interne getEffortLaps/detecterTypeEffort/extractTargetSpeed,
 * qui restent des fonctions privées de ce module (jamais exportées) —
 * seule getLapsAffichage() et les fonctions d'affichage/score sont de
 * vraies dépendances externes utilisées ailleurs dans index.html.
 */

// Détection par signal (16/08/2026, correctif décomposition séance
// qualité — cf. docs/v2-methodologie/saisie-et-integrations.md) —
// réutilise le même moteur que l'import FIT (fit-detection.js), déjà
// éprouvé sur ce cas exact (montre sans laps structurés natifs). Import
// ES statique : ce module est lui-même chargé comme module ES par
// index.html (cf. en-tête ci-dessus), donc un import top-level est
// cohérent avec le reste du fichier.
import { detecterIntervallesParSignal, construireRecordsDepuisStreamsStrava } from './fit-detection.js';

// ── Score d'Économie normalisé ──────────────────────────────────────────
// runnerFcMax : profilCoureur.fcMax côté appelant (variable locale au
// scope du script principal d'index.html, jamais exposée globalement).
export function economyScore(lap, sessionType, sessionTargets, runnerFcMax) {
  if (!lap.average_heartrate || !lap.average_speed || !runnerFcMax) return null;
  const target = sessionTargets[sessionType];
  if (!target) return null;
  const fcPct = sessionType==="VMA" ? 0.95 : sessionType==="SPEC" ? 0.875 : sessionType==="SEUIL" ? 0.875 : null;
  if (!fcPct) return null;
  const fcTheo = runnerFcMax * fcPct;
  const vTheo = 1000 / target.targetMin;
  const iecTheo = fcTheo / vTheo;
  const iecReal = lap.average_heartrate / lap.average_speed;
  return Math.round(iecTheo / iecReal * 100);
}
export function economyColor(score, n) {
  if (!score || n < 3) return "var(--text2)";
  if (score > 110) return "var(--accent2)";
  if (score >= 90) return "var(--warn)";
  return "var(--warn)";
}
export function economyLabel(score, n) {
  if (!score || n < 3) return "";
  if (score > 110) return "💚";
  if (score >= 90) return "💛";
  return "❤️";
}


// ── Icône Yoria inline ─────────────────────────────────────────────────
// Fonction pure sans dépendance externe (juste le DOM natif, pas el()) —
// inchangée, extraite telle quelle.
export function runByLeaIcon(size, radius) {
  const r = radius || Math.round(size * 0.22);
  const el2 = document.createElementNS("http://www.w3.org/2000/svg","svg");
  el2.setAttribute("width", size); el2.setAttribute("height", size);
  el2.setAttribute("viewBox","0 0 512 512");
  el2.style.borderRadius = r+"px";
  el2.style.flexShrink = "0";
  el2.innerHTML = `<defs><linearGradient id="g1" x1="100" y1="80" x2="260" y2="430" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent)"/></linearGradient><linearGradient id="g2" x1="420" y1="80" x2="250" y2="430" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--accent2)"/><stop offset="1" stop-color="var(--accent2)"/></linearGradient></defs><path d="M92 92 C184 104, 232 154, 256 230 C270 276, 264 342, 246 420" fill="none" stroke="url(#g1)" stroke-width="42" stroke-linecap="round"/><path d="M420 92 C328 104, 280 154, 256 230 C242 276, 248 342, 266 420" fill="none" stroke="url(#g2)" stroke-width="42" stroke-linecap="round"/>`;
  return el2;
}

// ── Détection des intervalles via streams (seconde par seconde) ──────────────
// Fonction privée de ce module (pas exportée) — utilisée uniquement par
// getLapsAffichage()/getEffortLaps() en interne, jamais appelée depuis
// index.html directement (vérifié avant extraction).
function extractTargetSpeed(sessionStr) {
  if (!sessionStr) return null;
  const m = sessionStr.match(/(\d+):(\d+)\/km/);
  if (m) return 1000 / (parseInt(m[1])*60 + parseInt(m[2]));
  return null;
}

/**
 * Détecte, parmi les laps "milieu" d'une activité (hors échauffement/retour
 * au calme), quelle cible générique de sessionTargets correspond le mieux
 * — en choisissant celle dont la vitesse moyenne réelle est la PLUS PROCHE
 * de la cible, pas juste celle qui capture le plus de laps (bug trouvé le
 * 6 juillet 2026 : les plages ±15% de VMA/SEUIL/SPEC se chevauchent, une
 * allure "seulement" 4'49/km reste dans la tolérance ±15% de VMA qui vise
 * 4'10/km, la marge en valeur absolue étant large sur une cible rapide).
 * Retourne { type, laps } ou null si aucune cible ne correspond.
 *
 * Exportée : utilisée en interne par getLapsAffichage()/getEffortLaps(),
 * mais aussi appelée directement depuis index.html par
 * weightedAvgByEffortDuration() (module predictor.js à venir) — vérifié
 * avant extraction, ne pas la rendre privée.
 */
export function detecterTypeEffort(middle, sessionTargets) {
  let meilleurType = null;
  let meilleurResultat = [];
  let meilleurEcart = Infinity;
  for (const [type, cible] of Object.entries(sessionTargets)) {
    const effSpeed = 1000 / cible.targetMin;
    const bySpeed = middle.filter(l => l.average_speed > 0 &&
      Math.abs(l.average_speed - effSpeed) <= effSpeed * 0.15);
    if (bySpeed.length === 0) continue;
    const vitesseMoyReelle = bySpeed.reduce((s,l) => s + l.average_speed, 0) / bySpeed.length;
    const ecart = Math.abs(vitesseMoyReelle - effSpeed);
    if (ecart < meilleurEcart) {
      meilleurEcart = ecart;
      meilleurResultat = bySpeed;
      meilleurType = type;
    }
  }
  return meilleurType ? { type: meilleurType, laps: meilleurResultat } : null;
}

// ------------------------------------------------------------
// Repli détection par signal (16/08/2026) — appelé par getLapsAffichage()
// quand les laps natifs de l'activité sont absents ou insuffisants pour
// isoler la structure attendue (moins de blocs+2 laps), ET que
// activity.raw_streams est disponible (posé par api/strava.js quand ce
// cas est détecté côté serveur — cf. son en-tête). Retourne un objet
// { laps, approximatif } plutôt qu'un tableau brut, pour que l'appelant
// (index.html, renderBlocRealise) sache qu'il doit afficher un
// avertissement, contrairement au cas nominal (laps natifs cohérents).
//
// N'appelle PAS ce repli si raw_streams est absent (ex. l'appel /streams
// a échoué côté serveur, ou l'activité est trop ancienne pour avoir été
// enrichie avec le nouveau paramètre interval_expected) — dans ce cas on
// retombe sur le comportement précédent (laps natifs tels quels, même
// insuffisants), plutôt que de renvoyer un tableau vide sans explication.
// ------------------------------------------------------------
function repliDetectionParSignal(activity, structureIntervalles) {
  if (!activity.raw_streams) return null;
  const records = construireRecordsDepuisStreamsStrava(activity.raw_streams);
  if (!records.length) return null;
  const structureAttendue = structureIntervalles?.blocs?.[0] || null;
  const laps = detecterIntervallesParSignal(records, structureAttendue);
  if (!laps.length) return null;
  return { laps, approximatif: true };
}

// Fonction privée de ce module — appelée uniquement par getLapsAffichage()
// en interne quand structureIntervalles est absente (repli). Jamais
// appelée directement depuis index.html (vérifié avant extraction : tous
// les appelants externes passent par getLapsAffichage()).
//
// CORRECTIF (16/08/2026) : le garde-fou "< 4 laps → []" est retiré au
// profit du repli par signal (repliDetectionParSignal ci-dessus) quand
// raw_streams est disponible. Un coureur qui ne programme pas sa montre
// en laps manuels (échauffement/effort/récup/retour au calme) obtenait
// jusqu'ici toujours un tableau vide, quelle que soit la séance — cf.
// discussion Laurent du 16/08/2026. Si raw_streams est absent (repli
// impossible), le comportement précédent est conservé (tableau vide) —
// pas de régression pour les activités déjà synchronisées avant ce
// correctif, ou pour les cas où le serveur n'a pas pu récupérer les
// streams.
function getEffortLaps(activity, allSessions, sessionTargets, structureIntervalles) {
  if (!activity.laps || activity.laps.length < 4) {
    const repli = repliDetectionParSignal(activity, structureIntervalles);
    return repli ? repli.laps : [];
  }

  // Supprimer 1er lap (echauffement) et 2 derniers (retour au calme)
  const middle = activity.laps.slice(1, -2);
  if (!middle.length) return [];

  // Vitesse cible : d'abord depuis le libellé de la séance si elle
  // correspond à une séance du plan à cette date (affinage, quand
  // disponible), sinon on essaie chaque cible générique de sessionTargets
  // (VMA/SEUIL/SPEC/TEST) indépendamment du plan — la reconnaissance du
  // type d'effort réel ne doit plus dépendre d'une correspondance stricte
  // de date avec ce qui était prévu (cf. docs/v2-methodologie/
  // convergence-v1-v2.md : la prédiction de performance doit rester fiable
  // même si le plan affiché à cette date-là ne correspond pas exactement à
  // l'effort réellement fourni, ce qui peut arriver dès qu'un plan diffère
  // du déroulé réel — pas seulement dans le contexte du chantier v2).
  //
  // NOTE IMPORTANTE : ceci ne concerne QUE la détection du type d'effort
  // pour la prédiction de performance. Le suivi de respect du plan
  // (statuts ✅/⚠️/❌ par séance prévue) reste entièrement basé sur la
  // correspondance stricte par date avec ALL_SESSIONS, inchangé.
  const date = activity.start_date_local ? activity.start_date_local.slice(0,10) : null;
  const planSess = date ? allSessions.find(s => s.date === date) : null;
  const targetSpeedDuPlan = planSess ? extractTargetSpeed(planSess.session) : null;

  // 1. Affinage par le plan prévu à cette date, si disponible
  if (targetSpeedDuPlan) {
    const bySpeed = middle.filter(l => l.average_speed > 0 &&
      Math.abs(l.average_speed - targetSpeedDuPlan) <= targetSpeedDuPlan * 0.15);
    if (bySpeed.length > 0) return bySpeed;
  }

  // 2. Sinon, détection générique par cible la plus proche
  const detection = detecterTypeEffort(middle, sessionTargets);
  if (detection) return detection.laps;

  // Fallback : moitie la plus rapide
  const withSpeed = middle.filter(l => l.average_speed > 0);
  const sorted = [...withSpeed].sort((a,b) => b.average_speed - a.average_speed);
  const half = Math.ceil(sorted.length / 2);
  const effortSet = new Set(sorted.slice(0, half).map(l => l.lap_index || l.id));
  return withSpeed.filter(l => effortSet.has(l.lap_index || l.id));
}

// Laps à utiliser pour L'AFFICHAGE de suivi (pas la prédiction de
// performance) — distinct de getEffortLaps() ci-dessus. Bug trouvé le
// 8 juillet 2026 : Laurent programme fidèlement ses séances sur sa montre,
// qui crée un lap DISTINCT pour chaque phase (effort, récup courte
// intra-répétition, récup longue inter-séries) — les laps alternent
// simplement effort/récup/effort/récup, avec une récup longue en PLUS de
// la récup normale à la fin de chaque série (sauf la dernière du plan).
//
// Historique des tentatives rejetées avant cette version, pour ne pas
// retomber dans les mêmes pièges si ce code est retouché plus tard :
// 1) garder tous les laps du milieu sans distinction (mélangeait effort et
//    récup) ; 2) filtrer par durée (ne fonctionne pas quand effort et
//    récup ont la même durée, ex. un 30-30 où les deux durent 30s) ;
// 3) traiter uniquement le cas à un seul bloc + boucle nbSeries, avec un
//    second cas "tous les blocs sont des efforts continus" pour les
//    structures multi-blocs — correct pour pyramidale/seuil-négatif (les
//    seuls types existants avec plusieurs blocs), mais fragile : un futur
//    type de séance avec plusieurs blocs à répétitions multiples (pas
//    encore implémenté) casserait silencieusement ce deuxième cas,
//    revenant au défaut n°1. Signalé explicitement par Laurent comme un
//    vrai risque à couvrir avant d'ajouter de nouveaux types de séries.
//
// Version généralisée : parcourt TOUS les blocs de la structure, un par
// un, chacun avec ses PROPRES répétitions et sa propre récupération — pas
// de cas particulier selon le nombre de blocs. Chaque bloc peut avoir
// repetitions=1 (effort continu, ex. pyramidale/seuil-négatif) ou
// repetitions>1 (vraies répétitions avec récup entre chacune, ex.
// seuil-court/i-3min). nbSeries s'applique en répétant l'ENSEMBLE des
// blocs (pas un seul), avec recupEntreSeriesSec ajoutée après le dernier
// bloc de chaque série (sauf la toute dernière série du plan).
//
// allSessions/sessionTargets : requis seulement pour le repli
// getEffortLaps() (cas sans structureIntervalles) — passés ici pour être
// transmis à ce repli, jamais utilisés directement par cette fonction.
//
// CORRECTIF (16/08/2026) : le garde-fou initial "< 4 laps → []" est
// retiré ici aussi, remplacé par un essai de repli par signal (cf.
// repliDetectionParSignal ci-dessus et l'en-tête de getEffortLaps) avant
// de renvoyer un tableau vide. Le flag `approximatif` posé sur le
// résultat du repli est perdu par le simple retour d'un tableau (return
// efforts / return getEffortLaps(...)) — c'est un choix assumé : cette
// fonction garde sa signature d'origine (tableau de laps), l'appelant
// index.html qui a besoin de savoir si l'activité a été enrichie de
// raw_streams peut le déduire lui-même via activity.laps_incoherents
// (posé par api/strava.js), sans avoir à faire remonter ce flag à travers
// toute la chaîne d'appel.
export function getLapsAffichage(activity, structureIntervalles, allSessions, sessionTargets) {
  if (!activity.laps || activity.laps.length < 4) {
    const repli = repliDetectionParSignal(activity, structureIntervalles);
    return repli ? repli.laps : [];
  }
  if (!structureIntervalles?.blocs?.length) return getEffortLaps(activity, allSessions, sessionTargets, structureIntervalles);

  const middle = activity.laps.slice(1, -2);
  const nbSeries = structureIntervalles.nbSeries || 1;
  const efforts = [];
  let curseur = 0;

  for (let serie = 0; serie < nbSeries; serie++) {
    const derniereSerie = serie === nbSeries - 1;
    structureIntervalles.blocs.forEach((bloc, indexBloc) => {
      const repsDuBloc = bloc.repetitions || 1;
      const dernierBlocDeLaSerie = indexBloc === structureIntervalles.blocs.length - 1;
      for (let rep = 0; rep < repsDuBloc; rep++) {
        if (curseur >= middle.length) return;
        efforts.push(middle[curseur]); // lap d'effort
        curseur++;
        const derniereRepDuBloc = rep === repsDuBloc - 1;
        const dernierEffortDuPlan = derniereRepDuBloc && dernierBlocDeLaSerie && derniereSerie;
        if (dernierEffortDuPlan) continue; // aucune récup à sauter après le tout dernier effort du plan (le prochain lap est déjà le retour au calme, exclu par slice(1,-2))
        // Une récup courte suit systématiquement chaque répétition (y
        // compris entre deux blocs différents, et y compris la dernière
        // répétition d'un bloc) — sauf si le bloc entier n'a qu'une seule
        // répétition SANS récup définie (dureeRecupSec absent/0, ex. un
        // bloc "effort continu" isolé sans vraie pause programmée).
        if (bloc.dureeRecupSec) curseur++;
        // Fin de série (dernier bloc de la série, dernière répétition de
        // ce bloc, mais pas la toute dernière série du plan) : un lap de
        // récup LONGUE s'ajoute EN PLUS de la récup courte normale, pas à
        // sa place — vérifié explicitement par Laurent sur sa vraie
        // séance (2 laps de récup successifs, pas un seul plus long).
        if (derniereRepDuBloc && dernierBlocDeLaSerie && !derniereSerie && structureIntervalles.recupEntreSeriesSec) {
          curseur++;
        }
      }
    });
  }

  // Si la structure attendue n'a pas pu être entièrement couverte par les
  // laps réels disponibles (curseur n'a pas atteint le nombre de laps
  // nécessaires), les efforts collectés jusqu'ici sont partiels — plutôt
  // que de renvoyer une décomposition tronquée silencieusement, on tente
  // le repli par signal si possible, qui reconstruit la séance en entier
  // depuis le flux continu plutôt que depuis des laps insuffisants.
  const nbEffortsAttendu = structureIntervalles.blocs.reduce((s,b)=>s+(b.repetitions||1),0) * nbSeries;
  if (efforts.length < nbEffortsAttendu) {
    const repli = repliDetectionParSignal(activity, structureIntervalles);
    if (repli) return repli.laps;
  }

  return efforts;
}


// ── Calcul dérive FC sur les répétitions ─────────────────────────────────
// elFn : fonction el() du script principal d'index.html (locale au module,
// jamais exposée globalement) — reçue en paramètre plutôt que supposée
// disponible dans le scope.
export function computeFcDrift(laps, elFn) {
  const hrLaps = laps.filter(l => l.average_heartrate);
  if (hrLaps.length < 2) return { driftBpm: null, driftEl: null };
  const firstHr = hrLaps[0].average_heartrate;
  const lastHr = hrLaps[hrLaps.length-1].average_heartrate;
  const drift = Math.round(lastHr - firstHr);
  const avgHr = hrLaps.reduce((s,l)=>s+l.average_heartrate,0)/hrLaps.length;
  const firstHrVal = hrLaps[0].average_heartrate;
  laps.forEach(l => {
    l._fcAlert = l.average_heartrate && l.average_heartrate > avgHr + 8;
    l._fcBase = firstHrVal;
  });
  const driftColor = drift <= 5 ? "var(--accent2)" : drift <= 12 ? "var(--warn)" : "var(--warn)";
  const driftIcon = drift <= 5 ? "✅" : drift <= 12 ? "⚠️" : "🔴";
  const driftEl = elFn("div",{style:{background:"var(--border-soft)",borderRadius:"8px",padding:"8px 12px",marginTop:"6px",display:"flex",justifyContent:"space-between",alignItems:"center"}},
    elFn("span",{class:"muted",style:{fontSize:"13px"}},"Dérive FC"),
    elFn("span",{style:{color:driftColor,fontSize:"14px",fontWeight:"700"}},(drift>0?"+":"")+drift+" bpm "+driftIcon)
  );
  return { driftBpm: drift, driftEl };
}

// ── Affichage commun d'une répétition (dashboard + weekDetail) ────────────
// elFn/fmtPaceFn : el()/fmtPace() du script principal, reçues en paramètre
// (même raison que computeFcDrift ci-dessus). allSessions/stravaActivities
// nécessaires pour nSameType (compte les activités du même type de séance,
// utilisé pour décider si le score d'économie est affiché — cf.
// economyColor/economyLabel qui exigent n>=3). runnerFcMax : transmis tel
// quel à economyScore (l'original lisait cette variable en scope, ici
// passée explicitement par l'appelant — même valeur, aucun changement de
// comportement).
export function renderLapRow(lap, i, sessionType, sessionTargets, stravaActivities, allSessions, runnerFcMax, elFn, fmtPaceFn) {
  const tgt = sessionTargets[sessionType];
  const pace = 1000/lap.average_speed;
  let bc = "var(--text2)", em = "";
  if (tgt) {
    if (pace <= tgt.okPace) { bc="var(--accent2)"; em="🟢"; }
    else if (pace <= tgt.warnPace) { bc="var(--warn)"; em="🟡"; }
    else { bc="var(--warn)"; em="🔴"; }
  }
  const maxP = tgt ? tgt.warnPace+30 : 400, minP = tgt ? tgt.targetMin-20 : 240;
  const bw = Math.max(0, Math.min(100, (1-(pace-minP)/(maxP-minP))*100));
  const nSameType = stravaActivities.filter(a=>{
    const d = a.start_date_local?.slice(0,10);
    return allSessions.find(ss=>ss.date===d&&ss.type===sessionType);
  }).length;
  const se = economyScore(lap, sessionType, sessionTargets, runnerFcMax);
  const seColor = economyColor(se, nSameType);
  const seLabel = economyLabel(se, nSameType);
  const cadence = lap.average_cadence ? Math.round(lap.average_cadence*2)+" spm" : "";

  // ── Raison du verdict ────────────────────────────────────────────────────
  let reasonParts = [];
  if (tgt) {
    if (pace <= tgt.okPace) reasonParts.push("Dans la cible");
    else if (pace <= tgt.warnPace) reasonParts.push("Un peu lente");
    else reasonParts.push("Trop lente");
  }
  if (lap.average_heartrate && lap._fcAlert) {
    const fcDiff = Math.round(lap.average_heartrate - (lap._fcBase||lap.average_heartrate));
    reasonParts.push("FC élevée"+(fcDiff>0?" (+"+fcDiff+" bpm)":""));
  } else if (lap.average_heartrate && i > 0) {
    const fcDiff = Math.round(lap.average_heartrate - (lap._fcBase||0));
    if (fcDiff > 3) reasonParts.push("FC +"+fcDiff+" bpm");
  }
  const reasonText = reasonParts.join(" · ");
  const reasonColor = bc === "var(--accent2)" ? "var(--accent2)" : bc === "var(--warn)" ? "var(--warn)" : "var(--warn)";
  return elFn("div",{style:{marginBottom:"6px"}},
    elFn("div",{style:{display:"grid",gridTemplateColumns:"28px 1fr 64px 56px 20px",gap:"4px",alignItems:"center",marginBottom:"2px"}},
      elFn("span",{style:{color:"var(--text2)",fontSize:"13px"}},"R"+(i+1)),
      elFn("div",{style:{height:"4px",background:"var(--border-soft)",borderRadius:"2px"}},elFn("div",{style:{width:bw+"%",height:"100%",background:bc,borderRadius:"2px"}})),
      elFn("span",{style:{color:"var(--text)",fontSize:"14px",fontWeight:"500",textAlign:"right"}},fmtPaceFn(lap.average_speed)+"/km"),
      lap.average_heartrate?elFn("span",{style:{fontSize:"13px",textAlign:"right",color:lap._fcAlert?"var(--warn)":"var(--text-muted)",fontWeight:lap._fcAlert?"700":"400"}},Math.round(lap.average_heartrate)+" bpm"+(lap._fcAlert?" ↑":"")):elFn("span",{},""),
      elFn("span",{style:{fontSize:"14px",textAlign:"center"}},em)
    ),
    reasonText?elFn("div",{style:{paddingLeft:"32px",marginBottom:"2px"}},
      elFn("span",{style:{color:reasonColor,fontSize:"12px"}},reasonText)
    ):null,
    (cadence||se)?elFn("div",{style:{display:"flex",gap:"8px",paddingLeft:"32px"}},
      cadence?elFn("span",{class:"muted",style:{fontSize:"12px"}},cadence):null,
      se?elFn("span",{style:{color:seColor,fontSize:"12px",fontWeight:"600"}},"IE "+se+(seLabel?" "+seLabel:"")):null
    ):null
  );
}
