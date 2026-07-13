// ============================================================
// Run by Léa — Synchronisation localStorage ↔ Supabase (copie classic)
// DÉRIVÉ DE public/v2/engine/sync-storage.js — pas une source de vérité.
// À régénérer manuellement à chaque modification de sync-storage.js.
// ============================================================

(function () {
  const CLES_INTEGRATIONS = [
    'lk_strava_token', 'lk_strava_refresh', 'lk_strava_expires',
    'lk_strava_activities', 'lk_last_sync', 'lk_github_token', 'lk_gist_id',
  ];

  const CLES_LOCALES_UNIQUEMENT = ['lk_weather_cache'];

  const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function estUuidValide(valeur) {
    return typeof valeur === 'string' && RE_UUID.test(valeur);
  }

  async function precharger(userId, planId) {
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

    if (cle === 'lk_profil_coureur') {
      supabase.from('profils_coureur')
        .upsert({ user_id: userId, data: valeur })
        .then(function (res) { if (res.error) console.warn('Sync profil échouée :', res.error.message); });
      return;
    }

    if (CLES_INTEGRATIONS.indexOf(cle) !== -1) {
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
      const payload = { user_id: userId };
      payload[colonne] = valeur;
      supabase.from('integrations')
        .upsert(payload)
        .then(function (res) { if (res.error) console.warn('Sync intégration échouée :', res.error.message); });
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
      .then(function (res) { if (res && res.error) console.warn('Sync plan_donnees échouée :', res.error.message); })
      .catch(function (err) { console.warn('Sync plan_donnees échouée :', err.message); });
  }

  window.LkSync = {
    precharger: precharger,
    synchroniserVersSupabase: synchroniserVersSupabase
  };
})();
