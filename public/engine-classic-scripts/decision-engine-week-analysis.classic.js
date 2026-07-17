// ============================================================================
// decision-engine-week-analysis.classic.js
// ----------------------------------------------------------------------------
// Module 3 du moteur de décision : vue agrégée sur une semaine, comparée au
// plan prévu et à la semaine précédente.
//
// Référence : §"Module 3 — Analyse hebdomadaire (WeekAnalyzer)" et §3.3
// (interface WeekAnalysis) du document d'architecture.
//
// DÉCISIONS ACTÉES avec Laurent le 17/07/2026, avant codage :
// - Fonction pure, sans dépendance au Module 2 (SessionAnalyzer). Le Module 2
//   ne couvre que les séances de qualité (VMA/SPEC/SEUIL/TEST) — une semaine
//   a aussi de l'EF/LONGUE/RECUP/repos, donc un WeekAnalyzer qui dépendrait
//   du Module 2 perdrait la vue sur la majorité des séances de la semaine.
//   Ceci diverge de l'anticipation notée dans l'en-tête de
//   decision-engine-session-analysis.classic.js ("doit être chargé AVANT
//   tout futur Module 3 qui consommera ses sorties") — anticipation qui ne
//   s'est pas vérifiée, assumé.
// - Pas de gestion de stockage/historique ici : ce module ne lit ni n'écrit
//   aucun WeekAnalysis passé. `semainePrecedente` est un paramètre fourni
//   par l'appelant (cf. signature du contrat), pas récupéré par ce module —
//   même philosophie que les Modules 1/2/5 (fonctions pures, aucun effet de
//   bord, découplées de tout mécanisme de stockage précis).
// - Entrées en SeanceRealisee[]/SeancePrevue[] (interfaces abstraites du doc
//   archi), jamais `assignment`/`statuses` bruts d'index.html — cohérent
//   avec le style déjà choisi pour les Modules 1/2/5. La transformation
//   depuis le format réel de stockage est la responsabilité de l'appelant,
//   pas de ce module (cf. §29.8 inventaire pour le détail de ce choix).
// - Comblement d'un vide du contrat théorique : SeanceRealisee[] ne
//   représente que les séances FAITES, pas les manquées. Ce module prend
//   donc aussi `seancesPrevues: SeancePrevue[]` (toute la semaine prévue,
//   qualité ou non) et déduit les manquées par différence
//   (prévues - réalisées, hors repos).
//
// Où le déposer : /engine-classic-scripts/decision-engine-week-analysis.classic.js
// Comment le charger : dans index.html, indépendant des autres modules du
// moteur (ne dépend d'aucun autre script du moteur, y compris le Module 2).
//   <script src="/engine-classic-scripts/decision-engine-week-analysis.classic.js"></script>
// ============================================================================

(function (global) {
  'use strict';

  // --------------------------------------------------------------------------
  // Charge PRÉVUE d'une séance (avant qu'elle ait eu lieu) — TSS-like fait
  // maison, cf. §5.1 doc archi pour la même limite déjà assumée sur la
  // constante de normalisation TRIMP/sRPE ("à ajuster une fois qu'on aura
  // plus de données réelles"). Décision actée avec Laurent le 17/07/2026 :
  // coefficientIntensite(type) x dureeEstimeeMin, plutôt que reprendre
  // kmEstime tel quel comme proxy — un simple volume ne distinguerait pas
  // une séance de qualité d'une EF de même distance, alors que
  // chargeTotaleSemaine (charge RÉALISÉE, calculée via TRIMP/sRPE plus haut
  // dans ce fichier) fait déjà cette distinction. Sans pondération par
  // intensité ici, recuperationEstimee comparerait des choses non
  // comparables.
  //
  // Coefficients calibrés à dire d'expert (pas de données réelles pour les
  // calibrer autrement à ce stade, comme pour normaliserCharge() côté
  // Module 1) — à ajuster une fois croisés avec l'historique réel de
  // Laurent. Base 1.0 = EF (séance de référence).
  const COEFFICIENT_INTENSITE_PAR_TYPE = {
    EF: 1.0,
    LONGUE: 1.15,   // durée longue, intensité modérée — un peu plus exigeant que l'EF pur
    VMA: 1.5,
    SEUIL: 1.45,
    SPEC: 1.5,
    TEST: 1.4,
    REPOS: 0,
  };
  const COEFFICIENT_INTENSITE_DEFAUT = 1.0; // repli si type inconnu — traité comme EF plutôt que 0 (évite de sous-estimer silencieusement)

  // dureeEstimeeMin : à défaut d'une vraie durée prévue par séance (le
  // générateur ne produit que kmEstime, pas de durée explicite en dehors de
  // ce module), estimée depuis kmEstime via l'allure EF de référence — même
  // repli que weekStats()/EF_PACE dans index.html (6.33 min/km), pour rester
  // cohérent avec l'estimation déjà utilisée ailleurs dans l'app plutôt que
  // d'inventer une deuxième conversion km→min incompatible.
  const ALLURE_EF_MIN_PAR_KM = 6.33;

  function calculerChargePrevueSeance(seancePrevue) {
    if (!seancePrevue || seancePrevue.type === 'repos') return 0;
    const typeNormalise = String(seancePrevue.type || '').toUpperCase();
    const coefficient = COEFFICIENT_INTENSITE_PAR_TYPE.hasOwnProperty(typeNormalise)
      ? COEFFICIENT_INTENSITE_PAR_TYPE[typeNormalise]
      : COEFFICIENT_INTENSITE_DEFAUT;
    const dureeEstimeeMin = (seancePrevue.volumePrevuKm || 0) * ALLURE_EF_MIN_PAR_KM;
    return Math.round(dureeEstimeeMin * coefficient * 10) / 10;
  }

  // --------------------------------------------------------------------------
  // Charge d'une séance réalisée — réutilise exactement la même logique que
  // le Module 1 (TRIMP si FC dispo, sRPE sinon, proxy durée en dernier
  // recours) plutôt que d'inventer une deuxième notion de "charge"
  // incompatible dans le même moteur. Dupliquée ici volontairement (même
  // pattern que le Module 2 vis-à-vis de parseAllure) : ce module ne doit
  // dépendre d'aucun autre script du moteur.
  //
  // fcMaxReference/fcReposReference/sexe : mêmes paramètres et mêmes limites
  // que le Module 1 — fcReposReference tourne encore avec une valeur
  // d'exemple tant que ce champ n'existe pas dans profilCoureur (cf. §26.3
  // inventaire, Option A retenue temporairement).
  // --------------------------------------------------------------------------
  function calculerChargeSeanceRealisee(seance, fcMaxReference, fcReposReference, sexe) {
    if (seance.fcMoyenne !== undefined && seance.fcMoyenne !== null
        && fcMaxReference && fcReposReference && fcMaxReference > fcReposReference) {
      const fcReserve = (seance.fcMoyenne - fcReposReference) / (fcMaxReference - fcReposReference);
      const fcReserveBornee = Math.max(0, Math.min(1, fcReserve));
      const [a, b] = sexe === 'femme' ? [0.86, 1.67] : [0.64, 1.92];
      const [aFinal, bFinal] = sexe === 'autre' || !sexe
        ? [(0.64 + 0.86) / 2, (1.92 + 1.67) / 2]
        : [a, b];
      const facteurPonderation = aFinal * Math.exp(bFinal * fcReserveBornee);
      return seance.dureeMin * fcReserveBornee * facteurPonderation; // TRIMP, échelle "standard"
    }
    if (seance.ressentiRPE !== undefined && seance.ressentiRPE !== null) {
      return (seance.dureeMin * seance.ressentiRPE) / 6; // sRPE ramené approx. à l'échelle TRIMP
    }
    return seance.dureeMin / 10; // proxy durée seule, poids réduit
  }

  // --------------------------------------------------------------------------
  // Détermine si une séance prévue compte comme "à réaliser" (repos exclu —
  // un repos n'est ni manqué ni réussi, il n'entre pas dans seancesTotal).
  // --------------------------------------------------------------------------
  function estSeanceARealiser(seancePrevue) {
    return seancePrevue && seancePrevue.type !== 'repos';
  }

  // --------------------------------------------------------------------------
  // Analyse une semaine : agrégats simples, comparaison à la semaine
  // précédente si fournie. Volontairement simple — cf. doc archi
  // "la lecture intelligente sur plusieurs semaines est le rôle du module 4".
  //
  // seances : SeanceRealisee[] — uniquement les séances réellement faites
  // seancesPrevues : SeancePrevue[] — toute la semaine prévue (qualité ou
  //   non), utilisée pour déduire les manquées par différence et pour
  //   volumePrevuKm/chargePrevue
  // planSemaine : PlanContext — phase, volumeHebdoPrevu, chargePrevue
  // semainePrecedente : WeekAnalysis optionnel, fourni par l'appelant
  // fcMaxReference/fcReposReference/sexe : mêmes paramètres que le Module 1,
  //   utilisés uniquement pour chargeTotaleSemaine
  // --------------------------------------------------------------------------
  function analyser(semaine, seances, seancesPrevues, planSemaine, semainePrecedente, fcMaxReference, fcReposReference, sexe) {
    const seancesRealisees = seances || [];
    const prevues = (seancesPrevues || []).filter(estSeanceARealiser);

    const volumeRealiseKm = Math.round(seancesRealisees.reduce((s, r) => s + (r.distanceKm || 0), 0) * 10) / 10;
    const volumePrevuKm = planSemaine && typeof planSemaine.volumeHebdoPrevu === 'number'
      ? planSemaine.volumeHebdoPrevu
      : Math.round(prevues.reduce((s, p) => s + (p.volumePrevuKm || 0), 0) * 10) / 10;

    const ecartVolumePourcent = volumePrevuKm > 0
      ? Math.round(((volumeRealiseKm - volumePrevuKm) / volumePrevuKm) * 1000) / 10
      : 0;

    const seancesTotal = prevues.length;
    const seancesReussies = seancesRealisees.length; // une séance avec une réalisation associée compte comme réussie
    const seancesManquees = Math.max(0, seancesTotal - seancesReussies);

    const chargeTotaleSemaine = Math.round(
      seancesRealisees.reduce((s, r) => s + calculerChargeSeanceRealisee(r, fcMaxReference, fcReposReference, sexe), 0) * 10
    ) / 10;

    // Récupération estimée — proxy simple en V1 (pas de vraie mesure de
    // récupération disponible) : ratio charge réalisée / charge prévue,
    // inversé et borné 0-100. Une semaine largement sous la charge prévue
    // suggère une récupération disponible plus large ; une semaine qui la
    // dépasse largement suggère l'inverse. Volontairement grossier, à
    // affiner une fois croisé avec des données réelles (même prudence que
    // la normalisation de charge du Module 1, cf. §5.1 doc archi).
    //
    // chargePrevueSemaine : priorité à planSemaine.chargePrevue si
    // explicitement fournie par l'appelant (rétrocompatible avec un futur
    // calcul différent), sinon calculée ici en sommant
    // calculerChargePrevueSeance() sur chaque séance prévue de la semaine
    // (chantier du 17/07/2026, cf. en-tête de fichier).
    const chargePrevueSemaine = planSemaine && typeof planSemaine.chargePrevue === 'number'
      ? planSemaine.chargePrevue
      : (prevues.length ? Math.round(prevues.reduce((s, p) => s + calculerChargePrevueSeance(p), 0) * 10) / 10 : null);
    let recuperationEstimee = 50; // valeur neutre si pas de référence de charge prévue
    if (chargePrevueSemaine && chargePrevueSemaine > 0) {
      const ratioCharge = chargeTotaleSemaine / chargePrevueSemaine;
      recuperationEstimee = Math.round(Math.max(0, Math.min(100, 100 - (ratioCharge - 1) * 50)));
    }

    let progressionVsPrecedente = 'stable';
    if (semainePrecedente && typeof semainePrecedente.chargeTotaleSemaine === 'number') {
      const chargePrecedente = semainePrecedente.chargeTotaleSemaine;
      if (chargePrecedente > 0) {
        const variationPourcent = ((chargeTotaleSemaine - chargePrecedente) / chargePrecedente) * 100;
        // Seuil ±10% pour "stable" — évite de qualifier de "hausse"/"baisse"
        // une fluctuation normale de charge d'une semaine à l'autre.
        if (variationPourcent > 10) progressionVsPrecedente = 'hausse';
        else if (variationPourcent < -10) progressionVsPrecedente = 'baisse';
      }
    }

    return {
      semaine,
      volumeRealiseKm,
      volumePrevuKm,
      ecartVolumePourcent,
      seancesManquees,
      seancesReussies,
      seancesTotal,
      chargeTotaleSemaine,
      recuperationEstimee,
      progressionVsPrecedente,
    };
  }

  global.DecisionEngineWeekAnalysis = {
    analyser,
    calculerChargeSeanceRealisee, // exposée pour tests unitaires isolés
    calculerChargePrevueSeance,
    estSeanceARealiser,
  };

})(window);
