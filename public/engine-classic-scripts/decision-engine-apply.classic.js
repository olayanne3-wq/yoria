// ============================================================================
// decision-engine-apply.classic.js
// ----------------------------------------------------------------------------
// Traduit une décision produite par le Module 5 (DecisionEngineRules) en
// modification réelle de window.__PLAN_BRUT__. Ce fichier ne contient AUCUNE
// règle de décision — seulement la mécanique d'application, une fois qu'une
// décision a déjà été prise ET validée explicitement par le coureur (cf. §7.1
// doc intégration : rien n'est automatique en V1).
//
// Références :
//   - Mécanisme d'application (kmEstime, semaine.sessions, origineModification) :
//     §6.2 du document d'intégration
//   - "Rien n'est automatique en V1" : §7.1 du document d'intégration —
//     appliquerDecisionAuPlan n'est appelée qu'en réponse à un clic explicite
//     sur "Appliquer", jamais en tâche de fond
//
// LIMITE ACTÉE (16/07/2026, décision explicite de Laurent) : une décision
// reduire_charge ne cible QUE les séances de type EF/LONGUE/RECUP. Les
// séances de qualité (VMA/SEUIL/SPEC/TEST) ont une structure d'intervalles
// (blocs, répétitions, pyramides) qu'une réduction linéaire de kmEstime
// casserait — ce cas est un chantier futur à part entière, non traité ici.
// Si la prochaine séance est une séance de qualité, ce module cherche la
// prochaine séance non-qualité de la même semaine ; si aucune n'existe,
// aucune cible n'est trouvée et la décision ne peut pas être appliquée
// (la carte de proposition ne doit alors pas s'afficher, cf. index.html).
//
// Où le déposer : /engine-classic-scripts/decision-engine-apply.classic.js
// Comment le charger : dans index.html, APRÈS decision-engine-rules.classic.js
//   <script src="/engine-classic-scripts/decision-engine-apply.classic.js"></script>
// ============================================================================

(function (global) {
  'use strict';

  // Types de séance sur lesquels une réduction linéaire de volume est sûre
  // (cf. limite actée en en-tête de fichier). Les vrais types de Yoria sont
  // EF/LONGUE/VMA/SEUIL/SPEC/TEST/REPOS/RACE — RECUP n'existe pas comme type
  // séparé aujourd'hui dans le code (dans le doute, inclus ici par sécurité
  // sémantique mais sans effet si le type n'est jamais utilisé réellement).
  const TYPES_REDUCTION_SURE = ['EF', 'LONGUE', 'RECUP'];
  const TYPES_NON_MODIFIABLES = ['REPOS', 'RACE'];

  // --------------------------------------------------------------------------
  // Trouve la prochaine séance à venir (date >= aujourd'hui) dans
  // planBrut.semaines, en excluant REPOS/RACE, et en préférant une séance de
  // type "sûr" (EF/LONGUE/RECUP) : si la toute prochaine séance est une
  // séance de qualité, cherche la suivante DANS LA MÊME SEMAINE qui soit
  // sûre. Ne déborde jamais sur la semaine suivante (cf. limite en en-tête :
  // pas de proposition plutôt qu'une cible hasardeuse).
  //
  // Retourne { semaine, session, indexSession } ou null si aucune cible sûre.
  // --------------------------------------------------------------------------
  function trouverProchaineSeanceCible(planBrut, dateReference) {
    if (!planBrut || !Array.isArray(planBrut.semaines)) return null;
    const aujourdhui = new Date(dateReference || new Date().toISOString()).toISOString().slice(0, 10);

    // Semaine contenant aujourd'hui (ou la première semaine à venir)
    const semaine = planBrut.semaines.find(s =>
      Array.isArray(s.sessions) && s.sessions.length > 0 &&
      s.sessions[0].date <= aujourdhui && s.sessions[s.sessions.length - 1].date >= aujourdhui
    ) || planBrut.semaines.find(s =>
      Array.isArray(s.sessions) && s.sessions.length > 0 && s.sessions[0].date > aujourdhui
    );
    if (!semaine) return null;

    const candidatesAVenir = semaine.sessions
      .map((s, i) => ({ session: s, index: i }))
      .filter(({ session }) => session.date >= aujourdhui && !TYPES_NON_MODIFIABLES.includes(session.type));

    if (candidatesAVenir.length === 0) return null;

    const cibleSure = candidatesAVenir.find(({ session }) => TYPES_REDUCTION_SURE.includes(session.type));
    if (!cibleSure) return null; // toutes les séances à venir cette semaine sont des séances de qualité — pas de cible sûre

    return { semaine, session: cibleSure.session, indexSession: cibleSure.index };
  }

  // --------------------------------------------------------------------------
  // Applique une décision (sortie de DecisionEngineRules.evaluerRegles) au
  // plan brut. Ne modifie QUE le type 'reduire_charge' pour l'instant — les
  // autres types (alerter_*) sont informatifs et ne touchent jamais au plan
  // (cf. §6.2 doc intégration, distinction essentielle entre les deux
  // familles de décisions).
  //
  // Retourne { succes: bool, raison?: string } — ne modifie planBrut qu'en
  // cas de succès, jamais partiellement.
  // --------------------------------------------------------------------------
  function appliquerDecisionAuPlan(planBrut, decision, dateReference) {
    if (!decision || !decision.type) {
      return { succes: false, raison: 'Décision absente ou invalide.' };
    }

    if (decision.type !== 'reduire_charge') {
      // Décisions informatives (alerter_blessure_potentielle, alerter_risque_decrochage, etc.)
      // n'écrivent jamais sur le plan — cf. §6.2 doc intégration.
      return { succes: false, raison: 'Ce type de décision est informatif, rien à appliquer au plan.' };
    }

    const cible = trouverProchaineSeanceCible(planBrut, dateReference);
    if (!cible) {
      return { succes: false, raison: 'Aucune séance cible sûre trouvée cette semaine (uniquement des séances de qualité ou aucune séance à venir).' };
    }

    const ampleur = decision.ampleurPourcent;
    if (typeof ampleur !== 'number') {
      return { succes: false, raison: 'ampleurPourcent manquant sur la décision.' };
    }

    cible.session.kmEstime = Math.round(cible.session.kmEstime * (1 + ampleur / 100) * 10) / 10;
    cible.semaine.origineModification = {
      regleId: decision.id,
      libelle: decision.libelle,
      justification: decision.justification,
      appliqueLe: new Date().toISOString(),
    };

    return { succes: true, semaineNum: cible.semaine.week, sessionIndex: cible.indexSession };
  }

  global.DecisionEngineApply = {
    appliquerDecisionAuPlan,
    trouverProchaineSeanceCible, // exposée pour tests unitaires isolés et pour l'affichage (savoir QUOI proposer avant de l'appliquer)
  };

})(window);
