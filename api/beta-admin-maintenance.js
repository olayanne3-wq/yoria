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

async function chargerPlanDonnees(config, planId) {
  const rows = await supabaseRequest(
    config,
    `plan_donnees?plan_id=eq.${encodeURIComponent(planId)}&select=data`,
    { method: "GET" },
  );
  return Array.isArray(rows) && rows[0] ? rows[0].data || {} : {};
}

async function ecrirePlanBrut(config, planId, planBrutComplet) {
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

  for (const plan of plans) {
    try {
      const donnees = await chargerPlanDonnees(config, plan.id);
      const statuts = donnees.lk_statuses || {};
      const manualPerf = donnees.lk_manual_perf || {};
      const stravaActivities = donnees.lk_strava_activities || [];

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
async function actionReparerPhases(config, email) {
  const user = await trouverUserIdParEmail(config, email);
  if (!user) return { status: 404, body: { message: "Aucun compte trouvé avec cette adresse e-mail." } };

  const plans = await chargerPlansActifUtilisateur(config, user.id);
  if (!plans.length) return { status: 404, body: { message: "Aucun plan actif pour ce compte." } };

  const planBrut = plans[0].plan_brut;
  const planId = plans[0].id;

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

  await ecrirePlanBrut(config, planId, planBrut);

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
// Action 3 — Corriger le sous-type d'une séance qualité précise.
// ---------------------------------------------------------------------------
async function actionChangerSousTypeSeance(config, email, semaineNum, jourIndex, nouveauSousType) {
  const user = await trouverUserIdParEmail(config, email);
  if (!user) return { status: 404, body: { message: "Aucun compte trouvé avec cette adresse e-mail." } };

  const plans = await chargerPlansActifUtilisateur(config, user.id);
  if (!plans.length) return { status: 404, body: { message: "Aucun plan actif pour ce compte." } };

  const planBrut = plans[0].plan_brut;
  const planId = plans[0].id;

  if (!planBrut?.paramsOrigine || !planBrut?.profilOrigine) {
    return { status: 200, body: { success: false, message: "Ce plan ne peut pas être modifié directement (paramsOrigine/profilOrigine absents)." } };
  }

  const semaine = planBrut.semaines.find((s) => s.semaineNum === semaineNum);
  const seance = semaine?.assignment?.[jourIndex];
  if (!seance || seance.type !== "qualite") {
    return { status: 404, body: { message: "Séance introuvable." } };
  }

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

  const distance = planBrut.paramsOrigine.distance;
  const rotation = Engine.ROTATION_SOUS_TYPE?.[distance]?.[semaine.phase];
  let semaineDansPhaseChoisie = 0;
  if (rotation) {
    const idx = rotation.indexOf(nouveauSousType);
    if (idx >= 0) semaineDansPhaseChoisie = idx - (seance.indexQualite ?? 0);
  }

  const { sousType, contenu, kmEstime, structureIntervalles } = Engine.genererContenuQualite({
    distance,
    phase: semaine.phase,
    semaineDansPhase: Math.max(0, semaineDansPhaseChoisie),
    indexQualiteSemaine: seance.indexQualite ?? 0,
    alluresSec,
    restrictionsAllure: seance.restrictionsAllure,
    tauxAffutage: semaine.tauxAffutage ?? 1,
    estDechargeSemaine: semaine.estDechargeSemaine ?? false,
    niveau: planBrut.profilOrigine?.niveau,
    volumeHebdoCibleKm: semaine.volumeCibleKm,
    tempsRef10KSec,
  });

  if (sousType !== nouveauSousType) {
    return { status: 200, body: { success: false, message: `Impossible de générer une séance "${nouveauSousType}" pour cette phase/distance.` } };
  }

  seance.sousType = sousType;
  seance.contenu = contenu;
  seance.kmEstime = kmEstime;
  seance.structureIntervalles = structureIntervalles;

  await ecrirePlanBrut(config, planId, planBrut);

  return { status: 200, body: { success: true, message: `Séance S${semaineNum} mise à jour : ${sousType}.` } };
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
    if (action === "recalculer_km") {
      const result = await actionRecalculerKm(config, email);
      return json(response, result.status, result.body);
    }

    if (action === "reparer_phases") {
      const result = await actionReparerPhases(config, email);
      return json(response, result.status, result.body);
    }

    if (action === "changer_sous_type_seance") {
      const semaineNum = Number(body.semaineNum);
      const jourIndex = Number(body.jourIndex);
      const nouveauSousType = String(body.nouveauSousType || "");
      if (!Number.isFinite(semaineNum) || !Number.isFinite(jourIndex) || !nouveauSousType) {
        return json(response, 400, { message: "Paramètres manquants (semaineNum, jourIndex, nouveauSousType)." });
      }
      const result = await actionChangerSousTypeSeance(config, email, semaineNum, jourIndex, nouveauSousType);
      return json(response, result.status, result.body);
    }

    return json(response, 400, { message: `Action inconnue : "${action}".` });
  } catch (error) {
    console.error("Erreur beta-admin-maintenance :", action, email, error?.message, error?.stack);
    const messageClient = error?.message?.trim() || `Une erreur inattendue est survenue pendant l'action "${action}" (voir les logs serveur).`;
    return json(response, 500, { message: messageClient });
  }
}
