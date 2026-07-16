// ============================================================
// Yoria — Synchronisation localStorage ↔ Supabase (copie classic)
// DÉRIVÉ DE public/v2/engine/sync-storage.js — pas une source de vérité.
// À régénérer manuellement à chaque modification de sync-storage.js.
// ============================================================

(function () {
  // Fonctions dupliquées depuis gist-sync.classic.js (dateFinPeriodeActive,
  // datesChevauchent, trouverPlanEnConflit) — v2.8, 15/07/2026. Duplication
  // plutôt qu'un appel croisé entre les deux IIFE classic (gist-sync.classic.js
  // n'expose aucune de ses fonctions via window.LkXxx, contrairement au
  // pattern habituel des autres modules classic — état existant, pas
  // touché ici pour ne rien risquer de casser côté Gist). Garder ces trois
  // fonctions synchronisées avec gist-sync.js/gist-sync.classic.js si leur
  // logique évolue.
  function dateFinPeriodeActive(plan) {
    if (plan.mode === 'forme') return plan.dateCloture || null;
    return plan.dateCourse || null;
  }

  function datesChevauchent(debutA, finA, debutB, finB) {
    if (finB !== null && finB !== undefined && debutA > finB) return false;
    if (finA !== null && finA !== undefined && debutB > finA) return false;
    return true;
  }

  function trouverPlanEnConflit(plans, dateDebut, dateFin, idAExclure) {
    return plans.find(function (p) {
      if (p.id === idAExclure || !p.dateDebut) return false;
      const finExistant = dateFinPeriodeActive(p);
      return datesChevauchent(dateDebut, dateFin === undefined ? null : dateFin, p.dateDebut, finExistant);
    }) || null;
  }

  // v2_gist_id ajouté le 14 juillet 2026 : oubliée depuis la création de
  // cette liste, c'est l'id du Gist contenant les VRAIS plans v2 (multi-
  // plans, format wizard) — distinct de lk_gist_id (résidu de l'ancien
  // système de backup v1). Son absence faisait qu'une nouvelle
  // installation restaurait lk_gist_id mais jamais v2_gist_id, donc
  // "Aucun plan enregistré" malgré des plans bien réels sur GitHub.
  // Nécessite la colonne v2_gist_id (text) sur la table integrations.
  const CLES_INTEGRATIONS = [
    'lk_strava_token', 'lk_strava_refresh', 'lk_strava_expires',
    'lk_strava_activities', 'lk_last_sync', 'lk_github_token', 'lk_gist_id',
    'v2_gist_id',
  ];

  const CLES_LOCALES_UNIQUEMENT = ['lk_weather_cache'];

  const CLE_FILE_SYNC = 'lk_file_attente_sync';

  function litFileSync() {
    try { return JSON.parse(localStorage.getItem(CLE_FILE_SYNC)) || []; }
    catch (e) { return []; }
  }

  function ecritFileSync(file) {
    try { localStorage.setItem(CLE_FILE_SYNC, JSON.stringify(file)); }
    catch (e) { /* quota dépassé */ }
  }

  function ajouterALaFile(type, payload) {
    const file = litFileSync();
    file.push({ type: type, payload: payload, essais: 0, ajoute: Date.now() });
    ecritFileSync(file);
  }

  async function rejouerEntreeFile(entree) {
    await window.LkAuth.supabaseReady;
    const supabase = window.LkAuth.supabase;
    try {
      if (entree.type === 'profil') {
        const res = await supabase.from('profils_coureur').upsert(entree.payload);
        return !res.error;
      }
      if (entree.type === 'integration') {
        const res = await supabase.from('integrations').upsert(entree.payload);
        return !res.error;
      }
      if (entree.type === 'plan_donnees') {
        const lecture = await supabase.from('plan_donnees').select('data').eq('plan_id', entree.payload.plan_id).maybeSingle();
        if (lecture.error) return false;
        const donnees = Object.assign({}, (lecture.data && lecture.data.data) || {});
        donnees[entree.payload.cleBase] = entree.payload.valeur;
        const res = await supabase.from('plan_donnees').upsert({
          plan_id: entree.payload.plan_id, user_id: entree.payload.user_id, data: donnees,
        });
        return !res.error;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  async function rejouerFileSync() {
    const file = litFileSync();
    if (file.length === 0) return;

    const fileRestante = [];
    for (let i = 0; i < file.length; i++) {
      const entree = file[i];
      const reussi = await rejouerEntreeFile(entree);
      if (!reussi) {
        entree.essais++;
        if (entree.essais < 10) fileRestante.push(entree);
      }
    }
    ecritFileSync(fileRestante);
  }

  window.addEventListener('online', function () { rejouerFileSync(); });
  setInterval(function () { rejouerFileSync(); }, 5 * 60 * 1000);

  const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function estUuidValide(valeur) {
    return typeof valeur === 'string' && RE_UUID.test(valeur);
  }

  const CLE_MARQUEUR_MIGRATION_GLOBALE = 'lk_migration_supabase_globale_faite';
  const CLE_MARQUEUR_MIGRATION_PLAN_PREFIX = 'lk_migration_supabase_plan_faite_';

  async function migrerDonneesExistantes(userId, planId) {
    await window.LkAuth.supabaseReady;
    const supabase = window.LkAuth.supabase;
    const planIdValide = estUuidValide(planId) ? planId : null;
    const dejaGlobale = !!localStorage.getItem(CLE_MARQUEUR_MIGRATION_GLOBALE);
    const cleMarqueurPlan = planIdValide ? (CLE_MARQUEUR_MIGRATION_PLAN_PREFIX + planIdValide) : null;
    const dejaPlan = cleMarqueurPlan ? !!localStorage.getItem(cleMarqueurPlan) : true;

    if (dejaGlobale && dejaPlan) return;

    try {
      if (!dejaGlobale) {
        const profilBrut = localStorage.getItem('lk_profil_coureur');
        if (profilBrut) {
          try {
            const profil = JSON.parse(profilBrut);
            await supabase.from('profils_coureur').upsert({ user_id: userId, data: profil });
          } catch (e) { /* ignore */ }
        }

        const colonnes = {
          lk_strava_token: 'strava_token',
          lk_strava_refresh: 'strava_refresh',
          lk_github_token: 'github_token',
          lk_gist_id: 'gist_id',
        };
        const payloadIntegrations = { user_id: userId };
        let auMoinsUneIntegration = false;
        const entriesColonnes = Object.entries(colonnes);
        for (let i = 0; i < entriesColonnes.length; i++) {
          const cleLocale = entriesColonnes[i][0];
          const colonne = entriesColonnes[i][1];
          const brut = localStorage.getItem(cleLocale);
          if (brut) {
            try {
              payloadIntegrations[colonne] = JSON.parse(brut);
              auMoinsUneIntegration = true;
            } catch (e) { /* ignore */ }
          }
        }
        // v2_gist_id traité séparément, en lecture BRUTE (pas de JSON.parse)
        // — contrairement aux autres clés, gist-sync.js l'écrit sans
        // JSON.stringify() (setV2GistId() fait un storage.setItem() brut).
        // Un JSON.parse('4b9e8e7d...') dessus échoue silencieusement (ce
        // n'est pas du JSON valide), donc la boucle générique ci-dessus ne
        // migrait jamais cette clé, même une fois ajoutée à
        // CLES_INTEGRATIONS. Bug découvert le 14 juillet 2026, distinct du
        // bug initial "clé manquante" corrigé plus tôt le même jour.
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
        const cleSuffixe = '_' + planIdValide;
        const donnees = {};
        for (let i = 0; i < localStorage.length; i++) {
          const cle = localStorage.key(i);
          if (cle && cle.indexOf('lk_') === 0 && cle.endsWith(cleSuffixe)) {
            const cleBase = cle.slice(0, -cleSuffixe.length);
            try {
              donnees[cleBase] = JSON.parse(localStorage.getItem(cle));
            } catch (e) { /* ignore */ }
          }
        }
        if (Object.keys(donnees).length > 0) {
          await supabase.from('plan_donnees').upsert({ plan_id: planIdValide, user_id: userId, data: donnees });
        }
        localStorage.setItem(cleMarqueurPlan, 'true');
      }
    } catch (err) {
      console.warn('Migration rétroactive localStorage → Supabase échouée, nouvelle tentative au prochain appel :', err.message);
    }
  }

  async function precharger(userId, planId) {
    await window.LkAuth.supabaseReady;
    const planIdValide = estUuidValide(planId) ? planId : null;
    const supabase = window.LkAuth.supabase;
    try {
      const results = await Promise.all([
        supabase.from('profils_coureur').select('data').eq('user_id', userId).maybeSingle(),
        supabase.from('integrations').select('*').eq('user_id', userId).maybeSingle(),
        planIdValide
          ? supabase.from('plan_donnees').select('data').eq('plan_id', planIdValide).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      const profilRes = results[0];
      const integrationsRes = results[1];
      const planDonneesRes = results[2];

      if (profilRes.data && profilRes.data.data) {
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
        // une nouvelle installation ne retrouvait jamais les plans v2.
        //
        // IMPORTANT — pas de JSON.stringify() ici, contrairement aux autres
        // clés : getV2GistId() dans gist-sync.js lit v2_gist_id en BRUT
        // (sans JSON.parse()). Écrire une valeur JSON.stringify()-ée ici
        // fait échouer chargerPlans() avec une URL GitHub invalide
        // (%224b9e...%22) — bug découvert le 14 juillet 2026, distinct du
        // bug initial "clé manquante" corrigé plus tôt le même jour.
        if (i.v2_gist_id) localStorage.setItem('v2_gist_id', i.v2_gist_id);
        if (i.last_sync) localStorage.setItem('lk_last_sync', JSON.stringify(new Date(i.last_sync).getTime()));
      }

      if (planDonneesRes.data && planDonneesRes.data.data) {
        const suffixe = planId ? '_' + planId : '';
        const entries = Object.entries(planDonneesRes.data.data);
        for (let j = 0; j < entries.length; j++) {
          const cle = entries[j][0];
          const valeur = entries[j][1];
          localStorage.setItem(cle + suffixe, JSON.stringify(valeur));
        }
      }

      return true;
    } catch (err) {
      console.warn('Préchargement Supabase échoué, poursuite avec localStorage local :', err.message);
      return false;
    }
  }

  function synchroniserVersSupabase(userId, planId, cle, valeur) {
    const supabase = window.LkAuth.supabase;
    if (!userId) return;
    if (!supabase) {
      // Appelée trop tôt (supabaseReady pas encore résolue) : réessaie
      // une fois prêt, plutôt que de planter sur supabase undefined.
      window.LkAuth.supabaseReady.then(function () {
        synchroniserVersSupabase(userId, planId, cle, valeur);
      });
      return;
    }

    if (cle === 'lk_profil_coureur') {
      const payloadProfil = { user_id: userId, data: valeur };
      supabase.from('profils_coureur')
        .upsert(payloadProfil)
        .then(function (res) {
          if (res.error) {
            console.warn('Sync profil échouée, mise en file :', res.error.message);
            ajouterALaFile('profil', payloadProfil);
          }
        });
      return;
    }

    if (CLES_INTEGRATIONS.indexOf(cle) !== -1) {
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
      let valeurFinale = valeur;
      if ((colonne === 'strava_expires' || colonne === 'last_sync') && typeof valeur === 'number') {
        const enMillisecondes = valeur < 1e12 ? valeur * 1000 : valeur;
        valeurFinale = new Date(enMillisecondes).toISOString();
      }
      const payload = { user_id: userId };
      payload[colonne] = valeurFinale;
      supabase.from('integrations')
        .upsert(payload)
        .then(function (res) {
          if (res.error) {
            console.warn('Sync intégration échouée, mise en file :', res.error.message);
            ajouterALaFile('integration', payload);
          }
        });
      return;
    }

    if (CLES_LOCALES_UNIQUEMENT.indexOf(cle) !== -1) {
      return;
    }

    if (!planId) return;
    if (!estUuidValide(planId)) {
      // Plan de repli par défaut ou tout autre id non-UUID : pas de table
      // pour ce cas, on reste volontairement en localStorage uniquement.
      return;
    }
    const cleBase = planId ? cle.replace('_' + planId, '') : cle;
    marquerEchoLocal(planId);

    supabase.from('plan_donnees')
      .select('data')
      .eq('plan_id', planId)
      .maybeSingle()
      .then(function (res) {
        const existant = res.data;
        const donnees = Object.assign({}, (existant && existant.data) || {});
        donnees[cleBase] = valeur;
        return supabase.from('plan_donnees').upsert({
          plan_id: planId,
          user_id: userId,
          data: donnees,
        });
      })
      .then(function (res) {
        if (res && res.error) {
          console.warn('Sync plan_donnees échouée, mise en file :', res.error.message);
          ajouterALaFile('plan_donnees', { plan_id: planId, user_id: userId, cleBase: cleBase, valeur: valeur });
        }
      })
      .catch(function (err) {
        console.warn('Sync plan_donnees échouée, mise en file :', err.message);
        ajouterALaFile('plan_donnees', { plan_id: planId, user_id: userId, cleBase: cleBase, valeur: valeur });
      });
  }

  async function chargerPlansSupabase(userId) {
    await window.LkAuth.supabaseReady;
    const supabase = window.LkAuth.supabase;
    if (!userId) return [];
    try {
      const res = await supabase
        .from('plans')
        .select('id, nom, plan_brut, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (res.error) {
        console.warn('chargerPlansSupabase a échoué :', res.error.message);
        return [];
      }
      return (res.data || []).map(function (row) {
        return Object.assign({}, row.plan_brut, { id: row.id, nom: row.nom || (row.plan_brut && row.plan_brut.nom) });
      });
    } catch (err) {
      console.warn('chargerPlansSupabase a échoué :', err.message);
      return [];
    }
  }

  async function mettreAJourPlanSupabase(planId, planBrutComplet) {
    await window.LkAuth.supabaseReady;
    const supabase = window.LkAuth.supabase;
    if (!estUuidValide(planId)) return;
    try {
      const payload = { plan_brut: planBrutComplet };
      if (planBrutComplet && planBrutComplet.nom) payload.nom = planBrutComplet.nom;
      const res = await supabase.from('plans').update(payload).eq('id', planId);
      if (res.error) {
        console.warn('Mise à jour du plan échouée :', res.error.message);
      }
    } catch (err) {
      console.warn('mettreAJourPlanSupabase a échoué :', err.message);
    }
  }

  async function cloturerPlanSupabase(planId, dateCloture) {
    await window.LkAuth.supabaseReady;
    const supabase = window.LkAuth.supabase;
    if (!estUuidValide(planId)) return;
    try {
      const lecture = await supabase.from('plans').select('plan_brut').eq('id', planId).maybeSingle();
      if (lecture.error || !lecture.data) {
        console.warn('Clôture du plan échouée (lecture) :', (lecture.error && lecture.error.message) || 'plan introuvable');
        return;
      }
      const planBrutMisAJour = Object.assign({}, lecture.data.plan_brut, { dateCloture: dateCloture });
      const update = await supabase.from('plans').update({ plan_brut: planBrutMisAJour }).eq('id', planId);
      if (update.error) {
        console.warn('Clôture du plan échouée (update) :', update.error.message);
      }
    } catch (err) {
      console.warn('cloturerPlanSupabase a échoué :', err.message);
    }
  }

  async function assurerPlanExiste(userId, planId, planBrut) {
    if (!estUuidValide(planId)) return;
    await window.LkAuth.supabaseReady;
    const supabase = window.LkAuth.supabase;

    try {
      const lecture = await supabase.from('plans').select('id').eq('id', planId).maybeSingle();
      if (lecture.error) {
        console.warn('Vérification existence du plan échouée :', lecture.error.message);
        return;
      }
      if (lecture.data) return;

      if (planBrut && planBrut.dateDebut) {
        const plansExistants = await chargerPlansSupabase(userId);
        const dateFinDuNouveauPlan = planBrut.mode === 'forme' ? (planBrut.dateCloture || null) : planBrut.dateCourse;
        const conflit = trouverPlanEnConflit(plansExistants, planBrut.dateDebut, dateFinDuNouveauPlan, planId);
        if (conflit) {
          const nomConflit = conflit.nom || (conflit.mode === 'forme' ? 'Plan forme' : ((conflit.distance || '?') + ' — ' + (conflit.objectif || '?')));
          const finConflit = conflit.mode === 'forme' ? (conflit.dateCloture || 'sans date de fin') : conflit.dateCourse;
          const finNouveau = dateFinDuNouveauPlan || 'sans date de fin';
          throw new Error('Ce plan (' + planBrut.dateDebut + ' → ' + finNouveau + ') chevauche un plan déjà actif : "' + nomConflit + '" (' + conflit.dateDebut + ' → ' + finConflit + '). Un seul plan peut être actif à la fois — clôture ou supprime le plan existant, ou choisis d\'autres dates.');
        }
      }

      const nom = (planBrut && planBrut.nom) ||
        (((planBrut && planBrut.distance) || '') + ' — ' + ((planBrut && planBrut.objectif) || '')).trim() ||
        'Plan';
      const insertion = await supabase.from('plans').insert({
        id: planId,
        user_id: userId,
        nom: nom,
        plan_brut: planBrut || {},
      });
      if (insertion.error) {
        console.warn('Création de la ligne plans échouée :', insertion.error.message);
      }
    } catch (err) {
      if (err.message && err.message.indexOf('chevauche un plan déjà actif') !== -1) throw err;
      console.warn('assurerPlanExiste a échoué :', err.message);
    }
  }

  const ECHOS_RECENTS = {};

  function marquerEchoLocal(planId) {
    ECHOS_RECENTS[planId] = Date.now();
  }

  function estEchoRecent(planId) {
    const t = ECHOS_RECENTS[planId];
    return t && (Date.now() - t) < 3000;
  }

  let canalRealtimeActuel = null;

  async function activerRealtime(planId, onChangement) {
    await window.LkAuth.supabaseReady;
    const supabase = window.LkAuth.supabase;
    if (!estUuidValide(planId)) return function () {};

    if (canalRealtimeActuel) {
      supabase.removeChannel(canalRealtimeActuel);
      canalRealtimeActuel = null;
    }

    const canal = supabase
      .channel('plan_donnees_' + planId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plan_donnees', filter: 'plan_id=eq.' + planId },
        function (payload) {
          if (estEchoRecent(planId)) return;
          onChangement(payload);
        }
      )
      .subscribe();

    canalRealtimeActuel = canal;
    return function () {
      supabase.removeChannel(canal);
      if (canalRealtimeActuel === canal) canalRealtimeActuel = null;
    };
  }

  window.LkSync = {
    precharger: precharger,
    synchroniserVersSupabase: synchroniserVersSupabase,
    migrerDonneesExistantes: migrerDonneesExistantes,
    assurerPlanExiste: assurerPlanExiste,
    cloturerPlanSupabase: cloturerPlanSupabase,
    mettreAJourPlanSupabase: mettreAJourPlanSupabase,
    chargerPlansSupabase: chargerPlansSupabase,
    rejouerFileSync: rejouerFileSync,
    activerRealtime: activerRealtime
  };
})();
