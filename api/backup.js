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
// pour rester cohérent avec le reste de l'admin bêta.
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
// téléchargé doit être traité comme temporaire par whoever le conserve
// (Laurent) — pas un filet permanent équivalent à une non-suppression.

const TABLES_EXCLUES = [];

// Colonnes à tester, dans cet ordre de préférence, pour rattacher une
// ligne d'une table à un utilisateur lors d'un export/réinjection CIBLÉ.
// decision_outcomes n'a AUCUNE des deux (seulement decision_event_id) —
// traité séparément via la chaîne indirecte, cf. exporterDecisions().
const COLONNES_USER = ['user_id', 'id_utilisateur'];

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
    // La réponse reste du texte (ex. erreur HTML improbable).
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

// Exécute une requête SQL brute via la fonction RPC générique n'existe
// pas par défaut sur Supabase — on utilise donc information_schema via
// PostgREST, qui EST exposé nativement en lecture (schéma information_schema
// n'est pas exposé par défaut par PostgREST : on interroge donc plutôt
// pg_catalog via une requête SQL exécutée par la Management API n'est pas
// disponible côté clé service_role REST. Solution retenue : Supabase
// expose une vue "pg_tables" accessible uniquement en SQL direct, donc on
// passe par le endpoint SQL de la Management API si disponible, sinon on
// utilise le endpoint standard /rest/v1/ avec introspection OpenAPI (qui,
// lui, EST exposé par PostgREST par défaut sur la racine /rest/v1/).
async function listerTables(config) {
  // PostgREST expose sa propre spec OpenAPI à la racine /rest/v1/ — ses
  // clés de premier niveau sous "definitions" (ou "paths" selon version)
  // sont exactement les tables/vues du schéma exposé (public). C'est la
  // méthode fiable et déjà accessible avec la clé service_role, sans
  // extension ni fonction SQL supplémentaire à créer côté base.
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
    // Best-effort par table — une table illisible (ex. vue sans SELECT
    // simple) ne doit pas faire échouer l'export entier, elle est juste
    // signalée dans le résultat pour que Laurent le voie.
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

// Filtre les lignes d'une table déjà entièrement chargée pour ne garder
// que celles rattachées à un utilisateur donné, en essayant chaque
// colonne candidate de COLONNES_USER. Une table sans aucune de ces
// colonnes est ignorée pour l'export ciblé (elle n'a pas de notion
// d'utilisateur — ex. beta_testers est gardée à part, cf. plus bas).
function filtrerLignesUtilisateur(rows, userId) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const colonne = COLONNES_USER.find((c) => Object.prototype.hasOwnProperty.call(rows[0], c));
  if (!colonne) return null; // signale "table sans notion d'utilisateur"
  return rows.filter((row) => row[colonne] === userId);
}

// decision_outcomes n'a pas de user_id direct (cf. inventaire §5) —
// remonte la chaîne decision_outcomes.decision_event_id ->
// decision_events.id -> decision_events.user_id, exactement comme le fait
// déjà api/beta-admin.js pour la lecture en Comptes.
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
  // Retrouve l'utilisateur Auth par email — même méthode que le module
  // "Comptes" existant (cf. api/beta-admin.js, search_user_plan) :
  // filtrage peu fiable de l'API Admin par email, donc on liste tout et
  // on filtre côté serveur. Volume de comptes faible en bêta.
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
  // decision_events/decision_outcomes traités séparément (chaîne
  // indirecte) — on les exclut de la boucle générique pour éviter un
  // double export ou un export incomplet (decision_outcomes n'a pas de
  // colonne utilisateur directe, la boucle générique le raterait de toute
  // façon, mais autant être explicite).
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
      // Table sans colonne user_id/id_utilisateur repérable — ex. table
      // globale sans notion d'utilisateur (beta_testers utilise "email",
      // pas un user_id Auth — traité séparément ci-dessous par email).
      tablesSansNotionUtilisateur.push(table);
      continue;
    }
    donnees[table] = filtrees;
  }

  // beta_testers n'a pas de user_id (candidature avant création de
  // compte) — rattachement par email plutôt que par id, cas particulier
  // documenté explicitement plutôt que deviné silencieusement.
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

// Réinjection — upsert (ON CONFLICT sur la clé primaire "id" standard,
// écrase la ligne existante si elle existe déjà) plutôt qu'un simple
// INSERT, cf. discussion de conception du 01/08/2026 : le scénario réel
// est "remettre les bonnes données à la place des mauvaises", pas
// "refuser si déjà présent".
//
// Ordre de réinjection : d'abord recréer l'utilisateur Auth s'il
// n'existe plus (même id — nécessaire pour que les FK des autres tables
// pointent vers un utilisateur existant), PUIS les tables dans un ordre
// qui respecte les dépendances connues : decision_events avant
// decision_outcomes (FK directe), tout le reste sans ordre garanti
// (pas de dépendances FK connues entre plans_actif/plan_donnees/
// abonnements/signalements au niveau du schéma applicatif actuel,
// cf. inventaire §5 — à revoir si une contrainte FK est ajoutée entre
// elles un jour).
const ORDRE_REINJECTION = ['decision_events', 'decision_outcomes'];

function trierTablesPourReinjection(nomsTables) {
  const dansOrdre = ORDRE_REINJECTION.filter((t) => nomsTables.includes(t));
  const reste = nomsTables.filter((t) => !ORDRE_REINJECTION.includes(t));
  // Bug corrigé le 01/08/2026 : le .filter précédent EXCLUAIT beta_testers
  // de la liste sans jamais le réintégrer ailleurs — il n'était donc
  // jamais réinjecté. beta_testers reste dans "reste", sa position n'a
  // pas d'importance particulière (pas de dépendance FK connue).
  return [...reste, ...dansOrdre];
}

async function recreerUtilisateurSiAbsent(config, utilisateur) {
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

  // L'Admin API Supabase permet de spécifier explicitement l'id à la
  // création (paramètre "id" du body) — nécessaire pour que toutes les
  // FK de l'export pointent vers le bon utilisateur recréé. Un mot de
  // passe aléatoire est généré (l'utilisateur devra passer par
  // "mot de passe oublié" pour se reconnecter — pas d'email de bienvenue
  // envoyé automatiquement ici, volontairement, pour laisser Laurent
  // décider s'il prévient le testeur).
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

// Filtre un export GLOBAL déjà chargé en mémoire pour ne garder que les
// lignes d'un utilisateur précis, avant réinjection — ajouté le 01/08/2026
// suite à un besoin réel de Laurent : réinjecter un seul coureur à partir
// d'un gros export global déjà téléchargé, sans repasser par un export
// ciblé séparé. Réutilise EXACTEMENT filtrerLignesUtilisateur() sur les
// données déjà en mémoire (aucun nouvel appel Supabase nécessaire pour
// les LIGNES, l'export global les contient déjà toutes) — mais il faut
// d'abord connaître l'`user_id` Auth correspondant à l'email fourni.
//
// Cas réel rencontré le 01/08/2026 : le compte a déjà été supprimé
// (scénario même de test backup/restore) — l'API Admin ne le retrouve
// plus par email. Repli en cascade pour trouver l'id quand même :
//   1. API Admin Auth (cas normal, compte encore actif)
//   2. Table `abonnements` dans l'EXPORT (a un champ email — cf.
//      upsertAbonnementGratuit dans beta-admin.js), si l'utilisateur a
//      un abonnement enregistré
//   3. `userId` fourni explicitement en paramètre (Laurent peut le lire
//      à l'œil dans le fichier JSON — n'importe quelle ligne de cet
//      utilisateur porte son `user_id`) — dernier recours si les deux
//      premiers échouent, jamais deviné silencieusement.
async function retrouverUserIdParEmail(config, exportData, email, userIdManuel) {
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

  if (userIdManuel) return userIdManuel;

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

  for (const [table, rows] of Object.entries(exportData.donnees || {})) {
    if (table === 'beta_testers') {
      // Pas de user_id — rattachement par email, cf. exportUtilisateur().
      const lignes = (Array.isArray(rows) ? rows : []).filter(
        (row) => (row.email || '').toLowerCase() === email.toLowerCase(),
      );
      if (lignes.length > 0) {
        donneesFiltrees[table] = lignes;
        totalLignesTrouvees += lignes.length;
      }
      continue;
    }

    if (table === 'decision_outcomes') {
      // Pas de user_id direct — filtré après coup une fois
      // decision_events connu, cf. bloc ci-dessous.
      continue;
    }

    const filtrees = filtrerLignesUtilisateur(rows, userId);
    if (filtrees === null) {
      // Table sans colonne utilisateur repérable — ignorée pour ce
      // filtrage ciblé, comme pour l'export ciblé (cf.
      // filtrerLignesUtilisateur).
      continue;
    }
    if (filtrees.length > 0) {
      donneesFiltrees[table] = filtrees;
      totalLignesTrouvees += filtrees.length;
    }
  }

  // decision_outcomes filtré via la chaîne indirecte, à partir des
  // decision_events déjà retenus ci-dessus pour cet utilisateur.
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
      `Aucune ligne trouvée pour ${email} dans cet export. Vérifie l'adresse e-mail ou que cet export contient bien ses données.`,
    );
    err.status = 404;
    throw err;
  }

  return {
    type: 'export_utilisateur',
    genereLe: exportData.genereLe,
    utilisateur: { id: userId, email },
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

  // Filtrage optionnel d'un export GLOBAL par email avant réinjection —
  // n'a de sens que sur un export_global ; un export_utilisateur est déjà
  // scoped à une seule personne, filtrer dessus n'apporterait rien (et
  // risquerait de filtrer sur le mauvais champ si l'email ne correspond
  // pas exactement à l'utilisateur déjà ciblé par l'export).
  if (filtrerEmail && exportDataBrut.type === 'export_global') {
    exportData = await filtrerExportGlobalParUtilisateur(config, exportDataBrut, filtrerEmail, userIdManuel);
    diagnostic.tablesApresFiltrage = Object.keys(exportData.donnees).length;
  }

  const rapport = { recreationCompte: null, tables: [], filtrePar: filtrerEmail || null, diagnostic };

  if (exportData.type === 'export_utilisateur' && exportData.utilisateur) {
    rapport.recreationCompte = await recreerUtilisateurSiAbsent(config, exportData.utilisateur);
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

  // Auth — même cookie/token que api/beta-admin.js. Réimplémentation
  // minimale volontaire (pas d'import croisé entre deux fonctions
  // serverless Vercel, chacune doit rester déployable indépendamment) —
  // garder ces deux blocs synchronisés si le format du cookie change un
  // jour dans beta-admin.js.
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
    // Export global — GET simple, pas de body nécessaire.
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
        });
      }
    }

    return json(response, 400, { message: 'Action inconnue.' });
  }

  response.setHeader('Allow', 'GET, POST');
  return json(response, 405, { message: 'Méthode non autorisée.' });
}
