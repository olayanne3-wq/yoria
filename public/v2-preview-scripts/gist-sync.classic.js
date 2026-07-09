/**
 * gist-sync.js
 * Persistence des plans via GitHub Gist — Run by Léa v2.0
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

// Écrit la liste complète des plans dans le Gist v2 (toujours un PATCH sur
// le même Gist si il existe déjà — le Gist lui-même n'est jamais supprimé,
// seul son contenu est mis à jour). Utilisée par sauvegarde, suppression et
// renommage : ces trois opérations ne sont que des variations sur la même
// écriture "liste de plans -> Gist".
async function ecrireListePlans(plans, storage = localStorage) {
  const token = getGithubToken(storage);
  if (!token) {
    throw new Error("Aucun token GitHub renseigné — impossible de sauvegarder.");
  }
  const body = {
    description: 'Run by Léa v2 — plans sauvegardés',
    public: false,
    files: { [GIST_FILENAME]: { content: JSON.stringify({ plans }, null, 2) } }
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
// 7ter) — empêche la création d'un nouveau plan dont la plage de dates
// (dateDebut -> dateCourse) chevauche celle d'un plan déjà sauvegardé.
// Décisions actées le 6 juillet 2026 : intersection stricte (pas de marge de
// tolérance), comportement bloquant (pas un simple avertissement) — cas le
// plus simple et prévisible pour démarrer, à assouplir plus tard si un vrai
// besoin de chevauchement volontaire apparaît en usage réel.
// ---------------------------------------------------------------------------

/**
 * Détecte si deux plages de dates [debut, fin] se chevauchent (bornes
 * incluses). Comparaison de chaînes ISO (YYYY-MM-DD), valide tant que les
 * deux dates sont dans ce format.
 */
function datesChevauchent(debutA, finA, debutB, finB) {
  return debutA <= finB && debutB <= finA;
}

/**
 * Trouve, parmi une liste de plans, celui qui chevauche la plage de dates
 * donnée (hors le plan portant idAExclure, pour ne pas se comparer à
 * soi-même lors d'une mise à jour). Retourne le premier plan trouvé en
 * conflit, ou null si aucun chevauchement.
 */
function trouverPlanEnConflit(plans, dateDebut, dateCourse, idAExclure) {
  return plans.find(p =>
    p.id !== idAExclure &&
    p.dateDebut && p.dateCourse &&
    datesChevauchent(dateDebut, dateCourse, p.dateDebut, p.dateCourse)
  ) || null;
}

async function sauvegarderPlan(plan, storage = localStorage) {
  const plansExistants = await chargerPlans(storage);
  const nouveauPlan = { ...plan, sauvegardeLe: new Date().toISOString() };
  // Remplace le plan existant (même id) plutôt que d'en créer un doublon —
  // nécessaire pour que le suivi de complétion se mette à jour en place
  const indexExistant = plansExistants.findIndex(p => p.id === plan.id);

  // La vérification de chevauchement ne s'applique qu'à la création d'un
  // NOUVEAU plan distinct — une mise à jour d'un plan déjà existant (même
  // id) ne doit jamais être bloquée par elle-même.
  if (indexExistant === -1 && plan.dateDebut && plan.dateCourse) {
    const conflit = trouverPlanEnConflit(plansExistants, plan.dateDebut, plan.dateCourse, plan.id);
    if (conflit) {
      const nomConflit = conflit.nom || `${conflit.distance || '?'} — ${conflit.objectif || '?'}`;
      throw new Error(`Ce plan (${plan.dateDebut} → ${plan.dateCourse}) chevauche un plan déjà sauvegardé : "${nomConflit}" (${conflit.dateDebut} → ${conflit.dateCourse}). Choisis d'autres dates, ou supprime/remplace le plan existant.`);
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
