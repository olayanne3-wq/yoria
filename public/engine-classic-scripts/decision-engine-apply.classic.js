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
// RÉDUCTION D'INTERVALLES POUR SÉANCES QUALITÉ (23/07/2026, conception
// validée avec Laurent, cf. bibliotheque-seances.md §42 pour la justification
// littérature du plancher "base") : une décision reduire_charge peut
// désormais cibler une séance 'qualite', mais JAMAIS en réduisant kmEstime
// linéairement (casserait la structure d'intervalles — allure et récup ne
// sont jamais touchées, cf. Daniels + littérature consultée). Le principe :
//   - Bloc unique répété (structureIntervalles.blocs.length === 1, avec
//     repetitions > 1) : retirer des répétitions une à une, jamais sous le
//     plancher `base` du sous-type/niveau (tables dupliquées ci-dessous
//     depuis plan-generator.js — RISQUE DE DIVERGENCE, ces tables ne sont
//     PAS exportées par le module source, cf. commentaire sur
//     PARAMS_NIVEAU_PAR_SOUS_TYPE plus bas).
//   - Pyramide (structureIntervalles.blocs.length > 1, paliers) : retirer des
//     blocs entiers en partant de la fin, plancher = pyramide 'debutant'
//     ([2,3,4], 3 blocs) quel que soit le niveau réel du coureur.
//   - i-30-30 (repsParSerie + nbSeries) : réduire repsParSerie en premier
//     jusqu'à son plancher, nbSeries seulement en dernier recours.
//   - Bloc continu unique (repetitions === 1, ex. tempo-court,
//     seuil-negatif) : PAS de structure à casser → traité EXACTEMENT comme
//     'ef'/'longue', réduction linéaire simple sur kmEstime (décision
//     tranchée le 23/07/2026, pas une exclusion).
// Si la séance cible est déjà à son plancher structurel : trouverProchaineSeanceCible
// élargit sa recherche (EF/LONGUE d'abord, autre qualité avec marge ensuite)
// avant de renvoyer null — jamais de réduction fictive à 0%.
// L'ampleur RÉELLEMENT appliquée (après arrondi à l'unité de répétition/bloc
// la plus proche) est systématiquement recalculée et utilisée pour kmEstime
// ET historiqueReductionsMoteur — jamais l'ampleur brute demandée par la
// décision (cf. calculerAmpleurReelleAppliquee).
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
  // géré séparément (cf. réductionQualite ci-dessous) car il nécessite de
  // préserver la structure d'intervalles. 'repos' et 'marche-course' n'ont
  // pas de sens à réduire (repos = déjà 0 ; marche-course suit une
  // progression par palier distincte, non gérée par ce moteur pour l'instant).
  const TYPES_REDUCTION_SURE = ['ef', 'longue'];

  // --------------------------------------------------------------------------
  // DUPLICATION DEPUIS plan-generator.js (23/07/2026) — RISQUE DE DIVERGENCE.
  // Ces tables base/cap par sous-type/niveau sont déclarées LOCALEMENT dans
  // chaque `case` du switch de generateSeanceQualite (plan-generator.js),
  // jamais exportées par le module source. Dupliquées ici volontairement
  // (cohérent avec le pattern déjà en place dans ce fichier — cf. commentaire
  // CORRECTIF STRUCTUREL sur la structure de assignment) plutôt que de
  // toucher au générateur pour un export, hors périmètre de ce chantier.
  // Seul `base` nous intéresse ici (plancher de réduction) — `cap` n'est pas
  // dupliqué car jamais utilisé par ce module.
  // SI plan-generator.js change une valeur `base`, PENSER À RÉPERCUTER ICI.
  // --------------------------------------------------------------------------
  const BASE_PAR_SOUS_TYPE_NIVEAU = {
    'seuil-court':          { debutant: 2, intermediaire: 3, confirme: 4 },
    'seuil':                { debutant: 2, intermediaire: 3, confirme: 4 },
    'seuil-2min':           { debutant: 3, intermediaire: 4, confirme: 5 },
    'i-3min':               { debutant: 3, intermediaire: 4, confirme: 5 },
    'vitesse':              { debutant: 4, intermediaire: 6, confirme: 8 },
    'cotes':                { debutant: 4, intermediaire: 6, confirme: 8 },
    'allure-course':        { debutant: 2, intermediaire: 3, confirme: 4 },
    'allure-course-court':  { debutant: 1, intermediaire: 2, confirme: 3 },
  };

  // i-30-30 : base exprimée en repsParSerie (nbSeries démarre toujours à 1).
  const BASE_I3030_REPS_PAR_SERIE = { debutant: 3, intermediaire: 4, confirme: 5 };

  // Pyramide 'debutant' — plancher UNIQUE quel que soit le niveau réel du
  // coureur (cf. bibliotheque-seances.md §42 : cohérent avec la logique
  // "redémarrage conservateur", transposée à la structure pyramidale qui n'a
  // pas de notion de `base` numérique comme les autres sous-types).
  const PYRAMIDE_PLANCHER_PALIERS = [2, 3, 4];

  // Sous-types dont structureIntervalles n'a qu'un seul bloc continu
  // (repetitions === 1) : pas de structure interne à préserver, traités
  // exactement comme 'ef'/'longue' (réduction linéaire sur kmEstime).
  const SOUS_TYPES_BLOC_CONTINU = ['tempo-court', 'seuil-negatif'];

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
  // Détermine si une séance 'qualite' a encore de la marge de réduction
  // structurelle (pas déjà à son plancher). Retourne un booléen — utilisé par
  // trouverProchaineSeanceCible pour élargir sa recherche si besoin.
  // Ne modifie jamais la séance — lecture seule.
  // --------------------------------------------------------------------------
  function seanceQualiteAEncoreDeLaMarge(seance, niveau) {
    const structure = seance && seance.structureIntervalles;
    if (!structure || !Array.isArray(structure.blocs) || structure.blocs.length === 0) return false;

    const sousType = seance.sousType;
    const blocs = structure.blocs;

    // Bloc continu unique : traité comme EF/LONGUE, toujours de la marge
    // tant que kmEstime existe (pas de plancher structurel spécifique).
    if (blocs.length === 1 && blocs[0].repetitions === 1) return typeof seance.kmEstime === 'number';

    // i-30-30 : marge si repsParSerie > base OU nbSeries > 1.
    if (sousType === 'i-30-30') {
      const base = BASE_I3030_REPS_PAR_SERIE[niveau] || BASE_I3030_REPS_PAR_SERIE.intermediaire;
      const bloc = blocs[0];
      return (bloc.repsParSerie || bloc.repetitions || 0) > base || (structure.nbSeries || 1) > 1;
    }

    // Pyramide : marge si plus de blocs que le plancher debutant.
    if (blocs.length > 1) return blocs.length > PYRAMIDE_PLANCHER_PALIERS.length;

    // Bloc unique répété (cas général) : marge si repetitions > base.
    const base = (BASE_PAR_SOUS_TYPE_NIVEAU[sousType] || {})[niveau]
      || (BASE_PAR_SOUS_TYPE_NIVEAU[sousType] || {}).intermediaire;
    if (typeof base !== 'number') return false; // sous-type inconnu de nos tables, prudence
    return (blocs[0].repetitions || 0) > base;
  }

  // --------------------------------------------------------------------------
  // Calcule la réduction structurelle à appliquer à une séance 'qualite'.
  // Retourne { possible: bool, nouvelleStructure?, ampleurReelleAppliquee?,
  // raison?: string }. Ne modifie JAMAIS la séance directement — c'est
  // appliquerDecisionAuPlan qui écrit, une fois le calcul validé.
  //
  // ampleurReelleAppliquee est TOUJOURS négative ou nulle, en pourcentage du
  // volume d'unités d'effort d'origine (pas du kmEstime brut) — cf. § "Ampleur
  // réelle vs demandée" de la conception : l'arrondi à l'unité entière fait
  // dévier ce chiffre de ampleurPourcent demandé, c'est ATTENDU et voulu.
  // --------------------------------------------------------------------------
  function calculerReductionQualite(seance, ampleurPourcentDemande, niveau) {
    const structure = seance.structureIntervalles;
    if (!structure || !Array.isArray(structure.blocs) || structure.blocs.length === 0) {
      return { possible: false, raison: 'structureIntervalles absente ou vide.' };
    }

    const sousType = seance.sousType;
    const blocs = structure.blocs;
    const pourcentAbs = Math.abs(ampleurPourcentDemande);

    // --- Cas 1 : bloc continu unique (tempo-court, seuil-negatif) ---
    // Pas de structure à casser, traité comme EF/LONGUE.
    if (blocs.length === 1 && blocs[0].repetitions === 1) {
      if (typeof seance.kmEstime !== 'number') {
        return { possible: false, raison: 'kmEstime absent sur une séance à bloc continu unique.' };
      }
      return {
        possible: true,
        reductionLineaireKm: true, // signal pour appliquerDecisionAuPlan : pas de nouvelleStructure, juste kmEstime
        ampleurReelleAppliquee: -pourcentAbs, // pas d'arrondi à l'unité ici, comme EF/LONGUE
      };
    }

    // --- Cas 2 : i-30-30 (repsParSerie prioritaire, nbSeries en dernier recours) ---
    if (sousType === 'i-30-30') {
      const base = BASE_I3030_REPS_PAR_SERIE[niveau] || BASE_I3030_REPS_PAR_SERIE.intermediaire;
      const bloc = blocs[0];
      const repsActuelles = bloc.repsParSerie || bloc.repetitions || 0;
      const seriesActuelles = structure.nbSeries || 1;
      const uniteTotaleActuelle = repsActuelles * seriesActuelles;

      let aRetirerUnites = Math.max(1, Math.round(uniteTotaleActuelle * pourcentAbs / 100));

      // Priorité 1 : réduire repsParSerie jusqu'au plancher (marge disponible sur cette série).
      const margeReps = repsActuelles - base;
      const retirerSurReps = Math.min(margeReps, aRetirerUnites);
      let nouvellesReps = repsActuelles - retirerSurReps;
      aRetirerUnites -= retirerSurReps;

      let nouvellesSeries = seriesActuelles;
      // Priorité 2 (dernier recours) : retirer une série entière si encore besoin
      // ET qu'il reste plus d'une série (jamais descendre à 0 série).
      if (aRetirerUnites > 0 && seriesActuelles > 1) {
        nouvellesSeries = seriesActuelles - 1;
      }

      if (nouvellesReps === repsActuelles && nouvellesSeries === seriesActuelles) {
        return { possible: false, raison: 'i-30-30 déjà à son plancher (repsParSerie=base, nbSeries=1).' };
      }

      const uniteTotaleNouvelle = nouvellesReps * nouvellesSeries;
      const ampleurReelle = -Math.round((1 - uniteTotaleNouvelle / uniteTotaleActuelle) * 1000) / 10;

      return {
        possible: true,
        nouvelleStructure: {
          ...structure,
          nbSeries: nouvellesSeries,
          blocs: [{ ...bloc, repsParSerie: nouvellesReps, repetitions: nouvellesReps }],
        },
        ratioVolume: uniteTotaleNouvelle / uniteTotaleActuelle,
        ampleurReelleAppliquee: ampleurReelle,
      };
    }

    // --- Cas 3 : pyramide (plusieurs blocs, un palier chacun) ---
    if (blocs.length > 1) {
      const nbBlocsActuel = blocs.length;
      const plancherBlocs = PYRAMIDE_PLANCHER_PALIERS.length;
      let aRetirer = Math.max(1, Math.round(nbBlocsActuel * pourcentAbs / 100));
      aRetirer = Math.min(aRetirer, nbBlocsActuel - plancherBlocs);

      if (aRetirer <= 0) {
        return { possible: false, raison: 'Pyramide déjà à son plancher (' + plancherBlocs + ' paliers).' };
      }

      const nouveauxBlocs = blocs.slice(0, nbBlocsActuel - aRetirer);
      // Volume approximé par nombre de blocs (chaque palier a une durée
      // différente, mais retirer depuis la fin retire les paliers les plus
      // longs de la pyramide — approximation acceptée, cohérent avec le
      // principe "réduction mesurée mais pas exacte au %").
      const ampleurReelle = -Math.round((aRetirer / nbBlocsActuel) * 1000) / 10;

      return {
        possible: true,
        nouvelleStructure: { ...structure, blocs: nouveauxBlocs },
        ratioVolume: nouveauxBlocs.length / nbBlocsActuel,
        ampleurReelleAppliquee: ampleurReelle,
      };
    }

    // --- Cas 4 : bloc unique répété (cas général : i-3min, seuil, vitesse...) ---
    const base = (BASE_PAR_SOUS_TYPE_NIVEAU[sousType] || {})[niveau]
      || (BASE_PAR_SOUS_TYPE_NIVEAU[sousType] || {}).intermediaire;
    if (typeof base !== 'number') {
      return { possible: false, raison: 'Sous-type "' + sousType + '" inconnu des tables de plancher (BASE_PAR_SOUS_TYPE_NIVEAU).' };
    }

    const bloc = blocs[0];
    const repsActuelles = bloc.repetitions || 0;
    let aRetirer = Math.max(1, Math.round(repsActuelles * pourcentAbs / 100));
    aRetirer = Math.min(aRetirer, repsActuelles - base);

    if (aRetirer <= 0) {
      return { possible: false, raison: 'Séance déjà à son plancher (base=' + base + ' répétitions).' };
    }

    const nouvellesReps = repsActuelles - aRetirer;
    const ampleurReelle = -Math.round((aRetirer / repsActuelles) * 1000) / 10;

    return {
      possible: true,
      nouvelleStructure: { ...structure, blocs: [{ ...bloc, repetitions: nouvellesReps }] },
      ratioVolume: nouvellesReps / repsActuelles,
      ampleurReelleAppliquee: ampleurReelle,
    };
  }

  // --------------------------------------------------------------------------
  // Trouve la prochaine séance à venir sur laquelle une réduction linéaire de
  // volume est sûre (type 'ef' ou 'longue'), dans la semaine courante
  // uniquement (ne déborde jamais sur la semaine suivante, cf. limite en
  // en-tête : pas de proposition plutôt qu'une cible hasardeuse).
  //
  // Retourne { semaine, seance, jourIndex, dateStr, viaQualite?: bool } ou
  // null si aucune cible sûre. Priorité par défaut : EF/LONGUE d'abord
  // (réduction linéaire simple), puis QUALITE avec marge structurelle
  // disponible en dernier recours (cf. conception 23/07/2026).
  //
  // cibleQualitePrioritaire (23/07/2026, R-070) : INVERSE cet ordre — cherche
  // d'abord une séance qualité avec marge, EF/LONGUE seulement en repli. Cas
  // d'usage : le signal qui a produit la décision concerne spécifiquement les
  // séances de qualité (ex. séances qualité ratées consécutives) — alléger
  // une EF ne répondrait pas au problème réel. Paramètre optionnel, false par
  // défaut pour ne rien changer au comportement existant de R-024s/R-050.
  // --------------------------------------------------------------------------
  function trouverProchaineSeanceCible(planBrut, dateReference, niveau, cibleQualitePrioritaire) {
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

    const trouverCibleQualite = () => {
      const c = joursAvenir.find(({ seance }) =>
        seance.type === 'qualite' && seanceQualiteAEncoreDeLaMarge(seance, niveau || 'intermediaire')
      );
      return c ? { semaine: semaineCourante, seance: c.seance, jourIndex: c.jourIndex, dateStr: c.dateStr, viaQualite: true } : null;
    };
    const trouverCibleSure = () => {
      const c = joursAvenir.find(({ seance }) => TYPES_REDUCTION_SURE.includes(seance.type));
      return c ? { semaine: semaineCourante, seance: c.seance, jourIndex: c.jourIndex, dateStr: c.dateStr } : null;
    };

    if (cibleQualitePrioritaire) {
      // R-070 : qualité d'abord, EF/LONGUE en repli si aucune qualité n'a de marge.
      return trouverCibleQualite() || trouverCibleSure();
    }
    // Comportement par défaut (R-024s/R-050) : EF/LONGUE d'abord, qualité en dernier recours.
    return trouverCibleSure() || trouverCibleQualite();
  }

  // --------------------------------------------------------------------------
  // Applique une décision (sortie de DecisionEngineRules.evaluerRegles) au
  // plan brut. Ne modifie QUE le type 'reduire_charge' pour l'instant — les
  // autres types (alerter_*) sont informatifs et ne touchent jamais au plan
  // (cf. §6.2 doc intégration, distinction essentielle entre les deux
  // familles de décisions).
  //
  // Garde-fou §10.2 doc intégration (cause 1, 17/07/2026) : plafond de
  // réduction cumulée sur une fenêtre glissante. Empêche plusieurs décisions
  // reduire_charge individuellement raisonnables de s'additionner en un
  // effet cumulé excessif sur peu de jours (ex: -20% puis -15% en 3 jours).
  // Valeur proposée dans le doc : pas plus de 25% de réduction cumulée sur
  // 14 jours glissants — chiffre à valider avec un regard coach, pas
  // définitif. Vérifié AVANT d'écrire sur planBrut, jamais après.
  const PLAFOND_REDUCTION_CUMULEE_POURCENT = 25;
  const FENETRE_CUMUL_JOURS = 14;

  // Journal des réductions déjà appliquées, distinct de semaine.origineModification
  // (qui ne garde qu'UNE entrée par semaine, écrasée à chaque nouvelle
  // application — insuffisant pour calculer un cumul). Stocké au niveau du
  // plan entier (planBrut.historiqueReductionsMoteur), jamais réinitialisé
  // par ce module — persiste tant que le plan brut lui-même persiste
  // (Supabase, cf. sauvegarderPlan côté index.html).
  function calculerReductionCumulee(planBrut, dateReference) {
    const historique = Array.isArray(planBrut.historiqueReductionsMoteur) ? planBrut.historiqueReductionsMoteur : [];
    const maintenant = new Date(dateReference || new Date().toISOString()).getTime();
    const fenetreMs = FENETRE_CUMUL_JOURS * 24 * 60 * 60 * 1000;
    return historique
      .filter(entree => {
        const ecart = maintenant - new Date(entree.appliqueLe).getTime();
        return ecart >= 0 && ecart <= fenetreMs;
      })
      .reduce((total, entree) => total + Math.abs(entree.ampleurPourcent || 0), 0);
  }

  // Retourne { succes: bool, raison?: string } — ne modifie planBrut qu'en
  // cas de succès, jamais partiellement.
  // --------------------------------------------------------------------------
  function appliquerDecisionAuPlan(planBrut, decision, dateReference, niveau) {
    if (!decision || !decision.type) {
      return { succes: false, raison: 'Décision absente ou invalide.' };
    }

    if (decision.type !== 'reduire_charge') {
      // Décisions informatives (alerter_blessure_potentielle, alerter_risque_decrochage, etc.)
      // n'écrivent jamais sur le plan — cf. §6.2 doc intégration.
      return { succes: false, raison: 'Ce type de décision est informatif, rien à appliquer au plan.' };
    }

    const cible = trouverProchaineSeanceCible(planBrut, dateReference, niveau, decision.cibleQualitePrioritaire === true);
    if (!cible) {
      return { succes: false, raison: 'Aucune séance cible sûre trouvée cette semaine (EF/LONGUE absentes, et aucune qualité avec marge de réduction structurelle).' };
    }

    const ampleurDemandee = decision.ampleurPourcent;
    if (typeof ampleurDemandee !== 'number') {
      return { succes: false, raison: 'ampleurPourcent manquant sur la décision.' };
    }

    // Détermine la branche d'application : réduction structurelle (séance
    // qualité atteinte via viaQualite) ou réduction linéaire simple
    // (EF/LONGUE, comme avant). L'ampleur RÉELLEMENT appliquée peut différer
    // de ampleurDemandee (arrondi à l'unité entière) — c'est cette valeur
    // réelle qui est utilisée pour kmEstime ET le journal, jamais la brute.
    let ampleurReelleAppliquee = ampleurDemandee;
    let nouvelleStructure = null;

    if (cible.viaQualite) {
      const resultatReduction = calculerReductionQualite(cible.seance, ampleurDemandee, niveau || 'intermediaire');
      if (!resultatReduction.possible) {
        return { succes: false, raison: 'Réduction structurelle impossible sur la séance qualité ciblée : ' + resultatReduction.raison };
      }
      ampleurReelleAppliquee = resultatReduction.ampleurReelleAppliquee;
      if (!resultatReduction.reductionLineaireKm) {
        nouvelleStructure = resultatReduction.nouvelleStructure;
      }
      // Sinon (bloc continu unique) : reductionLineaireKm=true, on tombe
      // dans la même branche kmEstime que EF/LONGUE ci-dessous.
    }

    if (typeof cible.seance.kmEstime !== 'number') {
      return { succes: false, raison: 'kmEstime absent sur la séance cible, impossible de réduire un volume inconnu.' };
    }

    // Garde-fou cumulé : refuse d'appliquer si le cumul (réductions déjà
    // appliquées sur la fenêtre + cette nouvelle décision) dépasserait le
    // plafond. Vérifié sur l'ampleur RÉELLE (post-arrondi), pas la demandée
    // — cohérent avec le principe "le journal reflète ce qui a vraiment été
    // appliqué". Le moteur reste muet plutôt que d'aggraver une réduction
    // déjà conséquente — cohérent avec le principe "sécurité avant performance".
    const cumulExistant = calculerReductionCumulee(planBrut, dateReference);
    const cumulApresApplication = cumulExistant + Math.abs(ampleurReelleAppliquee);
    if (cumulApresApplication > PLAFOND_REDUCTION_CUMULEE_POURCENT) {
      return {
        succes: false,
        raison: 'Plafond de réduction cumulée atteint (' + Math.round(cumulExistant) + '% déjà appliqués sur ' + FENETRE_CUMUL_JOURS + ' jours, plafond ' + PLAFOND_REDUCTION_CUMULEE_POURCENT + '%) — décision non appliquée par sécurité.',
      };
    }

    if (nouvelleStructure) {
      // Réduction structurelle (bloc unique répété, pyramide, i-30-30) :
      // recalcule kmEstime proportionnellement au nouveau volume d'unités,
      // jamais sur le pourcentage brut demandé (cf. conception "ampleur réelle").
      cible.seance.structureIntervalles = nouvelleStructure;
      cible.seance.kmEstime = Math.round(cible.seance.kmEstime * (1 + ampleurReelleAppliquee / 100) * 10) / 10;
    } else {
      // Réduction linéaire simple : EF/LONGUE, ou séance qualité à bloc
      // continu unique (tempo-court, seuil-negatif) traitée identiquement.
      cible.seance.kmEstime = Math.round(cible.seance.kmEstime * (1 + ampleurReelleAppliquee / 100) * 10) / 10;
    }

    cible.semaine.origineModification = {
      regleId: decision.id,
      libelle: decision.libelle,
      justification: decision.justification,
      appliqueLe: new Date().toISOString(),
    };

    if (!Array.isArray(planBrut.historiqueReductionsMoteur)) planBrut.historiqueReductionsMoteur = [];
    planBrut.historiqueReductionsMoteur.push({
      regleId: decision.id,
      ampleurPourcent: ampleurReelleAppliquee, // ampleur RÉELLE, jamais la demandée brute
      appliqueLe: new Date().toISOString(),
    });

    return { succes: true, semaineNum: cible.semaine.semaineNum, jourIndex: cible.jourIndex, dateStr: cible.dateStr, ampleurReelleAppliquee };
  }

  global.DecisionEngineApply = {
    appliquerDecisionAuPlan,
    trouverProchaineSeanceCible,    // exposée pour tests unitaires isolés et pour l'affichage (savoir QUOI proposer avant de l'appliquer)
    calculerReductionCumulee,       // exposée pour tests unitaires isolés
    calculerReductionQualite,       // exposée pour tests unitaires isolés (réduction structurelle séances qualité)
    seanceQualiteAEncoreDeLaMarge,  // exposée pour tests unitaires isolés
  };

})(window);
