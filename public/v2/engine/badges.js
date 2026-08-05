/**
 * badges.js
 * Système de badges (récompenses) — extrait de index.html le 31/07/2026
 * pour réduire la taille du fichier principal (~9100+ lignes).
 *
 * Vrai module ES (pas de script classique) — contrairement aux fichiers
 * engine-classic-scripts/*.classic.js, ce module ne dépend d'AUCUNE
 * variable globale implicite du scope d'index.html (ALL_SESSIONS, PLAN,
 * statuses, today(), currentWeek(), weeklyReport()...). Ces variables
 * vivent en `let`/`function` LOCAUX au <script type="module"> principal
 * d'index.html, invisibles depuis un fichier externe — un simple
 * `<script src>` classique n'aurait donc pas pu les lire (vérifié avant
 * ce chantier).
 *
 * Chaque fonction qui en a besoin reçoit un objet `ctx` explicite avec
 * les données/fonctions nécessaires, fourni par l'appelant (index.html)
 * à chaque appel — pas de scope partagé implicite. Import dans
 * index.html : `const badgesModule = await import("/v2/engine/badges.js")`,
 * même pattern que plan-generator.js/v1-bridge.js/plan-forme.js déjà en
 * place (cf. window.__PLAN_PRET__ dans index.html).
 *
 * Conception complète discutée avec Laurent le 27/07/2026, cf. inventaire
 * §16. Toutes les fonctions sont des calculs PURS en lecture seule —
 * aucune n'écrit dans badges_debloques elle-même (sauf
 * enregistrerBadgeDebloque, qui reste la seule écriture Supabase de ce
 * module, best-effort).
 */

// Définition des badges (id, catégorie, paliers) — catégorie pilote la
// couleur d'affichage (cf. §16 : turquoise=regularite, bleu=progression,
// vert sauge=corps, gris=etapes). Paliers vides = badge événementiel
// (un seul niveau, jamais de progression partielle affichée).
export const DEFINITIONS_BADGES = {
  seances_affilees:      { categorie: 'regularite',  paliers: [5, 10, 20, 40] },
  semaines_completes:    { categorie: 'regularite',  paliers: [2, 4, 8, 16] },
  fc_ef_maitrisee:       { categorie: 'corps',        paliers: [2, 4, 8] },
  retour_reussi:         { categorie: 'regularite',  paliers: [] },
  semaine_parfaite:      { categorie: 'regularite',  paliers: [3, 6, 12, 20] },
  nouvelle_estimation:   { categorie: 'progression', paliers: [] },
  record_battu:          { categorie: 'progression', paliers: [] },
  test_semi_cooper:      { categorie: 'progression', paliers: [] },
  km_cumules:            { categorie: 'progression', paliers: [50, 100, 250, 500, 1000, 1500, 2000] },
  repos_ecoute:          { categorie: 'corps',        paliers: [] },
  semaine_equilibree:    { categorie: 'corps',        paliers: [] },
  premier_plan:          { categorie: 'etapes',       paliers: [] },
  mi_parcours:           { categorie: 'etapes',       paliers: [] },
  entree_affutage:       { categorie: 'etapes',       paliers: [] },
  course_terminee:       { categorie: 'etapes',       paliers: [] },
};

// Libellés affichés — nom générique + libellé par palier pour les badges
// progressifs (affiché dans le bandeau de notification et l'écran détaillé).
//
// CORRECTIF (02/08/2026, bug signalé par Laurent : le libellé de palier
// affiché sous un badge non encore débloqué — ex. "6 semaines parfaites"
// — se lisait comme un état déjà acquis, alors que c'est le PROCHAIN
// palier à atteindre. Reformulés avec un verbe d'action explicite
// ("Enchaîner X", "Réaliser X", "Maîtriser X sur Y") pour ne plus jamais
// être ambigus entre "voici ce que tu as" et "voici ce qu'il te reste à
// faire" — s'applique aux 4 badges à paliers (seances_affilees,
// semaines_completes, fc_ef_maitrisee, semaine_parfaite). Le nom
// générique (`nom`) reste inchangé, seuls les libellés `paliers[]`
// changent — l'affichage du sous-libellé dans renderBadges() (index.html)
// utilise déjà `libelle.paliers[niveauActuel]` sans modification
// nécessaire côté appelant.
export const LIBELLES_BADGES = {
  seances_affilees:    { nom: "Séances validées d'affilée", paliers: ["Enchaîner 5 séances", "Enchaîner 10 séances", "Enchaîner 20 séances", "Enchaîner 40 séances"] },
  semaines_completes:  { nom: "Semaines complètes d'affilée", paliers: ["Enchaîner 2 semaines complètes", "Enchaîner 4 semaines complètes", "Enchaîner 8 semaines complètes", "Enchaîner 16 semaines complètes"] },
  fc_ef_maitrisee:     { nom: "FC EF maîtrisée", paliers: ["Maîtriser sa FC EF sur 2 semaines", "Maîtriser sa FC EF sur 4 semaines", "Maîtriser sa FC EF sur 8 semaines"] },
  retour_reussi:       { nom: "Retour réussi" },
  semaine_parfaite:    { nom: "Semaines parfaites", paliers: ["Réaliser 3 semaines parfaites", "Réaliser 6 semaines parfaites", "Réaliser 12 semaines parfaites", "Réaliser 20 semaines parfaites"] },
  nouvelle_estimation: { nom: "Nouvelle estimation" },
  record_battu:        { nom: "Record personnel battu" },
  test_semi_cooper:    { nom: "Test semi-Cooper validé" },
  km_cumules:          { nom: "Km cumulés", paliers: ["Atteindre 50 km cumulés", "Atteindre 100 km cumulés", "Atteindre 250 km cumulés", "Atteindre 500 km cumulés", "Atteindre 1000 km cumulés", "Atteindre 1500 km cumulés", "Atteindre 2000 km cumulés"] },
  repos_ecoute:        { nom: "Repos écouté" },
  semaine_equilibree:  { nom: "Semaine équilibrée" },
  premier_plan:        { nom: "Premier plan lancé" },
  mi_parcours:         { nom: "Mi-parcours franchi" },
  entree_affutage:     { nom: "Entrée en affûtage" },
  course_terminee:     { nom: "Course terminée" },
};

// Couleur par catégorie — dérivée de la charte existante (jamais de
// nouvelle couleur "gamification"), cf. §16 : turquoise=régularité (déjà
// la couleur des statuts ✅), bleu=progression (déjà la couleur des
// allures/liens), vert sauge=respect du corps (seule vraie nouvelle
// nuance, aucune couleur existante ne convenait sans créer de confusion),
// gris=étapes du plan (volontairement sobre, ce sont des jalons
// automatiques, pas des accomplissements mérités au même titre).
export const COULEURS_CATEGORIE_BADGES = {
  regularite:  'rgb(var(--accent2-rgb))',
  progression: 'rgb(var(--accent-rgb))',
  corps:       'rgb(107,143,90)',
  etapes:      'var(--text)',
};

// Chemin SVG (dans un repère centré [-9,9]) par badge — icônes linéaires
// simples, un pictogramme par badge, cf. §16 identité visuelle.
export const ICONES_BADGES = {
  seances_affilees:    'M-7,3.5 L-2.5,-2.5 L2,2 L7,-5',
  semaines_completes:  'RECT_DOUBLE',
  fc_ef_maitrisee:     'M-7,2 L-3,2 L-1,-4 L1,6 L3,-2 L7,-2',
  retour_reussi:       'ARC_FLECHE',
  semaine_parfaite:    'ETOILE',
  nouvelle_estimation: 'M-6,5 L-1,-3.5 L3.5,1 L6.5,-6',
  record_battu:        'CERCLE_CROIX',
  test_semi_cooper:    'CHRONOMETRE',
  km_cumules:          'M-8,6 C-8,6 -4,-2 0,2 C4,6 8,-6 8,-6',
  repos_ecoute:        'M0,-7 C3.5,-7 6,-4.5 6,-1 C6,3.5 0,8 0,8 C0,8 -6,3.5 -6,-1 C-6,-4.5 -3.5,-7 0,-7 Z',
  semaine_equilibree:  'BALANCE',
  premier_plan:        'M-6,7 L-6,-3 L0,-9 L6,-3 L6,7 Z',
  mi_parcours:         'M-8,6 L-3,-2 L1,3 L8,-7',
  entree_affutage:     'M-6,8 L-6,-8 L6,-4 L-6,0',
  course_terminee:     'CERCLE_CHECK',
};

// Rend un badge sous forme d'anneau SVG (débloqué plein, en cours partiel
// avec compteur au centre, verrouillé en pointillés) — fonction PARTAGÉE
// entre le bandeau de notification, la carte Stats et l'écran détaillé
// (27/07/2026), pour ne jamais dupliquer le dessin des 3 états.
//
// forceDebloqueSimple=true (utilisé par le bandeau de notification) force
// l'affichage "débloqué plein" quel que soit le niveau réel — au moment de
// la notification, on montre toujours l'anneau complet pour LE palier
// qu'on vient d'annoncer, pas l'état global du badge.
//
// badgesCache/badgesSeriesBrutes remplacent l'ancienne lecture directe de
// window.__badgesCache__/window.__badgesSeriesBrutes__ — passés en
// paramètres explicites, l'appelant reste responsable de leur cycle de vie
// (toujours window.__badgesCache__/window.__badgesSeriesBrutes__ côté
// index.html, mais ce module ne le suppose plus implicitement).
export function renderAnneauBadge(badgeId, forceDebloqueSimple, taille, badgesCache, badgesSeriesBrutes) {
  taille = taille || 52;
  const def = DEFINITIONS_BADGES[badgeId];
  const couleur = COULEURS_CATEGORIE_BADGES[def.categorie];
  const icone = ICONES_BADGES[badgeId];
  const R = 26, C = 2 * Math.PI * R;

  // Conception révisée le 27/07/2026 (2ème itération avec Laurent) : le
  // centre de l'anneau affiche désormais la SÉRIE ACTIVE (ce qui compte
  // maintenant, peut être 0 si cassée), avec le RECORD affiché en petit
  // texte sous le badge — jamais perdu, toujours visible même si la série
  // active retombe à zéro. Distinct de la 1ère itération (retirée) qui
  // affichait "6/8" ambigu ne distinguant pas série active vs record.
  let estDebloque, texteAuCentre, dashOffset, niveauPastille = null, legendeSousBadge = null;
  if (forceDebloqueSimple) {
    estDebloque = true; dashOffset = 0; texteAuCentre = null;
  } else if (def.paliers.length > 0) {
    const niveau = badgesCache?.[badgeId] ?? 0; // niveau de palier atteint (0 = aucun), jamais perdu
    const series = badgesSeriesBrutes?.[badgeId] ?? { serieMax: 0, serieActuelle: 0 };
    const serieBrute = series.serieActuelle; // série ACTIVE en ce moment, peut redescendre à 0
    // Record RÉEL (serieMax), pas déduit du niveau de palier — correctif
    // 27/07/2026 (2ème retour de Laurent) : un record de 1 ne montrait
    // aucune légende tant qu'aucun palier n'était atteint (le 1er palier
    // "semaines_completes" nécessite 2). Décision actée : montrer la
    // progression même naissante, pas seulement une fois un palier
    // débloqué — cohérent avec le principe "voir toute la progression".
    const record = series.serieMax;
    if (niveau >= def.paliers.length) {
      estDebloque = true; dashOffset = 0; texteAuCentre = null; niveauPastille = niveau;
    } else {
      const prochainSeuil = def.paliers[niveau];
      const fraction = serieBrute > 0 ? Math.min(1, serieBrute / prochainSeuil) : 0;
      estDebloque = serieBrute > 0;
      dashOffset = C * (1 - fraction);
      texteAuCentre = String(serieBrute);
      if (niveau > 0) niveauPastille = niveau;
      // CORRECTIF (02/08/2026, bug signalé par Laurent : la légende
      // "série active / record X" affichée pour semaine_parfaite n'a pas
      // de sens — ce badge est un COMPTEUR CUMULÉ (cf. commentaire de
      // compterSemainesParfaites() plus bas : "jamais de notion de
      // cassée"), où serieActuelle et serieMax sont TOUJOURS égaux par
      // construction. Afficher "série active" à côté d'un "record"
      // identique suggère à tort qu'une série pourrait casser, ce qui
      // n'arrive jamais pour ce badge précis. Aucune légende n'est
      // affichée pour semaine_parfaite — le chiffre au centre de
      // l'anneau (déjà affiché via texteAuCentre) suffit à représenter
      // le cumul, sans texte trompeur en dessous.
      if (badgeId !== 'semaine_parfaite') {
        if (record > 0) {
          legendeSousBadge = "série active<br>record " + record;
        } else if (serieBrute > 0) {
          legendeSousBadge = "série active";
        }
      }
    }
  } else {
    estDebloque = !!badgesCache?.[badgeId];
    dashOffset = 0; texteAuCentre = null;
  }

  const opaciteIcone = estDebloque ? 1 : 0.35;
  const couleurIcone = estDebloque ? couleur : 'rgba(var(--text-rgb),0.5)';
  const couleurTexteCentre = estDebloque ? couleur : 'rgba(var(--text-rgb),0.45)';

  let elementIcone;
  if (icone === 'RECT_DOUBLE') {
    elementIcone = `<rect x="-7" y="-7" width="5.5" height="14" rx="1" fill="${couleurIcone}"/><rect x="1.5" y="-7" width="5.5" height="14" rx="1" fill="${couleurIcone}"/>`;
  } else if (icone === 'ARC_FLECHE') {
    elementIcone = `<path d="M-6,-6 A8.5,8.5 0 1 0 6,-6" fill="none" stroke="${couleurIcone}" stroke-width="2" stroke-linecap="round"/><path d="M6,-9 L6,-6 L3,-6" fill="none" stroke="${couleurIcone}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (icone === 'CERCLE_CROIX') {
    elementIcone = `<circle cx="0" cy="0" r="7" fill="none" stroke="${couleurIcone}" stroke-width="2"/><path d="M0,-7 L0,-9.5 M0,7 L0,9.5 M-7,0 L-9.5,0 M7,0 L9.5,0" stroke="${couleurIcone}" stroke-width="2" stroke-linecap="round"/>`;
  } else if (icone === 'BALANCE') {
    elementIcone = `<path d="M-7,3 L7,-3 M0,0 L0,-6 M-7,3 A2,2 0 0 0 -3,3 M7,-3 A2,2 0 0 0 3,-3" fill="none" stroke="${couleurIcone}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (icone === 'CERCLE_CHECK') {
    elementIcone = `<circle cx="0" cy="0" r="7" fill="none" stroke="${couleurIcone}" stroke-width="2"/><path d="M-3,0 L-1,2 L3,-3" fill="none" stroke="${couleurIcone}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (icone === 'CHRONOMETRE') {
    elementIcone = `<circle cx="0" cy="1" r="7" fill="none" stroke="${couleurIcone}" stroke-width="2"/><path d="M0,1 L3,-2 M0,-6 L0,-8 M-3,-8 L3,-8" fill="none" stroke="${couleurIcone}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (icone === 'ETOILE') {
    elementIcone = `<path d="M0,-8 L2.1,-2.5 L8,-2 L3.4,1.8 L4.9,7.6 L0,4.2 L-4.9,7.6 L-3.4,1.8 L-8,-2 L-2.1,-2.5 Z" fill="none" stroke="${couleurIcone}" stroke-width="1.6" stroke-linejoin="round"/>`;
  } else {
    elementIcone = `<path d="${icone}" fill="none" stroke="${couleurIcone}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  const svg = `<svg width="${taille}" height="${taille}" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="${R}" fill="none" stroke="${estDebloque ? couleur : 'rgba(var(--text-rgb),0.13)'}" stroke-width="4" opacity="${estDebloque ? '0.15' : '1'}" ${estDebloque ? '' : 'stroke-dasharray="3,5"'}/>
    ${estDebloque ? `<circle cx="32" cy="32" r="${R}" fill="none" stroke="${couleur}" stroke-width="4" stroke-dasharray="${C}" stroke-dashoffset="${dashOffset}" stroke-linecap="round" transform="rotate(-90 32 32)"/>` : ''}
    ${texteAuCentre ? `<text x="32" y="39" text-anchor="middle" font-size="20" font-weight="700" fill="${couleurTexteCentre}">${texteAuCentre}</text>` : `<g transform="translate(32,32)" opacity="${opaciteIcone}">${elementIcone}</g>`}
    ${niveauPastille ? `<circle cx="52" cy="12" r="9" fill="${couleur}"/><text x="52" y="16" text-anchor="middle" font-size="11" font-weight="700" fill="white">${niveauPastille}</text>` : ''}
  </svg>`;

  const wrapper = document.createElement('div');
  wrapper.style.textAlign = 'center';
  wrapper.innerHTML = svg + (legendeSousBadge ? `<div style="font-size:9px;color:rgba(var(--text-rgb),0.45);margin-top:2px;line-height:1.2;">${legendeSousBadge}</div>` : '');
  return wrapper;
}

// Plus longue série historique de statutEffectif ∈ {✅,⚠️} consécutifs sur
// des séances passées non-REPOS — ⚠️ compte comme réussite (cohérent avec
// calculerScoreSemaine/weeklyReport, cf. §16 : éviter une règle divergente
// entre badges et reste de l'app). ❌ ou absence de statut sur une séance
// passée (statutEffectif=😴 implicite) casse la série.
//
// todayStr : résultat de today() côté appelant, passé explicitement (pas
// d'appel implicite à une fonction today() globale).
export function calculerSerieMaxSeancesValidees(allSessions, todayStr) {
  // Exclut la séance du JOUR MÊME tant qu'elle n'a pas de vrai statut posé
  // (✅/⚠️/❌/😴) — correctif 27/07/2026 (bug signalé par Laurent : une
  // séance du jour sans statut ("—") cassait artificiellement une série
  // qui aurait dû inclure la veille, affichant "0" au centre du badge
  // alors que la série active était réellement en cours). Cohérent avec
  // le principe transverse déjà en place ailleurs dans l'app : le jour
  // même n'est jamais traité comme "passé" (cf. §15, statutEffectif
  // ne bascule jamais en 😴 implicite le jour même).
  const passees = allSessions
    .filter(s => s.type !== "REPOS" && (s.date < todayStr || (s.date === todayStr && ["✅","⚠️","❌","😴"].includes(s.statutEffectif))))
    .sort((a, b) => a.date.localeCompare(b.date));
  let serieActuelle = 0, serieMax = 0;
  for (const s of passees) {
    if (s.statutEffectif === "✅" || s.statutEffectif === "⚠️") {
      serieActuelle++;
      serieMax = Math.max(serieMax, serieActuelle);
    } else {
      serieActuelle = 0;
    }
  }
  // Retourne les DEUX séparément (27/07/2026, correctif suite au retour de
  // Laurent) : serieMax = record historique jamais perdu (§16, sert la
  // pastille de niveau + la légende "record"), serieActuelle = série RÉELLE
  // en ce moment (sert le chiffre au centre de l'anneau) — bug précédent :
  // seul serieMax était retourné et utilisé à tort comme "série active",
  // affichant le record au centre même quand la série venait de casser.
  return { serieMax, serieActuelle };
}

// Plus longue série de semaines complètes (done+adapted===total) —
// parcourt le plan jusqu'à la semaine COURANTE incluse (correctif
// 27/07/2026, suite au retour de Laurent : une semaine déjà entièrement
// complétée — toutes ses séances prévues ont un statut — doit compter
// même si les 7 jours calendaires ne sont pas encore tous écoulés, par ex.
// un plan à 4 séances/semaine dont la dernière tombe un vendredi ; le
// samedi/dimanche restants ne changent rien à "complète"). weeklyReportFn()
// reste la seule source de vérité pour "complète" — total=0 (aucune
// séance prévue cette semaine-là) continue d'être ignoré, cohérent avec
// le comportement précédent.
//
// currentWeekNum/weeklyReportFn : passés en paramètres (currentWeek()
// et weeklyReport() sont des fonctions locales au module d'index.html,
// invisibles ici).
export function calculerSerieMaxSemainesCompletes(currentWeekNum, weeklyReportFn) {
  let serieActuelle = 0, serieMax = 0;
  for (let w = 1; w <= currentWeekNum; w++) {
    const report = weeklyReportFn(w);
    if (!report || report.total === 0) continue;
    if (report.done + report.adapted === report.total) {
      serieActuelle++;
      serieMax = Math.max(serieMax, serieActuelle);
    } else {
      serieActuelle = 0;
    }
  }
  return { serieMax, serieActuelle };
}

// Plus longue série de semaines où avgEfHr reste dans zoneFC.zonesParType.E
// — granularité semaine, pas séance (décision actée le 27/07/2026, cf.
// §16 : cohérence avec le signal FC transmis au coach, et avgEfHr est déjà
// une moyenne hebdo, pas une donnée par séance).
export function calculerSerieMaxFcEfMaitrisee(planBrut, currentWeekNum, weeklyReportFn) {
  const zonesFC = planBrut?.zoneFC?.zonesParType;
  if (!zonesFC?.E) return { serieMax: 0, serieActuelle: 0 };
  let serieActuelle = 0, serieMax = 0;
  for (let w = 1; w < currentWeekNum; w++) {
    const report = weeklyReportFn(w);
    if (!report?.avgEfHr) { serieActuelle = 0; continue; }
    if (report.avgEfHr <= zonesFC.E.max) {
      serieActuelle++;
      serieMax = Math.max(serieMax, serieActuelle);
    } else {
      serieActuelle = 0;
    }
  }
  return { serieMax, serieActuelle };
}

// Retour réussi : une semaine ayant déclenché analyserAdaptations (semaine
// "à adapter") suivie d'une semaine complète réussie — réutilise deux
// mécanismes déjà en place plutôt qu'un nouveau seuil (cf. §16).
//
// analyserAdaptationsFn : fonction analyserAdaptations() du moteur v2
// (plan-generator.js), déjà exposée globalement côté index.html via
// Object.assign(window, ...) — passée ici explicitement plutôt que lue
// en global, pour rester cohérent avec le reste de ce module.
export function detecterRetourReussi(planBrut, statuses, currentWeekNum, weeklyReportFn, analyserAdaptationsFn) {
  if (!planBrut?.semaines) return false;
  planBrut.statuses = statuses;
  const { semainesAAdapter } = analyserAdaptationsFn(planBrut);
  for (const semaineNum of semainesAAdapter.keys()) {
    if (semaineNum >= currentWeekNum) continue; // semaine suivante pas encore terminée
    const report = weeklyReportFn(semaineNum);
    if (report && report.total > 0 && report.done + report.adapted === report.total) return true;
  }
  return false;
}

// ACWR resté en zone "faible" (risque === 'faible') sur 4 semaines
// d'affilée — lit l'historique déjà calculé par le moteur physio plutôt
// que de refaire un calcul séparé (cf. principe "coach IA = habillage du
// moteur, jamais un second décideur", appliqué ici à un badge plutôt qu'un
// message texte).
//
// decisionEngineRunnerState : module DecisionEngineRunnerState (chargé en
// script classique côté index.html, engine-classic-scripts/decision-
// engine-runner-state.classic.js) — passé en paramètre plutôt que lu via
// `typeof DecisionEngineRunnerState` global, cf. principe de ce module.
export function detecterSemaineEquilibree(decisionEngineRunnerState, stravaActivities, profilCoureur, adapterHistoriqueAvecRpeFn) {
  if (!decisionEngineRunnerState) return false;
  try {
    const samples = adapterHistoriqueAvecRpeFn(stravaActivities || [], "strava_gratuit");
    const historique = decisionEngineRunnerState.calculerHistoriqueCharge(samples, {
      fcMaxReference: profilCoureur.fcMax, fcReposReference: profilCoureur.fcRepos, sexe: profilCoureur.sexe,
      nbJoursAffiches: 28,
    });
    if (!historique?.historique || historique.historique.length < 28) return false;
    const derniers28j = historique.historique.slice(-28);
    return derniers28j.every(h => h.ratio !== null && h.ratio >= 0.8 && h.ratio <= 1.3);
  } catch (err) {
    console.warn("Badge semaine équilibrée : erreur de calcul.", err.message);
    return false;
  }
}

// Semaine "parfaite" (27/07/2026, transformé en compteur cumulé le même
// jour à la demande de Laurent) — une semaine déjà terminée où TOUTES les
// séances prévues sont ✅ (done===total, plus strict que "semaine
// complète" qui tolère aussi les ⚠️ adaptées) ET aucune 😴 (skipped===0).
// Correctif le même jour : la première version utilisait done+adapted===
// total (même critère que semaines_completes), ce qui laissait une
// semaine avec des ⚠️ compter comme "parfaite" — incohérent avec le nom
// du badge. skipped réutilisé tel quel (cf. bug corrigé le 22/07/2026,
// gère déjà le cas 😴 automatique).
//
// CUMULÉ, pas une série d'affilée (décision actée le 27/07/2026, contraire
// aux 3 autres badges à paliers) — "parfaite" est déjà un critère exigeant
// en soi ; exiger EN PLUS la consécutivité rendrait les paliers hors de
// portée sur un seul plan (9-13 semaines typiquement). Seuils 3/6/12/20
// choisis en conséquence : le premier reste atteignable sur un plan court,
// le dernier vise plusieurs plans/saisons successifs.
export function compterSemainesParfaites(currentWeekNum, weeklyReportFn) {
  let compteur = 0;
  for (let w = 1; w <= currentWeekNum; w++) {
    const report = weeklyReportFn(w);
    if (!report || report.total === 0) continue;
    if (report.done === report.total && report.skipped === 0) compteur++;
  }
  return compteur;
}

// Orchestrateur — calcule l'état ACTUEL de chaque badge (niveau atteint
// pour les badges à paliers, booléen pour les événementiels), à comparer
// ensuite avec badgesDejaEnregistres pour détecter un nouveau déblocage.
// Ne touche jamais à Supabase elle-même — fonction pure de calcul.
//
// ctx attend : { allSessions, planBrut, statuses, todayStr, currentWeekNum,
// weeklyReportFn, analyserAdaptationsFn, decisionEngineRunnerState,
// stravaActivities, profilCoureur, adapterHistoriqueAvecRpeFn,
// badgesSeriesBrutes } — badgesSeriesBrutes est l'objet mutable que
// l'appelant doit conserver (équivalent de l'ancien
// window.__badgesSeriesBrutes__), rempli ici par effet de bord comme
// avant (contrat inchangé, cf. renderAnneauBadge qui le relit).
export function calculerEtatBadgesActuel(ctx) {
  const etat = {};
  const badgesSeriesBrutes = ctx.badgesSeriesBrutes;

  const { serieMax: maxSeances, serieActuelle: actuelleSeances } = calculerSerieMaxSeancesValidees(ctx.allSessions, ctx.todayStr);
  badgesSeriesBrutes.seances_affilees = { serieMax: maxSeances, serieActuelle: actuelleSeances };
  etat.seances_affilees = DEFINITIONS_BADGES.seances_affilees.paliers.filter(p => maxSeances >= p).length;

  const { serieMax: maxSemaines, serieActuelle: actuelleSemaines } = calculerSerieMaxSemainesCompletes(ctx.currentWeekNum, ctx.weeklyReportFn);
  badgesSeriesBrutes.semaines_completes = { serieMax: maxSemaines, serieActuelle: actuelleSemaines };
  etat.semaines_completes = DEFINITIONS_BADGES.semaines_completes.paliers.filter(p => maxSemaines >= p).length;

  const { serieMax: maxFcEf, serieActuelle: actuelleFcEf } = calculerSerieMaxFcEfMaitrisee(ctx.planBrut, ctx.currentWeekNum, ctx.weeklyReportFn);
  badgesSeriesBrutes.fc_ef_maitrisee = { serieMax: maxFcEf, serieActuelle: actuelleFcEf };
  etat.fc_ef_maitrisee = DEFINITIONS_BADGES.fc_ef_maitrisee.paliers.filter(p => maxFcEf >= p).length;

  // semaine_parfaite : compteur CUMULÉ, pas une série — serieActuelle vaut
  // toujours serieMax (jamais de notion de "cassée", cf. commentaire de
  // compterSemainesParfaites()) pour rester compatible avec l'affichage de
  // renderAnneauBadge, pensé pour les séries mais fonctionne identiquement
  // pour un cumul qui ne redescend jamais.
  const totalSemainesParfaites = compterSemainesParfaites(ctx.currentWeekNum, ctx.weeklyReportFn);
  badgesSeriesBrutes.semaine_parfaite = { serieMax: totalSemainesParfaites, serieActuelle: totalSemainesParfaites };
  etat.semaine_parfaite = DEFINITIONS_BADGES.semaine_parfaite.paliers.filter(p => totalSemainesParfaites >= p).length;

  // Km cumulés (05/08/2026) — même principe que semaine_parfaite : compteur
  // qui ne redescend jamais (serieActuelle === serieMax), mais SOURCE
  // différente : profilCoureur.kmCumulesTotal, déjà tenu à jour par
  // index.html (recalculerKmComptesPourUid, à chaque changement de statut
  // de séance) plutôt que recalculé ici depuis ALL_SESSIONS/weeklyReport.
  // Cumul TOTAL tous plans confondus (décision actée avec Laurent) — c'est
  // précisément pourquoi ce cumul ne peut pas être recalculé depuis
  // ctx.allSessions (qui ne couvre que le plan ACTIF) ; profilCoureur est
  // une donnée globale au compte, cohérente avec ce besoin.
  const kmCumulesTotal = Math.round((ctx.profilCoureur?.kmCumulesTotal || 0));
  badgesSeriesBrutes.km_cumules = { serieMax: kmCumulesTotal, serieActuelle: kmCumulesTotal };
  etat.km_cumules = DEFINITIONS_BADGES.km_cumules.paliers.filter(p => kmCumulesTotal >= p).length;

  etat.retour_reussi = detecterRetourReussi(ctx.planBrut, ctx.statuses, ctx.currentWeekNum, ctx.weeklyReportFn, ctx.analyserAdaptationsFn);
  etat.semaine_equilibree = detecterSemaineEquilibree(ctx.decisionEngineRunnerState, ctx.stravaActivities, ctx.profilCoureur, ctx.adapterHistoriqueAvecRpeFn);
  etat.premier_plan = !!ctx.planBrut;
  etat.entree_affutage = ctx.planBrut?.semaines?.some(s => s.phase === 'Affutage' && s.semaineNum < ctx.currentWeekNum) ?? false;

  const dureeSemaines = ctx.planBrut?.dureeSemaines;
  etat.mi_parcours = dureeSemaines ? ctx.currentWeekNum >= Math.ceil(dureeSemaines / 2) : false;

  const dateCourseStr = ctx.planBrut?.dateCourse;
  etat.course_terminee = dateCourseStr ? ctx.todayStr > dateCourseStr : false;

  // nouvelle_estimation et record_battu ne sont pas recalculables depuis
  // l'état courant seul (ce sont des ÉVÉNEMENTS ponctuels, pas un état
  // stable observable à tout moment) — détectés séparément au moment où
  // calculerReferenceCouranteAllures()/la saisie d'un record se produisent
  // réellement, pas dans cet orchestrateur. Cf. points d'appel dédiés.
  // repos_ecoute : idem, détecté au moment du clic "Appliquer" sur une
  // décision reduire_charge, pas recalculable après coup.

  return etat;
}

// Compare l'état actuel à ce qui est déjà enregistré (badgesDejaEnregistres,
// chargé depuis Supabase au démarrage) et retourne la liste des NOUVEAUX
// déblocages à écrire + notifier. N'écrit rien elle-même.
export function detecterNouveauxBadges(etatActuel, badgesDejaEnregistres) {
  const nouveaux = [];
  for (const [badgeId, def] of Object.entries(DEFINITIONS_BADGES)) {
    if (def.paliers.length > 0) {
      const niveauActuel = etatActuel[badgeId] ?? 0;
      const niveauEnregistre = badgesDejaEnregistres[badgeId] ?? 0;
      for (let n = niveauEnregistre + 1; n <= niveauActuel; n++) {
        nouveaux.push({ badgeId, niveau: n, seuil: def.paliers[n - 1] });
      }
    } else if (etatActuel[badgeId] === true && !badgesDejaEnregistres[badgeId]) {
      nouveaux.push({ badgeId, niveau: 1, seuil: null });
    }
  }
  return nouveaux;
}

// Charge tous les badges déjà débloqués pour l'utilisateur courant, sous
// forme { badgeId: niveauMax } (paliers) ou { badgeId: true } (événement).
// Best-effort — un échec réseau retourne {} plutôt que de bloquer le
// rendu ; dans ce cas calculerEtatBadgesActuel() pourrait re-proposer des
// badges déjà obtenus lors d'un chargement suivant réussi, préférable à
// ne jamais rien afficher.
//
// supabase/userId : passés explicitement (équivalent de l'ancienne lecture
// LkAuth.supabase / window.__UTILISATEUR__.id).
export async function chargerBadgesDebloques(supabase, userId) {
  if (!supabase || !userId) return {};
  try {
    const { data, error } = await supabase.from('badges_debloques')
      .select('badge_id, niveau')
      .eq('user_id', userId);
    if (error || !data) return {};
    const parNiveau = {};
    for (const row of data) {
      if (DEFINITIONS_BADGES[row.badge_id]?.paliers.length > 0) {
        parNiveau[row.badge_id] = Math.max(parNiveau[row.badge_id] ?? 0, row.niveau);
      } else {
        parNiveau[row.badge_id] = true;
      }
    }
    return parNiveau;
  } catch (e) {
    return {};
  }
}

// Écrit un nouveau badge/palier débloqué. Best-effort, jamais bloquant —
// même esprit que journaliserDecisionEvent (index.html). La contrainte
// UNIQUE (user_id, badge_id, niveau) protège contre un double-insert si
// calculerEtatBadgesActuel() est ré-évalué avant que le cache appelant ne
// soit mis à jour — l'erreur de contrainte est silencieusement ignorée
// dans ce cas.
export async function enregistrerBadgeDebloque(supabase, userId, badgeId, niveau) {
  if (!supabase || !userId) return;
  try {
    await supabase.from('badges_debloques').insert({
      user_id: userId,
      badge_id: badgeId,
      niveau,
    });
  } catch (e) {
    // best-effort, y compris violation de la contrainte unique (déjà
    // enregistré par un appel concurrent) — jamais remonté à l'utilisateur
  }
}
