// Yoria — api/backup.js
// Sauvegarde et réinjection de données Supabase, accessible depuis
// beta-admin (onglet "Sauvegarde"). Ajouté le 01/08/2026 — le plan
// Supabase actuel est Free, qui n'a AUCUNE sauvegarde automatique
// (ni Daily Backups, ni PITR — ces deux fonctionnalités démarrent au
// plan Pro). Ce fichier comble ce manque via deux exports et une
// réinjection, plutôt qu'un abonnement Supabase payant, tant que Yoria
// reste en bêta solo/petit panel de testeurs (cf. inventaire §16).
//
// Authentification : réutilise EXACTEMENT le même cookie de session que
// api/beta-admin.js (même secret BETA_ADMIN_PASSWORD, même format de
// token HMAC) — ce fichier n'introduit pas un second système d'auth,
// pour rester cohérent avec le reste de l'admin bêta. Exception : les
// requêtes cron (GET uniquement) portent l'en-tête
// `Authorization: Bearer CRON_SECRET` généré automatiquement par Vercel
// et sont acceptées sans cookie — cf. section "Sauvegardes automatiques"
// plus bas.
//
// Découverte des tables — auto via information_schema.tables (schéma
// public), PAS de liste blanche codée en dur. Toute nouvelle table créée
// plus tard dans le projet est automatiquement incluse au prochain export,
// sans toucher à ce fichier — c'est le point central de la conception
// (cf. discussion de conception du 01/08/2026, "évolutif s'il y a des
// ajouts"). Seule une LISTE NOIRE d'exclusion existe (TABLES_EXCLUES),
// jamais une liste blanche — cohérent avec le principe déjà en place pour
// le module "Comptes" : ne jamais lire/exposer les tokens Strava d'un
// testeur. Toute future table sensible (nouveaux tokens, secrets) DOIT
// être ajoutée à TABLES_EXCLUES au moment de sa création.
//
// Portée RGPD (cf. discussion de conception du 01/08/2026) — ce mécanisme
// sert UNIQUEMENT à réparer une perte accidentelle (bug applicatif,
// mauvaise manipulation), jamais à contourner une suppression de compte
// volontaire au titre du droit à l'effacement (art. 17 RGPD). Un export
// téléchargé ou stocké sur Vercel Blob doit être traité comme temporaire
// (cf. rétention 7 jours ci-dessous) — pas un filet permanent équivalent
// à une non-suppression.
//
// ============================================================
// Sauvegardes automatiques (21/08/2026)
// ============================================================
// 3 crons Vercel (vercel.json, horaires distincts — le plan Hobby limite
// chaque cron à 1 exécution/jour, 3 crons séparés contournent cette
// limite sans passer Pro) appellent GET /api/backup avec l'en-tête
// `Authorization: Bearer ${CRON_SECRET}` (variable d'env auto-
// provisionnée par Vercel, rien à définir manuellement). Ce chemin :
//   1. authentifie via CRON_SECRET (ni cookie, ni mot de passe admin) ;
//   2. génère un export global (exportGlobal(), identique à l'export
//      manuel) ;
//   3. l'uploade sur Vercel Blob, nom horodaté
//      `backups/auto-AAAA-MM-JJTHH-mm.json` ;
//   4. purge les fichiers du dossier `backups/` vieux de plus de
//      RETENTION_JOURS (7) — glissant, pas d'accumulation illimitée.
// Toute requête GET sans cookie NI Bearer valide continue de recevoir
// 401 comme avant — ce chemin s'ajoute, ne remplace rien.
//
// Nécessite la variable d'env BLOB_READ_WRITE_TOKEN (auto-provisionnée
// par Vercel dès qu'un store Blob est créé sur le projet) et le paquet
// @vercel/blob en dépendance.

import { put, list, del, get } from '@vercel/blob';

const TABLES_EXCLUES = [];

const COLONNES_USER = ['user_id', 'id_utilisateur'];

const RETENTION_JOURS = 7;
const PREFIXE_BLOB_AUTO = 'backups/auto-';

const json = (response, status, payload) =>
  response.status(status).json(payload);

async function supabaseRequest(config, path, options = {}) {
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        apikey: config.supabaseKey,
        Authorization: `Bearer ${config.supabaseKey}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    },
  );

  const text = await response.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // La réponse reste du texte.
  }

  if (!response.ok) {
    console.error('[backup] Erreur Supabase REST :', response.status, data);
    const err = new Error(
      (data && data.message) || `Erreur Supabase (${response.status})`,
    );
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

async function listerTables(config) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: config.supabaseKey,
      Authorization: `Bearer ${config.supabaseKey}`,
    },
  });

  if (!response.ok) {
    throw new Error("Impossible de découvrir la liste des tables (introspection PostgREST).");
  }

  const spec = await response.json();
  const definitions = spec.definitions || spec.components?.schemas || {};

  const tables = Object.keys(definitions).filter(
    (name) => !TABLES_EXCLUES.includes(name),
  );

  return tables;
}

async function exporterTableComplete(config, table) {
  try {
    const rows = await supabaseRequest(
      config,
      `${table}?select=*`,
      { method: 'GET' },
    );
    return { table, rows: Array.isArray(rows) ? rows : [], erreur: null };
  } catch (error) {
    return { table, rows: [], erreur: error.message };
  }
}

async function exportGlobal(config) {
  const tables = await listerTables(config);
  const resultats = await Promise.all(
    tables.map((table) => exporterTableComplete(config, table)),
  );

  const donnees = {};
  const erreurs = [];
  for (const r of resultats) {
    donnees[r.table] = r.rows;
    if (r.erreur) erreurs.push({ table: r.table, erreur: r.erreur });
  }

  return {
    type: 'export_global',
    genereLe: new Date().toISOString(),
    tables: tables.length,
    donnees,
    erreurs,
  };
}

function filtrerLignesUtilisateur(rows, userId) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const colonne = COLONNES_USER.find((c) => Object.prototype.hasOwnProperty.call(rows[0], c));
  if (!colonne) return null;
  return rows.filter((row) => row[colonne] === userId);
}

async function exporterDecisions(config, userId) {
  const events = await supabaseRequest(
    config,
    `decision_events?user_id=eq.${encodeURIComponent(userId)}&select=*`,
    { method: 'GET' },
  );

  const eventIds = (events || []).map((e) => e.id);
  let outcomes = [];
  if (eventIds.length > 0) {
    const filtreIds = eventIds.map((id) => encodeURIComponent(id)).join(',');
    outcomes = await supabaseRequest(
      config,
      `decision_outcomes?decision_event_id=in.(${filtreIds})&select=*`,
      { method: 'GET' },
    );
  }

  return { decision_events: events || [], decision_outcomes: outcomes || [] };
}

async function exportUtilisateur(config, email) {
  const usersResponse = await fetch(`${config.supabaseUrl}/auth/v1/admin/users`, {
    headers: {
      apikey: config.supabaseKey,
      Authorization: `Bearer ${config.supabaseKey}`,
    },
  });

  if (!usersResponse.ok) {
    throw new Error("Erreur lors de la recherche du compte.");
  }

  const usersData = await usersResponse.json();
  const users = Array.isArray(usersData) ? usersData : usersData.users || [];
  const user = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());

  if (!user) {
    const err = new Error("Aucun compte trouvé avec cette adresse e-mail.");
    err.status = 404;
    throw err;
  }

  const tables = await listerTables(config);
  const tablesGeneriques = tables.filter(
    (t) => t !== 'decision_events' && t !== 'decision_outcomes',
  );

  const donnees = {};
  const tablesSansNotionUtilisateur = [];
  const erreurs = [];

  for (const table of tablesGeneriques) {
    const { rows, erreur } = await exporterTableComplete(config, table);
    if (erreur) {
      erreurs.push({ table, erreur });
      continue;
    }
    const filtrees = filtrerLignesUtilisateur(rows, user.id);
    if (filtrees === null) {
      tablesSansNotionUtilisateur.push(table);
      continue;
    }
    donnees[table] = filtrees;
  }

  if (tablesSansNotionUtilisateur.includes('beta_testers')) {
    try {
      const candidats = await supabaseRequest(
        config,
        `beta_testers?email=eq.${encodeURIComponent(email)}&select=*`,
        { method: 'GET' },
      );
      donnees.beta_testers = candidats || [];
    } catch (error) {
      erreurs.push({ table: 'beta_testers', erreur: error.message });
    }
  }

  try {
    const decisions = await exporterDecisions(config, user.id);
    donnees.decision_events = decisions.decision_events;
    donnees.decision_outcomes = decisions.decision_outcomes;
  } catch (error) {
    erreurs.push({ table: 'decision_events/decision_outcomes', erreur: error.message });
  }

  return {
    type: 'export_utilisateur',
    genereLe: new Date().toISOString(),
    utilisateur: { id: user.id, email: user.email },
    donnees,
    tablesIgnorees: tablesSansNotionUtilisateur.filter((t) => t !== 'beta_testers'),
    erreurs,
  };
}

const ORDRE_REINJECTION = ['decision_events', 'decision_outcomes'];

function trierTablesPourReinjection(nomsTables) {
  const dansOrdre = ORDRE_REINJECTION.filter((t) => nomsTables.includes(t));
  const reste = nomsTables.filter((t) => !ORDRE_REINJECTION.includes(t));
  return [...reste, ...dansOrdre];
}

function verifierCoherenceIdDonnees(id, donnees) {
  for (const rows of Object.values(donnees || {})) {
    if (!Array.isArray(rows)) continue;
    if (rows.some((row) => row.user_id === id)) return true;
  }
  return false;
}

async function recreerUtilisateurSiAbsent(config, utilisateur, donnees) {
  const checkResponse = await fetch(
    `${config.supabaseUrl}/auth/v1/admin/users/${utilisateur.id}`,
    {
      headers: {
        apikey: config.supabaseKey,
        Authorization: `Bearer ${config.supabaseKey}`,
      },
    },
  );

  if (checkResponse.ok) {
    return { recree: false };
  }

  if (!verifierCoherenceIdDonnees(utilisateur.id, donnees)) {
    const err = new Error(
      `L'identifiant ${utilisateur.id} ne correspond à aucune ligne dans les données à réinjecter pour ${utilisateur.email} — recréer le compte avec cet id créerait un compte vide plutôt que de retrouver ses vraies données. Vérifie que l'id est correct (relis-le depuis le fichier JSON), ou que le fichier chargé contient bien les données de cet utilisateur.`,
    );
    err.status = 409;
    throw err;
  }

  const motDePasseTemporaire = `Reinject-${Math.random().toString(36).slice(2)}-${Date.now()}`;

  const createResponse = await fetch(`${config.supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: config.supabaseKey,
      Authorization: `Bearer ${config.supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: utilisateur.id,
      email: utilisateur.email,
      password: motDePasseTemporaire,
      email_confirm: true,
    }),
  });

  if (!createResponse.ok) {
    const errText = await createResponse.text();
    throw new Error(`Échec de la recréation du compte auth : ${errText}`);
  }

  return { recree: true };
}

async function upsertLignes(config, table, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { table, count: 0, erreur: null };
  }

  try {
    await supabaseRequest(config, table, {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    });
    return { table, count: rows.length, erreur: null };
  } catch (error) {
    return { table, count: 0, erreur: error.message };
  }
}

async function retrouverUserIdParEmail(config, exportData, email, userIdManuel) {
  if (userIdManuel) return userIdManuel;

  const usersResponse = await fetch(`${config.supabaseUrl}/auth/v1/admin/users`, {
    headers: {
      apikey: config.supabaseKey,
      Authorization: `Bearer ${config.supabaseKey}`,
    },
  });

  if (usersResponse.ok) {
    const usersData = await usersResponse.json();
    const users = Array.isArray(usersData) ? usersData : usersData.users || [];
    const user = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (user) return user.id;
  }

  const abonnementsExport = exportData.donnees?.abonnements;
  if (Array.isArray(abonnementsExport)) {
    const abonnement = abonnementsExport.find(
      (row) => (row.email || '').toLowerCase() === email.toLowerCase(),
    );
    if (abonnement?.user_id) return abonnement.user_id;
  }

  const err = new Error(
    `Impossible de retrouver l'identifiant de ${email} — le compte n'existe plus et aucune donnée de l'export ne permet de le déduire. Renseigne son identifiant utilisateur manuellement (visible dans le fichier JSON, champ "user_id" d'une de ses lignes).`,
  );
  err.status = 404;
  err.besoinUserIdManuel = true;
  throw err;
}

async function filtrerExportGlobalParUtilisateur(config, exportData, email, userIdManuel) {
  const userId = await retrouverUserIdParEmail(config, exportData, email, userIdManuel);

  const donneesFiltrees = {};
  let totalLignesTrouvees = 0;
  const diagnosticParTable = {};

  for (const [table, rows] of Object.entries(exportData.donnees || {})) {
    if (table === 'beta_testers') {
      const lignes = (Array.isArray(rows) ? rows : []).filter(
        (row) => (row.email || '').toLowerCase() === email.toLowerCase(),
      );
      diagnosticParTable[table] = { avant: (rows || []).length, apres: lignes.length, mode: 'email' };
      if (lignes.length > 0) {
        donneesFiltrees[table] = lignes;
        totalLignesTrouvees += lignes.length;
      }
      continue;
    }

    if (table === 'decision_outcomes') {
      continue;
    }

    const filtrees = filtrerLignesUtilisateur(rows, userId);
    if (filtrees === null) {
      diagnosticParTable[table] = { avant: (rows || []).length, apres: null, mode: 'sans_colonne_utilisateur' };
      continue;
    }
    const echantillonUserIds = [...new Set((rows || []).map((r) => r.user_id).filter(Boolean))].slice(0, 3);
    diagnosticParTable[table] = { avant: (rows || []).length, apres: filtrees.length, mode: 'user_id', echantillonUserIds };
    if (filtrees.length > 0) {
      donneesFiltrees[table] = filtrees;
      totalLignesTrouvees += filtrees.length;
    }
  }

  if (Array.isArray(exportData.donnees?.decision_outcomes)) {
    const eventIds = new Set((donneesFiltrees.decision_events || []).map((e) => e.id));
    const outcomesFiltres = exportData.donnees.decision_outcomes.filter((o) =>
      eventIds.has(o.decision_event_id),
    );
    if (outcomesFiltres.length > 0) {
      donneesFiltrees.decision_outcomes = outcomesFiltres;
      totalLignesTrouvees += outcomesFiltres.length;
    }
  }

  if (totalLignesTrouvees === 0) {
    const err = new Error(
      `Aucune ligne trouvée pour ${email} (userId=${userId}) dans cet export. Vérifie l'adresse e-mail ou que cet export contient bien ses données.`,
    );
    err.status = 404;
    err.diagnosticParTable = diagnosticParTable;
    err.userId = userId;
    throw err;
  }

  return {
    type: 'export_utilisateur',
    genereLe: exportData.genereLe,
    utilisateur: { id: userId, email },
    diagnosticParTable,
    donnees: donneesFiltrees,
  };
}

async function reinjecter(config, exportDataBrut, filtrerEmail, userIdManuel) {
  if (!exportDataBrut || typeof exportDataBrut !== 'object' || !exportDataBrut.donnees) {
    const err = new Error("Fichier de sauvegarde invalide (champ 'donnees' manquant).");
    err.status = 400;
    throw err;
  }

  const diagnostic = {
    tablesDansFichierSource: Object.keys(exportDataBrut.donnees).length,
  };

  let exportData = exportDataBrut;

  if (filtrerEmail && exportDataBrut.type === 'export_global') {
    exportData = await filtrerExportGlobalParUtilisateur(config, exportDataBrut, filtrerEmail, userIdManuel);
    diagnostic.tablesApresFiltrage = Object.keys(exportData.donnees).length;
    diagnostic.parTable = exportData.diagnosticParTable;
    diagnostic.userIdUtilise = exportData.utilisateur?.id;
  }

  const rapport = { recreationCompte: null, tables: [], filtrePar: filtrerEmail || null, diagnostic };

  if (exportData.type === 'export_utilisateur' && exportData.utilisateur) {
    rapport.recreationCompte = await recreerUtilisateurSiAbsent(config, exportData.utilisateur, exportData.donnees);
  }

  const nomsTables = Object.keys(exportData.donnees);
  diagnostic.nomsTablesAvantTri = nomsTables;
  const ordre = trierTablesPourReinjection(nomsTables);
  diagnostic.nomsTablesApresTri = ordre;

  for (const table of ordre) {
    const rows = exportData.donnees[table];
    const resultat = await upsertLignes(config, table, rows);
    rapport.tables.push(resultat);
  }

  return rapport;
}

// ============================================================
// Sauvegardes automatiques — Vercel Blob (21/08/2026)
// ============================================================

function nomFichierAuto(date) {
  const iso = date.toISOString(); // ex. 2026-08-21T04:00:12.345Z
  const horodatage = iso.slice(0, 16).replace(/:/g, '-'); // 2026-08-21T04-00
  return `${PREFIXE_BLOB_AUTO}${horodatage}.json`;
}

async function purgerAnciennesSauvegardes() {
  const { blobs } = await list({ prefix: PREFIXE_BLOB_AUTO });
  const seuil = Date.now() - RETENTION_JOURS * 24 * 60 * 60 * 1000;
  const aSupprimer = blobs.filter((b) => new Date(b.uploadedAt).getTime() < seuil);

  if (aSupprimer.length === 0) {
    return { supprimes: 0 };
  }

  await del(aSupprimer.map((b) => b.url));
  return { supprimes: aSupprimer.length };
}

async function executerSauvegardeAutomatique(config) {
  const exportData = await exportGlobal(config);
  const contenu = JSON.stringify(exportData);
  const nom = nomFichierAuto(new Date());

  const blob = await put(nom, contenu, {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  const purge = await purgerAnciennesSauvegardes();

  return {
    type: 'sauvegarde_automatique',
    genereLe: exportData.genereLe,
    tables: exportData.tables,
    erreursExport: exportData.erreurs,
    blob: { url: blob.url, pathname: blob.pathname, taille: contenu.length },
    purge,
  };
}

async function listerSauvegardesAutomatiques() {
  const { blobs } = await list({ prefix: PREFIXE_BLOB_AUTO });
  return blobs
    .map((b) => ({
      pathname: b.pathname,
      url: b.url,
      taille: b.size,
      uploadedAt: b.uploadedAt,
    }))
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

// Store Blob créé en accès Private (21/08/2026, données personnelles de
// testeurs dans les exports) — en Private, TOUTE lecture (pas seulement
// l'écriture) requiert une authentification : un simple fetch(blob.url)
// échoue. On utilise donc get() du SDK, qui gère cette authentification
// (OIDC ou BLOB_READ_WRITE_TOKEN selon la configuration du projet) —
// jamais de lien <a href> direct vers blob.url côté client, qui ne
// fonctionnerait pas non plus en mode Private.
async function telechargerSauvegardeAutomatique(pathname) {
  const result = await get(pathname, { access: 'private' });
  if (!result) {
    const err = new Error('Sauvegarde introuvable (a peut-être déjà été purgée).');
    err.status = 404;
    throw err;
  }

  const chunks = [];
  for await (const chunk of result.stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// ============================================================
// Diagnostic des cascades ON DELETE (01/08/2026)
// ============================================================
// api/delete-account.js dépend entièrement de ce que chaque table
// applicative liée à user_id ait ON DELETE CASCADE vers auth.users —
// sinon supprimer un compte échoue en erreur 23503 (violation de
// contrainte de clé étrangère). Déjà arrivé deux fois (decision_events,
// badges_debloques) avant correction au cas par cas. Ce diagnostic liste
// PROACTIVEMENT ce qui manque, avec le SQL de correction prêt à copier —
// à lancer manuellement avant chaque mise en production plutôt qu'à
// chaque table ajoutée (cf. discussion de conception du 01/08/2026), en
// filet de rattrapage : la vérification systématique au moment de créer
// une table reste la responsabilité principale, cf. inventaire §15.
//
// Nécessite les fonctions RPC diagnostiquer_cascades_user_id() et
// diagnostiquer_colonnes_user_id_sans_fk() côté Supabase — cf.
// docs/v2-methodologie/diagnostic-cascades-user-id.sql, à exécuter UNE
// FOIS dans le SQL Editor avant la première utilisation. Si ces
// fonctions RPC n'existent pas encore, l'appel échoue avec un message
// d'erreur PostgREST explicite (fonction introuvable) — traduit pour
// l'utilisateur dans le handler ci-dessous plutôt que laissé cryptique.
async function diagnostiquerCascades(config) {
  const [cascadesRes, sansFkRes] = await Promise.all([
    supabaseRequest(config, 'rpc/diagnostiquer_cascades_user_id', { method: 'POST', body: JSON.stringify({}) }),
    supabaseRequest(config, 'rpc/diagnostiquer_colonnes_user_id_sans_fk', { method: 'POST', body: JSON.stringify({}) }),
  ]);

  const cascades = Array.isArray(cascadesRes) ? cascadesRes : [];
  const sansFk = Array.isArray(sansFkRes) ? sansFkRes : [];

  const avecCascadeManquante = cascades.filter((c) => c.delete_rule !== 'CASCADE');
  const avecCascadeOk = cascades.filter((c) => c.delete_rule === 'CASCADE');

  const genererSqlCorrection = (row) =>
    `ALTER TABLE public.${row.table_name} DROP CONSTRAINT ${row.constraint_name};\n` +
    `ALTER TABLE public.${row.table_name} ADD CONSTRAINT ${row.constraint_name} ` +
    `FOREIGN KEY (${row.column_name}) REFERENCES public.${row.referenced_table}(id) ON DELETE CASCADE;`;

  const genererSqlAjoutFk = (row) =>
    `-- Aucune contrainte de clé étrangère du tout sur ${row.table_name}.${row.column_name}.\n` +
    `-- Vérifie d'abord qu'il s'agit bien d'un vrai user_id vers auth.users avant d'exécuter :\n` +
    `ALTER TABLE public.${row.table_name} ADD CONSTRAINT ${row.table_name}_${row.column_name}_fkey ` +
    `FOREIGN KEY (${row.column_name}) REFERENCES auth.users(id) ON DELETE CASCADE;`;

  return {
    genereLe: new Date().toISOString(),
    aRisque: [
      ...avecCascadeManquante.map((row) => ({
        table: row.table_name,
        colonne: row.column_name,
        probleme: `FK vers ${row.referenced_table}, règle actuelle : ${row.delete_rule} (pas CASCADE)`,
        sql: genererSqlCorrection(row),
      })),
      ...sansFk.map((row) => ({
        table: row.table_name,
        colonne: row.column_name,
        probleme: 'Aucune contrainte de clé étrangère du tout',
        sql: genererSqlAjoutFk(row),
      })),
    ],
    ok: avecCascadeOk.map((row) => ({ table: row.table_name, colonne: row.column_name })),
  };
}

function isValidCronRequest(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.authorization || '';
  return authHeader === `Bearer ${secret}`;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Frame-Options', 'DENY');

  const config = {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    password: process.env.BETA_ADMIN_PASSWORD,
  };

  if (!config.supabaseUrl || !config.supabaseKey || !config.password) {
    return json(response, 500, {
      message: 'Configuration administrateur incomplète.',
    });
  }

  // Requête cron authentifiée par CRON_SECRET (Bearer) : contourne le
  // cookie admin, réservée au GET déclenché par vercel.json (voir
  // section "Sauvegardes automatiques" en tête de fichier).
  if (request.method === 'GET' && isValidCronRequest(request)) {
    try {
      const rapport = await executerSauvegardeAutomatique(config);
      return json(response, 200, rapport);
    } catch (error) {
      console.error('[backup] Erreur sauvegarde automatique :', error);
      return json(response, 500, {
        message: error.message || "La sauvegarde automatique a échoué.",
      });
    }
  }

  const crypto = await import('node:crypto');
  const COOKIE = 'yoria_beta_admin';

  const safe = (a, b) => {
    const first = Buffer.from(String(a));
    const second = Buffer.from(String(b));
    return first.length === second.length && crypto.timingSafeEqual(first, second);
  };
  const sign = (value, key) => crypto.createHmac('sha256', key).update(value).digest('base64url');
  const parseCookies = (header) =>
    (header || '').split(';').reduce((cookies, part) => {
      const sep = part.indexOf('=');
      if (sep > 0) {
        cookies[part.slice(0, sep).trim()] = decodeURIComponent(part.slice(sep + 1).trim());
      }
      return cookies;
    }, {});
  const isValidToken = (token, key) => {
    if (!token) return false;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return false;
    if (!safe(signature, sign(payload, key))) return false;
    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      return data.scope === 'beta-admin' && data.exp > Math.floor(Date.now() / 1000);
    } catch {
      return false;
    }
  };

  const cookies = parseCookies(request.headers.cookie);
  if (!isValidToken(cookies[COOKIE], config.password)) {
    return json(response, 401, { message: 'Authentification requise.' });
  }

  if (request.method === 'GET') {
    try {
      const result = await exportGlobal(config);
      return json(response, 200, result);
    } catch (error) {
      console.error('[backup] Erreur export global :', error);
      return json(response, 500, {
        message: error.message || "L'export n'a pas pu être généré.",
      });
    }
  }

  if (request.method === 'POST') {
    const body = request.body || {};
    const action = String(body.action || '');

    if (action === 'export_user') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!email) {
        return json(response, 400, { message: 'Adresse e-mail manquante.' });
      }
      try {
        const result = await exportUtilisateur(config, email);
        return json(response, 200, result);
      } catch (error) {
        console.error('[backup] Erreur export utilisateur :', error);
        return json(response, error.status || 500, {
          message: error.message || "L'export n'a pas pu être généré.",
        });
      }
    }

    if (action === 'reinject') {
      const exportData = body.exportData;
      const filtrerEmail = String(body.filtrerEmail || '').trim().toLowerCase() || null;
      const userIdManuel = String(body.userIdManuel || '').trim() || null;
      if (!exportData) {
        return json(response, 400, { message: 'Fichier de sauvegarde manquant.' });
      }
      try {
        const rapport = await reinjecter(config, exportData, filtrerEmail, userIdManuel);
        return json(response, 200, { success: true, rapport });
      } catch (error) {
        console.error('[backup] Erreur réinjection :', error);
        return json(response, error.status || 500, {
          message: error.message || "La réinjection a échoué.",
          besoinUserIdManuel: error.besoinUserIdManuel || false,
          diagnosticParTable: error.diagnosticParTable || null,
          userIdUtilise: error.userId || null,
        });
      }
    }

    if (action === 'diagnostic_cascades') {
      try {
        const result = await diagnostiquerCascades(config);
        return json(response, 200, result);
      } catch (error) {
        console.error('[backup] Erreur diagnostic cascades :', error);
        const messageFonctionManquante = /function .*diagnostiquer_.* does not exist/i.test(error.message || '')
          || error.data?.message?.includes('diagnostiquer_');
        return json(response, error.status || 500, {
          message: messageFonctionManquante
            ? "Les fonctions SQL de diagnostic n'existent pas encore côté Supabase — exécute d'abord docs/v2-methodologie/diagnostic-cascades-user-id.sql dans le SQL Editor (à faire une seule fois)."
            : (error.message || "Le diagnostic n'a pas pu être généré."),
        });
      }
    }

    if (action === 'lister_sauvegardes_auto') {
      try {
        const sauvegardes = await listerSauvegardesAutomatiques();
        return json(response, 200, { sauvegardes });
      } catch (error) {
        console.error('[backup] Erreur listage sauvegardes auto :', error);
        return json(response, 500, {
          message: error.message || "Impossible de lister les sauvegardes automatiques.",
        });
      }
    }

    if (action === 'telecharger_sauvegarde_auto') {
      const pathname = String(body.pathname || '').trim();
      if (!pathname) {
        return json(response, 400, { message: 'Chemin de fichier manquant.' });
      }
      try {
        const contenu = await telechargerSauvegardeAutomatique(pathname);
        return json(response, 200, { pathname, contenu: JSON.parse(contenu) });
      } catch (error) {
        console.error('[backup] Erreur téléchargement sauvegarde auto :', error);
        return json(response, error.status || 500, {
          message: error.message || "Impossible de télécharger cette sauvegarde.",
        });
      }
    }

    if (action === 'declencher_sauvegarde_auto') {
      // Déclenchement manuel depuis beta-admin, hors cron — utile pour
      // tester la chaîne complète sans attendre le prochain horaire.
      try {
        const rapport = await executerSauvegardeAutomatique(config);
        return json(response, 200, rapport);
      } catch (error) {
        console.error('[backup] Erreur déclenchement manuel sauvegarde auto :', error);
        return json(response, 500, {
          message: error.message || "La sauvegarde n'a pas pu être générée.",
        });
      }
    }

    return json(response, 400, { message: 'Action inconnue.' });
  }

  response.setHeader('Allow', 'GET, POST');
  return json(response, 405, { message: 'Méthode non autorisée.' });
}
