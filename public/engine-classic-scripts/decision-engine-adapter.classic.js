// ============================================================================
// decision-engine-adapter.classic.js
// ----------------------------------------------------------------------------
// Rôle : traduire les données réelles de Yoria (stravaActivities, format brut
// de l'API Strava tel que persisté par index.html, cf. lignes ~5526-5537)
// vers le format ActivitySample attendu par le moteur de décision
// (cf. §3.1 du document d'architecture moteur-decision-yoria-architecture.md).
//
// Ce fichier ne contient AUCUNE règle métier — uniquement de la traduction
// de données. Les règles vivent ailleurs (futur decision-engine-rules.classic.js).
//
// Où le déposer : /engine-classic-scripts/decision-engine-adapter.classic.js
// Comment le charger : ajouter dans index.html, juste après sync-storage :
//   <script src="/engine-classic-scripts/decision-engine-adapter.classic.js"></script>
// ============================================================================

(function (global) {
  'use strict';

  /**
   * Traduit une activité Strava brute (telle que stockée dans stravaActivities)
   * vers un ActivitySample au format attendu par le moteur.
   *
   * @param {Object} activiteStrava - un élément de stravaActivities
   * @param {string} provenanceDeclaree - 'strava_gratuit' | 'strava_premium' | 'montre_connectee' | 'manuel'
   * @param {number|null} rpeSaisi - RPE manuel s'il existe pour cette séance (via manualPerf[uid].rpe), sinon null
   * @returns {Object} ActivitySample
   */
  function adapterActiviteStrava(activiteStrava, provenanceDeclaree, rpeSaisi) {
    if (!activiteStrava) {
      throw new Error('adapterActiviteStrava: activiteStrava est requis');
    }

    return {
      activityId: String(activiteStrava.id_str ?? activiteStrava.id ?? ''),
      date: activiteStrava.start_date_local ?? null,
      distanceKm: activiteStrava.distance != null
        ? Math.round(activiteStrava.distance / 100) / 10  // Strava stocke en mètres
        : null,
      dureeMin: activiteStrava.moving_time != null
        ? Math.round(activiteStrava.moving_time / 60)      // Strava stocke en secondes
        : null,
      allureMoyenneMinKm: activiteStrava.average_speed
        ? formaterAllure(activiteStrava.average_speed)
        : null,
      fcMoyenne: activiteStrava.average_heartrate || undefined,
      fcMax: activiteStrava.max_heartrate || undefined,
      // Cadence et dénivelé : absents du format persisté actuel (stravaActivities
      // ne conserve que id_str/type/start_date_local/distance/moving_time/
      // average_speed/average_heartrate/max_heartrate/start_latlng/laps,
      // cf. index.html ~5526-5537). undefined plutôt qu'une valeur inventée —
      // le moteur sait déjà se dégrader proprement sur une donnée absente
      // (cf. §4 du document d'architecture).
      cadence: undefined,
      denivelePositifM: undefined,
      temperatureC: undefined,
      puissanceMoyenneW: undefined,
      ressentiRPE: rpeSaisi ?? undefined,
      provenance: provenanceDeclaree,
    };
  }

  /**
   * Traduit une liste complète de stravaActivities en ActivitySample[].
   * Filtre automatiquement les activités qui ne sont pas des courses à pied
   * (type !== 'Run'), cohérent avec les filtres déjà utilisés ailleurs dans
   * index.html (cf. weekRuns = stravaActivities.filter(a => a.type === "Run")).
   *
   * @param {Array} stravaActivities - la variable globale déjà présente dans index.html
   * @param {Object} manualPerf - la table {uid: {rpe, ...}} déjà présente dans index.html
   * @param {string} provenanceDeclaree
   * @returns {Array} ActivitySample[]
   */
  function adapterHistoriqueComplet(stravaActivities, manualPerf, provenanceDeclaree) {
    if (!Array.isArray(stravaActivities)) {
      console.warn('adapterHistoriqueComplet: stravaActivities absent ou invalide, retour []');
      return [];
    }
    const perf = manualPerf || {};

    return stravaActivities
      .filter(a => a.type === 'Run')
      .map(a => {
        // Le RPE manuel est indexé par uid de séance du PLAN, pas par activité
        // Strava — il n'y a donc pas de lien automatique ici. Cette fonction
        // ne peuple ressentiRPE que si un appelant fait la correspondance
        // lui-même (cf. exemple de test plus bas). C'est un choix volontaire :
        // mieux vaut ne rien inventer qu'associer un RPE à la mauvaise séance.
        return adapterActiviteStrava(a, provenanceDeclaree, null);
      })
      .filter(sample => sample.date !== null); // sécurité : jamais d'échantillon sans date
  }

  /**
   * Convertit une vitesse Strava (mètres/seconde) en allure "M:SS" par km.
   * Réutilise la même logique que fmtPace déjà présente dans index.html,
   * réécrite ici pour que ce fichier reste autonome (ne dépend d'aucune
   * fonction globale d'index.html).
   */
  function formaterAllure(vitesseMetresParSeconde) {
    if (!vitesseMetresParSeconde || vitesseMetresParSeconde <= 0) return null;
    const secondesParKm = 1000 / vitesseMetresParSeconde;
    const minutes = Math.floor(secondesParKm / 60);
    const secondes = Math.round(secondesParKm % 60);
    return `${minutes}:${String(secondes).padStart(2, '0')}`;
  }

  // Exposition globale, cohérent avec le pattern des autres scripts
  // engine-classic-scripts (Engine.generatePlan, LkSync.xxx, etc.)
  global.DecisionEngineAdapter = {
    adapterActiviteStrava,
    adapterHistoriqueComplet,
    formaterAllure, // exposée pour pouvoir la tester isolément
  };

})(window);
