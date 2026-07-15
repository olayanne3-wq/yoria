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

import { supabase, supabaseReady } from './auth.js';
import { trouverPlanEnConflit } from './gist-sync.js';

// Clés globales (non préfixées par plan) à synchroniser avec la table
// `integrations` plutôt que `profils_coureur` ou `plan_donnees` —
// cf. schéma SQL, ces clés contiennent des tokens tiers.
//
// v2_gist_id ajouté le 14 juillet 2026 : oubliée depuis la création de
// cette liste, c'est l'id du Gist contenant les VRAIS plans v2 (multi-
// plans, format wizard) — distinct de lk_gist_id (résidu de l'ancien
// système de backup v1, cf. inventaire §10, chantier "nettoyage backup
// v1"). Son absence ici faisait qu'une toute nouvelle installation (ou
// un nouvel appareil) restaurait bien lk_github_token/lk_gist_id depuis
// Supabase, mais jamais v2_gist_id — chargerPlans() (qui lit v2_gist_id,
// pas lk_gist_id) se retrouvait donc sans le bon id de Gist et
// retournait une liste de plans vide, malgré des plans bien réels et
// intacts sur GitHub. Bug découvert le 14 juillet 2026 lors du premier
// test d'installation Play Store sur un appareil neuf (aucun localStorage
// préexistant, contrairement aux tests précédents qui gardaient toujours
// une trace locale de sessions antérieures). Nécessite une colonne
// v2_gist_id (text) sur la table integrations côté Supabase, ajoutée en
// même temps que ce correctif.
const CLES_INTEGRATIONS = [
  'lk_strava_token', 'lk_strava_refresh', 'lk_strava_expires',
  'lk_strava_activities', 'lk_last_sync', 'lk_github_token', 'lk_gist_id',
  'v2_gist_id',
];

// Clé globale de cache météo — pas de table dédiée pour l'instant,
// reste en localStorage uniquement (donnée re-générable, faible enjeu
// de perte en cas de changement d'appareil).
const CLES_LOCALES_UNIQUEMENT = ['lk_weather_cache'];

// ------------------------------------------------------------
// File d'attente de synchronisation — ajoutée le 13 juillet 2026.
// Si une écriture Supabase échoue (réseau coupé, timeout, etc.), on la
// met en file plutôt que de l'abandonner silencieusement. La file est
// rejouée automatiquement au retour du réseau (événement 'online') et
// périodiquement (au cas où 'online' ne se déclenche pas de façon fiable
// sur tous les navigateurs/PWA). localStorage reste toujours correct
// entre-temps — cette file ne fait que rattraper Supabase.
// ------------------------------------------------------------
const CLE_FILE_SYNC = 'lk_file_attente_sync';

function litFileSync() {
  try { return JSON.parse(localStorage.getItem(CLE_FILE_SYNC)) || []; }
  catch (e) { return []; }
}

function ecritFileSync(file) {
  try { localStorage.setItem(CLE_FILE_SYNC, JSON.stringify(file)); }
  catch (e) { /* quota localStorage dépassé, tant pis pour cette entrée */ }
}

// Ajoute une tentative échouée à la file. `type` identifie l'action à
// rejouer (une des clés gérées par rejouerEntreeFile ci-dessous).
function ajouterALaFile(type, payload) {
  const file = litFileSync();
  file.push({ type, payload, essais: 0, ajoute: Date.now() });
  ecritFileSync(file);
}

// Rejoue une entrée de la file selon son type. Retourne true si réussie.
async function rejouerEntreeFile(entree) {
  await supabaseReady;
  try {
    if (entree.type === 'profil') {
      const { error } = await supabase.from('profils_coureur').upsert(entree.payload);
      return !error;
    }
    if (entree.type === 'integration') {
      const { error } = await supabase.from('integrations').upsert(entree.payload);
      return !error;
    }
    if (entree.type === 'plan_donnees') {
      const { error: erreurLecture, data: existant } = await supabase
        .from('plan_donnees').select('data').eq('plan_id', entree.payload.plan_id).maybeSingle();
      if (erreurLecture) return false;
      const donnees = { ...(existant?.data || {}), [entree.payload.cleBase]: entree.payload.valeur };
      const { error } = await supabase.from('plan_donnees').upsert({
        plan_id: entree.payload.plan_id, user_id: entree.payload.user_id, data: donnees,
      });
      return !error;
    }
    return true; // type inconnu : on l'abandonne plutôt que de la rejouer indéfiniment
  } catch (e) {
    return false;
  }
}

// Rejoue toute la file, retire les entrées réussies, garde les autres
// (avec compteur d'essais incrémenté). Abandonne une entrée après 10
// essais infructueux, pour éviter une file qui grossit indéfiniment
// avec une entrée systématiquement en échec (ex: donnée corrompue).
export async function rejouerFileSync() {
  const file = litFileSync();
  if (file.length === 0) return;

  const fileRestante = [];
  for (const entree of file) {
    const reussi = await rejouerEntreeFile(entree);
    if (!reussi) {
      entree.essais++;
      if (entree.essais < 10) fileRestante.push(entree);
      // sinon : abandonnée silencieusement après 10 essais
    }
  }
  ecritFileSync(fileRestante);
}

// Déclenche un rejeu au retour du réseau, et toutes les 5 minutes en
// secours (PWA en arrière-plan, événement 'online' pas toujours fiable).
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { rejouerFileSync(); });
  setInterval(() => { rejouerFileSync(); }, 5 * 60 * 1000);
}

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
  await supabaseReady;
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
      // v2_gist_id ajouté le 14 juillet 2026 — cf. commentaire sur
      // CLES_INTEGRATIONS plus haut dans ce fichier.
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
      // v2_gist_id traité séparément, en lecture BRUTE (pas de JSON.parse) —
      // contrairement aux autres clés d'intégration, gist-sync.js l'écrit
      // sans JSON.stringify() (storage.setItem('v2_gist_id', id) brut dans
      // setV2GistId()). Un JSON.parse('4b9e8e7d...') sur cette valeur
      // échoue silencieusement (ce n'est pas du JSON valide), donc la
      // boucle générique ci-dessus ne migrait jamais cette clé, même une
      // fois ajoutée à CLES_INTEGRATIONS. Bug découvert le 14 juillet 2026,
      // distinct du bug initial "clé manquante" corrigé plus tôt le même
      // jour — cf. commentaire sur CLES_INTEGRATIONS plus haut.
      const v2GistIdBrut = localStorage.getItem('v2_gist_id');
      if (v2GistIdBrut) {
        payloadIntegrations.v2_gist_id = v2GistIdBrut;
        auMoinsUneIntegration = true;
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
  await supabaseReady;
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
      // v2_gist_id ajouté le 14 juillet 2026 — cf. commentaire sur
      // CLES_INTEGRATIONS plus haut dans ce fichier. Sans cette ligne,
      // le préchargement restaurait bien lk_gist_id (résidu v1) mais
      // jamais v2_gist_id (le vrai id utilisé par chargerPlans()), donc
      // une nouvelle installation ne retrouvait jamais les plans v2
      // pourtant bien migrés au premier login.
      //
      // IMPORTANT — pas de JSON.stringify() ici, contrairement aux autres
      // clés d'intégration : getV2GistId() dans gist-sync.js lit v2_gist_id
      // en BRUT (storage.getItem('v2_gist_id') sans JSON.parse()), alors que
      // getGithubToken() dans ce même fichier gère les deux formats. Écrire
      // une valeur JSON.stringify()-ée ici ("4b9e..." avec guillemets) fait
      // que chargerPlans() construit une URL GitHub invalide
      // (api.github.com/gists/%224b9e...%22) et échoue en 404 — bug
      // découvert le 14 juillet 2026 lors du tout premier test réel sur un
      // appareil neuf, distinct du bug initial "clé manquante" corrigé plus
      // tôt le même jour.
      if (i.v2_gist_id) localStorage.setItem('v2_gist_id', i.v2_gist_id);
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
  // Reste volontairement synchrone (fire-and-forget) côté appelant — en
  // pratique save() n'est appelée qu'après le premier rendu, donc
  // supabaseReady est déjà résolue. Garde de sécurité quand même : si
  // jamais appelée trop tôt, on attend silencieusement plutôt que de
  // planter sur `supabase` undefined.
  if (!supabase) {
    supabaseReady.then(() => synchroniserVersSupabase(userId, planId, cle, valeur));
    return;
  }

  if (cle === 'lk_profil_coureur') {
    const payload = { user_id: userId, data: valeur };
    supabase.from('profils_coureur')
      .upsert(payload)
      .then(({ error }) => {
        if (error) {
          console.warn('Sync profil échouée, mise en file :', error.message);
          ajouterALaFile('profil', payload);
        }
      });
    return;
  }

  if (CLES_INTEGRATIONS.includes(cle)) {
    // v2_gist_id ajouté le 14 juillet 2026 — cf. commentaire sur
    // CLES_INTEGRATIONS plus haut dans ce fichier.
    const colonnes = {
      lk_strava_token: 'strava_token',
      lk_strava_refresh: 'strava_refresh',
      lk_strava_expires: 'strava_expires',
      lk_strava_activities: 'strava_activities_cache',
      lk_last_sync: 'last_sync',
      lk_github_token: 'github_token',
      lk_gist_id: 'gist_id',
      v2_gist_id: 'v2_gist_id',
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
      .then(({ error }) => {
        if (error) {
          console.warn('Sync intégration échouée, mise en file :', error.message);
          ajouterALaFile('integration', payload);
        }
      });
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
  marquerEchoLocal(planId); // avant l'écriture : l'événement Realtime qui
  // reviendra pour ce planId dans les 3s sera ignoré, c'est notre propre écho.

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
    .then((res) => {
      if (res?.error) {
        console.warn('Sync plan_donnees échouée, mise en file :', res.error.message);
        ajouterALaFile('plan_donnees', { plan_id: planId, user_id: userId, cleBase, valeur });
      }
    })
    .catch((err) => {
      console.warn('Sync plan_donnees échouée, mise en file :', err.message);
      ajouterALaFile('plan_donnees', { plan_id: planId, user_id: userId, cleBase, valeur });
    });
}

// ------------------------------------------------------------
// Liste tous les plans d'un utilisateur depuis Supabase — ajouté le
// 15/07/2026. Jusqu'ici, seul chargerPlans() (gist-sync.js, Gist GitHub)
// permettait de lister "tous mes plans" pour le sélecteur/repli du
// dashboard ; assurerPlanExiste() ne fait qu'insérer UNE ligne pour un
// plan déjà choisi, jamais de listing. Conséquence concrète découverte le
// 15/07/2026 en testant le wizard grand-débutant : sans token GitHub
// configuré (Laurent l'a volontairement retiré), chargerPlans() retourne
// toujours [] (gist-sync.js, ligne ~49), donc AUCUN plan tout juste
// généré ne pouvait jamais être retrouvé côté dashboard, quel que soit le
// wizard utilisé (course, forme, grand-débutant) — pas un bug propre au
// grand-débutant, un trou structurel du chantier v2.5 migration.
//
// plan_brut (jsonb, colonne existante depuis assurerPlanExiste) contient
// déjà le plan complet tel que généré par le moteur — pas besoin de le
// reconstruire depuis plan_donnees, contrairement aux statuts/notes qui
// eux restent dans cette table séparée.
// ------------------------------------------------------------
export async function chargerPlansSupabase(userId) {
  await supabaseReady;
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('id, nom, plan_brut, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('chargerPlansSupabase a échoué :', error.message);
      return [];
    }
    // plan_brut porte déjà id/nom en interne (écrits par le wizard avant
    // sauvegarde) — on les retrouve tels quels, la colonne id/nom de la
    // table plans n'est qu'une redondance utile pour trier/nommer sans
    // charger tout le jsonb à chaque fois.
    return (data || []).map(row => ({ ...row.plan_brut, id: row.id, nom: row.nom || row.plan_brut?.nom }));
  } catch (err) {
    console.warn('chargerPlansSupabase a échoué :', err.message);
    return [];
  }
}

// ------------------------------------------------------------
// Met à jour un plan Forme déjà existant côté Supabase — v2.8, 15/07/2026.
// assurerPlanExiste() ne fait jamais de mise à jour (juste "créer si
// absent"), donc insuffisant pour modifier un plan déjà en base (clôture,
// renommage). Remplace intégralement plan_brut (pas de merge partiel —
// l'appelant doit fournir l'objet plan complet et à jour) ; met aussi à
// jour la colonne `nom` dénormalisée si planBrut.nom est fourni, pour
// rester cohérente avec ce que chargerPlansSupabase() lit en priorité.
//
// Utilisée notamment par la bannière de transition grand-débutant ("🏆 Tu
// cours en continu !", index.html) : sans cette fonction, le clic sur
// "Configurer mon prochain plan" ne clôturait jamais le plan grand-
// débutant en cours, qui restait donc "actif indéfiniment" — bloquant la
// création du nouveau plan par le garde-fou anti-chevauchement
// (assurerPlanExiste, réactivé le même jour). Également utilisée par la
// clôture manuelle depuis Réglages (index.html), qui renomme aussi le
// plan si son nom semblait auto-généré (cf. nommerPlanForme, v2/index.html).
// ------------------------------------------------------------
export async function mettreAJourPlanSupabase(planId, planBrutComplet) {
  await supabaseReady;
  if (!estUuidValide(planId)) return;
  try {
    const payload = { plan_brut: planBrutComplet };
    if (planBrutComplet?.nom) payload.nom = planBrutComplet.nom;
    const { error } = await supabase.from('plans').update(payload).eq('id', planId);
    if (error) {
      console.warn('Mise à jour du plan échouée :', error.message);
    }
  } catch (err) {
    console.warn('mettreAJourPlanSupabase a échoué :', err.message);
  }
}

// Conservée pour compatibilité : clôture seule (pas de renommage), utilisée
// par la bannière grand-débutant où il n'y a pas de nom particulier à
// synchroniser (le nom auto-généré à la création reste correct — il ne
// mentionne la date de clôture que si generatePlanForme la connaît déjà
// à ce moment-là, ce qui n'est pas le cas ici puisqu'elle est décidée
// après coup). Repose sur mettreAJourPlanSupabase() pour l'écriture.
export async function cloturerPlanSupabase(planId, dateCloture) {
  await supabaseReady;
  if (!estUuidValide(planId)) return;
  try {
    const { data: existant, error: erreurLecture } = await supabase
      .from('plans')
      .select('plan_brut')
      .eq('id', planId)
      .maybeSingle();
    if (erreurLecture || !existant) {
      console.warn('Clôture du plan échouée (lecture) :', erreurLecture?.message || 'plan introuvable');
      return;
    }
    const planBrutMisAJour = { ...existant.plan_brut, dateCloture };
    const { error: erreurUpdate } = await supabase
      .from('plans')
      .update({ plan_brut: planBrutMisAJour })
      .eq('id', planId);
    if (erreurUpdate) {
      console.warn('Clôture du plan échouée (update) :', erreurUpdate.message);
    }
  } catch (err) {
    console.warn('cloturerPlanSupabase a échoué :', err.message);
  }
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
  await supabaseReady;
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

    // Garde-fou anti-chevauchement — porté depuis gist-sync.js le
    // 15/07/2026 (v2.8). Jusqu'ici, cette vérification n'existait que côté
    // sauvegarderPlan() (Gist) : depuis que Supabase est devenu le
    // mécanisme de sauvegarde PRINCIPAL (même jour, correctif "Supabase
    // devient le mécanisme de sauvegarde principal"), elle était
    // silencieusement contournée pour tout nouveau plan créé via
    // assurerPlanExiste — pas spécifique au grand-débutant, un trou pour
    // tous les modes (course, forme, grand-débutant). Même règle
    // qu'avant : un plan Forme sans dateCloture bloque tout nouveau plan
    // (course ou forme) tant qu'il n'est pas clôturé — cf.
    // dateFinPeriodeActive()/trouverPlanEnConflit() dans gist-sync.js pour
    // le détail des règles.
    if (planBrut?.dateDebut) {
      const plansExistants = await chargerPlansSupabase(userId);
      const dateFinDuNouveauPlan = planBrut.mode === 'forme' ? (planBrut.dateCloture || null) : planBrut.dateCourse;
      const conflit = trouverPlanEnConflit(plansExistants, planBrut.dateDebut, dateFinDuNouveauPlan, planId);
      if (conflit) {
        const nomConflit = conflit.nom || (conflit.mode === 'forme' ? 'Plan forme' : `${conflit.distance || '?'} — ${conflit.objectif || '?'}`);
        const finConflit = conflit.mode === 'forme' ? (conflit.dateCloture || 'sans date de fin') : conflit.dateCourse;
        const finNouveau = dateFinDuNouveauPlan || 'sans date de fin';
        throw new Error(`Ce plan (${planBrut.dateDebut} → ${finNouveau}) chevauche un plan déjà actif : "${nomConflit}" (${conflit.dateDebut} → ${finConflit}). Un seul plan peut être actif à la fois — clôture ou supprime le plan existant, ou choisis d'autres dates.`);
      }
    }

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
    // Re-lance si c'est notre propre erreur de conflit (message déjà
    // clair pour l'utilisateur) — les autres erreurs (réseau, etc.)
    // restent en best-effort silencieux comme avant.
    if (err.message?.includes('chevauche un plan déjà actif')) throw err;
    console.warn('assurerPlanExiste a échoué :', err.message);
  }
}

// ------------------------------------------------------------
// Realtime — ajouté le 13 juillet 2026. S'abonne aux changements sur
// plan_donnees (filtré par plan_id) pour cet utilisateur, afin qu'un
// changement fait sur un AUTRE appareil (ex: coche une séance sur le
// téléphone) déclenche un rafraîchissement ici, sans attendre un
// rechargement manuel de la page. N'écoute que plan_donnees pour
// l'instant — c'est la table qui change le plus souvent (statuts,
// notes) ; profils_coureur/integrations changent rarement, pas encore
// couverts par Realtime (peuvent l'être plus tard si besoin réel).
//
// Anti-écho : chaque écriture via synchroniserVersSupabase() de CETTE
// session marque brièvement la clé concernée comme "origine locale" —
// si l'événement Realtime qui revient correspond à une écriture qu'on
// vient nous-mêmes de faire, on l'ignore (pas de re-render inutile).
// Fenêtre de 3s, largement suffisante pour un aller-retour réseau normal.
// ------------------------------------------------------------
const ECHOS_RECENTS = new Map(); // planId -> timestamp du dernier upsert local

function marquerEchoLocal(planId) {
  ECHOS_RECENTS.set(planId, Date.now());
}

function estEchoRecent(planId) {
  const t = ECHOS_RECENTS.get(planId);
  return t && (Date.now() - t) < 3000;
}

let canalRealtimeActuel = null;

// ------------------------------------------------------------
// Active l'écoute Realtime pour un plan donné. `onChangement(payload)`
// est appelé à chaque modification distante détectée (pas la nôtre).
// Retourne une fonction de désabonnement, à appeler si on change de
// plan actif (évite d'accumuler des abonnements sur d'anciens plans).
// ------------------------------------------------------------
export async function activerRealtime(planId, onChangement) {
  await supabaseReady;
  if (!estUuidValide(planId)) return () => {}; // plan de repli : rien à écouter

  // Ferme un éventuel abonnement précédent avant d'en ouvrir un nouveau —
  // évite d'accumuler des canaux si l'utilisateur change de plan plusieurs
  // fois dans la même session.
  if (canalRealtimeActuel) {
    supabase.removeChannel(canalRealtimeActuel);
    canalRealtimeActuel = null;
  }

  const canal = supabase
    .channel(`plan_donnees_${planId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'plan_donnees', filter: `plan_id=eq.${planId}` },
      (payload) => {
        if (estEchoRecent(planId)) return; // c'est notre propre écriture qui revient, on ignore
        onChangement(payload);
      }
    )
    .subscribe();

  canalRealtimeActuel = canal;
  return () => {
    supabase.removeChannel(canal);
    if (canalRealtimeActuel === canal) canalRealtimeActuel = null;
  };
}
