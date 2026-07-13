// ============================================================
// Run by Léa — Synchronisation localStorage ↔ Supabase
// Source de vérité : public/v2/engine/sync-storage.js
// Copie non-module dérivée : public/engine-classic-scripts/sync-storage.classic.js
// Chantier v2.5 migration, démarré le 13 juillet 2026.
// ============================================================
//
// Stratégie retenue (cf. inventaire §8bis, mise à jour du 13 juillet) :
// plutôt que de rendre asynchrones les ~22 lectures synchrones
// `let x = load(clePourPlan("lk_..."), défaut)` qui initialisent l'état
// au chargement de index.html (risque élevé de casser le séquencement
// sur un fichier de 5000 lignes), on précharge TOUTES les données
// Supabase dans localStorage AVANT que ces lignes s'exécutent. Le code
// existant (load()/save(), inchangées) continue de fonctionner sans
// modification. À chaque save(), on écrit aussi vers Supabase en
// arrière-plan (fire-and-forget), sans bloquer l'affichage.
//
// Limite connue de cette approche : en cas de perte réseau pendant la
// sauvegarde Supabase, la donnée reste correcte en localStorage (donc
// pas de perte immédiate pour l'utilisateur sur CET appareil) mais ne
// remonte pas au serveur tant que la prochaine sauvegarde réussie ne
// se produit pas. Acceptable en v1 de ce chantier ; passer par une
// file d'attente de sync si ça devient un problème réel en usage.
// ============================================================

import { supabase } from './auth.js';

// Clés globales (non préfixées par plan) à synchroniser avec la table
// `integrations` plutôt que `profils_coureur` ou `plan_donnees` —
// cf. schéma SQL, ces clés contiennent des tokens tiers.
const CLES_INTEGRATIONS = [
  'lk_strava_token', 'lk_strava_refresh', 'lk_strava_expires',
  'lk_strava_activities', 'lk_last_sync', 'lk_github_token', 'lk_gist_id',
];

// Clé globale de cache météo — pas de table dédiée pour l'instant,
// reste en localStorage uniquement (donnée re-générable, faible enjeu
// de perte en cas de changement d'appareil).
const CLES_LOCALES_UNIQUEMENT = ['lk_weather_cache'];

// Vérifie qu'une chaîne a la forme d'un UUID v4-like (celle générée par
// crypto.randomUUID() côté wizard). Le plan de repli par défaut, généré
// quand aucun plan n'existe encore (index.html, id fixe 'plan-repli-defaut',
// cf. inventaire §2 commentaire du chargement du plan), n'en est pas un —
// la colonne plan_id de plans/plan_donnees est typée uuid côté Postgres,
// toute tentative d'écriture avec un id non-UUID échoue en 400. On l'ignore
// proprement plutôt que de laisser l'erreur réseau se répéter à chaque save().
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function estUuidValide(valeur) {
  return typeof valeur === 'string' && RE_UUID.test(valeur);
}

// Marqueurs localStorage posés après chaque étape de migration réussie,
// pour ne la tenter qu'une fois par appareil/navigateur. Deux marqueurs
// séparés (pas un seul) car les données globales (profil, intégrations)
// et les données de plan ne sont pas connues au même moment : au tout
// premier appel (juste après connexion), planId est encore indéfini —
// un marqueur unique poserait le verrou trop tôt et empêcherait à jamais
// la migration des données de plan lors du second appel.
const CLE_MARQUEUR_MIGRATION_GLOBALE = 'lk_migration_supabase_globale_faite';
const CLE_MARQUEUR_MIGRATION_PLAN_PREFIX = 'lk_migration_supabase_plan_faite_';

export async function migrerDonneesExistantes(userId, planId) {
  const planIdValide = estUuidValide(planId) ? planId : null;
  const dejaGlobale = !!localStorage.getItem(CLE_MARQUEUR_MIGRATION_GLOBALE);
  const cleMarqueurPlan = planIdValide ? `${CLE_MARQUEUR_MIGRATION_PLAN_PREFIX}${planIdValide}` : null;
  const dejaPlan = cleMarqueurPlan ? !!localStorage.getItem(cleMarqueurPlan) : true; // pas de plan = rien à faire de ce côté

  if (dejaGlobale && dejaPlan) return; // tout est déjà migré, rien à faire

  try {
    if (!dejaGlobale) {
      // Profil coureur
      const profilBrut = localStorage.getItem('lk_profil_coureur');
      if (profilBrut) {
        try {
          const profil = JSON.parse(profilBrut);
          await supabase.from('profils_coureur').upsert({ user_id: userId, data: profil });
        } catch (e) { /* JSON invalide, on ignore cette clé plutôt que de bloquer toute la migration */ }
      }

      // Intégrations (tokens Strava/GitHub/Gist)
      const colonnes = {
        lk_strava_token: 'strava_token',
        lk_strava_refresh: 'strava_refresh',
        lk_github_token: 'github_token',
        lk_gist_id: 'gist_id',
      };
      const payloadIntegrations = { user_id: userId };
      let auMoinsUneIntegration = false;
      for (const [cleLocale, colonne] of Object.entries(colonnes)) {
        const brut = localStorage.getItem(cleLocale);
        if (brut) {
          try {
            payloadIntegrations[colonne] = JSON.parse(brut);
            auMoinsUneIntegration = true;
          } catch (e) { /* ignore */ }
        }
      }
      const stravaExpiresBrut = localStorage.getItem('lk_strava_expires');
      if (stravaExpiresBrut) {
        try {
          const ts = JSON.parse(stravaExpiresBrut);
          if (ts) { payloadIntegrations.strava_expires = new Date(ts).toISOString(); auMoinsUneIntegration = true; }
        } catch (e) { /* ignore */ }
      }
      const lastSyncBrut = localStorage.getItem('lk_last_sync');
      if (lastSyncBrut) {
        try {
          const ts = JSON.parse(lastSyncBrut);
          if (ts) { payloadIntegrations.last_sync = new Date(ts).toISOString(); auMoinsUneIntegration = true; }
        } catch (e) { /* ignore */ }
      }
      if (auMoinsUneIntegration) {
        await supabase.from('integrations').upsert(payloadIntegrations);
      }

      localStorage.setItem(CLE_MARQUEUR_MIGRATION_GLOBALE, 'true');
    }

    if (!dejaPlan && planIdValide) {
      const cleSuffixe = `_${planIdValide}`;
      const donnees = {};
      for (let i = 0; i < localStorage.length; i++) {
        const cle = localStorage.key(i);
        if (cle && cle.startsWith('lk_') && cle.endsWith(cleSuffixe)) {
          const cleBase = cle.slice(0, -cleSuffixe.length);
          try {
            donnees[cleBase] = JSON.parse(localStorage.getItem(cle));
          } catch (e) { /* ignore cette clé */ }
        }
      }
      if (Object.keys(donnees).length > 0) {
        await supabase.from('plan_donnees').upsert({ plan_id: planIdValide, user_id: userId, data: donnees });
      }
      localStorage.setItem(cleMarqueurPlan, 'true');
    }
  } catch (err) {
    // Échec réseau ou autre : on NE pose PAS les marqueurs manquants,
    // pour retenter au prochain appel plutôt que d'abandonner
    // silencieusement une migration qui n'a pas eu lieu.
    console.warn('Migration rétroactive localStorage → Supabase échouée, nouvelle tentative au prochain appel :', err.message);
  }
}

// ------------------------------------------------------------
// Précharge toutes les données Supabase de l'utilisateur dans
// localStorage. À appeler une fois, juste après confirmation de la
// session (avant que index.html ne lise ses variables `let x = load(...)`).
// ------------------------------------------------------------
export async function precharger(userId, planId) {
  const planIdValide = estUuidValide(planId) ? planId : null;
  try {
    const [profilRes, integrationsRes, planDonneesRes] = await Promise.all([
      supabase.from('profils_coureur').select('data').eq('user_id', userId).maybeSingle(),
      supabase.from('integrations').select('*').eq('user_id', userId).maybeSingle(),
      planIdValide
        ? supabase.from('plan_donnees').select('data').eq('plan_id', planIdValide).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (profilRes.data?.data) {
      localStorage.setItem('lk_profil_coureur', JSON.stringify(profilRes.data.data));
    }

    if (integrationsRes.data) {
      const i = integrationsRes.data;
      if (i.strava_token) localStorage.setItem('lk_strava_token', JSON.stringify(i.strava_token));
      if (i.strava_refresh) localStorage.setItem('lk_strava_refresh', JSON.stringify(i.strava_refresh));
      if (i.strava_expires) localStorage.setItem('lk_strava_expires', JSON.stringify(new Date(i.strava_expires).getTime()));
      if (i.strava_activities_cache) localStorage.setItem('lk_strava_activities', JSON.stringify(i.strava_activities_cache));
      if (i.github_token) localStorage.setItem('lk_github_token', JSON.stringify(i.github_token));
      if (i.gist_id) localStorage.setItem('lk_gist_id', JSON.stringify(i.gist_id));
      if (i.last_sync) localStorage.setItem('lk_last_sync', JSON.stringify(new Date(i.last_sync).getTime()));
    }

    if (planDonneesRes.data?.data) {
      // plan_donnees.data est un objet { lk_statuses: {...}, lk_notes: [...], ... }
      // — on éclate chaque clé vers sa version préfixée par plan, pour que
      // clePourPlan() (déjà présent dans index.html) les retrouve normalement.
      const suffixe = planId ? `_${planId}` : '';
      for (const [cle, valeur] of Object.entries(planDonneesRes.data.data)) {
        localStorage.setItem(`${cle}${suffixe}`, JSON.stringify(valeur));
      }
    }

    return true;
  } catch (err) {
    // Échec réseau ou autre : on laisse localStorage tel quel (données
    // d'une session précédente, ou vide au tout premier login) plutôt
    // que de bloquer l'affichage de l'app.
    console.warn('Préchargement Supabase échoué, poursuite avec localStorage local :', err.message);
    return false;
  }
}

// ------------------------------------------------------------
// Écrit une valeur vers Supabase en arrière-plan, sans bloquer.
// Route vers la bonne table selon la clé. Appelée depuis save()
// dans index.html, en plus de l'écriture localStorage existante.
// ------------------------------------------------------------
export function synchroniserVersSupabase(userId, planId, cle, valeur) {
  if (!userId) return; // pas connecté, pas de sync possible (ne devrait pas arriver)

  if (cle === 'lk_profil_coureur') {
    supabase.from('profils_coureur')
      .upsert({ user_id: userId, data: valeur })
      .then(({ error }) => { if (error) console.warn('Sync profil échouée :', error.message); });
    return;
  }

  if (CLES_INTEGRATIONS.includes(cle)) {
    const colonnes = {
      lk_strava_token: 'strava_token',
      lk_strava_refresh: 'strava_refresh',
      lk_strava_expires: 'strava_expires',
      lk_strava_activities: 'strava_activities_cache',
      lk_last_sync: 'last_sync',
      lk_github_token: 'github_token',
      lk_gist_id: 'gist_id',
    };
    const colonne = colonnes[cle];
    // strava_expires et last_sync sont des colonnes timestamptz côté
    // Postgres — index.html stocke ces valeurs en timestamp Unix (parfois
    // en secondes, parfois en millisecondes selon l'origine), jamais en
    // ISO. Écrire le nombre brut fait échouer l'upsert avec "date/time
    // field value out of range" (bug découvert en test de production le
    // 13 juillet 2026). On convertit ici plutôt que de supposer un format.
    let valeurFinale = valeur;
    if ((colonne === 'strava_expires' || colonne === 'last_sync') && typeof valeur === 'number') {
      // En dessous de ce seuil (an ~2001 en millisecondes), c'est presque
      // certainement des secondes Unix, pas des millisecondes — on multiplie.
      const enMillisecondes = valeur < 1e12 ? valeur * 1000 : valeur;
      valeurFinale = new Date(enMillisecondes).toISOString();
    }
    const payload = { user_id: userId, [colonne]: valeurFinale };
    supabase.from('integrations')
      .upsert(payload)
      .then(({ error }) => { if (error) console.warn('Sync intégration échouée :', error.message); });
    return;
  }

  if (CLES_LOCALES_UNIQUEMENT.includes(cle)) {
    return; // volontairement pas synchronisé
  }

  // Toute autre clé préfixée par plan (lk_statuses_xxx, lk_notes_xxx, etc.)
  // va dans plan_donnees.data, sous sa clé SANS le suffixe d'id.
  if (!planId) return; // pas de plan actif, rien à synchroniser
  if (!estUuidValide(planId)) {
    // Plan de repli par défaut ou tout autre id non-UUID : pas de table
    // pour ce cas, on reste volontairement en localStorage uniquement.
    // Redevient synchronisable dès qu'un vrai plan (UUID du wizard) est actif.
    return;
  }
  const cleBase = planId ? cle.replace(`_${planId}`, '') : cle;

  supabase.from('plan_donnees')
    .select('data')
    .eq('plan_id', planId)
    .maybeSingle()
    .then(({ data: existant }) => {
      const donnees = { ...(existant?.data || {}), [cleBase]: valeur };
      return supabase.from('plan_donnees').upsert({
        plan_id: planId,
        user_id: userId,
        data: donnees,
      });
    })
    .then((res) => { if (res?.error) console.warn('Sync plan_donnees échouée :', res.error.message); })
    .catch((err) => console.warn('Sync plan_donnees échouée :', err.message));
}

// ------------------------------------------------------------
// Garantit qu'une ligne existe dans la table `plans` pour ce planId,
// AVANT toute tentative d'écriture vers `plan_donnees` (qui a une
// contrainte de clé étrangère vers plans.id — cf. schéma SQL). Sans
// cet appel, la toute première écriture vers plan_donnees échoue en
// 409 "violates foreign key constraint plan_donnees_plan_id_fkey",
// car aucun code n'insérait jamais de ligne dans `plans` elle-même —
// bug découvert en test de production le 13 juillet 2026, cf.
// inventaire §8bis. À appeler une fois, dès que window.__PLAN_BRUT__
// est connu, avant le premier appel à synchroniserVersSupabase() ou
// migrerDonneesExistantes() pour ce plan.
// ------------------------------------------------------------
export async function assurerPlanExiste(userId, planId, planBrut) {
  if (!estUuidValide(planId)) return; // plan de repli ou id non-UUID : rien à faire

  try {
    const { data: existant, error: erreurLecture } = await supabase
      .from('plans')
      .select('id')
      .eq('id', planId)
      .maybeSingle();

    if (erreurLecture) {
      console.warn('Vérification existence du plan échouée :', erreurLecture.message);
      return;
    }
    if (existant) return; // déjà là, rien à faire

    const nom = planBrut?.nom || `${planBrut?.distance || ''} — ${planBrut?.objectif || ''}`.trim() || 'Plan';
    const { error: erreurInsertion } = await supabase.from('plans').insert({
      id: planId,
      user_id: userId,
      nom,
      plan_brut: planBrut || {},
    });
    if (erreurInsertion) {
      console.warn('Création de la ligne plans échouée :', erreurInsertion.message);
    }
  } catch (err) {
    console.warn('assurerPlanExiste a échoué :', err.message);
  }
}
