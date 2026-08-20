// api/beta-admin-maintenance.js
// ----------------------------------------------------------------------------
// Module "Maintenance" de beta-admin (20/08/2026) — porte côté serveur les 3
// outils qui vivaient jusqu'ici dans l'accordéon Réglages > 🔧 Maintenance de
// index.html (recalculerKmComptesPourUid, reparerCoherencePhasesApp,
// changerSousTypeSeanceApp). Décision actée avec Laurent : ces outils sont
// des réparations ponctuelles de données, pas des réglages d'usage courant —
// ils n'ont pas leur place dans l'app principale accessible à tout compte, et
// n'ont de sens que pour un compte ciblé (recherché par email), au même titre
// que le module "Comptes" déjà existant dans beta-admin.
//
// Contrairement aux fonctions client d'origine (qui agissaient sur l'état en
// mémoire du navigateur — window.__PLAN_BRUT__, statuses, ALL_SESSIONS —
// donc uniquement sur le compte de la personne connectée), ces versions
// serveur résolvent l'utilisateur par email (même pattern que
// action=search_user_plan dans beta-admin.js) puis lisent/écrivent
// directement les tables Supabase concernées (plans_actif.plan_brut,
// plan_donnees.data, profils_coureur.data). Réutilise le moteur de
// génération plan-generator.js tel quel (déjà importé côté serveur pour
// v1-bridge.js dans beta-admin.js — module pur, aucune dépendance DOM) : la
// logique de réparation reste identique à celle de l'app cliente, aucune
// duplication d'algorithme.
//
// Authentification : même cookie/token que beta-admin.js (COOKIE partagé),
// donc réservé aux mêmes administrateurs. Fichier séparé de beta-admin.js
// (déjà 31K) plutôt que d'y ajouter ces 3 actions, pour garder chaque
// fichier lisible — les deux partagent le même pattern d'auth par cookie,
// dupliqué volontairement plutôt que factorisé prématurément (peu de code
// commun réel : isValidToken/parseCookies/safe/sign, ~40 lignes).
//
// CORRECTIF (20/08/2026, bug signalé par Laurent — le front n'affichait que
// "Erreur" sans détail) : toute exception non anticipée pouvait auparavant
// remonter sans message exploitable (ex. error.message vide/undefined selon
// le type d'erreur JS levée). Chaque étape logge maintenant explicitement
// côté serveur (console.error avec contexte) ET garantit un message non vide
// dans la réponse JSON, pour qu'un problème futur soit diagnosticable depuis
// les logs Vercel sans avoir à deviner où ça a cassé.
// ----------------------------------------------------------------------------

import crypto from "node:crypto";
import * as Engine from "../public/v2/engine/plan-generator.js";
import { traduirePlanVersFormatV1 } from "../public/v2/engine/v1-bridge.js";

const COOKIE = "yoria_beta_admin";

const json = (response, status, payload) => response.status(status).json(payload);

// ---------------------------------------------------------------------------
// Auth — copié tel quel depuis beta-admin.js (safe/sign/parseCookies/
// isValidToken). Dupliqué volontairement, cf. commentaire en tête de
// fichier — ce n'est que la vérification du cookie, aucune dépendance sur
// le reste de beta-admin.js.
// ---------------------------------------------------------------------------
const safe = (firstValue, secondValue) => {
  const first = Buffer.from(String(firstValue));
  const second = Buffer.from(String(secondValue));
  return first.length === second.length && crypto.timingSafeEqual(first, second);
};

const sign = (value, key) => crypto.createHmac("sha256", key).update(value).digest("base64url");

const parseCookies = (header) =>
  (header || "").split(";").reduce((cookies, part) => {
    const separator = part.indexOf("=");
    if (separator > 0) {
      const name = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      cookies[name] = decodeURIComponent(value);
    }
    return cookies;
  }, {});

const isValidToken = (token, key) => {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safe(signature, sign(payload, key))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.scope === "beta-admin" && data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// Accès Supabase — même pattern que beta-admin.js (fetch direct REST, pas
// de client supabase-js côté serveur dans ce projet). CORRECTIF : logge
// maintenant le path et le corps de la requête en cas d'échec, et retourne
// un message d'erreur avec le détail Supabase plutôt qu'un message générique.
// ---------------------------------------------------------------------------
async function supabaseRequest(config, path, options = {}) {
  let response;
  try {
    response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: config.supabaseKey,
        Authorization: `Bearer ${config.supabaseKey}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (networkErr) {
    console.error("Erreur réseau Supabase beta-admin-maintenance :", path, networkErr.message);
    throw new Error(`Erreur réseau vers Supabase (${path}) : ${networkErr.message}`);
  }
  const text = await response.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // reste du texte
  }
  if (!response.ok) {
    console.error("Erreur Supabase beta-admin-maintenance :", path, response.status, options.method || "GET", JSON.stringify(data));
    const detail = data?.message || data?.hint || data?.error || (typeof data === "string" ? data : JSON.stringify(data)) || "réponse vide";
    throw new Error(`Supabase a refusé la requête (${response.status} sur ${path}) : ${detail}`);
  }
  return data;
}

async function trouverUserIdParEmail(config, email) {
  let usersResponse;
  try {
    usersResponse = await fetch(`${config.supabaseUrl}/auth/v1/admin/users`, {
      headers: { apikey: config.supabaseKey, Authorization: `Bearer ${config.supabaseKey}` },
    });
  } catch (networkErr) {
    console.error("Erreur réseau recherche utilisateur :", networkErr.message);
    throw new Error(`Erreur réseau lors de la recherche du compte : ${networkErr.message}`);
  }
  if (!usersResponse.ok) {
    const text = await usersResponse.text().catch(() => "");
    console.error("Erreur recherche utilisateur :", usersResponse.status, text);
    throw new Error(`Recherche du compte échouée (${usersResponse.status}).`);
  }
  const usersData = await usersResponse.json();
  const users = Array.isArray(usersData) ? usersData : usersData.users || [];
  const user = users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
  return user || null;
}

async function chargerPlansActifUtilisateur(config, userId) {
  return supabaseRequest(
    config,
    `plans_actif?user_id=eq.${encodeURIComponent(userId)}&select=id,nom,plan_brut,created_at&order=created_at.desc`,
    { method: "GET" },
  );
}

// CORRECTIF (20/08/2026, bug "Séance introuvable" signalé par Laurent) :
// les actions 2 et 3 ciblaient systématiquement plans[0] (le plan le plus
// RÉCEMMENT CRÉÉ), pas forcément le plan ACTIF/suivi dans l'app — un
// compte avec 2 plans (ex. un plan Forme + un plan course en parallèle,
// cf. garde-fou anti-chevauchement qui autorise ce cas) peut très bien
// avoir son plan le plus récent différent de celui que l'utilisateur
// regarde. Plutôt que de deviner lequel est "actif" (pas de champ
// explicite dans le schéma pour ça), on demande maintenant le planId en
// paramètre optionnel — s'il est fourni, on cible ce plan précis ; sinon,
// on retombe sur l'ancien comportement (le plus récent) pour ne pas
// casser l'usage simple à un seul plan.
function resoudrePlanCible(plans, planId) {
  if (planId) {
    const trouve = plans.find((p) => p.id === planId);
    if (!trouve) return { erreur: `Aucun plan avec l'id "${planId}" pour ce compte.` };
    return { plan: trouve };
  }
  return { plan: plans[0] };
}

async function chargerPlanDonnees(config, planId) {
  const rows = await supabaseRequest(
    config,
    `plan_donnees?plan_id=eq.${encodeURIComponent(planId)}&select=data`,
    { method: "GET" },
  );
  return Array.isArray(rows) && rows[0] ? rows[0].data || {} : {};
}

// AJOUTÉ (20/08/2026, suite à un cas réel : "Séance introuvable" alors que
// la séance était bien visible dans l'app — elle avait été déplacée via la
// fonction d'échange du dashboard/Semaines). Ce que voit l'utilisateur à
// une position donnée (ex. "S7, vendredi") peut différer de ce qui est
// réellement stocké à cette position dans plan_brut.semaines[].assignment
// — un échange (glisser-déposer une séance, ou double-tap > Déplacer,
// cf. tuto "Échanger deux séances") ne réécrit JAMAIS assignment lui-même,
// il pose une redirection dans une table séparée (lk_swap_table, clé
// préfixée par plan dans plan_donnees.data — cf. index.html, commentaire
// "RETOUR D'EXPÉRIENCE 17/08/2026" sur ce choix d'architecture délibéré :
// une table plutôt que des paires, pour que résoudre une position ne
// dépende jamais d'une chaîne d'échanges antérieurs). Le format en table
// est simple à répliquer ici : swapTable[uidAffiche] = uidPhysiqueSource.
//
// Cette fonction traduit donc une position AFFICHÉE (ce que l'utilisateur
// voit/communique, ex. "vendredi S7") vers la position PHYSIQUE réelle
// dans assignment (ex. "jeudi", jour 3) — à utiliser AVANT toute lecture
// de semaine.assignment[jourIndex] quand jourIndex vient d'une
// communication humaine plutôt que d'une source déjà garantie physique
// (ex. un export ou un calcul interne au plan lui-même).
//
// Symétrique par construction (mêmes clés jouent les deux rôles selon le
// sens de lecture) : si swapTable ne contient aucune entrée pour cette
// position, la position affichée EST la position physique (cas normal,
// aucun échange n'a jamais eu lieu sur ce jour).
async function resoudrePositionAffichee(config, planId, semaineNum, jourIndexAffiche) {
  const donnees = await chargerPlanDonnees(config, planId);
  const swapTable = donnees.lk_swap_table || {};
  const uidAffiche = `${semaineNum}-${jourIndexAffiche}`;
  const uidPhysique = swapTable[uidAffiche] || uidAffiche;
  const [, jourIndexPhysiqueStr] = uidPhysique.split("-");
  return {
    jourIndexPhysique: Number(jourIndexPhysiqueStr),
    futEchangee: uidPhysique !== uidAffiche,
  };
}

// CORRECTIF (20/08/2026, bug "0 km" signalé par Laurent) : lk_strava_activities
// n'est PAS stockée dans plan_donnees.data — c'est une clé globale
// (sauvegardée via save("lk_strava_activities", ...) sans clePourPlan() côté
// client, cf. index.html), donc synchronisée dans la table integrations
// (colonne strava_activities_cache), pas dans plan_donnees. Le premier
// portage lisait donnees.lk_strava_activities depuis plan_donnees, qui n'y
// est jamais écrit — le total tombait toujours à 0 dès qu'une distance
// provenait de Strava plutôt que d'une saisie manuelle.
async function chargerStravaActivitiesUtilisateur(config, userId) {
  const rows = await supabaseRequest(
    config,
    `integrations?user_id=eq.${encodeURIComponent(userId)}&select=strava_activities_cache`,
    { method: "GET" },
  );
  return Array.isArray(rows) && rows[0] ? rows[0].strava_activities_cache || [] : [];
}

// CORRECTIF (20/08/2026, vérification demandée par Laurent après le bug
// Strava) : mettreAJourPlanSupabase (sync-storage.js, côté client) refuse
// d'écrire sur un plan Forme déjà clôturé (dateCloture posée) — garde-fou
// absent du premier portage de cette fonction. Sans lui, un admin pourrait
// accidentellement modifier un plan Forme censé être figé définitivement.
async function ecrirePlanBrut(config, planId, planBrutComplet) {
  const planExistantRows = await supabaseRequest(
    config,
    `plans_actif?id=eq.${encodeURIComponent(planId)}&select=plan_brut`,
    { method: "GET" },
  );
  const planExistant = Array.isArray(planExistantRows) && planExistantRows[0] ? planExistantRows[0].plan_brut : null;
  if (planExistant?.mode === "forme" && planExistant.dateCloture) {
    throw new Error(`Ce plan est clôturé depuis le ${planExistant.dateCloture} et ne peut plus être modifié.`);
  }

  const payload = { plan_brut: planBrutComplet };
  if (planBrutComplet?.nom) payload.nom = planBrutComplet.nom;
  await supabaseRequest(config, `plans_actif?id=eq.${encodeURIComponent(planId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
}

async function ecrireProfilCoureur(config, userId, patchDonnees) {
  const rows = await supabaseRequest(
    config,
    `profils_coureur?user_id=eq.${encodeURIComponent(userId)}&select=data`,
    { method: "GET" },
  );
  const profilExistant = Array.isArray(rows) && rows[0] ? rows[0].data || {} : {};
  const nouveauProfil = { ...profilExistant, ...patchDonnees };
  await supabaseRequest(config, "profils_coureur", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ user_id: userId, data: nouveauProfil }),
  });
  return nouveauProfil;
}

// ---------------------------------------------------------------------------
// Action 0 — Lister les plans d'un compte (ajoutée pour permettre de choisir
// le bon planId avant d'utiliser les actions 2/3, cf. bug "Séance
// introuvable" — un compte avec plusieurs plans n'a pas forcément son plan
// le plus récent comme étant celui réellement suivi).
// ---------------------------------------------------------------------------
async function actionListerPlans(config, email) {
  const user = await trouverUserIdParEmail(config, email);
  if (!user) return { status: 404, body: { message: "Aucun compte trouvé avec cette adresse e-mail." } };

  const plans = await chargerPlansActifUtilisateur(config, user.id);
  return {
    status: 200,
    body: {
      success: true,
      plans: plans.map((p) => ({
        id: p.id,
        nom: p.nom,
        mode: p.plan_brut?.mode || "course",
        distance: p.plan_brut?.distance || null,
        objectif: p.plan_brut?.objectif || null,
        dateDebut: p.plan_brut?.dateDebut || null,
        dateCourse: p.plan_brut?.dateCourse || null,
        dateCloture: p.plan_brut?.dateCloture || null,
        createdAt: p.created_at,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// Action 1 — Recalculer le badge km cumulés (portage de
// recalculerKmComptesPourUid + le bouton "Maintenance", index.html).
// Contrairement à la version cliente (qui traitait le plan ACTUEL depuis la
// mémoire du navigateur + les AUTRES plans depuis Supabase), cette version
// serveur lit TOUS les plans du compte ciblé directement depuis Supabase —
// pas d'état mémoire équivalent côté serveur, donc un seul chemin de
// lecture pour tous les plans plutôt que deux.
// ---------------------------------------------------------------------------
async function actionRecalculerKm(config, email) {
  const user = await trouverUserIdParEmail(config, email);
  if (!user) return { status: 404, body: { message: "Aucun compte trouvé avec cette adresse e-mail." } };

  const plans = await chargerPlansActifUtilisateur(config, user.id);
  if (!plans.length) {
    return { status: 200, body: { success: true, message: "Aucun plan pour ce compte, rien à recalculer.", kmCumulesTotal: 0 } };
  }

  let totalGlobal = 0;
  let kmComptesParUidPlanLePlusRecent = null;
  let planLePlusRecentId = plans[0].id; // déjà trié created_at.desc

  const stravaActivities = await chargerStravaActivitiesUtilisateur(config, user.id);

  for (const plan of plans) {
    try {
      const donnees = await chargerPlanDonnees(config, plan.id);
      const statuts = donnees.lk_statuses || {};
      const manualPerf = donnees.lk_manual_perf || {};

      if (!plan.plan_brut?.dateDebut || !Array.isArray(plan.plan_brut?.semaines)) {
        console.warn("Recalcul km : plan sans dateDebut/semaines exploitables, ignoré :", plan.id);
        continue;
      }

      const planTraduit = traduirePlanVersFormatV1(plan.plan_brut);
      if (!planTraduit?.length) continue;

      const kmComptesParUidCePlan = {};
      planTraduit.forEach((semaine) => {
        semaine.sessions.forEach((s, i) => {
          const uid = `${semaine.week}-${i}`;
          const statut = statuts[uid] || "—";
          if (statut !== "✅" && statut !== "⚠️" && statut !== "❌") return;
          let km = 0;
          if (manualPerf[uid]?.distance) {
            km = manualPerf[uid].distance;
          } else {
            const run = stravaActivities.find(
              (a) => (a.type === "Run" || a.sport_type === "Run") && a.start_date_local?.slice(0, 10) === s.date,
            );
            if (run?.distance) km = run.distance / 1000;
          }
          if (km > 0) {
            kmComptesParUidCePlan[uid] = km;
            totalGlobal += km;
          }
        });
      });

      if (plan.id === planLePlusRecentId) {
        kmComptesParUidPlanLePlusRecent = kmComptesParUidCePlan;
      }
    } catch (err) {
      console.error("Recalcul km (maintenance admin) : traitement d'un plan échoué, ignoré :", plan.id, err.message, err.stack);
    }
  }

  const kmCumulesTotal = Math.round(totalGlobal * 10) / 10;

  await ecrireProfilCoureur(config, user.id, { kmCumulesTotal });
  if (planLePlusRecentId && kmComptesParUidPlanLePlusRecent) {
    const donneesExistantes = await chargerPlanDonnees(config, planLePlusRecentId);
    await supabaseRequest(config, "plan_donnees", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        plan_id: planLePlusRecentId,
        user_id: user.id,
        data: { ...donneesExistantes, lk_km_comptes_par_uid: kmComptesParUidPlanLePlusRecent },
      }),
    });
  }

  return {
    status: 200,
    body: { success: true, message: `Badge recalculé (tous plans confondus) : ${kmCumulesTotal} km.`, kmCumulesTotal },
  };
}

// ---------------------------------------------------------------------------
// Action 2 — Vérifier/réparer la cohérence des phases (portage de
// reparerCoherencePhasesApp).
// ---------------------------------------------------------------------------
async function actionReparerPhases(config, email, planId) {
  const user = await trouverUserIdParEmail(config, email);
  if (!user) return { status: 404, body: { message: "Aucun compte trouvé avec cette adresse e-mail." } };

  const plans = await chargerPlansActifUtilisateur(config, user.id);
  if (!plans.length) return { status: 404, body: { message: "Aucun plan actif pour ce compte." } };

  const { plan: planCible, erreur } = resoudrePlanCible(plans, planId);
  if (erreur) return { status: 404, body: { message: erreur } };

  const planBrut = planCible.plan_brut;
  const planIdCible = planCible.id;

  if (!planBrut?.paramsOrigine || !planBrut?.profilOrigine) {
    return { status: 200, body: { success: false, message: "Ce plan ne peut pas être réparé automatiquement (paramsOrigine/profilOrigine absents)." } };
  }

  const { totalSemaines: totalSemainesReel, phases: phasesReelles } = Engine.computePhases({
    dateDebut: planBrut.dateDebut,
    dateCourse: planBrut.dateCourse,
    distance: planBrut.paramsOrigine.distance,
    niveau: planBrut.profilOrigine.niveau,
    ampleurObjectif: planBrut.ampleurObjectif ?? "moderee",
  });

  let curseur = 0;
  const bornesPhases = phasesReelles.map((p) => {
    const debut = curseur;
    curseur += p.semaines;
    return { nom: p.nom, debut, fin: curseur };
  });
  const vraiePhaseDe = (semaineNum) => {
    const b = bornesPhases.find((b) => semaineNum > b.debut && semaineNum <= b.fin);
    return b?.nom ?? null;
  };

  const semainesIncoherentes = planBrut.semaines.filter((s) => {
    const vraie = vraiePhaseDe(s.semaineNum);
    return vraie && vraie !== s.phase;
  });

  if (semainesIncoherentes.length === 0) {
    return { status: 200, body: { success: true, message: "Aucune incohérence détectée — rien à réparer.", reparees: [] } };
  }

  planBrut.phases = phasesReelles;

  const alluresSec = Engine.computeAllures({
    refTimeSeconds: Engine.parseTimeToSeconds(planBrut.paramsOrigine.tempsReference),
    refDistanceKm: Engine.KM_BY_DISTANCE[planBrut.paramsOrigine.refDistance ?? planBrut.paramsOrigine.distance],
    objectifTimeSeconds: Engine.parseTimeToSeconds(planBrut.paramsOrigine.objectif),
    distanceCibleKm: Engine.KM_BY_DISTANCE[planBrut.paramsOrigine.distance],
  });
  const tempsRef10KSec = Engine.riegelPredict(
    Engine.parseTimeToSeconds(planBrut.paramsOrigine.tempsReference),
    Engine.KM_BY_DISTANCE[planBrut.paramsOrigine.refDistance ?? planBrut.paramsOrigine.distance],
    10,
  );

  for (const semaine of semainesIncoherentes) {
    const vraiePhase = vraiePhaseDe(semaine.semaineNum);
    semaine.phase = vraiePhase;

    const semainesMemePhaseTriees = planBrut.semaines
      .filter((s) => s.phase === vraiePhase)
      .sort((a, b) => a.semaineNum - b.semaineNum);
    const semaineDansPhase = semainesMemePhaseTriees.findIndex((s) => s.semaineNum === semaine.semaineNum);

    let kmQualiteTotal = 0;
    for (const seance of Object.values(semaine.assignment)) {
      if (seance.type !== "qualite") continue;
      if (seance.estTest || seance.estCourse || seance.estCourseIntermediaire) {
        kmQualiteTotal += seance.kmEstime ?? 0;
        continue;
      }
      const { sousType, contenu, kmEstime, structureIntervalles } = Engine.genererContenuQualite({
        distance: planBrut.paramsOrigine.distance,
        phase: vraiePhase,
        semaineDansPhase: Math.max(0, semaineDansPhase),
        indexQualiteSemaine: seance.indexQualite ?? 0,
        alluresSec,
        restrictionsAllure: seance.restrictionsAllure,
        tauxAffutage: semaine.tauxAffutage ?? 1,
        estDechargeSemaine: semaine.estDechargeSemaine ?? false,
        niveau: planBrut.profilOrigine?.niveau,
        volumeHebdoCibleKm: semaine.volumeCibleKm,
        tempsRef10KSec,
      });
      seance.sousType = sousType;
      seance.contenu = contenu;
      seance.kmEstime = kmEstime;
      seance.structureIntervalles = structureIntervalles;
      kmQualiteTotal += kmEstime;
    }

    if (semaine.volumeCibleKm != null) {
      const nbEF = Object.values(semaine.assignment).filter((s) => s.type === "ef").length;
      const aLongue = Object.values(semaine.assignment).some((s) => s.type === "longue");
      const { kmLongue, kmParEF } = Engine.repartirVolumeSemaine({
        volumeCibleKm: semaine.volumeCibleKm,
        kmQualiteTotal,
        nbEF,
        aLongue,
        nbJours: Object.keys(semaine.assignment).length,
      });
      for (const seance of Object.values(semaine.assignment)) {
        if (seance.type === "ef") {
          const { contenu, kmEstime } = Engine.genererContenuEF({
            alluresSec,
            kmCible: kmParEF,
            role: seance.role === "recuperation" ? "recuperation" : "standard",
          });
          seance.contenu = contenu;
          seance.kmEstime = kmEstime;
        } else if (seance.type === "longue") {
          const { contenu, kmEstime } = Engine.genererContenuLongue({
            distance: planBrut.paramsOrigine.distance,
            phase: vraiePhase,
            alluresSec,
            kmCible: kmLongue,
          });
          seance.contenu = contenu;
          seance.kmEstime = kmEstime;
        }
      }
    }
  }

  await ecrirePlanBrut(config, planIdCible, planBrut);

  return {
    status: 200,
    body: {
      success: true,
      message: `${semainesIncoherentes.length} semaine(s) réparée(s) : ${semainesIncoherentes.map((s) => "S" + s.semaineNum).join(", ")}.`,
      reparees: semainesIncoherentes.map((s) => s.semaineNum),
    },
  };
}

// ---------------------------------------------------------------------------
// Action 3 — Corriger une séance qualité précise, EN SAISIE DIRECTE
// (20/08/2026, réécrite suite à un test réel : le nombre de répétitions
// généré était incohérent).
//
// genererContenuQualite() du moteur ne permet PAS de demander "génère-moi
// le contenu détaillé pour CE sous-type précis" — elle détermine TOUJOURS
// elle-même le sous-type à partir de sa position dans ROTATION_SOUS_TYPE
// (rotation[(semaineDansPhase + indexQualiteSemaine) % rotation.length]).
// La première version de cet outil contournait ça en calculant une valeur
// artificielle de semaineDansPhase, choisie uniquement pour que la
// rotation retombe sur le sous-type demandé — mais ce même paramètre pilote
// aussi le nombre de répétitions générées (reduireSelonNiveauProgression),
// donc le nombre de reps produit n'avait plus de rapport avec la vraie
// progression du coureur à cette semaine. Corriger le calcul de
// semaineDansPhase pour qu'il soit réaliste résout le nombre de reps, mais
// casse alors le forçage du sous-type (la rotation retombe sur le sous-type
// "naturel", pas celui demandé) — les deux ne peuvent pas être corrects
// simultanément en passant par cette fonction, elle n'a pas été conçue pour
// un forçage explicite.
//
// Solution retenue avec Laurent : sortir complètement de
// genererContenuQualite() pour cette action. L'admin saisit directement le
// sous-type, le nombre de répétitions, la durée (ou distance) de chaque
// répétition, et le temps de récupération — la séance est construite
// manuellement à partir de ces valeurs, avec le même format texte que le
// moteur produit normalement (cohérent avec l'affichage habituel de l'app,
// cf. parserContenuQualite dans v1-bridge.js qui attend ce format précis :
// "Échauffement Xmin @ ... (EF) + [corps] + Retour au calme Ymin @ ...
// (EF)"). Échauffement/retour au calme restent calculés par le moteur
// (DUREE_ECHAUFFEMENT_MIN/DUREE_RETOUR_CALME_MIN, valeurs fixes 15/10min
// non affectées par le problème de progression ci-dessus).
// ---------------------------------------------------------------------------

const ALLURE_PAR_SOUS_TYPE = {
  'seuil-court': 'T', 'seuil': 'T', 'seuil-negatif': 'T', 'seuil-2min': 'T', 'tempo-court': 'T',
  'i-30-30': 'I', 'i-3min': 'I', 'pyramidale': 'I',
  'vitesse': 'V', 'cotes': 'V',
  'allure-course': 'C', 'allure-course-court': 'C',
};

const LABEL_PAR_SOUS_TYPE = {
  'seuil-court': 'Seuil', 'seuil': 'Seuil', 'seuil-negatif': 'Seuil', 'seuil-2min': 'Seuil', 'tempo-court': 'Seuil léger',
  'i-30-30': 'VMA', 'i-3min': 'VMA', 'pyramidale': 'VMA',
  'vitesse': 'Vitesse', 'cotes': 'effort soutenu (côte)',
  'allure-course': 'allure course', 'allure-course-court': 'allure course',
};

async function actionChangerSousTypeSeance(config, email, semaineNum, jourIndex, nouveauSousType, planId, repetitions, dureeEffortSec, dureeRecupSec) {
  const user = await trouverUserIdParEmail(config, email);
  if (!user) return { status: 404, body: { message: "Aucun compte trouvé avec cette adresse e-mail." } };

  const plans = await chargerPlansActifUtilisateur(config, user.id);
  if (!plans.length) return { status: 404, body: { message: "Aucun plan actif pour ce compte." } };

  const { plan: planCible, erreur } = resoudrePlanCible(plans, planId);
  if (erreur) return { status: 404, body: { message: erreur } };

  const planBrut = planCible.plan_brut;
  const planIdCible = planCible.id;

  if (!planBrut?.paramsOrigine || !planBrut?.profilOrigine) {
    return { status: 200, body: { success: false, message: "Ce plan ne peut pas être modifié directement (paramsOrigine/profilOrigine absents)." } };
  }

  // Résolution position affichée -> physique (cf. resoudrePositionAffichee)
  // AVANT toute lecture de assignment — jourIndex reçu ici vient d'une
  // communication humaine (semaine + jour tels que VUS dans l'app), qui
  // peut différer du jour physiquement stocké si la séance a été déplacée
  // via la fonction d'échange.
  const { jourIndexPhysique, futEchangee } = await resoudrePositionAffichee(config, planIdCible, semaineNum, jourIndex);

  const semaine = planBrut.semaines.find((s) => s.semaineNum === semaineNum);
  const seance = semaine?.assignment?.[jourIndexPhysique];
  if (!seance || seance.type !== "qualite") {
    const suffixeEchange = futEchangee ? ` (position résolue depuis un échange : jour affiché ${jourIndex} -> jour physique ${jourIndexPhysique})` : "";
    if (!semaine) {
      const semainesDisponibles = planBrut.semaines.map((s) => s.semaineNum).join(", ");
      return { status: 404, body: { message: `Semaine ${semaineNum} introuvable dans ce plan. Semaines disponibles : ${semainesDisponibles}.` } };
    }
    const joursDisponibles = Object.keys(semaine.assignment || {}).join(", ");
    if (!seance) {
      return { status: 404, body: { message: `Semaine ${semaineNum} trouvée, mais aucun jour "${jourIndexPhysique}" dans son assignment${suffixeEchange}. Jours présents : [${joursDisponibles}].` } };
    }
    return { status: 404, body: { message: `Semaine ${semaineNum}, jour ${jourIndexPhysique} trouvé${suffixeEchange}, mais son type est "${seance.type}" (pas "qualite"). Contenu : ${seance.contenu || "(vide)"}` } };
  }

  const alluresSec = Engine.computeAllures({
    refTimeSeconds: Engine.parseTimeToSeconds(planBrut.paramsOrigine.tempsReference),
    refDistanceKm: Engine.KM_BY_DISTANCE[planBrut.paramsOrigine.refDistance ?? planBrut.paramsOrigine.distance],
    objectifTimeSeconds: Engine.parseTimeToSeconds(planBrut.paramsOrigine.objectif),
    distanceCibleKm: Engine.KM_BY_DISTANCE[planBrut.paramsOrigine.distance],
  });

  const zoneAllure = ALLURE_PAR_SOUS_TYPE[nouveauSousType];
  if (!zoneAllure) {
    return { status: 400, body: { message: `Sous-type "${nouveauSousType}" non reconnu.` } };
  }
  const paceEffortSec = alluresSec[zoneAllure];
  const paceE = alluresSec.E;

  // Facteur de réduction identique à celui du moteur (Affûtage/décharge) —
  // seul point encore emprunté au calcul normal, cohérent avec le reste
  // du plan pour l'échauffement/retour au calme.
  const facteurReduction = semaine.estDechargeSemaine ? 0.75 : (semaine.phase === 'Affutage' ? (semaine.tauxAffutage ?? 1) : 1);
  const dureeEchauffementMin = Math.max(8, Math.round(15 * facteurReduction));
  const dureeRetourCalmeMin = Math.max(5, Math.round(10 * facteurReduction));
  const kmEchauffement = (dureeEchauffementMin * 60) / paceE;
  const kmRetourCalme = (dureeRetourCalmeMin * 60) / paceE;

  const kmDepuisSec = (sec) => sec / paceEffortSec;
  const kmCorps = kmDepuisSec(repetitions * dureeEffortSec);
  const kmEstime = kmCorps + kmEchauffement + kmRetourCalme;

  const labelSousType = LABEL_PAR_SOUS_TYPE[nouveauSousType] || nouveauSousType;
  const formatPaceLocal = (secPerKm) => {
    const total = Math.round(secPerKm);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}/km`;
  };
  const dureeEffortLabel = dureeEffortSec % 60 === 0 ? `${dureeEffortSec / 60}min` : `${dureeEffortSec}s`;
  const dureeRecupLabel = dureeRecupSec % 60 === 0 ? `${dureeRecupSec / 60}min` : `${dureeRecupSec}s`;
  const corpsTexte = `${repetitions}×${dureeEffortLabel} @ ${formatPaceLocal(paceEffortSec)} (${labelSousType}), récup ${dureeRecupLabel}`;

  const contenu = `Échauffement ${dureeEchauffementMin}min @ ${formatPaceLocal(paceE)} (EF) + ${corpsTexte} + Retour au calme ${dureeRetourCalmeMin}min @ ${formatPaceLocal(paceE)} (EF)`;

  const structureIntervalles = {
    blocs: [{ repetitions, dureeEffortSec, allure: formatPaceLocal(paceEffortSec), dureeRecupSec }],
    echauffementSec: dureeEchauffementMin * 60,
    retourCalmeSec: dureeRetourCalmeMin * 60,
    allureEchauffement: formatPaceLocal(paceE),
  };

  seance.sousType = nouveauSousType;
  seance.contenu = contenu;
  seance.kmEstime = kmEstime;
  seance.structureIntervalles = structureIntervalles;

  await ecrirePlanBrut(config, planIdCible, planBrut);

  const suffixeEchangeSucces = futEchangee ? ` (jour affiché ${jourIndex} résolu vers jour physique ${jourIndexPhysique} suite à un échange)` : "";
  return { status: 200, body: { success: true, message: `Séance S${semaineNum} mise à jour : ${repetitions}×${dureeEffortLabel} ${labelSousType}, récup ${dureeRecupLabel}${suffixeEchangeSucces}.` } };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Frame-Options", "DENY");

  const config = {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    password: process.env.BETA_ADMIN_PASSWORD,
  };

  if (!config.supabaseUrl || !config.supabaseKey || !config.password) {
    console.error("beta-admin-maintenance : configuration incomplète", {
      supabaseUrl: !!config.supabaseUrl,
      supabaseKey: !!config.supabaseKey,
      password: !!config.password,
    });
    return json(response, 500, { message: "Configuration administrateur incomplète (variable d'environnement manquante côté serveur)." });
  }

  const cookies = parseCookies(request.headers.cookie);
  if (!isValidToken(cookies[COOKIE], config.password)) {
    return json(response, 401, { message: "Authentification requise." });
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { message: "Méthode non autorisée." });
  }

  const body = request.body || {};
  const action = String(body.action || "");
  const email = String(body.email || "").trim().toLowerCase();

  if (!email) {
    return json(response, 400, { message: "Adresse e-mail manquante." });
  }

  try {
    if (action === "lister_plans") {
      const result = await actionListerPlans(config, email);
      return json(response, result.status, result.body);
    }

    if (action === "recalculer_km") {
      const result = await actionRecalculerKm(config, email);
      return json(response, result.status, result.body);
    }

    if (action === "reparer_phases") {
      const planId = String(body.planId || "").trim() || null;
      const result = await actionReparerPhases(config, email, planId);
      return json(response, result.status, result.body);
    }

    if (action === "changer_sous_type_seance") {
      const semaineNum = Number(body.semaineNum);
      const jourIndex = Number(body.jourIndex);
      const nouveauSousType = String(body.nouveauSousType || "");
      const planId = String(body.planId || "").trim() || null;
      const repetitions = Number(body.repetitions);
      const dureeEffortSec = Number(body.dureeEffortSec);
      const dureeRecupSec = Number(body.dureeRecupSec);
      if (
        !Number.isFinite(semaineNum) || !Number.isFinite(jourIndex) || !nouveauSousType ||
        !Number.isFinite(repetitions) || repetitions <= 0 ||
        !Number.isFinite(dureeEffortSec) || dureeEffortSec <= 0 ||
        !Number.isFinite(dureeRecupSec) || dureeRecupSec < 0
      ) {
        return json(response, 400, { message: "Paramètres manquants ou invalides (semaineNum, jourIndex, nouveauSousType, repetitions, dureeEffortSec, dureeRecupSec)." });
      }
      const result = await actionChangerSousTypeSeance(config, email, semaineNum, jourIndex, nouveauSousType, planId, repetitions, dureeEffortSec, dureeRecupSec);
      return json(response, result.status, result.body);
    }

    return json(response, 400, { message: `Action inconnue : "${action}".` });
  } catch (error) {
    console.error("Erreur beta-admin-maintenance :", action, email, error?.message, error?.stack);
    const messageClient = error?.message?.trim() || `Une erreur inattendue est survenue pendant l'action "${action}" (voir les logs serveur).`;
    return json(response, 500, { message: messageClient });
  }
}
