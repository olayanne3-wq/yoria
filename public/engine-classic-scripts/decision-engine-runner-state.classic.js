// ============================================================================
// decision-engine-runner-state.classic.js
// ----------------------------------------------------------------------------
// Module 1 du moteur de décision : calcule l'état du coureur (charge, ACWR,
// fatigue, confiance) à partir de l'historique adapté (ActivitySample[],
// produit par decision-engine-adapter.classic.js).
//
// Références :
//   - Formules TRIMP/sRPE : §5.1 du document d'architecture
//   - ACWR et ses limites : §5.2 du document d'architecture
//   - Structures RunnerState : §3.3 du document d'architecture
//   - Dégradation selon données disponibles : §4 du document d'architecture
//
// Ce fichier ne contient AUCUNE règle de décision (pas de "si fatigue élevée
// alors réduire") — seulement du calcul. Les règles viendront dans un futur
// decision-engine-rules.classic.js (Module 5).
//
// Où le déposer : /engine-classic-scripts/decision-engine-runner-state.classic.js
// Comment le charger : dans index.html, APRÈS decision-engine-adapter.classic.js
//   <script src="/engine-classic-scripts/decision-engine-runner-state.classic.js"></script>
// ============================================================================

(function (global) {
  'use strict';

  // --------------------------------------------------------------------------
  // Calcul de la charge d'UNE séance (TRIMP de Banister si FC dispo, sRPE de
  // Foster sinon, proxy durée seule en dernier recours) — cf. §5.1 doc archi
  // --------------------------------------------------------------------------
  function calculerChargeSeance(sample, fcMaxReference, fcReposReference, sexe) {
    if (sample.fcMoyenne !== undefined && fcMaxReference && fcReposReference
        && fcMaxReference > fcReposReference) {
      const fcReserve = (sample.fcMoyenne - fcReposReference) / (fcMaxReference - fcReposReference);
      const fcReserveBornee = Math.max(0, Math.min(1, fcReserve)); // sécurité : jamais hors [0,1]
      const [a, b] = sexe === 'femme' ? [0.86, 1.67] : [0.64, 1.92];
      // sexe === 'autre' ou non renseigné : moyenne des deux jeux de constantes (cf. §5.1 doc archi)
      const [aFinal, bFinal] = sexe === 'autre' || !sexe
        ? [(0.64 + 0.86) / 2, (1.92 + 1.67) / 2]
        : [a, b];
      const facteurPonderation = aFinal * Math.exp(bFinal * fcReserveBornee);
      const valeur = sample.dureeMin * fcReserveBornee * facteurPonderation;
      return { valeur, methode: 'trimp', confiance: 85 };
    }
    if (sample.ressentiRPE !== undefined && sample.ressentiRPE !== null) {
      // sRPE de Foster — corrélé au TRIMP (r=0.79-0.91), cf. §5.1 doc archi
      const valeur = sample.dureeMin * sample.ressentiRPE;
      return { valeur, methode: 'srpe', confiance: 65 };
    }
    // Dernier recours : proxy durée seule, cf. §4.3 doc archi — confiance nettement réduite
    return { valeur: sample.dureeMin, methode: 'srpe', confiance: 30 };
  }

  // --------------------------------------------------------------------------
  // Normalise une charge sur une échelle 0-100 environ, pour que TRIMP et
  // sRPE restent comparables entre eux avant sommation (cf. §5.1 doc archi :
  // "ne jamais comparer un TRIMP et un sRPE comme s'ils étaient la même unité").
  // Constante de normalisation empirique à ajuster une fois qu'on aura plus
  // de données réelles (cf. §10.1 doc intégration — rejeu sur historique).
  // --------------------------------------------------------------------------
  function normaliserCharge(valeurBrute, methode) {
    if (methode === 'trimp') return valeurBrute; // le TRIMP est déjà dans une échelle "standard" en sciences du sport
    if (methode === 'srpe') return valeurBrute / 6; // sRPE (durée x RPE 1-10) ramené approximativement à l'échelle TRIMP
    return valeurBrute / 10; // proxy durée seule : échelle la plus grossière, poids réduit en conséquence
  }

  // --------------------------------------------------------------------------
  // Calcule la charge aiguë (7j) et chronique (28j), puis l'ACWR — cf. §5.1
  // et §5.2 doc archi
  // --------------------------------------------------------------------------
  function calculerCharge(activitySamples, dateReference, fcMaxReference, fcReposReference, sexe) {
    const maintenant = new Date(dateReference).getTime();
    const septJours = 7 * 24 * 60 * 60 * 1000;
    const vingtHuitJours = 28 * 24 * 60 * 60 * 1000;

    let chargeAigueBrute = 0;
    let chargeChroniqueBrute = 0;
    let nbSeancesAigues = 0;
    let nbSeancesChroniques = 0;
    let sommeConfianceAigue = 0;
    let dateChroniqueLaPlusAncienne = null; // pour savoir combien de jours sont RÉELLEMENT couverts

    activitySamples.forEach(sample => {
      if (!sample.date) return;
      const dateActivite = new Date(sample.date).getTime();
      const ecart = maintenant - dateActivite;
      if (ecart < 0 || ecart > vingtHuitJours) return; // hors fenêtre ou date future aberrante

      const { valeur, methode, confiance } = calculerChargeSeance(sample, fcMaxReference, fcReposReference, sexe);
      const valeurNormalisee = normaliserCharge(valeur, methode);

      chargeChroniqueBrute += valeurNormalisee;
      nbSeancesChroniques += 1;
      if (dateChroniqueLaPlusAncienne === null || dateActivite < dateChroniqueLaPlusAncienne) {
        dateChroniqueLaPlusAncienne = dateActivite;
      }

      if (ecart <= septJours) {
        chargeAigueBrute += valeurNormalisee;
        nbSeancesAigues += 1;
        sommeConfianceAigue += confiance;
      }
    });

    // CORRECTIF (16/07) : la charge chronique doit être ramenée à une moyenne
    // hebdomadaire en divisant par le nombre de semaines RÉELLEMENT couvertes
    // par les données disponibles, jamais par une constante fixe de 4. Sinon,
    // un historique court (ex: 7 jours pour un nouvel utilisateur) sous-estime
    // artificiellement la charge chronique et fait exploser le ratio ACWR
    // (observé en test : ratio de 3.3 sur un historique de 7 jours seulement,
    // alors que la charge était en réalité stable sur cette période).
    const joursCouvertsParChronique = dateChroniqueLaPlusAncienne !== null
      ? Math.max(1, Math.round((maintenant - dateChroniqueLaPlusAncienne) / (24 * 60 * 60 * 1000)) + 1)
      : 0;
    const semainesCouvertes = Math.max(1, Math.min(4, joursCouvertsParChronique / 7)); // borné à [1, 4]

    const chargeChroniqueMoyenneHebdo = nbSeancesChroniques > 0
      ? chargeChroniqueBrute / semainesCouvertes
      : 0;

    // Confiance du ratio réduite si l'historique chronique est court (moins de
    // 28 jours) : le ratio reste calculable mais moins fiable, cf. §4.4 doc archi
    const ratioFiabiliteHistorique = Math.min(joursCouvertsParChronique / 28, 1);

    const ratio = chargeChroniqueMoyenneHebdo > 0
      ? chargeAigueBrute / chargeChroniqueMoyenneHebdo
      : null; // pas assez de données chroniques pour un ratio significatif

    const confianceMoyenneAigue = nbSeancesAigues > 0 ? sommeConfianceAigue / nbSeancesAigues : 0;
    const confianceCalculAjustee = confianceMoyenneAigue * ratioFiabiliteHistorique;

    return {
      aigue: Math.round(chargeAigueBrute * 10) / 10,
      chronique: Math.round(chargeChroniqueMoyenneHebdo * 10) / 10,
      ratio: ratio !== null ? Math.round(ratio * 100) / 100 : null,
      nbSeancesAigues,
      nbSeancesChroniques,
      joursCouvertsParChronique,
      confianceCalcul: Math.round(confianceCalculAjustee),
    };
  }

  // --------------------------------------------------------------------------
  // Calcule un score de fatigue 0-100 à partir de la charge. Version simplifiée
  // pour le catalogue de démarrage (cf. §7.2 doc intégration — seulement 3
  // règles au départ, pas besoin d'un modèle de fatigue sophistiqué tout de
  // suite). Le ratio ACWR est le signal principal ; le nombre de séances
  // récentes vient nuancer la confiance.
  // --------------------------------------------------------------------------
  function calculerFatigue(charge) {
    if (charge.ratio === null) {
      return { valeur: null, confiance: 0 }; // pas assez de données pour se prononcer
    }
    // Mapping simple : ratio 1.0 = fatigue neutre (50), ratio 1.5+ = fatigue haute (proche 100),
    // ratio 0.5 ou moins = fatigue basse (proche 0). Fonction linéaire volontairement simple pour
    // la V1 — à affiner une fois le rejeu sur historique réel possible (cf. §10.1 doc intégration).
    const fatigueBrute = 50 + (charge.ratio - 1.0) * 100;
    const fatigueBornee = Math.max(0, Math.min(100, fatigueBrute));
    return { valeur: Math.round(fatigueBornee), confiance: charge.confianceCalcul };
  }

  // --------------------------------------------------------------------------
  // Confiance globale du RunnerState — cf. §4.4 doc archi. Plafonnée par la
  // profondeur d'historique ET par la qualité des données disponibles.
  // --------------------------------------------------------------------------
  function calculerConfianceGlobale(charge, nbJoursHistoriqueDisponible) {
    if (charge.ratio === null) return 0;
    const scoreProfondeur = Math.min(nbJoursHistoriqueDisponible / 28, 1) * 100; // 28j = confiance max sur ce critère
    const scoreQualiteDonnees = charge.confianceCalcul; // déjà 0-100, cf. calculerChargeSeance
    return Math.round(Math.min(scoreProfondeur, scoreQualiteDonnees));
  }

  // --------------------------------------------------------------------------
  // Point d'entrée principal du Module 1 — cf. §6 doc archi, RunnerStateCalculator
  // --------------------------------------------------------------------------
  function calculerRunnerState(activitySamples, options) {
    const opts = options || {};
    const dateReference = opts.dateReference || new Date().toISOString();
    const fcMaxReference = opts.fcMaxReference || undefined;
    const fcReposReference = opts.fcReposReference || undefined;
    const sexe = opts.sexe || undefined;

    if (!Array.isArray(activitySamples) || activitySamples.length === 0) {
      return {
        fatigue: null,
        charge: { aigue: 0, chronique: 0, ratio: null },
        confiance: 0,
        risque: 'indetermine',
        calculeLe: new Date().toISOString(),
        avertissement: 'Aucune séance disponible pour le calcul.',
      };
    }

    const charge = calculerCharge(activitySamples, dateReference, fcMaxReference, fcReposReference, sexe);
    const fatigue = calculerFatigue(charge);

    const datesTriees = activitySamples
      .map(s => s.date)
      .filter(Boolean)
      .sort();
    const nbJoursHistorique = datesTriees.length > 0
      ? Math.round((new Date(dateReference) - new Date(datesTriees[0])) / (24 * 60 * 60 * 1000))
      : 0;

    const confiance = calculerConfianceGlobale(charge, nbJoursHistorique);

    let risque = 'indetermine';
    if (charge.ratio !== null) {
      if (charge.ratio > 1.5) risque = 'critique';
      else if (charge.ratio > 1.3) risque = 'eleve';
      else if (charge.ratio >= 0.8) risque = 'faible';
      else risque = 'modere'; // sous-charge : pas dangereux physiquement mais signalé (cf. §5.2 doc archi)
    }

    return {
      fatigue: fatigue.valeur,
      charge: {
        aigue: charge.aigue,
        chronique: charge.chronique,
        ratio: charge.ratio,
      },
      confiance,
      risque,
      nbSeancesAnalysees: {
        aigues: charge.nbSeancesAigues,
        chroniques: charge.nbSeancesChroniques,
      },
      calculeLe: new Date().toISOString(),
    };
  }

  global.DecisionEngineRunnerState = {
    calculerRunnerState,
    calculerChargeSeance, // exposée pour tests unitaires isolés
    calculerCharge,       // idem
    calculerFatigue,      // idem
  };

})(window);
