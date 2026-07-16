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
//   - Mécanisme d'application (kmEstime, origineModification) : §6.2 du
//     document d'intégration
//   - "Rien n'est automatique en V1" : §7.1 du document d'intégration —
//     appliquerDecisionAuPlan n'est appelée qu'en réponse à un clic explicite
//     sur "Appliquer", jamais en tâche de fond
//
// CORRECTIF STRUCTUREL (16/07/2026) : la V1 de ce fichier supposait à tort
// que window.__PLAN_BRUT__.semaines avait la même forme que PLAN/
// __PLAN_GENERE__ (le format déjà TRADUIT par v1-bridge.classic.js, avec
// week/sessions[]/type en MAJUSCULES/date explicite). Vérifié en console sur
// les vraies données de Laurent (16/07/2026) : ce n'est pas le cas. La vraie
// structure de __PLAN_BRUT__.semaines[i] est :
//   { semaineNum, phase, assignment: { [jourIndex 0-6]: seance }, volumeCibleKm }
// où seance.type est en MINUSCULES ('ef' | 'longue' | 'qualite' | 'repos' |
// 'marche-course'), sans champ date explicite (reconstruite depuis
// plan.dateDebut, cf. traduirePlanVersFormatV1 dans v1-bridge.classic.js).
// Ce fichier travaille maintenant DIRECTEMENT sur cette vraie structure brute
// — la même que celle lue par v1-bridge.classic.js — au lieu de supposer un
// format déjà traduit. La logique de classification (est-ce une séance de
// qualité ?) réutilise le même principe que typeV1DepuisSeanceV2 dans
// v1-bridge.classic.js plutôt que de la redupliquer avec un risque de
// divergence future entre les deux fichiers.
//
// LIMITE ACTÉE (16/07/2026, décision explicite de Laurent) : une décision
// reduire_charge ne cible QUE les séances de type 'ef' / 'longue' (les
// séances de type 'qualite' ont une structureIntervalles — blocs,
// répétitions, pyramides — qu'une réduction linéaire de kmEstime casserait).
// Ce cas (réduire le nombre d'intervalles plutôt que le volume brut) est un
// chantier futur à part entière, non traité ici, cf. mémoire de session. Si
// la prochaine séance est une séance de qualité, ce module cherche la
// prochaine séance 'ef'/'longue' de la même semaine ; si aucune n'existe,
// aucune cible n'est trouvée et la décision ne peut pas être appliquée (la
// carte de proposition ne doit alors pas s'afficher, cf. index.html).
//
// Où le déposer : /engine-classic-scripts/decision-engine-apply.classic.js
// Comment le charger : dans index.html, APRÈS decision-engine-rules.classic.js
// ET APRÈS v1-bridge.classic.js (dépend implicitement des mêmes conventions
// de structure, même si aucune fonction n'est importée directement)
//   <script src="/engine-classic-scripts/decision-engine-apply.classic.js"></script>
// ============================================================================

(function (global) {
  'use strict';

  // Types de séance (champ `type` brut de assignment[jourIndex], minuscules)
  // sur lesquels une réduction linéaire de volume est sûre. 'qualite' est
  // volontairement exclu (cf. limite actée en en-tête). 'repos' et
  // 'marche-course' n'ont pas de sens à réduire non plus (repos = déjà 0 ;
  // marche-course suit une progression par palier distincte, cf. mémoire
  // grand-débutant — pas gérée par ce moteur de décision pour l'instant).
  const TYPES_REDUCTION_SURE = ['ef', 'longue'];

  // --------------------------------------------------------------------------
  // Reconstruit, pour une semaine donnée (semaineNum), la liste des séances
  // à venir (jourIndex dont la date calendaire réelle est >= aujourd'hui),
  // avec leur date reconstruite — même logique que traduirePlanVersFormatV1
  // (v1-bridge.classic.js) pour ne jamais diverger sur le calcul de date.
  //
  // CORRECTIF (16/07/2026, vérifié en console sur les vraies données de
  // Laurent) : les clés de semaine.assignment vont de '1' (mardi) à '6'
  // (dimanche) — le lundi (indice ISO 0) n'a JAMAIS de clé dans assignment,
  // contrairement à ce que documentait v1-bridge.classic.js en commentaire
  // (JOUR_NOMS commence à 'Lun' pour jourIndex 0). L'indice ISO du jour de
  // semaine (0=lundi...6=dimanche) doit donc être décalé de +1 pour retrouver
  // la vraie clé de assignment (jourIndexAssignment = jourIndexISO). En
  // pratique : jourIndexISO 0 (lundi) n'a pas de clé -> jour absent, considéré
  // comme repos implicite comme avant. jourIndexISO 1 (mardi) -> clé '1'.
  // jourIndexISO 6 (dimanche) -> clé '6'. Donc la clé assignment = jourIndexISO
  // directement (pas besoin de +1 en fait, la boucle ci-dessous itère déjà
  // sur jourIndexISO 0-6 et va simplement ne rien trouver pour 0, ce qui est
  // le comportement correct).
  // --------------------------------------------------------------------------
  function reconstruireJoursAvenirDeLaSemaine(planBrut, semaine, dateReference) {
    const dateDebut = new Date(planBrut.dateDebut + 'T00:00:00Z');
    const jourSemaineISO = (dateDebut.getUTCDay() + 6) % 7; // 0=lundi ... 6=dimanche
    const lundiDeLaSemaine = new Date(dateDebut);
    lundiDeLaSemaine.setUTCDate(dateDebut.getUTCDate() - jourSemaineISO);

    const aujourdhui = new Date(dateReference || new Date().toISOString()).toISOString().slice(0, 10);

    const jours = [];
    for (let jourIndex = 0; jourIndex < 7; jourIndex++) {
      const date = new Date(lundiDeLaSemaine);
      date.setUTCDate(lundiDeLaSemaine.getUTCDate() + (semaine.semaineNum - 1) * 7 + jourIndex);
      const dateStr = date.toISOString().slice(0, 10);
      if (dateStr < aujourdhui) continue; // dans le passé, jamais une cible

      const seance = semaine.assignment ? semaine.assignment[jourIndex] : undefined;
      if (!seance) continue; // pas de séance ce jour-là (repos implicite)

      jours.push({ jourIndex, dateStr, seance });
    }
    return jours;
  }

  // --------------------------------------------------------------------------
  // Trouve la prochaine séance à venir sur laquelle une réduction linéaire de
  // volume est sûre (type 'ef' ou 'longue'), dans la semaine courante
  // uniquement (ne déborde jamais sur la semaine suivante, cf. limite en
  // en-tête : pas de proposition plutôt qu'une cible hasardeuse).
  //
  // Retourne { semaine, seance, jourIndex, dateStr } ou null si aucune cible sûre.
  // --------------------------------------------------------------------------
  function trouverProchaineSeanceCible(planBrut, dateReference) {
    if (!planBrut || !Array.isArray(planBrut.semaines) || !planBrut.dateDebut) return null;

    const aujourdhui = new Date(dateReference || new Date().toISOString()).toISOString().slice(0, 10);

    // Semaine courante : celle dont l'intervalle [lundi, dimanche] contient
    // aujourd'hui, calculée à partir de dateDebut — pas de champ semaine.date
    // disponible directement dans le format brut, donc reconstruite comme
    // v1-bridge.classic.js le fait.
    const dateDebut = new Date(planBrut.dateDebut + 'T00:00:00Z');
    const jourSemaineISO = (dateDebut.getUTCDay() + 6) % 7;
    const lundiDeLaSemaine = new Date(dateDebut);
    lundiDeLaSemaine.setUTCDate(dateDebut.getUTCDate() - jourSemaineISO);

    const semaineCourante = planBrut.semaines.find(semaine => {
      const lundiSemaine = new Date(lundiDeLaSemaine);
      lundiSemaine.setUTCDate(lundiDeLaSemaine.getUTCDate() + (semaine.semaineNum - 1) * 7);
      const dimancheSemaine = new Date(lundiSemaine);
      dimancheSemaine.setUTCDate(lundiSemaine.getUTCDate() + 6);
      const lundiStr = lundiSemaine.toISOString().slice(0, 10);
      const dimancheStr = dimancheSemaine.toISOString().slice(0, 10);
      return aujourdhui >= lundiStr && aujourdhui <= dimancheStr;
    });
    if (!semaineCourante) return null;

    const joursAvenir = reconstruireJoursAvenirDeLaSemaine(planBrut, semaineCourante, dateReference);
    if (joursAvenir.length === 0) return null;

    const cible = joursAvenir.find(({ seance }) => TYPES_REDUCTION_SURE.includes(seance.type));
    if (!cible) return null; // toutes les séances à venir cette semaine sont des séances de qualité (ou repos/marche-course) — pas de cible sûre

    return { semaine: semaineCourante, seance: cible.seance, jourIndex: cible.jourIndex, dateStr: cible.dateStr };
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
      return { succes: false, raison: 'Aucune séance cible sûre trouvée cette semaine (uniquement des séances de qualité/repos, ou aucune séance à venir).' };
    }

    const ampleur = decision.ampleurPourcent;
    if (typeof ampleur !== 'number') {
      return { succes: false, raison: 'ampleurPourcent manquant sur la décision.' };
    }

    if (typeof cible.seance.kmEstime !== 'number') {
      return { succes: false, raison: 'kmEstime absent sur la séance cible, impossible de réduire un volume inconnu.' };
    }

    cible.seance.kmEstime = Math.round(cible.seance.kmEstime * (1 + ampleur / 100) * 10) / 10;
    cible.semaine.origineModification = {
      regleId: decision.id,
      libelle: decision.libelle,
      justification: decision.justification,
      appliqueLe: new Date().toISOString(),
    };

    return { succes: true, semaineNum: cible.semaine.semaineNum, jourIndex: cible.jourIndex, dateStr: cible.dateStr };
  }

  global.DecisionEngineApply = {
    appliquerDecisionAuPlan,
    trouverProchaineSeanceCible, // exposée pour tests unitaires isolés et pour l'affichage (savoir QUOI proposer avant de l'appliquer)
  };

})(window);
