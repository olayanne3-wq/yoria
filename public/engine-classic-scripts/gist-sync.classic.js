/**
 * gist-sync.js
 * Persistence des plans via GitHub Gist — Yoria v2.0
 *
 * Module pur (aucune dépendance DOM) — testable en isolation.
 * Réutilise le même token GitHub que v1 ("lk_github_token", clé partagée
 * pour éviter une re-saisie si déjà configuré ailleurs), mais un Gist
 * séparé et dédié à v2 (schéma de données différent, fichier
 * plan10k_v2_plans.json).
 *
 * Le storage (localStorage par défaut) est injectable pour rester testable
 * hors navigateur et réutilisable dans d'autres contextes (ex: Capacitor).
 */

const GIST_FILENAME = 'plan10k_v2_plans.json';

function getGithubToken(storage = localStorage) {
  const raw = storage.getItem('lk_github_token');
  if (!raw) return '';
  // Le token peut avoir été écrit par save() de index.html (v1), qui fait
  // systématiquement JSON.stringify(val) — pour une chaîne simple, ça ajoute
  // des guillemets autour ("ghp_..." plutôt que ghp_...). Bug trouvé le
  // 7 juillet 2026 : Laurent avait saisi son token via le champ de v1
  // (Paramètres), donc stocké avec guillemets, mais getGithubToken() (ce
  // module) le lisait brut sans JSON.parse() — 401 systématique sur GitHub,
  // le token transmis contenait littéralement 2 guillemets en trop.
  // JSON.parse() gère les deux cas : si raw est déjà une chaîne brute (sans
  // guillemets), JSON.parse() échoue et le catch retombe sur raw tel quel.
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : raw;
  } catch {
    return raw;
  }
}
function setGithubToken(token, storage = localStorage) {
  storage.setItem('lk_github_token', token);
}
function getV2GistId(storage = localStorage) {
  return storage.getItem('v2_gist_id') || '';
}
function setV2GistId(id, storage = localStorage) {
  storage.setItem('v2_gist_id', id);
}

async function chargerPlans(storage = localStorage) {
  const token = getGithubToken(storage);
  const gistId = getV2GistId(storage);
  if (!token || !gistId) return [];
  try {
    const resp = await fetch('https://api.github.com/gists/' + gistId, {
      headers: { Authorization: 'token ' + token }
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    const raw = data.files[GIST_FILENAME]?.content;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    let plans = parsed.plans || [];

    // Migration : les plans sauvegardés avant l'ajout de l'id (section 28)
    // n'en ont pas, ce qui casse renommer/supprimer (rien à quoi s'accrocher).
    // On leur en attribue un et on réécrit la liste immédiatement.
    const sansId = plans.filter(p => !p.id);
    if (sansId.length > 0) {
      plans = plans.map(p => p.id ? p : { ...p, id: (window.crypto?.randomUUID ? crypto.randomUUID() : 'plan-' + Date.now() + '-' + Math.random()) });
      try {
        await ecrireListePlans(plans, storage);
      } catch (e) {
        console.warn('Migration des ids a échoué (pas bloquant) :', e.message);
      }
    }

    return plans;
  } catch (e) {
    console.warn('chargerPlans a échoué :', e.message);
    return [];
  }
}

// Charge la copie figée des plans (audit/comparaison, jamais modifiée après
// création — cf. chantier séparation original/actif du 17/07/2026). Simple
// lecture, contrairement à chargerPlans() : pas de migration d'id, la copie
// est faite après coup sur des plans qui en ont déjà un.
async function chargerPlansOriginal(storage = localStorage) {
  const token = getGithubToken(storage);
  const gistId = getV2GistId(storage);
  if (!token || !gistId) return [];
  try {
    const resp = await fetch('https://api.github.com/gists/' + gistId, {
      headers: { Authorization: 'token ' + token }
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    const raw = data.files[GIST_FILENAME] && data.files[GIST_FILENAME].content;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.plansOriginal || [];
  } catch (e) {
    console.warn('chargerPlansOriginal a échoué :', e.message);
    return [];
  }
}

// Ajoute une copie figée d'un plan à plansOriginal — appelée une seule fois,
// à la création du plan par le wizard, en miroir de assurerPlanExiste() côté
// Supabase. N'écrase jamais une entrée existante (un original ne change
// plus jamais) : si un plan avec cet id est déjà dans plansOriginal, ne fait
// rien.
async function ajouterPlanOriginal(plan, storage = localStorage) {
  const plansOriginalExistants = await chargerPlansOriginal(storage);
  if (plansOriginalExistants.some(function (p) { return p.id === plan.id; })) return;
  const plansActif = await chargerPlans(storage);
  const nouveauxPlansOriginal = plansOriginalExistants.concat([Object.assign({}, plan, { sauvegardeLe: new Date().toISOString() })]);
  const token = getGithubToken(storage);
  if (!token) {
    throw new Error("Aucun token GitHub renseigné — impossible de sauvegarder.");
  }
  const body = {
    description: 'Yoria v2 — plans sauvegardés',
    public: false,
    files: { [GIST_FILENAME]: { content: JSON.stringify({ plans: plansActif, plansOriginal: nouveauxPlansOriginal }, null, 2) } }
  };
  const gistId = getV2GistId(storage);
  const url = gistId ? 'https://api.github.com/gists/' + gistId : 'https://api.github.com/gists';
  const method = gistId ? 'PATCH' : 'POST';
  const resp = await fetch(url, {
    method: method,
    headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const data = await resp.json();
  setV2GistId(data.id, storage);
  return data.id;
}

// Écrit la liste complète des plans actifs dans le Gist v2 (toujours un
// PATCH sur le même Gist si il existe déjà — le Gist lui-même n'est jamais
// supprimé, seul son contenu est mis à jour). Utilisée par sauvegarde,
// suppression et renommage : ces trois opérations ne sont que des
// variations sur la même écriture "liste de plans -> Gist".
//
// Préserve plansOriginal (17/07/2026, chantier séparation original/actif) :
// cette fonction ne touche jamais la copie figée, donc on doit la relire et
// la réinjecter telle quelle à chaque écriture, sinon elle serait perdue au
// premier appel suivant (le body remplace tout le contenu du fichier Gist).
async function ecrireListePlans(plans, storage = localStorage) {
  const token = getGithubToken(storage);
  if (!token) {
    throw new Error("Aucun token GitHub renseigné — impossible de sauvegarder.");
  }
  const plansOriginal = await chargerPlansOriginal(storage);
  const body = {
    description: 'Yoria v2 — plans sauvegardés',
    public: false,
    files: { [GIST_FILENAME]: { content: JSON.stringify({ plans: plans, plansOriginal: plansOriginal }, null, 2) } }
  };
  const gistId = getV2GistId(storage);
  const url = gistId ? 'https://api.github.com/gists/' + gistId : 'https://api.github.com/gists';
  const method = gistId ? 'PATCH' : 'POST';

  const resp = await fetch(url, {
    method,
    headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const data = await resp.json();
  setV2GistId(data.id, storage);
  return data.id;
}

// ---------------------------------------------------------------------------
// Non-chevauchement des dates entre plans (doc convergence-v1-v2.md, section
// 7ter) — empêche la création d'un nouveau plan dont la période active
// chevauche celle d'un plan déjà sauvegardé. Décisions actées le 6 juillet
// 2026 : intersection stricte (pas de marge de tolérance), comportement
// bloquant (pas un simple avertissement) — cas le plus simple et prévisible
// pour démarrer, à assouplir plus tard si un vrai besoin de chevauchement
// volontaire apparaît en usage réel.
//
// Généralisé le 13 juillet 2026 pour couvrir le mode Forme (plan.mode ===
// 'forme'), qui n'a pas de date de fin naturelle (cf. plan-forme.js) —
// contrairement à un plan course borné par dateCourse. Principe retenu avec
// Laurent : un seul plan actif à la fois, tous types confondus. Un plan
// Forme est "en cours" indéfiniment tant qu'aucune dateCloture optionnelle
// n'est fixée dessus ; une fois clôturé, il redevient possible de planifier
// un plan course (ou un autre plan Forme) à sa suite.
// ---------------------------------------------------------------------------

/**
 * Renvoie la date de fin de la période "active" d'un plan, ou null si cette
 * période n'a jamais de fin (plan Forme sans dateCloture) — un null signifie
 * "actif indéfiniment dans le futur", pas "pas de plan".
 */
function dateFinPeriodeActive(plan) {
  if (plan.mode === 'forme') return plan.dateCloture || null;
  return plan.dateCourse || null;
}

/**
 * Détecte si deux plages de dates se chevauchent, chacune pouvant être
 * ouverte (fin = null, signifie "sans fin connue", jamais "aujourd'hui").
 * Comparaison de chaînes ISO (YYYY-MM-DD), valide tant que les deux dates
 * sont dans ce format.
 */
function datesChevauchent(debutA, finA, debutB, finB) {
  // A commence après la fin connue de B (B a une fin, A démarre après) : pas
  // de chevauchement possible, peu importe si A a lui-même une fin ou non.
  if (finB !== null && finB !== undefined && debutA > finB) return false;
  // B commence après la fin connue de A : même raisonnement, symétrique.
  if (finA !== null && finA !== undefined && debutB > finA) return false;
  // Dans tous les autres cas (au moins une des deux périodes n'a pas de fin
  // connue avant que l'autre ne démarre), les deux périodes se recouvrent.
  return true;
}

/**
 * Trouve, parmi une liste de plans, celui qui chevauche la période active
 * du plan candidat (hors le plan portant idAExclure, pour ne pas se
 * comparer à soi-même lors d'une mise à jour). Retourne le premier plan
 * trouvé en conflit, ou null si aucun chevauchement. Fonctionne pour
 * n'importe quelle combinaison de types (course/course, course/forme,
 * forme/forme) — dateFinPeriodeActive() abstrait la différence de règle
 * entre les deux.
 */
function trouverPlanEnConflit(plans, dateDebut, dateFin, idAExclure) {
  return plans.find(p => {
    if (p.id === idAExclure || !p.dateDebut) return false;
    const finExistant = dateFinPeriodeActive(p);
    return datesChevauchent(dateDebut, dateFin ?? null, p.dateDebut, finExistant);
  }) || null;
}

async function sauvegarderPlan(plan, storage = localStorage) {
  const plansExistants = await chargerPlans(storage);
  const nouveauPlan = { ...plan, sauvegardeLe: new Date().toISOString() };
  // Remplace le plan existant (même id) plutôt que d'en créer un doublon —
  // nécessaire pour que le suivi de complétion se mette à jour en place
  const indexExistant = plansExistants.findIndex(p => p.id === plan.id);
  const planAvant = indexExistant >= 0 ? plansExistants[indexExistant] : null;

  // Clôture permanente d'un plan Forme (décision du 13 juillet 2026, avec
  // Laurent) : une fois dateCloture fixée et sauvegardée, le plan devient
  // intégralement figé — plus aucune modification possible (contenu,
  // statuts, notes, sync Strava…), y compris retirer ou changer la
  // dateCloture elle-même. Choix volontairement strict : élimine tout
  // risque de contournement du garde-fou "un seul plan actif à la fois"
  // (plus besoin de revérifier les conflits à chaque modification), et
  // rend le comportement d'un plan clôturé prévisible — lecture seule,
  // point final, comme un plan course déjà passé.
  if (planAvant?.mode === 'forme' && planAvant.dateCloture) {
    throw new Error(`Ce plan est clôturé depuis le ${planAvant.dateCloture} et ne peut plus être modifié — il reste consultable en lecture seule.`);
  }

  // dateFin dépend du type de plan (13 juillet 2026) : un plan course est
  // toujours borné par dateCourse ; un plan Forme n'a de fin que si
  // dateCloture a été explicitement fixée (sinon null = actif
  // indéfiniment, cf. datesChevauchent/dateFinPeriodeActive plus haut dans
  // ce fichier). Un plan Forme sans dateCloture bloque donc la création de
  // tout nouveau plan (course ou Forme) tant qu'il n'a pas été clôturé.
  //
  // La vérification de chevauchement ne s'applique qu'à la création d'un
  // NOUVEAU plan distinct (indexExistant === -1). Une mise à jour d'un plan
  // déjà existant et NON clôturé (le seul cas restant possible, cf. garde
  // ci-dessus) n'a pas besoin d'être revérifiée : sa période active était
  // déjà validée lors de sa création, et elle ne peut plus changer que via
  // le wizard/la clôture elle-même, tous deux traités comme des créations
  // (nouvelle sauvegarde, ou blocage total une fois clôturé).
  const dateFinDuNouveauPlan = plan.mode === 'forme' ? (plan.dateCloture || null) : plan.dateCourse;

  if (indexExistant === -1 && plan.dateDebut) {
    const conflit = trouverPlanEnConflit(plansExistants, plan.dateDebut, dateFinDuNouveauPlan, plan.id);
    if (conflit) {
      const nomConflit = conflit.nom || (conflit.mode === 'forme' ? 'Plan forme' : `${conflit.distance || '?'} — ${conflit.objectif || '?'}`);
      const finConflit = conflit.mode === 'forme' ? (conflit.dateCloture || 'sans date de fin') : conflit.dateCourse;
      const finNouveau = dateFinDuNouveauPlan || 'sans date de fin';
      throw new Error(`Ce plan (${plan.dateDebut} → ${finNouveau}) chevauche un plan déjà actif : "${nomConflit}" (${conflit.dateDebut} → ${finConflit}). Un seul plan peut être actif à la fois — clôture ou supprime le plan existant, ou choisis d'autres dates.`);
    }
  }

  const plans = indexExistant >= 0
    ? plansExistants.map((p, i) => i === indexExistant ? nouveauPlan : p)
    : [...plansExistants, nouveauPlan];
  return ecrireListePlans(plans, storage);
}

// Retire un seul plan de la liste et réécrit le Gist — le Gist lui-même
// n'est jamais supprimé, seul son contenu (liste de plans) est mis à jour.
async function supprimerPlan(planId, storage = localStorage) {
  const plansExistants = await chargerPlans(storage);
  const plans = plansExistants.filter(p => p.id !== planId);
  return ecrireListePlans(plans, storage);
}

async function renommerPlan(planId, nouveauNom, storage = localStorage) {
  const plansExistants = await chargerPlans(storage);
  const plans = plansExistants.map(p => p.id === planId ? { ...p, nom: nouveauNom } : p);
  return ecrireListePlans(plans, storage);
}
