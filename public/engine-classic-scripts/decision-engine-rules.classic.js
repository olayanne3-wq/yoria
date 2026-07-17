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
// Catalogue (ajouts R-050 et R-060 le 17/07/2026, cf. notes ci-dessous) :
//   R-006  Pic de séance unique          (sécurité)
//   R-024s Fatigue élevée basique        (sécurité, version simplifiée)
//   R-050  ACWR élevé                    (sécurité, ajoutée 17/07)
//   R-060  Tendance fatigue en hausse    (sécurité, ajoutée 17/07)
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

  // Garde-fou §10.2 doc intégration (cause 2, 17/07/2026) : borne dure sur
  // l'ampleur d'UNE décision individuelle, jamais dépassée quelle que soit la
  // règle qui la produit. Valeur proposée dans le doc (jamais plus de -30%
  // sur une seule décision) — chiffre à valider avec un regard coach, pas
  // arbitraire mais pas définitif non plus. Exposée globalement pour être
  // réutilisée comme référence par decision-engine-apply.classic.js (garde-fou
  // cumulé, cause 1), même si les deux mécanismes restent indépendants.
  const BORNE_AMPLEUR_MAX_POURCENT = 30;

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
  // R-050 — ACWR élevé (sécurité) — ajoutée le 17/07/2026
  // cf. §5.2 doc archi : ratio charge aiguë/chronique > 1.3 = risque "élevé",
  // > 1.5 = risque "critique" (mêmes seuils déjà utilisés par
  // calculerRunnerState() pour dériver runnerState.risque). Cette règle lit
  // directement runnerState.charge.ratio plutôt que de recalculer quoi que ce
  // soit — le calcul existe déjà dans le Module 1 (RunnerStateCalculator).
  //
  // Recoupement volontaire avec R-024s : la fatigue (Module 1) dérive déjà du
  // ratio ACWR via un mapping linéaire simple (cf. calculerFatigue()), mais ce
  // mapping n'aligne pas exactement fatigue>=75 sur ratio>1.3 (à ratio=1.3,
  // fatigue≈80 ; à ratio=1.25, fatigue≈75). R-050 sert de filet pour les cas où
  // le ratio dépasse le seuil "élevé" du doc archi sans que la fatigue linéaire
  // ait franchi 75. Priorité placée juste sous R-024s (qui reste la référence
  // "fatigue" principale) pour qu'en cas de double déclenchement le message le
  // plus englobant (fatigue) prime — mais R-050 se déclenche seule dans les cas
  // où R-024s ne matche pas.
  // --------------------------------------------------------------------------
  function evaluerACWRElevee(runnerState) {
    if (!runnerState || !runnerState.charge || runnerState.charge.ratio === null || runnerState.charge.ratio === undefined) {
      return null; // pas de ratio calculable (historique insuffisant, cf. calculerCharge)
    }
    const ratio = runnerState.charge.ratio;
    if (ratio <= 1.3) return null; // sous le seuil "élevé" du doc archi, rien à signaler

    // Ampleur function du niveau de dépassement : -15% entre 1.3 et 1.5 (seuil
    // "élevé"), -25% au-delà de 1.5 (seuil "critique"), cf. §5.2 doc archi.
    const ampleurPourcent = ratio > 1.5 ? -25 : -15;
    const niveauRisque = ratio > 1.5 ? 'critique' : 'élevé';

    return {
      id: 'R-050',
      libelle: 'ACWR élevé',
      categorie: 'securite',
      priorite: 85, // sécurité, sous R-024s (90) pour laisser primer le message fatigue en cas de double match
      type: 'reduire_charge',
      ampleurPourcent,
      cible: 'volume',
      justification: `Ratio de charge aiguë/chronique de ${ratio} (risque ${niveauRisque}, seuil de vigilance à 1.3). Réduction du volume de la prochaine séance recommandée.`,
      confianceMax: Math.min(runnerState.confiance || 0, 65), // cf. §5.5 doc archi : plafond ACWR isolé
      donnees: { chargeRatio: ratio, chargeAigue: runnerState.charge.aigue, chargeChronique: runnerState.charge.chronique, niveauRisque },
    };
  }

  // --------------------------------------------------------------------------
  // R-060 — Tendance fatigue en hausse (sécurité) — ajoutée le 17/07/2026
  // Complète R-024s (seuil ponctuel fatigue>=75) : capte une fatigue qui monte
  // progressivement sur 3 mesures consécutives sans jamais franchir le seuil
  // dur de R-024s. Ne recalcule rien de nouveau — rappelle calculerRunnerState
  // du Module 1 à 3 dates de référence différentes (aujourd'hui, J-4, J-7),
  // même principe que calculerHistoriqueCharge() qui fait déjà ça pour le
  // graphique ACWR. Nécessite DecisionEngineRunnerState.calculerRunnerState
  // et les mêmes paramètres coureur (fcMax/fcRepos/sexe) que le Module 1.
  //
  // Se déclenche seulement si les 3 points sont strictement croissants ET si
  // aucun des 3 n'atteint 75 (sinon R-024s aurait déjà matché en priorité, cf.
  // évaluerRegles ci-dessous qui garde la priorité la plus haute).
  // --------------------------------------------------------------------------
  function evaluerTendanceFatigue(activitySamples, dateReference, coureurOptions) {
    if (!Array.isArray(activitySamples) || activitySamples.length === 0) return null;
    if (!global.DecisionEngineRunnerState || typeof global.DecisionEngineRunnerState.calculerRunnerState !== 'function') {
      return null; // Module 1 non chargé, rien à faire
    }

    const opts = coureurOptions || {};
    const dateRef = new Date(dateReference);
    const joursMs = 24 * 60 * 60 * 1000;

    // 3 points : J (aujourd'hui), J-4, J-7 — espacement volontairement inégal
    // pour capter une tendance sur ~1 semaine sans se limiter à un pas fixe
    const dates = [0, 4, 7].map(decalage => new Date(dateRef.getTime() - decalage * joursMs));

    const points = dates.map(d => {
      const rs = global.DecisionEngineRunnerState.calculerRunnerState(activitySamples, {
        dateReference: d.toISOString(),
        fcMaxReference: opts.fcMaxReference,
        fcReposReference: opts.fcReposReference,
        sexe: opts.sexe,
      });
      return { date: d.toISOString().slice(0, 10), fatigue: rs.fatigue, confiance: rs.confiance };
    });

    // Les 3 points doivent être exploitables (fatigue calculable)
    if (points.some(p => p.fatigue === null || p.fatigue === undefined)) return null;

    const [fJ, fJ4, fJ7] = points.map(p => p.fatigue);

    // Tendance strictement croissante en remontant dans le temps : J7 < J4 < J
    const croissanceStricte = fJ7 < fJ4 && fJ4 < fJ;
    if (!croissanceStricte) return null;

    // Si un point a déjà franchi le seuil dur, R-024s couvre déjà le cas —
    // R-060 ne sert qu'à capter la montée AVANT ce seuil
    if (fJ >= 75 || fJ4 >= 75 || fJ7 >= 75) return null;

    // Écart minimal pour ne pas réagir à du bruit (±1-2 points sans
    // signification) : au moins 8 points de fatigue entre J-7 et J
    const ecartTotal = fJ - fJ7;
    if (ecartTotal < 8) return null;

    const confianceMoyenne = Math.round((points[0].confiance + points[1].confiance + points[2].confiance) / 3);

    return {
      id: 'R-060',
      libelle: 'Tendance fatigue en hausse',
      categorie: 'securite',
      priorite: 80, // sécurité, sous R-050 (85) : signal plus précoce donc moins urgent que les seuils déjà franchis
      type: 'alerter_tendance_fatigue',
      justification: `Fatigue en hausse continue sur les 7 derniers jours : ${fJ7} → ${fJ4} → ${fJ}. Aucun seuil critique franchi, mais la tendance mérite une vigilance avant la prochaine séance de qualité.`,
      confianceMax: Math.min(confianceMoyenne, 65),
      donnees: { pointsFatigue: points, ecartTotal },
    };
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
        priorite: 50, // hors sécurité, priorité plus basse que R-006/R-024s/R-050
        type: 'alerter_risque_decrochage',
        justification: signal.description,
        confianceMax: Math.min(engagementState.confiance || 0, 70),
        donnees: { regulariteRecente: engagementState.regulariteRecente },
      };
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // Point d'entrée principal du Module 5 — évalue les règles du catalogue,
  // retourne la décision de la règle gagnante (priorité la plus haute parmi
  // celles qui matchent), ou null si aucune règle ne se déclenche.
  //
  // input attendu : { runnerState, engagementState, activitySamples, dateReference }
  // --------------------------------------------------------------------------
  function evaluerRegles(input) {
    const opts = input || {};
    const dateReference = opts.dateReference || new Date().toISOString();

    const candidats = [
      evaluerPicDeSeance(opts.activitySamples, dateReference),
      evaluerFatigueElevee(opts.runnerState),
      evaluerACWRElevee(opts.runnerState),
      evaluerTendanceFatigue(opts.activitySamples, dateReference, opts.coureurOptions),
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

    // Garde-fou §10.2 cause 2 (doc intégration, 17/07/2026) : borne dure sur
    // l'ampleur d'UNE décision individuelle, indépendante de la règle qui l'a
    // produite. Protège contre un seuil mal calibré ou une erreur de frappe
    // dans une constante (ex: -80% au lieu de -8%) qui produirait un résultat
    // absurde même si la règle avait raison de se déclencher. Plafonne plutôt
    // que rejette : le signal de la règle reste valide, seule l'ampleur est
    // bornée — jamais de silence total sur une vraie alerte.
    // BORNE_AMPLEUR_MAX_POURCENT défini en tête de fichier (constante partagée
    // avec le garde-fou cumulé de decision-engine-apply.classic.js, §10.2
    // cause 1 — les deux gardes-fous restent indépendants dans leur
    // déclenchement mais partagent la même limite unitaire de référence).
    let ampleurBornee = gagnante.ampleurPourcent;
    if (typeof ampleurBornee === 'number' && ampleurBornee < -BORNE_AMPLEUR_MAX_POURCENT) {
      console.warn('Moteur de décision : ampleurPourcent (' + ampleurBornee + '%) dépasse la borne dure, plafonné à -' + BORNE_AMPLEUR_MAX_POURCENT + '%.');
      ampleurBornee = -BORNE_AMPLEUR_MAX_POURCENT;
    }

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
        ampleurPourcent: ampleurBornee, // undefined si non pertinent (ex: R-040), sinon borné cf. ci-dessus
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
    evaluerACWRElevee,
    evaluerTendanceFatigue,
    evaluerDesengagementPrecoce,
    BORNE_AMPLEUR_MAX_POURCENT,  // référence partagée avec le garde-fou cumulé (decision-engine-apply.classic.js)
  };

})(window);
