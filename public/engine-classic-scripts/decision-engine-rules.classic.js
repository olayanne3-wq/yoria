// ============================================================================
// decision-engine-rules.classic.js
// ----------------------------------------------------------------------------
// Module 5 du moteur de décision : moteur de règles (RuleEngine). Consomme
// les sorties des modules 1 (RunnerState, EngagementState) déjà en place, et
// produit une décision (ou aucune) selon un petit catalogue de règles.
//
// Références :
//   - Catalogue de démarrage réduit à 3 règles : §7.2 du document d'intégration
//   - Contrats DecisionRule / EngineDecision (version complète) : §3.4 du
//     document d'architecture — VERSION SIMPLIFIÉE ICI, cf. note ci-dessous
//   - "Rien n'est automatique en V1" : §7.1 du document d'intégration — ce
//     module PRODUIT une décision, il ne l'applique JAMAIS au plan
//     (__PLAN_BRUT__ n'est pas touché ici, ni même référencé)
//
// VERSION SIMPLIFIÉE (16/07/2026) : le contrat EngineInput complet du doc
// archi (§3.4) suppose des modules 2/3/4 (SessionAnalysis, WeekAnalysis,
// TrendAnalysis) non codés à ce stade. Ce module ne consomme donc que ce qui
// existe réellement : RunnerState (Module 1) + EngagementState (sous-module
// Engagement) + un historique brut de séances pour R-006 (pic de séance).
// Décision actée avec Laurent le 16/07/2026 : "on avance vite, on itère" —
// ce RuleEngine sera enrichi une fois les modules 2/3/4 codés, pas avant.
//
// Catalogue de démarrage (§7.2 doc intégration), 3 règles seulement :
//   R-006  Pic de séance unique          (sécurité)
//   R-024s Fatigue élevée basique        (sécurité, version simplifiée)
//   R-040  Désengagement précoce         (engagement)
//
// Ce module ne modifie AUCUNE donnée. Il retourne au maximum UNE décision
// (la première règle qui matche, par ordre de priorité décroissante) — pas
// une liste de décisions concurrentes, cf. §3.4 doc archi ("la règle
// gagnante").
//
// Où le déposer : /engine-classic-scripts/decision-engine-rules.classic.js
// Comment le charger : dans index.html, APRÈS decision-engine-runner-state.classic.js
// ET decision-engine-engagement.classic.js (dépend des deux)
//   <script src="/engine-classic-scripts/decision-engine-rules.classic.js"></script>
// ============================================================================

(function (global) {
  'use strict';

  // --------------------------------------------------------------------------
  // R-006 — Pic de séance unique (sécurité)
  // cf. §5.5 doc archi : dépasser 110% de la plus longue sortie des 30
  // derniers jours est associé à un risque de blessure de surcharge accru de
  // plus de 64% (étude Garmin-RUNSAFE). C'est le signal le mieux soutenu par
  // la littérature au catalogue de démarrage (§7.2 doc intégration).
  //
  // Compare la séance la PLUS RÉCENTE de l'historique (dernière réalisée) à
  // la plus longue sortie des 30 jours PRÉCÉDENTS (hors séance elle-même).
  // --------------------------------------------------------------------------
  function evaluerPicDeSeance(activitySamples, dateReference) {
    if (!Array.isArray(activitySamples) || activitySamples.length < 2) {
      return null; // pas assez de données pour comparer une séance à un historique
    }

    const maintenant = new Date(dateReference).getTime();
    const trenteJoursMs = 30 * 24 * 60 * 60 * 1000;

    // Trie par date décroissante pour isoler la séance la plus récente
    const triees = activitySamples
      .filter(s => s.date && s.distanceKm !== undefined)
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (triees.length < 2) return null;

    const derniereSeance = triees[0];
    const ecartDerniere = maintenant - new Date(derniereSeance.date).getTime();
    // La "dernière séance" doit être récente (survenue dans les 3 derniers jours) pour que la règle
    // ait un sens temporel — sinon on évaluerait un pic ancien, sans intérêt pour une décision actuelle.
    if (ecartDerniere < 0 || ecartDerniere > 3 * 24 * 60 * 60 * 1000) return null;

    // Plus longue sortie des 30 jours précédents, hors la séance elle-même
    let plusLongueSortie30j = 0;
    triees.slice(1).forEach(s => {
      const ecart = maintenant - new Date(s.date).getTime();
      if (ecart >= 0 && ecart <= trenteJoursMs && s.distanceKm > plusLongueSortie30j) {
        plusLongueSortie30j = s.distanceKm;
      }
    });

    if (plusLongueSortie30j <= 0) return null; // pas d'historique de référence exploitable

    const ratioVsPlusLongue = derniereSeance.distanceKm / plusLongueSortie30j;

    if (ratioVsPlusLongue > 1.10) {
      const depassementPourcent = Math.round((ratioVsPlusLongue - 1) * 100);
      return {
        id: 'R-006',
        libelle: 'Pic de séance unique',
        categorie: 'securite',
        priorite: 100, // sécurité = priorité maximale
        type: 'alerter_blessure_potentielle',
        justification: `Dernière séance : ${derniereSeance.distanceKm} km, soit ${depassementPourcent}% de plus que la plus longue sortie des 30 derniers jours (${plusLongueSortie30j} km). Ce type de pic isolé est associé à un risque de blessure accru.`,
        confianceMax: 70, // cf. §5.5 doc archi : signal bien soutenu mais V1, pas de plafond aussi bas que l'ACWR isolé (65)
        donnees: { distanceDerniereSeance: derniereSeance.distanceKm, plusLongueSortie30j, depassementPourcent },
      };
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // R-024 simplifiée — Fatigue élevée basique (sécurité)
  // cf. §8.1 doc intégration : seuil fatigue >= 75, décision reduire_charge,
  // ampleur -15% (exemple pas-à-pas concret repris tel quel comme référence
  // de calibrage initial).
  // --------------------------------------------------------------------------
  function evaluerFatigueElevee(runnerState) {
    if (!runnerState || runnerState.fatigue === null || runnerState.fatigue === undefined) {
      return null; // pas de RunnerState exploitable
    }
    if (runnerState.fatigue >= 75) {
      return {
        id: 'R-024s',
        libelle: 'Fatigue élevée (basique)',
        categorie: 'securite',
        priorite: 90, // sécurité, juste sous R-006 qui reste prioritaire en cas de conflit
        type: 'reduire_charge',
        ampleurPourcent: -15,
        cible: 'volume',
        justification: `Fatigue élevée détectée (${runnerState.fatigue}/100), ratio de charge de ${runnerState.charge && runnerState.charge.ratio}. Réduction du volume de la prochaine séance recommandée.`,
        confianceMax: Math.min(runnerState.confiance || 0, 70), // jamais plus confiant que le RunnerState qui l'a nourri, cf. §6 doc archi point de vigilance
        donnees: { fatigue: runnerState.fatigue, chargeRatio: runnerState.charge ? runnerState.charge.ratio : null },
      };
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // R-040 — Désengagement précoce (engagement)
  // cf. §7.2 doc intégration : seule règle hors sécurité retenue au démarrage.
  // Ne modifie jamais la charge d'entraînement — c'est un signal produit/UI
  // ("alerter_risque_decrochage"), pas une décision sur le plan.
  // --------------------------------------------------------------------------
  function evaluerDesengagementPrecoce(engagementState) {
    if (!engagementState || !Array.isArray(engagementState.signauxDetectes)) {
      return null;
    }
    const signal = engagementState.signauxDetectes.find(s => s.code === 'DESENGAGEMENT_PRECOCE');
    if (signal) {
      return {
        id: 'R-040',
        libelle: 'Désengagement précoce',
        categorie: 'engagement',
        priorite: 50, // hors sécurité, priorité plus basse que R-006/R-024s
        type: 'alerter_risque_decrochage',
        justification: signal.description,
        confianceMax: Math.min(engagementState.confiance || 0, 70),
        donnees: { regulariteRecente: engagementState.regulariteRecente },
      };
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // Point d'entrée principal du Module 5 — évalue les 3 règles du catalogue de
  // démarrage, retourne la décision de la règle gagnante (priorité la plus
  // haute parmi celles qui matchent), ou null si aucune règle ne se déclenche.
  //
  // input attendu : { runnerState, engagementState, activitySamples, dateReference }
  // --------------------------------------------------------------------------
  function evaluerRegles(input) {
    const opts = input || {};
    const dateReference = opts.dateReference || new Date().toISOString();

    const candidats = [
      evaluerPicDeSeance(opts.activitySamples, dateReference),
      evaluerFatigueElevee(opts.runnerState),
      evaluerDesengagementPrecoce(opts.engagementState),
    ].filter(Boolean);

    if (candidats.length === 0) {
      return {
        decision: null,
        regleGagnante: null,
        toutesLesReglesEvaluees: [],
        calculeLe: new Date().toISOString(),
      };
    }

    // La règle gagnante est celle de priorité la plus haute. En cas d'égalité
    // (ne devrait pas arriver avec ce catalogue, priorités toutes distinctes),
    // la première évaluée l'emporte — comportement documenté, pas un hasard.
    candidats.sort((a, b) => b.priorite - a.priorite);
    const gagnante = candidats[0];

    // La confiance finale de la décision est plafonnée par confianceMax de la
    // règle gagnante — jamais une confiance inventée plus haute que ce que la
    // règle elle-même autorise (cf. §6 doc archi, point de vigilance repris
    // pour R-024s ci-dessus, généralisé ici à toutes les règles).
    return {
      decision: {
        id: gagnante.id,
        libelle: gagnante.libelle,
        categorie: gagnante.categorie,
        type: gagnante.type,
        ampleurPourcent: gagnante.ampleurPourcent, // undefined si non pertinent (ex: R-040)
        cible: gagnante.cible,                     // idem
        justification: gagnante.justification,
        confiance: gagnante.confianceMax,
        donnees: gagnante.donnees,
      },
      regleGagnante: gagnante.id,
      toutesLesReglesEvaluees: candidats.map(c => c.id),
      calculeLe: new Date().toISOString(),
    };
  }

  global.DecisionEngineRules = {
    evaluerRegles,
    evaluerPicDeSeance,          // exposées pour tests unitaires isolés
    evaluerFatigueElevee,
    evaluerDesengagementPrecoce,
  };

})(window);
