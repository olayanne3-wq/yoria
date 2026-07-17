// ============================================================================
// decision-engine-session-analysis.classic.js
// ----------------------------------------------------------------------------
// Module 2 du moteur de décision : compare une séance de qualité PRÉVUE à sa
// RÉALISATION (écarts allure/FC/volume), produit un SessionAnalysis.
//
// Référence : §6 "Module 2 — Analyse de séance (SessionAnalyzer)" et §3.3
// (interface SessionAnalysis) du document d'architecture.
//
// PÉRIMÈTRE VOLONTAIREMENT RESTREINT (décision Laurent, 17/07/2026) : ce
// module n'analyse QUE les séances de qualité (VMA/SPEC/SEUIL/TEST), pas
// EF/LONGUE/RECUP. Raison : seules les séances de qualité ont une cible
// d'allure précise et resserrée dans Yoria (SESSION_TARGETS, index.html) —
// EF/LONGUE n'ont qu'une zone FC large, l'écart d'allure n'y a pas le même
// sens (l'allure y est volontairement variable selon la fatigue du jour).
//
// Ce module NE RECALCULE PAS les cibles (SESSION_TARGETS/FC_ZONES) : elles
// vivent dans index.html (dépendent du plan chargé, __PLAN_BRUT__.allures) et
// sont transmises en input telles quelles, cf. §"Ce module ne décide de rien.
// Il constate." — même philosophie d'isolation que le RuleEngine (Module 5)
// vis-à-vis du plan.
//
// Où le déposer : /engine-classic-scripts/decision-engine-session-analysis.classic.js
// Comment le charger : dans index.html, indépendant des autres modules du
// moteur (ne dépend d'aucun autre script du moteur), mais doit être chargé
// AVANT tout futur Module 3 (WeekAnalyzer) qui consommera ses sorties.
//   <script src="/engine-classic-scripts/decision-engine-session-analysis.classic.js"></script>
// ============================================================================

(function (global) {
  'use strict';

  const TYPES_QUALITE = ['VMA', 'SPEC', 'SEUIL', 'TEST'];

  // --------------------------------------------------------------------------
  // Convertit une allure "M:SS/km" ou "M:SS" en secondes/km. Retourne null si
  // non parsable — jamais d'exception, cf. philosophie générale du moteur
  // (dégradation propre plutôt que crash), même pattern que ailleurs dans le
  // moteur (parseAllure côté index.html, mais dupliqué ici volontairement :
  // ce module ne doit dépendre d'aucune fonction externe à lui-même).
  // --------------------------------------------------------------------------
  function paceStringVersSecondes(paceStr) {
    if (!paceStr || typeof paceStr !== 'string') return null;
    const nettoye = paceStr.replace('/km', '').trim();
    const parts = nettoye.split(':').map(Number);
    if (parts.length !== 2 || parts.some(isNaN)) return null;
    return parts[0] * 60 + parts[1];
  }

  // --------------------------------------------------------------------------
  // Écart d'allure : compare l'allure moyenne réalisée (secondes/km) à la
  // fourchette cible (targetMin/targetMax, secondes/km — plus la valeur est
  // BASSE, plus l'allure est RAPIDE, cf. convention déjà en place dans
  // SESSION_TARGETS). ecartPourcent positif = plus LENT que la cible (allure
  // en secondes plus grande), négatif = plus RAPIDE.
  // --------------------------------------------------------------------------
  function analyserEcartAllure(allureRealiseeSec, cible) {
    if (!allureRealiseeSec || !cible || !cible.targetMin || !cible.targetMax) {
      return { ecartPourcent: 0, dansLaZone: false, commentaire: 'Allure non disponible pour comparaison.' };
    }
    const centreCible = (cible.targetMin + cible.targetMax) / 2;
    const ecartPourcent = Math.round(((allureRealiseeSec - centreCible) / centreCible) * 1000) / 10;
    const dansLaZone = allureRealiseeSec >= cible.targetMin && allureRealiseeSec <= cible.targetMax;

    let commentaire;
    if (dansLaZone) {
      commentaire = 'Allure dans la zone cible.';
    } else if (allureRealiseeSec < cible.targetMin) {
      commentaire = `Allure plus rapide que la cible (${Math.abs(ecartPourcent)}% plus vite).`;
    } else {
      commentaire = `Allure plus lente que la cible (${ecartPourcent}% plus lent).`;
    }
    return { ecartPourcent, dansLaZone, commentaire };
  }

  // --------------------------------------------------------------------------
  // Écart de FC : compare la FC moyenne réalisée à la zone cible (FC_ZONES,
  // bornes en bpm). Même convention de signe que l'allure : positif = FC plus
  // haute que la zone (au-dessus), négatif = plus basse (en-dessous).
  // --------------------------------------------------------------------------
  function analyserEcartFC(fcMoyenneRealisee, zoneFC) {
    if (!fcMoyenneRealisee || !zoneFC || !zoneFC.min || !zoneFC.max) {
      return { ecartPourcent: 0, dansLaZone: false, commentaire: 'FC non disponible pour comparaison.' };
    }
    const centreZone = (zoneFC.min + zoneFC.max) / 2;
    const ecartPourcent = Math.round(((fcMoyenneRealisee - centreZone) / centreZone) * 1000) / 10;
    const dansLaZone = fcMoyenneRealisee >= zoneFC.min && fcMoyenneRealisee <= zoneFC.max;

    let commentaire;
    if (dansLaZone) {
      commentaire = 'FC dans la zone cible.';
    } else if (fcMoyenneRealisee > zoneFC.max) {
      commentaire = `FC au-dessus de la zone cible (${ecartPourcent}%).`;
    } else {
      commentaire = `FC en-dessous de la zone cible (${Math.abs(ecartPourcent)}%).`;
    }
    return { ecartPourcent, dansLaZone, commentaire };
  }

  // --------------------------------------------------------------------------
  // Écart de volume : compare la distance réalisée à la distance prévue.
  // Tolérance ±5% = "dans la zone", cf. §6 doc archi (exemple donné pour le
  // volume). Moins central pour une séance qualité à structure fixe (allure
  // et FC priment), mais conservé pour rester fidèle au contrat SessionAnalysis.
  // --------------------------------------------------------------------------
  function analyserEcartVolume(distanceRealiseeKm, distancePrevueKm) {
    if (!distanceRealiseeKm || !distancePrevueKm) {
      return { ecartPourcent: 0, dansLaZone: false, commentaire: 'Volume non disponible pour comparaison.' };
    }
    const ecartPourcent = Math.round(((distanceRealiseeKm - distancePrevueKm) / distancePrevueKm) * 1000) / 10;
    const dansLaZone = Math.abs(ecartPourcent) <= 5;
    const commentaire = dansLaZone
      ? 'Volume dans la zone cible.'
      : `Volume ${ecartPourcent > 0 ? 'au-dessus' : 'en-dessous'} de la cible (${ecartPourcent}%).`;
    return { ecartPourcent, dansLaZone, commentaire };
  }

  // --------------------------------------------------------------------------
  // difficulteRessentie : déduite du RPE si présent (échelle 1-10, cf. doc
  // archi §5.3), sinon estimée depuis les écarts allure/FC comme proxy
  // imparfait (§6 doc archi : "proxy imparfait, 'inconnue' si aucune donnée
  // fiable"). Le proxy ne se prononce que si un écart franc est mesurable —
  // pas de fausse confiance sur des écarts faibles ou des données absentes.
  // --------------------------------------------------------------------------
  function deduireDifficulteRessentie(ressentiRPE, ecartAllure, ecartFC) {
    if (ressentiRPE !== undefined && ressentiRPE !== null) {
      if (ressentiRPE <= 3) return 'facile';
      if (ressentiRPE <= 6) return 'normale';
      if (ressentiRPE <= 8) return 'difficile';
      return 'tres_difficile';
    }
    // Proxy : une FC nettement au-dessus de la zone à allure cible tenue (ou
    // dépassée) suggère une séance difficile ; une FC basse dans la zone,
    // allure tenue, suggère une séance facile. Reste 'inconnue' dans le cas
    // ambigu (données absentes ou signaux contradictoires) plutôt que de
    // deviner à tort.
    if (!ecartFC || ecartFC.ecartPourcent === 0) return 'inconnue';
    if (ecartFC.ecartPourcent > 8) return 'difficile';
    if (ecartFC.ecartPourcent < -5 && ecartAllure && ecartAllure.dansLaZone) return 'facile';
    return 'inconnue';
  }

  // --------------------------------------------------------------------------
  // scoreReussite : moyenne pondérée des dansLaZone. Pour une séance qualité,
  // l'allure prime légèrement sur la FC (poids 0.6/0.4) — à l'inverse d'une
  // sortie longue où la FC primerait (cf. §6 doc archi), mais ce module ne
  // traite que les séances qualité (cf. en-tête). Volume pondéré plus léger
  // (0.2) et normalisé pour que le total reste sur 100.
  // --------------------------------------------------------------------------
  function calculerScoreReussite(ecartAllure, ecartFC, ecartVolume) {
    const poids = { allure: 0.5, fc: 0.35, volume: 0.15 };
    let score = 0;
    if (ecartAllure.dansLaZone) score += poids.allure;
    if (ecartFC.dansLaZone) score += poids.fc;
    if (ecartVolume.dansLaZone) score += poids.volume;
    return Math.round(score * 100);
  }

  // --------------------------------------------------------------------------
  // alertes : déclenchées par seuils simples, cf. §6 doc archi (exemple donné
  // : FC moyenne > FC max cible + 10% → "FC_TROP_HAUTE", gravité "attention").
  // Ce module ne décide de rien (pas d'ampleur de réduction, pas d'action) —
  // il constate et laisse le moteur de règles (Module 5) réagir s'il le juge
  // pertinent, cf. "Point de vigilance" §6 doc archi.
  // --------------------------------------------------------------------------
  function detecterAlertes(ecartAllure, ecartFC) {
    const alertes = [];
    if (ecartFC.ecartPourcent > 10) {
      alertes.push({ code: 'FC_TROP_HAUTE', gravite: 'attention' });
    }
    if (ecartAllure.ecartPourcent < -8) {
      // Allure nettement plus rapide que la cible sur une séance qualité :
      // pas forcément un problème, mais mérite un signalement (peut indiquer
      // un excès d'enthousiasme sur une séance structurée en intervalles).
      alertes.push({ code: 'ALLURE_TROP_RAPIDE', gravite: 'info' });
    }
    if (ecartAllure.ecartPourcent > 12) {
      alertes.push({ code: 'ALLURE_TROP_LENTE', gravite: 'attention' });
    }
    return alertes;
  }

  // --------------------------------------------------------------------------
  // Point d'entrée principal du Module 2.
  //
  // seanceRealisee attendu : { seanceId, distanceKm, allureMoyenneSec (nombre,
  //   secondes/km — PAS une string "M:SS", cf. paceStringVersSecondes si besoin
  //   de convertir en amont), fcMoyenne, ressentiRPE }
  // ciblesSeance attendu : { type, distancePrevueKm, allureCible: {targetMin,
  //   targetMax} (= SESSION_TARGETS[type] côté index.html), zoneFC: {min,max}
  //   (= FC_ZONES[type] côté index.html) }
  //
  // Retourne null si le type de séance n'est pas une séance qualité (cf.
  // périmètre restreint en en-tête) — pas une erreur, juste hors scope.
  // --------------------------------------------------------------------------
  function analyser(seanceRealisee, ciblesSeance) {
    if (!seanceRealisee || !ciblesSeance || !ciblesSeance.type) return null;
    if (TYPES_QUALITE.indexOf(ciblesSeance.type) === -1) return null; // hors périmètre, cf. en-tête

    const ecartAllure = analyserEcartAllure(seanceRealisee.allureMoyenneSec, ciblesSeance.allureCible);
    const ecartFC = analyserEcartFC(seanceRealisee.fcMoyenne, ciblesSeance.zoneFC);
    const ecartVolume = analyserEcartVolume(seanceRealisee.distanceKm, ciblesSeance.distancePrevueKm);

    const scoreReussite = calculerScoreReussite(ecartAllure, ecartFC, ecartVolume);
    const difficulteRessentie = deduireDifficulteRessentie(seanceRealisee.ressentiRPE, ecartAllure, ecartFC);
    const alertes = detecterAlertes(ecartAllure, ecartFC);

    return {
      seanceId: seanceRealisee.seanceId || null,
      reussite: scoreReussite >= 60, // seuil simple : majorité des critères pondérés dans la zone
      scoreReussite,
      difficulteRessentie,
      derive: {
        allure: ecartAllure,
        frequenceCardiaque: ecartFC,
        volume: ecartVolume,
      },
      alertes,
      calculeLe: new Date().toISOString(),
    };
  }

  global.DecisionEngineSessionAnalysis = {
    analyser,
    paceStringVersSecondes,        // exposée pour que index.html puisse convertir avant appel
    analyserEcartAllure,           // exposées pour tests unitaires isolés
    analyserEcartFC,
    analyserEcartVolume,
    calculerScoreReussite,
    deduireDifficulteRessentie,
    detecterAlertes,
    TYPES_QUALITE,
  };

})(window);
